import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { FULFILMENT_MODES } from '../pricing/fulfilment';

export class JoinLineDto {
  @IsString() dealLineId!: string;
  @IsInt() @Min(1) quantity!: number;
}

export class JoinDealDto {
  @IsString() customerId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => JoinLineDto)
  lines!: JoinLineDto[];

  @IsIn(FULFILMENT_MODES) fulfilmentMode!: string;

  @IsOptional() @IsString() fulfilmentOptionId?: string;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() addressId?: string;
  @IsOptional() @IsString() paymentRef?: string;
}
