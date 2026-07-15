import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Phone + OTP identity (ADR-0004). The OTP is delivered by SMS/WhatsApp in production
 * via a pluggable messaging provider; NONE is connected here. In non-production the code
 * is returned in the response so the flow is testable without a provider.
 */
@Injectable()
export class AuthService {
  private readonly otpTtlMs = 5 * 60_000;
  private readonly maxAttempts = 5;
  // Abuse controls (DB-backed so they survive restarts and hold across instances):
  private readonly resendCooldownMs = 30_000; // min gap between OTP sends to one number
  private readonly maxSendsPerWindow = 4; // cap sends per number
  private readonly sendWindowMs = 15 * 60_000; // ...within this window

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /** Start login: ensure a customer exists for this phone, issue an OTP challenge. */
  async requestOtp(phone: string): Promise<{ sent: true; devCode?: string }> {
    if (!/^\+?[1-9]\d{6,14}$/.test(phone)) throw new BadRequestException('Invalid phone number');

    const customer = await this.prisma.customer.upsert({
      where: { phone },
      create: { phone },
      update: {},
    });

    // Throttle: protect against SMS-bombing a victim's number and enumeration/cost abuse.
    const recent = await this.prisma.otpChallenge.findMany({
      where: { customerId: customer.id, createdAt: { gt: new Date(Date.now() - this.sendWindowMs) } },
      orderBy: { createdAt: 'desc' },
      take: this.maxSendsPerWindow,
    });
    if (recent.length > 0 && Date.now() - recent[0].createdAt.getTime() < this.resendCooldownMs) {
      throw new BadRequestException('Please wait a moment before requesting another code.');
    }
    if (recent.length >= this.maxSendsPerWindow) {
      throw new BadRequestException('Too many code requests. Please try again in a little while.');
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.otpChallenge.create({
      data: {
        customerId: customer.id,
        codeHash: this.hash(code),
        expiresAt: new Date(Date.now() + this.otpTtlMs),
      },
    });

    // TODO(provider): send `code` via SMS/WhatsApp. Not connected — see roadmap.
    const isProd = this.config.get('NODE_ENV') === 'production';
    return isProd ? { sent: true } : { sent: true, devCode: code };
  }

  /** Complete login: verify the latest unconsumed OTP, return a JWT session. */
  async verifyOtp(phone: string, code: string): Promise<{ token: string; customerId: string }> {
    const customer = await this.prisma.customer.findUnique({ where: { phone } });
    if (!customer) throw new UnauthorizedException('Request an OTP first');

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { customerId: customer.id, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) throw new UnauthorizedException('No valid OTP; request a new one');
    if (challenge.attempts >= this.maxAttempts) throw new UnauthorizedException('Too many attempts');

    if (challenge.codeHash !== this.hash(code)) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Incorrect code');
    }

    await this.prisma.$transaction([
      this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
      this.prisma.customer.update({ where: { id: customer.id }, data: { phoneVerified: true } }),
    ]);

    const token = await this.jwt.signAsync({ sub: customer.id, phone: customer.phone });
    return { token, customerId: customer.id };
  }
}
