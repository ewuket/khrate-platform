import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import {
  AdminDealsController,
  AdminPaymentsController,
  AdminOrdersController,
  AdminDeliveriesController,
  AdminCatalogueController,
  AdminConfigController,
  AdminReportsController,
} from './admin.controllers';
import { StaffController } from '../staff/staff.controller';
import { StaffGuard } from '../staff/staff-auth';
import { TimelineService } from '../common/timeline.service';
import { PaymentsModule } from '../payments/payments.module';

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
  controllers: [
    StaffController,
    AdminDealsController,
    AdminPaymentsController,
    AdminOrdersController,
    AdminDeliveriesController,
    AdminCatalogueController,
    AdminConfigController,
    AdminReportsController,
  ],
  providers: [AdminService, StaffGuard, TimelineService],
})
export class AdminModule {}
