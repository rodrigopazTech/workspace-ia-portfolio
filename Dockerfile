# Multi-stage production build for Workspace Copilot
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* bun.lock* ./
RUN npm ci || npm install

# Copy source and build static bundle
COPY . .
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules and built dist + server
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src/server ./src/server

# Expose port
EXPOSE 3000

# Start server with tsx
CMD ["npx", "tsx", "server.ts"]
