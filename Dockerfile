# Multi-stage Docker build for Pixel Dominion
# Optimized for production deployment with minimal image size

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies to reduce size
RUN npm ci --production --frozen-lockfile

# Production stage
FROM node:20-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S pixeldominion -u 1001

# Set working directory
WORKDIR /app

# Copy built application and production dependencies
COPY --from=builder --chown=pixeldominion:nodejs /app/build build/
COPY --from=builder --chown=pixeldominion:nodejs /app/node_modules node_modules/
COPY --from=builder --chown=pixeldominion:nodejs /app/package.json .
COPY --from=builder --chown=pixeldominion:nodejs /app/static static/

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Switch to non-root user
USER pixeldominion

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the application
CMD ["node", "build"]

# Metadata
LABEL maintainer="Pixel Dominion Team"
LABEL description="Real-time pixel-based RTS game"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/pixel-dominion/game"
LABEL org.opencontainers.image.description="Pixel Dominion - Real-time pixel-based RTS"
LABEL org.opencontainers.image.licenses="MIT"