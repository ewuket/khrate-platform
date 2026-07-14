import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GroupBuyingService } from './group-buying.service';
import { GroupBuyingController } from './group-buying.controller';
import { CutoffScheduler } from './cutoff.scheduler';
import { TimelineService } from '../common/timeline.service';
import { PolicyService } from '../policy/policy.service';
import { PaymentsModule } from '../payments/payments.module';
import { CustomerGuard } from '../auth/customer-auth';

@Module({
  imports: [
    PaymentsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'khrate-dev-secret-change-me',
      }),
    }),
  ],
  controllers: [GroupBuyingController],
  providers: [GroupBuyingService, CutoffScheduler, TimelineService, PolicyService, CustomerGuard],
  exports: [GroupBuyingService],
})
export class GroupBuyingModule {}
