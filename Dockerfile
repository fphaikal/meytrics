# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server.js ./
COPY src/server ./src/server

# Create data directory for SQLite
RUN mkdir -p /data

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/public/services || exit 1

# Start server
CMD ["node", "server.js"]
