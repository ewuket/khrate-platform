import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

/** The signed-in customer, extracted from the customer JWT (sub = customerId). */
export interface CustomerPrincipal {
  customerId: string;
  phone: string;
}

export const CurrentCustomer = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CustomerPrincipal =>
    ctx.switchToHttp().getRequest().customer as CustomerPrincipal,
);

/** Guards customer-only routes. Rejects staff tokens (kind === 'staff'). */
@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { customer?: CustomerPrincipal }>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Sign in to continue');

    let payload: { sub: string; phone: string; kind?: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Session expired — please sign in again');
    }
    if (payload.kind === 'staff') throw new UnauthorizedException('Staff token not valid here');

    req.customer = { customerId: payload.sub, phone: payload.phone };
    return true;
  }
}
