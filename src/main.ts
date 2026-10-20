import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { Env, InvalidEnvError, parseEnv } from './config/env';

function loadConfig(): Env {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
  try {
    return parseEnv(process.env);
  } catch (error) {
    if (error instanceof InvalidEnvError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

async function bootstrap() {
  const env = loadConfig();
  const app = await NestFactory.create(AppModule);
  configureApp(app, env.CORS_ORIGIN);
  await app.listen(env.PORT);
}

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
