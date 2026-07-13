import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GroupBuyingService } from './group-buying.service';
import { JoinDealDto } from './dto';
import { FulfilmentMode } from '../pricing/fulfilment';

/** Customer-facing group-buying endpoints. Auth guard added with the auth module. */
@Controller('deals')
export class GroupBuyingController {
  constructor(private readonly groupBuying: GroupBuyingService) {}

  /** Honest live progress toward tipping. */
  @Get(':id/progress')
  progress(@Param('id') id: string) {
    return this.groupBuying.progress(id);
  }

  /** Join a deal (place a group order). */
  @Post(':id/join')
  join(@Param('id') id: string, @Body() dto: JoinDealDto) {
    return this.groupBuying.join({
      dealId: id,
      customerId: dto.customerId,
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
