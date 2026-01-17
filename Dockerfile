# ============================================================================
# Discord Bot Service Dockerfile
# Multi-stage build for production
# ============================================================================

ARG BASE_IMAGE={{DOCKER_REGISTRY}}/{{APP_NAME}}-base:latest

# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Copy all package files
COPY package*.json ./
COPY commons/package*.json ./commons/

# Install all dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source files
COPY commons/ ./commons/
COPY src/ ./src/
COPY load-env.js ./

# Generate Prisma client
RUN cd commons && npx prisma generate

# ============================================================================
# Production dependencies only
# ============================================================================
FROM node:20-alpine AS prod-deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
COPY commons/package*.json ./commons/

RUN npm ci --only=production && npm cache clean --force

# ============================================================================
# Final production image
# ============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

# Add labels
LABEL org.opencontainers.image.source="https://github.com/{{GITHUB_ORG}}/{{APP_NAME}}"
LABEL org.opencontainers.image.description="{{APP_TITLE}} Discord Bot"

# Install runtime dependencies
RUN apk add --no-cache dumb-init

# Add non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy production dependencies
COPY --from=prod-deps --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/commons ./commons
COPY --from=builder --chown=appuser:nodejs /app/src ./src
COPY --from=builder --chown=appuser:nodejs /app/load-env.js ./
COPY --chown=appuser:nodejs package.json ./

USER appuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/index.js"]