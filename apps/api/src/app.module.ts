import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogueModule } from './catalogue/catalogue.module';
import { PaymentsModule } from './payments/payments.module';
import { GroupBuyingModule } from './group-buying/group-buying.module';
import { AdminModule } from './admin/admin.module';
import { CustomerModule } from './customer/customer.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CatalogueModule,
    PaymentsModule,
    GroupBuyingModule,
    AdminModule,
    CustomerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
