import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type Situacao = 'disponivel' | 'emprestado' | 'manutencao';

export type LinhaEquipamento = {
  id: string;
  nome: string;
  categoria: string;
  patrimonio: string | null;
  observacao: string | null;
  imagem_path: string | null;
  situacao: Situacao;
  devolver_ate: string | null;
  emprestimo_user_id: string | null;
  pessoa_nome: string | null;
  cursor: string;
};

export type FiltroLista = {
  tenantId: string;
  q?: string;
  situacao?: Situacao;
  cursor?: { criadoEm: string; id: string };
  limite: number;
};

// Situação derivada (spec 004 regra 3): empréstimo aberto vence o valor guardado.
const SITUACAO = Prisma.sql`CASE WHEN a.id IS NOT NULL THEN 'emprestado' ELSE e.situacao END`;

/** Escapa curingas do LIKE para a busca ser por trecho literal. */
function trechoLike(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

@Injectable()
export class EquipamentosRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Uma página, do mais novo ao mais antigo; traz limite+1 para saber se há próxima. */
  async listar(f: FiltroLista): Promise<LinhaEquipamento[]> {
    const condicoes: Prisma.Sql[] = [Prisma.sql`e.tenant_id = ${f.tenantId}::uuid`];
    if (f.q) {
      const t = trechoLike(f.q);
      condicoes.push(Prisma.sql`(e.nome ILIKE ${t} OR e.patrimonio ILIKE ${t})`);
    }
    if (f.situacao) condicoes.push(Prisma.sql`${SITUACAO} = ${f.situacao}`);
    if (f.cursor) {
      condicoes.push(
        Prisma.sql`(e.criado_em, e.id) < (${f.cursor.criadoEm}::timestamptz, ${f.cursor.id}::uuid)`,
      );
    }
    return this.prisma.$queryRaw<LinhaEquipamento[]>`
      SELECT e.id, e.nome, e.categoria, e.patrimonio, e.observacao, e.imagem_path,
             ${SITUACAO} AS situacao,
             to_char(a.devolver_ate, 'YYYY-MM-DD') AS devolver_ate,
             a.user_id::text AS emprestimo_user_id,
             m.nome AS pessoa_nome,
             e.criado_em::text AS cursor
      FROM equipamentos e
      LEFT JOIN emprestimos a ON a.equipamento_id = e.id AND a.devolvido_em IS NULL
      LEFT JOIN memberships m ON m.user_id = a.user_id AND m.tenant_id = e.tenant_id
      WHERE ${Prisma.join(condicoes, ' AND ')}
      ORDER BY e.criado_em DESC, e.id DESC
      LIMIT ${f.limite + 1}`;
  }

  /** Totais do tenant inteiro, sem busca nem filtro (spec 004 regra 6). */
  async totais(tenantId: string): Promise<{ total: number; disponiveis: number }> {
    const [r] = await this.prisma.$queryRaw<{ total: number; disponiveis: number }[]>`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE ${SITUACAO} = 'disponivel')::int AS disponiveis
      FROM equipamentos e
      LEFT JOIN emprestimos a ON a.equipamento_id = e.id AND a.devolvido_em IS NULL
      WHERE e.tenant_id = ${tenantId}::uuid`;
    return r ?? { total: 0, disponiveis: 0 };
  }
}
