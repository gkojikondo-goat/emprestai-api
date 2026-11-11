import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** Spec 006 regra 1: só o equipamento; pessoa e tenant vêm do token (campos extras são descartados). */
export const SolicitarEmprestimo = z.object({ equipamentoId: z.uuid() });
export class SolicitarEmprestimoDto extends createZodDto(SolicitarEmprestimo) {}

const Data = z.string().describe('AAAA-MM-DD');

export const EmprestimoCriado = z.object({
  id: z.uuid(),
  equipamentoId: z.uuid(),
  userId: z.uuid(),
  retiradaEm: Data,
  devolverAte: Data,
});
export class EmprestimoCriadoDto extends createZodDto(EmprestimoCriado) {}

export const MeusEmprestimos = z.object({
  itens: z.array(
    z.object({
      id: z.uuid(),
      equipamento: z.object({ id: z.uuid(), nome: z.string(), patrimonio: z.string().nullable() }),
      retiradaEm: Data,
      devolverAte: Data,
      emAtraso: z.boolean(),
    }),
  ),
  limite: z.number().int(),
  bloqueado: z.boolean(),
});
export class MeusEmprestimosDto extends createZodDto(MeusEmprestimos) {}
export type MeusEmprestimosSaida = z.infer<typeof MeusEmprestimos>;
export type EmprestimoCriadoSaida = z.infer<typeof EmprestimoCriado>;
