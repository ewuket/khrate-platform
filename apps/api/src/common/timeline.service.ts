import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Append-only audit. Every meaningful event (deal tipped, payment captured, refund
 * issued, delivery confirmed, PII access) is recorded here with its actor. This is the
 * backbone of ops, analytics, and fraud investigation (see docs/engineering/09).
 */
@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    type: string;
    actor?: string;
    dealId?: string;
    orderId?: string;
    data?: Prisma.InputJsonValue;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const client = params.tx ?? this.prisma;
    await client.timelineEvent.create({
      data: {
        type: params.type,
        actor: params.actor ?? 'system',
        dealId: params.dealId,
        orderId: params.orderId,
        data: params.data,
      },
    });
  }
}
