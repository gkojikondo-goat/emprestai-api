import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { quemChama } from '../../common/request-context';
import { MembershipRepository } from '../auth/membership.repository';
import { MeSchema } from './me.schemas';

export type Me = z.infer<typeof MeSchema>;

@Injectable()
export class MeService {
  constructor(private readonly memberships: MembershipRepository) {}

  /** Spec 002 regra 7. Tenant e pessoa vêm do contexto, nunca de parâmetro. */
  async me(): Promise<Me> {
    const { userId, tenantId, email, papel } = quemChama();
    const vinculo = await this.memberships.buscar(userId, tenantId);
    if (!vinculo) throw new Error('Vínculo sumiu durante o request.');
    return { id: userId, email, nome: vinculo.nome, tenant: vinculo.tenant, papel };
  }
}
