import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ProblemDetailsFilter } from './common/problem-details.filter';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new ProblemDetailsFilter(app.get(HttpAdapterHost)));
}
