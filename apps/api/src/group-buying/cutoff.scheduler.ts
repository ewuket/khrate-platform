import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { GroupBuyingService } from './group-buying.service';

/**
 * Drives deal cut-offs. Every minute it finds deals whose cut-off has passed but which are
 * still OPEN/LOCKED and runs the tip/fail decision. At scale this moves to a Redis/BullMQ
 * job scheduled per-deal; polling is fine and simple for launch volumes.
 */
@Injectable()
export class CutoffScheduler {
  private readonly logger = new Logger(CutoffScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly groupBuying: GroupBuyingService,
  ) {}

  @Interval(60_000)
  async sweep(): Promise<void> {
    const due = await this.prisma.groupDeal.findMany({
      where: { state: { in: ['OPEN', 'LOCKED'] }, cutoffAt: { lte: new Date() } },
      select: { id: true },
    });
    for (const deal of due) {
      try {
        const result = await this.groupBuying.processCutoff(deal.id);
        if (result.changed) this.logger.log(`Deal ${deal.id} -> ${result.state}`);
      } catch (err) {
        this.logger.error(`Cut-off failed for deal ${deal.id}: ${(err as Error).message}`);
      }
    }
  }
}
