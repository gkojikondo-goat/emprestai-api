import { HttpException } from '@nestjs/common';

/**
 * Erro de regra de negócio em Problem Details (RFC 9457) com `type` fixo, que
 * o front usa para mostrar o motivo (spec 006 regra 4 e CA-23).
 */
export class Problema extends HttpException {
  constructor(status: number, readonly tipo: string, titulo: string, detalhe: string) {
    super({ type: tipo, error: titulo, message: detalhe }, status);
  }
}

export const recusas = {
  limite: () =>
    new Problema(422, 'limite-de-itens', 'Limite de itens', 'Você já tem 3 itens emprestados.'),
  atraso: () =>
    new Problema(
      422,
      'bloqueado-por-atraso',
      'Bloqueado por atraso',
      'Você tem um item em atraso. Devolva-o antes de pedir outro.',
    ),
  indisponivel: () =>
    new Problema(
      409,
      'equipamento-indisponivel',
      'Equipamento indisponível',
      'Este equipamento acabou de ser emprestado.',
    ),
  manutencao: () =>
    new Problema(
      409,
      'equipamento-em-manutencao',
      'Equipamento em manutenção',
      'Este equipamento está em manutenção.',
    ),
};
