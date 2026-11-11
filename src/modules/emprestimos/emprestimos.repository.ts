import { Injectable, NotFoundException } from '@nestjs/common';
import { recusas } from '../../common/problema';
import { PrismaService } from '../../prisma/prisma.service';

export const LIMITE_DE_ITENS = 3;

export type NovoEmprestimo = {
  tenantId: string;
  userId: string;
  equipamentoId: string;
  hoje: string;
  devolverAte: string;
};

export type EmprestimoCriado = {
  id: string;
  equipamento_id: string;
  user_id: string;
  retirada_em: string;
  devolver_ate: string;
};

export type EmprestimoAberto = {
  id: string;
  equipamento_id: string;
  nome: string;
  patrimonio: string | null;
  retirada_em: string;
  devolver_ate: string;
};

const ehViolacaoUnica = (e: unknown) => JSON.stringify(e ?? '').includes('23505');

@Injectable()
export class EmprestimosRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Spec 006 regras 4 e 5, numa transação. Ordem das checagens (plano):
   * 404, manutenção, indisponível, atraso, limite.
   *  - trava por pessoa (advisory lock) serializa os pedidos da mesma pessoa (CA-05);
   *  - FOR UPDATE na linha do equipamento serializa pedidos do mesmo item (CA-07);
   *  - o unique parcial de empréstimo aberto é a rede de segurança.
   */
  async criar(p: NovoEmprestimo): Promise<EmprestimoCriado> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${p.tenantId}:${p.userId}`}, 0))`;
        const [equip] = await tx.$queryRaw<{ situacao: string }[]>`
          SELECT situacao FROM equipamentos
          WHERE id = ${p.equipamentoId}::uuid AND tenant_id = ${p.tenantId}::uuid
          FOR UPDATE`;
        if (!equip) throw new NotFoundException('Equipamento não encontrado.');
        if (equip.situacao === 'manutencao') throw recusas.manutencao();
        const [aberto] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM emprestimos
          WHERE equipamento_id = ${p.equipamentoId}::uuid AND devolvido_em IS NULL`;
        if (aberto) throw recusas.indisponivel();
        const [pessoa] = await tx.$queryRaw<{ abertos: number; atrasados: number }[]>`
          SELECT count(*)::int AS abertos,
                 count(*) FILTER (WHERE devolver_ate < ${p.hoje}::date)::int AS atrasados
          FROM emprestimos
          WHERE tenant_id = ${p.tenantId}::uuid AND user_id = ${p.userId}::uuid AND devolvido_em IS NULL`;
        if ((pessoa?.atrasados ?? 0) > 0) throw recusas.atraso();
        if ((pessoa?.abertos ?? 0) >= LIMITE_DE_ITENS) throw recusas.limite();
        const [criado] = await tx.$queryRaw<EmprestimoCriado[]>`
          INSERT INTO emprestimos (tenant_id, equipamento_id, user_id, retirada_em, devolver_ate)
          VALUES (${p.tenantId}::uuid, ${p.equipamentoId}::uuid, ${p.userId}::uuid, ${p.hoje}::date, ${p.devolverAte}::date)
          RETURNING id, equipamento_id, user_id,
                    to_char(retirada_em, 'YYYY-MM-DD') AS retirada_em,
                    to_char(devolver_ate, 'YYYY-MM-DD') AS devolver_ate`;
        if (!criado) throw new Error('INSERT de empréstimo não devolveu linha.');
        // Spec 006 regra 7 / CA-13: auditoria na mesma transação.
        await tx.$executeRaw`
          INSERT INTO auditoria (tenant_id, ator_id, acao, recurso_tipo, recurso_id, dados)
          VALUES (${p.tenantId}::uuid, ${p.userId}::uuid, 'emprestimo.criado', 'emprestimo',
                  ${criado.id}::uuid,
                  ${JSON.stringify({ equipamentoId: p.equipamentoId, devolverAte: p.devolverAte })}::jsonb)`;
        return criado;
      });
    } catch (erro) {
      if (ehViolacaoUnica(erro)) throw recusas.indisponivel();
      throw erro;
    }
  }

  async abertosDe(tenantId: string, userId: string): Promise<EmprestimoAberto[]> {
    return this.prisma.$queryRaw<EmprestimoAberto[]>`
      SELECT a.id, a.equipamento_id, e.nome, e.patrimonio,
             to_char(a.retirada_em, 'YYYY-MM-DD') AS retirada_em,
             to_char(a.devolver_ate, 'YYYY-MM-DD') AS devolver_ate
      FROM emprestimos a
      JOIN equipamentos e ON e.id = a.equipamento_id AND e.tenant_id = a.tenant_id
      WHERE a.tenant_id = ${tenantId}::uuid AND a.user_id = ${userId}::uuid AND a.devolvido_em IS NULL
      ORDER BY a.devolver_ate, a.id`;
  }
}
