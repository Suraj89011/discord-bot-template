# ============================================================================
# API Service Dockerfile
# Multi-stage build for production
# ============================================================================

# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files for all required packages
COPY api-service/package*.json ./api-service/
COPY commons/package*.json ./commons/

# Install dependencies
RUN cd commons && npm ci
RUN cd api-service && npm ci

# Copy source
COPY commons/ ./commons/
COPY api-service/ ./api-service/

# Generate Prisma client
RUN cd commons && npx prisma generate

# ============================================================================
# Production dependencies
# ============================================================================
FROM node:20-alpine AS prod-deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY api-service/package*.json ./api-service/
COPY commons/package*.json ./commons/

RUN cd commons && npm ci --only=production
RUN cd api-service && npm ci --only=production

# ============================================================================
# Final production image
# ============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/{{GITHUB_ORG}}/{{APP_NAME}}"
LABEL org.opencontainers.image.description="{{APP_TITLE}} API Service"

RUN apk add --no-cache dumb-init

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy production deps and built files
COPY --from=prod-deps --chown=appuser:nodejs /app/commons ./commons
COPY --from=prod-deps --chown=appuser:nodejs /app/api-service/node_modules ./api-service/node_modules
COPY --from=builder --chown=appuser:nodejs /app/commons/node_modules/.prisma ./commons/node_modules/.prisma
COPY --from=builder --chown=appuser:nodejs /app/api-service/src ./api-service/src
COPY --chown=appuser:nodejs api-service/package.json ./api-service/

WORKDIR /app/api-service

USER appuser

ENV NODE_ENV=production
ENV API_PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/index.js"]