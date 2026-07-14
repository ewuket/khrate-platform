import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
  join(@Param('id') id: string, @Body() dto: JoinDealDto, @CurrentCustomer() me: CustomerPrincipal) {
    return this.groupBuying.join({
      dealId: id,
      customerId: me.customerId,
      lines: dto.lines,
      fulfilmentMode: dto.fulfilmentMode as FulfilmentMode,
      fulfilmentOptionId: dto.fulfilmentOptionId,
      locationId: dto.locationId,
      addressId: dto.addressId,
      paymentRef: dto.paymentRef,
    });
  }

  /** Manual trigger of the cut-off decision (also runs automatically via the scheduler). */
  @Post(':id/process-cutoff')
  processCutoff(@Param('id') id: string) {
    return this.groupBuying.processCutoff(id);
  }
}
