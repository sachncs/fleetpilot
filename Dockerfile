# syntax=docker/dockerfile:1.7
# FleetPilot — SaaS Docker image
# Stage 1: build the library + web app.
# Stage 2: runtime image with everything.

ARG NODE_VERSION=20.20.0-alpine

# ---- Stage 1: builder ---------------------------------------------------
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/vrp-web/package.json apps/vrp-web/
RUN npm ci --no-audit --no-fund

COPY tsconfig.json rollup.config.mjs eslint.config.mjs ./
COPY src ./src
COPY samples ./samples
COPY apps/vrp-web ./apps/vrp-web

RUN npm run build
RUN npm run build -w vrp-web

# ---- Stage 2: runtime ---------------------------------------------------
FROM node:${NODE_VERSION} AS runtime

LABEL org.opencontainers.image.title="fleetpilot" \
      org.opencontainers.image.description="FleetPilot — Route optimization SaaS" \
      org.opencontainers.image.source="https://github.com/sachncs/vehicle-routing-problem-with-resource-constraints" \
      org.opencontainers.image.licenses="ISC"

ENV NODE_OPTIONS="--max-old-space-size=1024" \
    UV_THREADPOOL_SIZE=8 \
    NODE_ENV=production \
    DATABASE_URL=file:/app/data/fleetpilot.db

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/samples ./samples
COPY --from=builder /app/apps/vrp-web/.next/standalone ./
COPY --from=builder /app/apps/vrp-web/.next/static ./apps/vrp-web/.next/static
COPY --from=builder /app/apps/vrp-web/public ./apps/vrp-web/public
COPY --from=builder /app/apps/vrp-web/server.ts ./apps/vrp-web/server.ts
COPY --from=builder /app/apps/vrp-web/lib ./apps/vrp-web/lib
COPY --from=builder /app/apps/vrp-web/next.config.mjs ./apps/vrp-web/next.config.mjs
COPY --from=builder /app/apps/vrp-web/tsconfig.json ./apps/vrp-web/tsconfig.json

RUN mkdir -p /app/data

EXPOSE 3000

USER node

CMD ["node", "apps/vrp-web/server.ts"]
