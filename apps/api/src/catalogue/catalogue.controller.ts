import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogueService } from './catalogue.service';

@Controller()
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  /** Served areas + their drop points — powers the customer's location picker. */
  @Get('zones')
  zones() {
    return this.catalogue.listZones();
  }

  @Get('zones/:zoneId/deals')
  deals(@Param('zoneId') zoneId: string) {
    return this.catalogue.openDealsForZone(zoneId);
  }

  @Get('deals/:id')
  deal(@Param('id') id: string) {
    return this.catalogue.dealDetail(id);
  }

  @Get('products')
  products() {
    return this.catalogue.listProducts();
  }

  @Get('bundles')
  bundles() {
    return this.catalogue.listBundles();
  }
}
