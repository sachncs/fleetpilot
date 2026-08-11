# syntax=docker/dockerfile:1.7
# Multi-stage build for vehicle-routing.
# Stage 1: build the dist bundle.
# Stage 2: minimal runtime image with the bundle + CLI.

ARG NODE_VERSION=20.20.0-alpine

# ---- Stage 1: builder ---------------------------------------------------
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

# Install full deps for build (rollup, typescript, etc).
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build.
COPY tsconfig.json rollup.config.mjs eslint.config.mjs ./
COPY src ./src
COPY tests ./tests
COPY scripts ./scripts
COPY samples ./samples

# Build dist (also runs prebuild:check-samples).
RUN npm run build

# ---- Stage 2: runtime ---------------------------------------------------
FROM node:${NODE_VERSION} AS runtime

LABEL org.opencontainers.image.title="vehicle-routing" \
      org.opencontainers.image.description="VRP-RPD solver for Indian logistics" \
      org.opencontainers.image.source="https://github.com/sachncs/vehicle-routing-problem-with-resource-constraints" \
      org.opencontainers.image.licenses="ISC"

# Sensible heap ceiling for the paper-default config.
ENV NODE_OPTIONS="--max-old-space-size=1024" \
    UV_THREADPOOL_SIZE=8

WORKDIR /app

# Copy only what we need to run: the bundle, CLI, samples, and package.json.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/samples ./samples

# Drop privileges to the unprivileged node user (already present in the base image).
USER node

# Default command: solve the bundled delhi-10 sample. Override with `docker run ... <args>`.
ENTRYPOINT ["node", "dist/cli.mjs"]
CMD ["--problem", "samples/delhi-10.json", "--max-time", "30000", "--seed", "1"]
