import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * KHRATE API bootstrap. Global prefix /api/v1 (the frozen V1 surface the mobile & web
 * clients consume). Whitelisting validation so every input is a validated DTO.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  // Security headers (HSTS, no-sniff, frameguard, etc.). It's a JSON API, so we don't need
  // the CSP that's mainly for HTML responses.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // CORS: locked down by config in production, permissive for local dev. Set
  // CORS_ORIGINS to a comma-separated allow-list (e.g. the web app + admin origins).
  const origins = process.env.CORS_ORIGINS;
  app.enableCors(origins ? { origin: origins.split(',').map((o) => o.trim()) } : {});

  // BigInt is not JSON-serialisable by default; emit money (minor units) as a number string safely.
  (BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
    return this.toString();
  };

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  new Logger('Bootstrap').log(`KHRATE API on http://localhost:${port}/api/v1`);
}

void bootstrap();
