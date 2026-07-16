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
  // Production fail-fast: never boot a public instance on unsafe defaults. Catching this at
  // startup beats discovering it in an incident.
  if (process.env.NODE_ENV === 'production') {
    const missing: string[] = [];
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change-me')) {
      missing.push('JWT_SECRET (set a long random value — never the dev default)');
    }
    if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
    if (!process.env.CORS_ORIGINS) missing.push('CORS_ORIGINS (comma-separated allow-list)');
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.error(`FATAL: unsafe production configuration. Missing/invalid: ${missing.join('; ')}`);
      process.exit(1);
    }
  }

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
