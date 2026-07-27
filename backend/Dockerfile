FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate
# Compile the idempotent Prisma seed script while TypeScript tooling is still
# available in the build image. The runtime image intentionally omits dev tools.
RUN npx tsc prisma/seed.ts --outDir dist-seed --module commonjs --target ES2023 --esModuleInterop --skipLibCheck

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-seed ./dist-seed
COPY prisma ./prisma

RUN mkdir -p /app/data /app/storage \
  && chown -R node:node /app
USER node

EXPOSE 3001
# The seed script uses upserts, so it safely creates demo accounts on first
# startup and refreshes their credentials on subsequent local restarts.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist-seed/seed.js && node dist/src/main.js"]
