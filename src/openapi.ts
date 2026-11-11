import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';

/** Documento OpenAPI gerado dos schemas Zod (ADR-001: fonte do contrato). */
export function gerarDocumento(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Emprestai API')
    .setVersion('1')
    .addBearerAuth()
    .build();
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}

/** Serialização estável (chaves ordenadas) para o diff do arquivo versionado. */
export function serializar(doc: OpenAPIObject): string {
  const ordenar = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(ordenar)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v as object)
              .sort()
              .map((k) => [k, ordenar((v as Record<string, unknown>)[k])]),
          )
        : v;
  return `${JSON.stringify(ordenar(doc), null, 2)}\n`;
}

// `npm run openapi`: monta a app em modo preview (sem banco) e grava openapi.json.
if (require.main === module) {
  (async () => {
    const app = await NestFactory.create(AppModule, { preview: true, logger: false });
    app.setGlobalPrefix('v1');
    const destino = path.resolve(__dirname, '..', 'openapi.json');
    writeFileSync(destino, serializar(gerarDocumento(app)));
    await app.close();
    console.log(`openapi.json gravado em ${destino}`);
  })().catch((erro: unknown) => {
    console.error(erro);
    process.exit(1);
  });
}
