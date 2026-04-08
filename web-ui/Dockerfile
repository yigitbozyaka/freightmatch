FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml ./
COPY web-ui/package.json ./web-ui/

# Install dependencies for web-ui
RUN pnpm install --filter web-ui...

# Copy source code and build
COPY web-ui ./web-ui
RUN pnpm --filter web-ui run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/web-ui/dist /usr/share/nginx/html
COPY web-ui/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
