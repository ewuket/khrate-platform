import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { GroupBuyingService } from './group-buying.service';
import { JoinDealDto } from './dto';
import { FulfilmentMode } from '../pricing/fulfilment';
import { CurrentCustomer, CustomerGuard, CustomerPrincipal } from '../auth/customer-auth';

/** Customer-facing group-buying endpoints. */
@Controller('deals')
export class GroupBuyingController {
  constructor(private readonly groupBuying: GroupBuyingService) {}

  /** Honest live progress toward tipping. Public — anyone can see a deal fill up. */
  @Get(':id/progress')
  progress(@Param('id') id: string) {
    return this.groupBuying.progress(id);
  }

  /** Join a deal (place a group order). Uses the authenticated customer — never a body id. */
  @Post(':id/join')
  @UseGuards(CustomerGuard)
  join(
    @Param('id') id: string,
    @Body() dto: JoinDealDto,
    @CurrentCustomer() me: CustomerPrincipal,
    // Idempotency-Key lets a retried request (dropped mobile connection) resolve to the
    // same order rather than a duplicate. Optional; the mobile app always sends one.
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.groupBuying.join({
      dealId: id,
      customerId: me.customerId,
      lines: dto.lines,
      fulfilmentMode: dto.fulfilmentMode as FulfilmentMode,
      fulfilmentOptionId: dto.fulfilmentOptionId,
      locationId: dto.locationId,
      addressId: dto.addressId,
      paymentRef: dto.paymentRef,
      idempotencyKey: idempotencyKey || undefined,
    });
  }

  /** Manual trigger of the cut-off decision (also runs automatically via the scheduler). */
  @Post(':id/process-cutoff')
  processCutoff(@Param('id') id: string) {
    return this.groupBuying.processCutoff(id);
  }
}
