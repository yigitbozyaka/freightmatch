FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/load-service/package.json services/load-service/
COPY services/user-service/package.json services/user-service/
COPY services/bidding-service/package.json services/bidding-service/
COPY services/matching-service/package.json services/matching-service/
COPY shared/contracts/package.json shared/contracts/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY services/load-service/tsconfig.json services/load-service/
COPY services/load-service/src services/load-service/src
COPY shared/contracts shared/contracts
RUN pnpm --filter @freightmatch/contracts build
RUN pnpm --filter @freightmatch/load-service build

FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/load-service/package.json services/load-service/
COPY services/user-service/package.json services/user-service/
COPY services/bidding-service/package.json services/bidding-service/
COPY services/matching-service/package.json services/matching-service/
COPY shared/contracts/package.json shared/contracts/
RUN pnpm install --frozen-lockfile --prod
WORKDIR /app/services/load-service
COPY --from=builder /app/services/load-service/dist ./dist
EXPOSE 3002
CMD ["node", "dist/index.js"]
