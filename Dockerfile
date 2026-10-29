# syntax=docker/dockerfile:1

# PaisaPilot runs as one Node process with a local SQLite file.
# The database lives on a volume; everything else is baked into the image.

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    DATABASE_PATH=/data/paisapilot.db

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=build /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/lib/invite-code.mjs ./lib/invite-code.mjs

RUN mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# `next start` (not standalone output) keeps the image simple and avoids
# changing build behaviour for local development.
CMD ["npm", "run", "start"]
