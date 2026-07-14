import { Body, Controller, Get, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { verifyPassword } from './passwords';
import { Staff, StaffGuard, StaffPrincipal } from './staff-auth';

class StaffLoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}

@Controller('staff')
export class StaffController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Post('login')
  async login(@Body() dto: StaffLoginDto) {
    const user = await this.prisma.staffUser.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive || !verifyPassword(dto.password, user.passwordHash)) {
      // One message for both cases: don't leak which emails exist.
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, kind: 'staff' },
      { expiresIn: '12h' }, // staff sessions are short-lived, unlike customer sessions
    );
    return { token, staff: { id: user.id, name: user.name, email: user.email, role: user.role } };
  }

  @Get('me')
  @UseGuards(StaffGuard)
  me(@Staff() staff: StaffPrincipal) {
    return staff;
  }
}
