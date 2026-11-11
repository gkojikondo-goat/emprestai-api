import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import pino from 'pino';
import { LOGGER, RequestContextMiddleware } from './common/request-context';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
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
  imports: [ConfigModule, LogModule, PrismaModule, AuthModule, HealthModule, MeModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
