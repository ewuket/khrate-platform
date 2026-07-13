import { Module } from '@nestjs/common';
import { GroupBuyingService } from './group-buying.service';
import { GroupBuyingController } from './group-buying.controller';
import { CutoffScheduler } from './cutoff.scheduler';
import { TimelineService } from '../common/timeline.service';
import { PolicyService } from '../policy/policy.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [GroupBuyingController],
  providers: [GroupBuyingService, CutoffScheduler, TimelineService, PolicyService],
  exports: [GroupBuyingService],
})
export class GroupBuyingModule {}
