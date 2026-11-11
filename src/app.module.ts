import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import pino from 'pino';
import { LOGGER, RequestContextMiddleware } from './common/request-context';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmprestimosModule } from './modules/emprestimos/emprestimos.module';
import { EquipamentosModule } from './modules/equipamentos/equipamentos.module';
import { HealthModule } from './modules/health/health.module';
import { MeModule } from './modules/me/me.module';
import { PrismaModule } from './prisma/prisma.module';

@Global()
@Module({
  providers: [{ provide: LOGGER, useFactory: () => pino() }],
  exports: [LOGGER],
})
class LogModule {}

@Module({
  imports: [
    ConfigModule,
    LogModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    MeModule,
    EquipamentosModule,
    EmprestimosModule,
  ],
  providers: [
    // Zod valida a entrada e serializa a saída com o mesmo schema do OpenAPI (ADR-001).
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
