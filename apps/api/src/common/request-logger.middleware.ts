import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

/**
 * Structured request logging for operations. One line per request as JSON in production
 * (machine-parsable for any log collector later), human-readable in dev. Never logs bodies
 * — request bodies can contain phone numbers and payment references (privacy).
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  private readonly json = process.env.NODE_ENV === 'production';

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    res.on('finish', () => {
      const entry = {
        method: req.method,
        path: req.originalUrl.split('?')[0], // strip query — may carry identifiers
        status: res.statusCode,
        ms: Date.now() - start,
        ip: req.ip,
      };
      const line = this.json
        ? JSON.stringify(entry)
        : `${entry.method} ${entry.path} ${entry.status} ${entry.ms}ms`;
      if (res.statusCode >= 500) this.logger.error(line);
      else if (res.statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });
    next();
  }
}
