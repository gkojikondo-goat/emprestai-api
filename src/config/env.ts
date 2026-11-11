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
  // Spec 002: validação do token do Supabase pela JWKS pública.
  SUPABASE_JWKS_URL: z.url({
    error: 'URL da JWKS, ex.: https://<ref>.supabase.co/auth/v1/.well-known/jwks.json',
  }),
  SUPABASE_JWT_ISSUER: z.url({ error: 'emissor do token, ex.: https://<ref>.supabase.co/auth/v1' }),
  // Spec 004 regra 15: base pública do bucket de fotos (sem barra no final).
  STORAGE_PUBLIC_URL: z
    .url({
      error: 'base pública do bucket, ex.: https://<ref>.supabase.co/storage/v1/object/public/equipamentos',
    })
    .transform((v) => v.replace(/\/+$/, '')),
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
