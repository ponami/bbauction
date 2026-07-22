FROM node:22-alpine AS builder
WORKDIR /app/bbauction
COPY package*.json ./
RUN npm install --legacy-peer-deps --include=dev
COPY . .
# Bust Next.js build cache
ARG CACHE_BUST=6
RUN echo "Cache bust: $CACHE_BUST" && rm -rf .next/cache
# Ensure Prisma client is generated for the alpine/musl runtime
RUN npx --yes prisma@6.19.2 generate --schema=./prisma/schema.prisma
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

FROM node:22-alpine AS runner
WORKDIR /app/bbauction
ENV NODE_ENV=production
ENV PORT=3000
# standalone 미사용 → 전체 node_modules로 next start (typescript 등 config 로딩 의존성 유지)
COPY --from=builder /app/bbauction/package*.json ./
COPY --from=builder /app/bbauction/node_modules ./node_modules
COPY --from=builder /app/bbauction/.next ./.next
COPY --from=builder /app/bbauction/public ./public
COPY --from=builder /app/bbauction/next.config.ts ./
COPY --from=builder /app/bbauction/prisma ./prisma
EXPOSE 3000
CMD ["npm", "start"]
