import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { CustomerGuard } from '../auth/customer-auth';
import { TimelineService } from '../common/timeline.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'khrate-dev-secret-change-me',
      }),
    }),
  ],
  controllers: [CustomerController],
  providers: [CustomerService, CustomerGuard, TimelineService],
})
export class CustomerModule {}
