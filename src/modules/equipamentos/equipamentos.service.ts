import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { quemChama } from '../../common/request-context';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { EquipamentosRepository, Situacao } from './equipamentos.repository';
import type { ListaEquipamentosSaida } from './equipamentos.schemas';

type Cursor = { criadoEm: string; id: string };

export function codificarCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}

/** Cursor opaco; qualquer valor adulterado vira 400 (spec 004 CA-09). */
export function decodificarCursor(valor: string): Cursor {
  try {
    const c = JSON.parse(Buffer.from(valor, 'base64url').toString('utf8')) as Partial<Cursor>;
    if (
      typeof c.criadoEm === 'string' &&
      typeof c.id === 'string' &&
      /^[0-9a-f-]{36}$/i.test(c.id) &&
      !Number.isNaN(Date.parse(c.criadoEm))
    ) {
      return { criadoEm: c.criadoEm, id: c.id };
    }
  } catch {
    // cai no erro abaixo
  }
  throw new BadRequestException('Cursor inválido.');
}

@Injectable()
export class EquipamentosService {
  constructor(
    private readonly repo: EquipamentosRepository,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async listar(p: {
    q?: string;
    situacao?: Situacao;
    cursor?: string;
    limite: number;
  }): Promise<ListaEquipamentosSaida> {
    const { tenantId, userId } = quemChama();
    const cursor = p.cursor ? decodificarCursor(p.cursor) : undefined;
    const [linhas, totais] = await Promise.all([
      this.repo.listar({ tenantId, q: p.q || undefined, situacao: p.situacao, cursor, limite: p.limite }),
      this.repo.totais(tenantId),
    ]);
    const pagina = linhas.slice(0, p.limite);
    const ultima = pagina[pagina.length - 1];
    return {
      itens: pagina.map((l) => ({
        id: l.id,
        nome: l.nome,
        categoria: l.categoria,
        patrimonio: l.patrimonio,
        situacao: l.situacao,
        observacao: l.observacao,
        imagemUrl: l.imagem_path ? `${this.env.STORAGE_PUBLIC_URL}/${l.imagem_path}` : null,
        emprestimo:
          l.situacao === 'emprestado' && l.devolver_ate
            ? {
                pessoaNome: l.pessoa_nome ?? '—',
                devolverAte: l.devolver_ate,
                comigo: l.emprestimo_user_id === userId,
              }
            : null,
      })),
      proximoCursor:
        linhas.length > p.limite && ultima ? codificarCursor({ criadoEm: ultima.cursor, id: ultima.id }) : undefined,
      totais,
    };
  }
}
