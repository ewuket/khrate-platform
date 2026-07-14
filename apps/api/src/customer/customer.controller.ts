import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { CustomerService } from './customer.service';
import { CurrentCustomer, CustomerGuard, CustomerPrincipal } from '../auth/customer-auth';

class PaymentRefDto {
  @IsString() @Length(3, 60) providerRef!: string;
}

@Controller('me')
@UseGuards(CustomerGuard)
export class CustomerController {
  constructor(private readonly customer: CustomerService) {}

  @Get('orders')
  orders(@CurrentCustomer() me: CustomerPrincipal) {
    return this.customer.myOrders(me.customerId);
  }

  @Get('orders/:id')
  order(@CurrentCustomer() me: CustomerPrincipal, @Param('id') id: string) {
    return this.customer.myOrder(me.customerId, id);
  }

  @Post('orders/:id/payment-ref')
  submitRef(
    @CurrentCustomer() me: CustomerPrincipal,
    @Param('id') id: string,
    @Body() dto: PaymentRefDto,
  ) {
    return this.customer.submitPaymentRef(me.customerId, id, dto.providerRef);
  }
}
