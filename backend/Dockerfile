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
# The runtime only needs application dependencies. Prisma is deliberately a
# production dependency because startup executes `prisma migrate deploy`; omitting all
# other dev tooling removes the Nest CLI, Jest, TypeScript and test stack from
# the published image.
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Set ownership as files enter the runtime stage. A final `chown -R /app`
# duplicates every installed dependency in a separate image layer.
COPY --chown=node:node --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/dist-seed ./dist-seed
COPY --chown=node:node prisma ./prisma

RUN mkdir -p /app/data /app/storage \
  && chown node:node /app/data /app/storage
USER node

EXPOSE 3001
# The seed script uses upserts, so it safely creates demo accounts on first
# startup and refreshes their credentials on subsequent local restarts.
# Use migrate deploy in production to apply versioned migrations.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist-seed/seed.js && node dist/src/main.js"]
