import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string({ error: 'variável obrigatória ausente' })
    .regex(/^postgres(ql)?:\/\//, 'deve começar com postgresql://'),
  CORS_ORIGIN: z
    .string({ error: 'variável obrigatória ausente' })
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.url({ error: 'cada origem deve ser uma URL, ex.: http://localhost:5173' }))
        .min(1, 'informe ao menos uma origem'),
    ),
});

export type Env = z.infer<typeof envSchema>;

export class InvalidEnvError extends Error {}

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
    );
    throw new InvalidEnvError(
      `Configuração inválida. Corrija as variáveis de ambiente (veja .env.example):\n${lines.join('\n')}`,
    );
  }
  return result.data;
}
