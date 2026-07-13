import { Body, Controller, Post } from '@nestjs/common';
import { IsString, Matches, Length } from 'class-validator';
import { AuthService } from './auth.service';

class RequestOtpDto {
  @IsString() @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Invalid phone number' })
  phone!: string;
}

class VerifyOtpDto {
  @IsString() @Matches(/^\+?[1-9]\d{6,14}$/) phone!: string;
  @IsString() @Length(6, 6) code!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  request(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Post('otp/verify')
  verify(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code);
  }
}
