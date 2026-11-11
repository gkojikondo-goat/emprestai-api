import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** Spec 002 regra 7. Fonte única: valida a saída e gera o OpenAPI. */
export const MeSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  nome: z.string(),
  tenant: z.object({ id: z.uuid(), slug: z.string() }),
  papel: z.enum(['colaborador', 'operacoes']),
});

export class MeDto extends createZodDto(MeSchema) {}
