# syntax=docker/dockerfile:1.7
# FleetPilot — SaaS Docker image

ARG NODE_VERSION=26-alpine

# ---- Stage 1: builder ---------------------------------------------------
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
RUN npm ci --no-audit --no-fund

COPY tsconfig.json rollup.config.mjs ./
COPY src ./src
COPY frontend ./frontend

RUN npm run build
RUN npm run build -w @fleetpilot/web

# ---- Stage 2: runtime ---------------------------------------------------
FROM node:${NODE_VERSION} AS runtime

LABEL org.opencontainers.image.title="fleetpilot" \
      org.opencontainers.image.description="FleetPilot — Route optimization SaaS" \
      org.opencontainers.image.source="https://github.com/sachncs/fleetpilot" \
      org.opencontainers.image.licenses="ISC"

ENV NODE_OPTIONS="--max-old-space-size=1024" \
    UV_THREADPOOL_SIZE=8 \
    NODE_ENV=production \
    DATABASE_URL=file:/app/data/fleetpilot.db

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend ./frontend

RUN mkdir -p /app/data && chown -R node:node /app/data /app/frontend

EXPOSE 3000

USER node

CMD ["node", "--import", "tsx/esm", "frontend/server.ts"]
