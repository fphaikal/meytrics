# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Install dependencies (including devDeps for prisma CLI)
RUN apk add --no-cache openssl
RUN npm install --legacy-peer-deps

# Generate Prisma Client
ENV DATABASE_URL="file:./meytrics.db"
RUN npx prisma generate

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package.json ./
RUN apk add --no-cache openssl
RUN npm install --omit=dev --legacy-peer-deps

# Copy generated Prisma Client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server.js ./
COPY src/server ./src/server
# Copy prisma directory (useful for migrations if we add a migrate script later)
COPY prisma ./prisma

# Create data directory for SQLite
RUN mkdir -p /data

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data
ENV DATABASE_URL="file:/data/meytrics.db"
# We now set default DATABASE_URL so 'prisma db push' works in the CMD.
# db.js will also use this if not overridden.

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/public/services || exit 1

# Start server (ensure DB schema is aligned first)
CMD npx prisma db push && node server.js
