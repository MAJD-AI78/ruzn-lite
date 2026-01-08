# ═══════════════════════════════════════════════════════════════════════════════
# RUZN-LITE DOCKERFILE
# ═══════════════════════════════════════════════════════════════════════════════
# Multi-stage build for optimized production image
#
# Build:  docker build -t ruzn-lite .
# Run:    docker run -p 3000:3000 --env-file .env ruzn-lite
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# Stage 1: Dependencies
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY patches ./patches

# Install dependencies
RUN pnpm install --frozen-lockfile

# ═══════════════════════════════════════════════════════════════════════════════
# Stage 2: Builder
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN pnpm build

# ═══════════════════════════════════════════════════════════════════════════════
# Stage 3: Production Runner
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS runner

WORKDIR /app

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ruzn

# Install pnpm for production
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy built application
COPY --from=builder --chown=ruzn:nodejs /app/dist ./dist
COPY --from=builder --chown=ruzn:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ruzn:nodejs /app/package.json ./package.json

# Copy knowledge base structure (sources mounted at runtime)
COPY --from=builder --chown=ruzn:nodejs /app/knowledge ./knowledge
COPY --from=builder --chown=ruzn:nodejs /app/server/knowledge/migrations ./server/knowledge/migrations

# Switch to non-root user
USER ruzn

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["node", "dist/server/index.js"]
