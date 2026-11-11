import { createLocalJWKSet, exportJWK, generateKeyPair, JWTVerifyGetKey, SignJWT } from 'jose';

export const EMISSOR = 'https://teste.supabase.co/auth/v1';

/**
 * Par de chaves ES256 local, no lugar do Supabase. O guard recebe a JWKS
 * local; as claims têm o mesmo formato do token do Supabase.
 */
export async function criarEmissor() {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'teste', alg: 'ES256' };
  const jwks: JWTVerifyGetKey = createLocalJWKSet({ keys: [jwk] });
  const outra = await generateKeyPair('ES256');

  type Opcoes = {
    sub: string;
    email?: string;
    tenantId?: string | null;
    expiraEm?: string | number;
    emissor?: string;
    chaveErrada?: boolean;
  };

  async function token(o: Opcoes): Promise<string> {
    const claims: Record<string, unknown> = { email: o.email ?? `${o.sub.slice(0, 8)}@teste.dev` };
    if (o.tenantId !== null) claims.app_metadata = { tenant_id: o.tenantId };
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: 'teste' })
      .setSubject(o.sub)
      .setIssuer(o.emissor ?? EMISSOR)
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime(o.expiraEm ?? '1h')
      .sign(o.chaveErrada ? outra.privateKey : privateKey);
  }

  return { jwks, token };
}
