import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';
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
    // Blunt per-IP rate limit (DoS/abuse backstop; the OTP endpoint has its own stricter
    // business-level throttle). 300 req/min is generous for legitimate clients.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuthModule,
    CatalogueModule,
    PaymentsModule,
    GroupBuyingModule,
    AdminModule,
    CustomerModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
