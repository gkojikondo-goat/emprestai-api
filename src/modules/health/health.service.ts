import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HealthRepository } from './health.repository';

@Injectable()
export class HealthService {
  constructor(private readonly repository: HealthRepository) {}

  async check(): Promise<{ status: 'ok'; database: 'up' }> {
    try {
      await this.repository.ping();
    } catch {
      throw new ServiceUnavailableException('Banco de dados indisponível.');
    }
    return { status: 'ok', database: 'up' };
  }
}
