import { Inject, Injectable } from '@nestjs/common';
import { hojeEmSaoPaulo, PRAZO_DIAS, RELOGIO, type Relogio, somarDias } from '../../common/datas';
import { quemChama } from '../../common/request-context';
import { EmprestimosRepository, LIMITE_DE_ITENS } from './emprestimos.repository';
import type { EmprestimoCriadoSaida, MeusEmprestimosSaida } from './emprestimos.schemas';

@Injectable()
export class EmprestimosService {
  constructor(
    private readonly repo: EmprestimosRepository,
    @Inject(RELOGIO) private readonly agora: Relogio,
  ) {}

  /** Spec 006 regras 1 e 2: em nome de quem chama; devolve em hoje + 14 dias. */
  async solicitar(equipamentoId: string): Promise<EmprestimoCriadoSaida> {
    const { tenantId, userId } = quemChama();
    const hoje = hojeEmSaoPaulo(this.agora());
    const c = await this.repo.criar({
      tenantId,
      userId,
      equipamentoId,
      hoje,
      devolverAte: somarDias(hoje, PRAZO_DIAS),
    });
    return {
      id: c.id,
      equipamentoId: c.equipamento_id,
      userId: c.user_id,
      retiradaEm: c.retirada_em,
      devolverAte: c.devolver_ate,
    };
  }

  /** Spec 006 regra 6: só os abertos de quem chama; em atraso = devolverAte < hoje. */
  async meus(): Promise<MeusEmprestimosSaida> {
    const { tenantId, userId } = quemChama();
    const hoje = hojeEmSaoPaulo(this.agora());
    const itens = (await this.repo.abertosDe(tenantId, userId)).map((l) => ({
      id: l.id,
      equipamento: { id: l.equipamento_id, nome: l.nome, patrimonio: l.patrimonio },
      retiradaEm: l.retirada_em,
      devolverAte: l.devolver_ate,
      emAtraso: l.devolver_ate < hoje,
    }));
    return { itens, limite: LIMITE_DE_ITENS, bloqueado: itens.some((i) => i.emAtraso) };
  }
}
