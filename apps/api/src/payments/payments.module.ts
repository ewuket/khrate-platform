import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentRegistry } from './payment-registry.service';
import { ManualMomoProvider } from './providers/manual-momo.provider';
import { TimelineService } from '../common/timeline.service';
import { PolicyService } from '../policy/policy.service';

@Module({
  providers: [PaymentsService, PaymentRegistry, ManualMomoProvider, TimelineService, PolicyService],
  exports: [PaymentsService, PaymentRegistry],
})
export class PaymentsModule {}
