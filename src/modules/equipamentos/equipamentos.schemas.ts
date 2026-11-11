import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SITUACOES = ['disponivel', 'emprestado', 'manutencao'] as const;

/** Spec 004 regra 2 e CA-09: parâmetros fora do intervalo respondem 400. */
export const ListarEquipamentosQuery = z.object({
  q: z.string().trim().max(100).optional(),
  situacao: z.enum(SITUACOES).optional(),
  cursor: z.string().max(200).optional(),
  limite: z.coerce.number().int().min(1).max(100).default(50),
});

export class ListarEquipamentosQueryDto extends createZodDto(ListarEquipamentosQuery) {}

const Equipamento = z.object({
  id: z.uuid(),
  nome: z.string(),
  categoria: z.string(),
  patrimonio: z.string().nullable(),
  situacao: z.enum(SITUACOES),
  observacao: z.string().nullable(),
  imagemUrl: z.string().nullable(),
  emprestimo: z
    .object({
      pessoaNome: z.string(),
      devolverAte: z.string().describe('AAAA-MM-DD'),
      comigo: z.boolean(),
    })
    .nullable(),
});

export const ListaEquipamentos = z.object({
  itens: z.array(Equipamento),
  proximoCursor: z.string().nullable(),
  totais: z.object({ total: z.number().int(), disponiveis: z.number().int() }),
});

export class ListaEquipamentosDto extends createZodDto(ListaEquipamentos) {}
export type ListaEquipamentosSaida = z.infer<typeof ListaEquipamentos>;
