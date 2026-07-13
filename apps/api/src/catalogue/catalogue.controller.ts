import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogueService } from './catalogue.service';

@Controller()
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get('zones/:zoneId/deals')
  deals(@Param('zoneId') zoneId: string) {
    return this.catalogue.openDealsForZone(zoneId);
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
