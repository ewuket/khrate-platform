# KHRATE API — reproducible production image (multi-stage, small runtime, non-root).
# Built STANDALONE from apps/api (the API has no workspace-package deps), so the image
# installs ~13 runtime deps instead of the whole monorepo — reproducible via the committed
# apps/api/package-lock.json and light enough not to OOM the Docker builder.
#
# Build from the REPO ROOT (context = repo) so .dockerignore applies:
#   docker build -f apps/api/Dockerfile -t khrate-api .

# ---- build stage -----------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
# Exact, reproducible install from the API-scoped lockfile.
COPY apps/api/package.json apps/api/package-lock.json ./
# Resilient, low-footprint install: retry flaky registries, cap concurrency (--maxsockets)
# to stay within constrained builder memory, and reuse a BuildKit cache mount. Reproducible
# — driven by the committed lockfile.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --maxsockets=3 \
      --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-timeout=600000
COPY apps/api/ ./
# Use the locally-installed binaries directly (not `npx`, which can hit the registry even
# when the tool is present). Keep the full node_modules: the runtime CMD runs
# `prisma migrate deploy`, which needs the prisma CLI (a devDependency).
RUN ./node_modules/.bin/prisma generate && ./node_modules/.bin/nest build

# ---- runtime stage ---------------------------------------------------------
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
# Non-root: the API never needs root.
RUN addgroup -S khrate && adduser -S khrate -G khrate
# Runtime-only deps + generated Prisma client + compiled output + migrations.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
USER khrate
EXPOSE 3001
# Apply committed migrations, then start. `migrate deploy` never generates migrations, so
# releases are deterministic.
CMD ./node_modules/.bin/prisma migrate deploy && node dist/main.js

# Container healthcheck hits the DB-aware health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/v1/health || exit 1
