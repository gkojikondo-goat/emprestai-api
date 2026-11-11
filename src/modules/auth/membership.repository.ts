import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type Vinculo = {
  papel: string;
  nome: string;
  tenant: { id: string; slug: string };
};

@Injectable()
export class MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscar(userId: string, tenantId: string): Promise<Vinculo | null> {
    return this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      select: { papel: true, nome: true, tenant: { select: { id: true, slug: true } } },
    });
  }
}
