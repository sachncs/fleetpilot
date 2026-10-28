# syntax=docker/dockerfile:1.7
# FleetPilot — SaaS Docker image

ARG NODE_VERSION=26-alpine

# ---- Stage 1: builder ---------------------------------------------------
FROM node:${NODE_VERSION} AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY scripts ./scripts
RUN npm ci --no-audit --no-fund

COPY tsconfig.json rollup.config.mjs ./
COPY src ./src
COPY frontend ./frontend

RUN npm run build
RUN npm run build -w @fleetpilot/web
RUN npx esbuild frontend/server.ts \
      --bundle \
      --platform=node \
      --format=esm \
      --target=node26 \
      --external:next \
      --external:next/* \
      --external:better-sqlite3 \
      --external:ws \
      --outfile=custom-server.mjs \
    && npx esbuild frontend/lib/worker/process.ts \
      --bundle \
      --platform=node \
      --format=esm \
      --target=node26 \
      --external:better-sqlite3 \
      --outfile=worker.mjs \
    && node scripts/trace-container-runtime.mjs \
    && rm -rf runtime/data

# ---- Stage 2: runtime ---------------------------------------------------
FROM node:${NODE_VERSION} AS runtime

LABEL org.opencontainers.image.title="fleetpilot" \
      org.opencontainers.image.description="FleetPilot — Route optimization SaaS" \
      org.opencontainers.image.source="https://github.com/sachncs/fleetpilot" \
      org.opencontainers.image.licenses="ISC"

ENV NODE_OPTIONS="--max-old-space-size=1024" \
    UV_THREADPOOL_SIZE=8 \
    NODE_ENV=production \
    DATABASE_URL=file:/app/data/fleetpilot.db \
    FLEETPILOT_DATA_DIR=/app/data \
    FLEETPILOT_APP_DIR=/app/frontend \
    FLEETPILOT_WORKER_PATH=/app/worker.mjs

WORKDIR /app

COPY --from=builder /app/runtime ./
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public

RUN mkdir -p /app/data && chown -R node:node /app/data

EXPOSE 3000

USER node

CMD ["node", "custom-server.mjs"]
