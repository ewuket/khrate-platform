import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AdminService } from './admin.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../common/timeline.service';
import { Roles, Staff, StaffGuard, StaffPrincipal } from '../staff/staff-auth';
import { FULFILMENT_MODES } from '../pricing/fulfilment';

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

class DealLineDto {
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() bundleId?: string;
  @IsInt() @Min(0) groupPrice!: number;
  @IsInt() @Min(0) soloPrice!: number;
}

class DealFulfilmentDto {
  @IsIn(FULFILMENT_MODES) mode!: string;
  @IsOptional() @IsString() locationId?: string;
}

class CreateDealDto {
  @IsString() title!: string;
  @IsString() zoneId!: string;
  @IsDateString() cutoffAt!: string;
  @IsOptional() @IsInt() @Min(1) minUnits?: number;
  @IsOptional() @IsInt() @Min(1) minValue?: number;
  @IsArray() @ArrayNotEmpty() @ValidateNested({ each: true }) @Type(() => DealLineDto)
  lines!: DealLineDto[];
  @IsArray() @ArrayNotEmpty() @ValidateNested({ each: true }) @Type(() => DealFulfilmentDto)
  fulfilment!: DealFulfilmentDto[];
}

class FulfilmentRecordDto {
  @IsOptional() @IsInt() @Min(0) fulfilledQuantity?: number;
  @IsOptional() @IsString() substitutionNote?: string;
}

class ProductDto {
  @IsString() name!: string;
  @IsString() category!: string;
  @IsOptional() @IsString() description?: string;
  @IsIn(['EACH', 'KG', 'BUNCH', 'PACK']) saleUnit!: string;
  @IsOptional() @IsBoolean() isFresh?: boolean;
  @IsOptional() @IsInt() nominalGrams?: number;
}

class PolicyDto {
  @IsString() value!: string;
  @IsOptional() @IsString() description?: string;
}

// ---------------------------------------------------------------------------
// Deal board & procurement — GROUP_COORDINATOR
// ---------------------------------------------------------------------------

@Controller('admin/deals')
@UseGuards(StaffGuard)
@Roles('GROUP_COORDINATOR')
export class AdminDealsController {
  constructor(private readonly admin: AdminService) {}

  @Get('board')
  // Packers and delivery staff need read visibility of live deals to do their jobs.
  @Roles('GROUP_COORDINATOR', 'ORDER_OPS', 'DELIVERY_COORDINATOR')
  board() {
    return this.admin.dealBoard();
  }

  @Post()
  create(@Body() dto: CreateDealDto, @Staff() staff: StaffPrincipal) {
    return this.admin.createDeal({
      ...dto,
      cutoffAt: new Date(dto.cutoffAt),
      actor: staff.staffId,
    });
  }

  @Get(':id/procurement')
  procurement(@Param('id') id: string) {
    return this.admin.procurementList(id);
  }
}

// ---------------------------------------------------------------------------
// Payment verification — PAYMENT_REVIEWER
// ---------------------------------------------------------------------------

@Controller('admin/payments')
@UseGuards(StaffGuard)
@Roles('PAYMENT_REVIEWER')
export class AdminPaymentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  /** The verification queue: manual MoMo payments awaiting a human check. */
  @Get('pending')
  pending() {
    return this.prisma.payment.findMany({
      where: { state: 'PENDING' },
      include: {
        order: {
          include: {
            customer: { select: { name: true, phone: true } },
            deal: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post(':orderId/verify')
  verify(@Param('orderId') orderId: string, @Staff() staff: StaffPrincipal) {
    return this.payments.verify(orderId, staff.staffId);
  }
}

// ---------------------------------------------------------------------------
// Packing queue — ORDER_OPS
// ---------------------------------------------------------------------------

@Controller('admin/orders')
@UseGuards(StaffGuard)
@Roles('ORDER_OPS')
export class AdminOrdersController {
  constructor(private readonly admin: AdminService) {}

  @Get('packing')
  packing(@Query('dealId') dealId: string) {
    return this.admin.packingQueue(dealId);
  }

  @Patch('items/:itemId/fulfilment')
  fulfilment(
    @Param('itemId') itemId: string,
    @Body() dto: FulfilmentRecordDto,
    @Staff() staff: StaffPrincipal,
  ) {
    return this.admin.recordFulfilment(itemId, dto, staff.staffId);
  }

  @Post(':orderId/state/:state')
  state(
    @Param('orderId') orderId: string,
    @Param('state') state: string,
    @Staff() staff: StaffPrincipal,
  ) {
    if (state !== 'PREPARING' && state !== 'READY') {
      throw new Error('Only PREPARING/READY via this endpoint');
    }
    return this.admin.setOrderState(orderId, state, staff.staffId);
  }
}

// ---------------------------------------------------------------------------
// Deliveries — DELIVERY_COORDINATOR (+ DRIVER read/confirm)
// ---------------------------------------------------------------------------

class ScheduleDeliveryDto {
  @IsString() orderId!: string;
  @IsOptional() @IsString() driverId?: string;
  @IsOptional() @IsDateString() scheduledFor?: string;
}

@Controller('admin/deliveries')
@UseGuards(StaffGuard)
export class AdminDeliveriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  @Get()
  @Roles('DELIVERY_COORDINATOR', 'DRIVER')
  list(@Staff() staff: StaffPrincipal) {
    // Drivers see only their own assignments; coordinators see everything.
    const where = staff.role === 'DRIVER' ? { driverId: staff.staffId } : {};
    return this.prisma.delivery.findMany({
      where,
      include: {
        order: {
          include: {
            location: true,
            address: true,
            customer: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  @Post('schedule')
  @Roles('DELIVERY_COORDINATOR')
  async schedule(@Body() dto: ScheduleDeliveryDto, @Staff() staff: StaffPrincipal) {
    const delivery = await this.prisma.delivery.upsert({
      where: { orderId: dto.orderId },
      create: {
        orderId: dto.orderId,
        driverId: dto.driverId,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
      },
      update: {
        driverId: dto.driverId,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      },
    });
    await this.timeline.record({ type: 'DELIVERY_SCHEDULED', orderId: dto.orderId, actor: staff.staffId });
    return delivery;
  }

  @Post(':orderId/state/:state')
  @Roles('DELIVERY_COORDINATOR', 'DRIVER')
  async setState(
    @Param('orderId') orderId: string,
    @Param('state') state: string,
    @Staff() staff: StaffPrincipal,
  ) {
    const allowed = ['PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COLLECTED', 'FAILED'];
    if (!allowed.includes(state)) throw new Error(`State must be one of ${allowed.join(', ')}`);
    const delivery = await this.prisma.delivery.update({
      where: { orderId },
      data: {
        state: state as never,
        confirmedAt: state === 'COLLECTED' || state === 'DELIVERED' ? new Date() : undefined,
        confirmedBy: state === 'COLLECTED' || state === 'DELIVERED' ? staff.staffId : undefined,
      },
    });
    // Keep the order's customer-facing state in step with the physical world.
    if (state === 'DELIVERED' || state === 'COLLECTED') {
      await this.prisma.order.update({ where: { id: orderId }, data: { state: state as never } });
    }
    await this.timeline.record({ type: `DELIVERY_${state}`, orderId, actor: staff.staffId });
    return delivery;
  }
}

// ---------------------------------------------------------------------------
// Catalogue & configuration — CATALOGUE_MANAGER (policies/pricing: ADMIN)
// ---------------------------------------------------------------------------

@Controller('admin/catalogue')
@UseGuards(StaffGuard)
@Roles('CATALOGUE_MANAGER')
export class AdminCatalogueController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('products')
  products() {
    return this.prisma.product.findMany({ orderBy: { name: 'asc' } });
  }

  @Post('products')
  createProduct(@Body() dto: ProductDto) {
    return this.prisma.product.create({ data: dto as never });
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: Partial<ProductDto> & { isActive?: boolean }) {
    return this.prisma.product.update({ where: { id }, data: dto as never });
  }

  @Get('bundles')
  bundles() {
    return this.prisma.bundle.findMany({ include: { items: { include: { product: true } } } });
  }
}

@Controller('admin/config')
@UseGuards(StaffGuard)
@Roles('ADMIN')
export class AdminConfigController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  @Get('policies')
  policies() {
    return this.prisma.policy.findMany();
  }

  @Post('policies/:key')
  async setPolicy(@Param('key') key: string, @Body() dto: PolicyDto, @Staff() staff: StaffPrincipal) {
    const policy = await this.prisma.policy.upsert({
      where: { key },
      create: { key, value: dto.value, description: dto.description },
      update: { value: dto.value, description: dto.description },
    });
    await this.timeline.record({ type: 'POLICY_CHANGED', actor: staff.staffId, data: { key, value: dto.value } });
    return policy;
  }

  @Get('pricing-rules')
  pricingRules() {
    return this.prisma.pricingRule.findMany({ orderBy: { priority: 'asc' } });
  }
}

// ---------------------------------------------------------------------------
// Reports — ADMIN / FINANCE
// ---------------------------------------------------------------------------

@Controller('admin/reports')
@UseGuards(StaffGuard)
@Roles('FINANCE')
export class AdminReportsController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  report() {
    return this.admin.report();
  }
}
