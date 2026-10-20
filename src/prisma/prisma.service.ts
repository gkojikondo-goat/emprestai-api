import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(@Inject(ENV) env: Env) {
    super({
      adapter: new PrismaPg({ connectionString: env.DATABASE_URL, max: 1 }),
    });
  }

  async onModuleInit() {
    try {
      await this.$queryRaw`SELECT 1`;
    } catch (error) {
      throw new Error(
        'Não foi possível conectar ao banco de dados. Verifique DATABASE_URL e se o banco está no ar.',
        { cause: error },
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
