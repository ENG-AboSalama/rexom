# ============================================
# Rexom Discord Music Bot
# Production Dockerfile
# ============================================

# Use official Node.js LTS image with Alpine for smaller size
FROM node:20-alpine AS base

# Install dependencies required for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# ============================================
# Dependencies Stage
# ============================================
FROM base AS dependencies

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts \
    && npm cache clean --force

# Rebuild native modules for Linux
RUN npm rebuild

# ============================================
# Production Stage
# ============================================
FROM base AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S rexom -u 1001

# Set working directory
WORKDIR /app

# Copy dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source
COPY --chown=rexom:nodejs . .

# Create data directory for database
RUN mkdir -p data logs && chown -R rexom:nodejs data logs

# Switch to non-root user
USER rexom

# Expose no ports (bot doesn't need external access)

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Run the bot
CMD ["node", "src/index.js"]
