import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ProblemDetailsFilter } from './common/problem-details.filter';

export function configureApp(
  app: INestApplication,
  allowedOrigins: string[],
): void {
  app.setGlobalPrefix('v1');
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.useGlobalFilters(new ProblemDetailsFilter(app.get(HttpAdapterHost)));
}
