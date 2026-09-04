# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci

# Copy source code
COPY apps/web ./apps/web

# Build application
WORKDIR /app/apps/web
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY --from=builder /app/apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
