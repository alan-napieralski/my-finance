# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built output (owned by non-root user)
COPY --from=build --chown=node:node /app/.output ./.output

# Run as non-root for security hardening
USER node

# Nuxt/Nitro runtime expects these by default; can be overridden in compose
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
