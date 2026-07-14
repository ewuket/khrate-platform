import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

/**
 * Staff RBAC (least privilege — docs/operations/10). A staff JWT carries `role`; the
 * guard checks it against the roles a route requires. ADMIN passes everywhere.
 */

export interface StaffPrincipal {
  staffId: string;
  email: string;
  role: string;
}

export const ROLES_KEY = 'khrate:roles';
/** Restrict a route to these staff roles (ADMIN always allowed). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** Injects the authenticated staff principal into a handler parameter. */
export const Staff = createParamDecorator((_: unknown, ctx: ExecutionContext): StaffPrincipal => {
  return ctx.switchToHttp().getRequest().staff as StaffPrincipal;
});

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { staff?: StaffPrincipal }>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Staff token required');

    let payload: { sub: string; email: string; role: string; kind?: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (payload.kind !== 'staff') throw new UnauthorizedException('Not a staff token');

    req.staff = { staffId: payload.sub, email: payload.email, role: payload.role };

    const required = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required && required.length > 0) {
      if (payload.role !== 'ADMIN' && !required.includes(payload.role)) {
        throw new ForbiddenException(`Requires role: ${required.join(' or ')}`);
      }
    }
    return true;
  }
}
