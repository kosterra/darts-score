# syntax=docker/dockerfile:1

# The base image, pinned by digest so every build — and every Snyk/scanner pass —
# uses the exact same, known-current Node, not whatever a floating tag happens to
# resolve to. This is node:24.22.2-slim (Debian) as of 2026-10-30. Bump it (tag +
# digest together) when a High/Critical advisory hits the Node binary or the Debian
# base; the dependency-management skill says how and when to check. `docker buildx
# imagetools inspect node:24-slim` prints the current digest.
ARG NODE_IMAGE=node:24.22.2-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c

# ---------------------------------------------------------------------------
# Stage 1 – UI Builder: install deps and compile the Vite bundle
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS ui-builder

RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /ui

COPY app-ui/package.json app-ui/package-lock.json ./
RUN npm ci --no-audit --no-fund --loglevel warn

COPY app-ui/ ./
# the version shown in the app comes from the root package.json (read as ../package.json)
COPY package.json /package.json
# true only for the release build of main (.github/workflows/release.yml): otherwise
# the changes of this version are shown as coming soon
ARG APP_RELEASED=false
ENV APP_RELEASED=$APP_RELEASED
RUN npm run build


# ---------------------------------------------------------------------------
# Stage 2 – API Builder: install deps and compile the esbuild bundle
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS builder

RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY app-api/package.json app-api/package-lock.json ./
RUN npm ci --no-audit --no-fund --loglevel warn

COPY app-api/ ./
RUN npm run build


# ---------------------------------------------------------------------------
# Stage 3 – UI Development: Vite HMR dev server
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS ui-development

RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /ui

# Vite writes its dep cache to node_modules/.vite, so everything must be owned by node
RUN chown node:node /ui
USER node

COPY --chown=node:node app-ui/package.json app-ui/package-lock.json ./
RUN npm ci --no-audit --no-fund --loglevel warn

COPY --chown=node:node app-ui/ ./
COPY package.json /package.json

EXPOSE 3000
CMD ["npm", "run", "dev"]


# ---------------------------------------------------------------------------
# Stage 4 – API Development: hot-reload with nodemon, full source mounted
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS development

RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/data \
    && chown -R node:node /app \
    && chmod -R 770 /app

WORKDIR /app

COPY --chown=node:node --from=builder /app ./
COPY --chown=node:node --from=ui-builder /ui/dist ./public/ui

USER node

EXPOSE 3001
CMD ["npm", "run", "dev"]


# ---------------------------------------------------------------------------
# Stage 5 – Production: compiled API bundle + React static files
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS production

RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/data \
    && chown -R node:node /app \
    && chmod -R 770 /app

WORKDIR /app

# the npm packages the API needs at runtime; the bundle leaves them out
COPY app-api/package.json app-api/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund --loglevel warn && npm cache clean --force

# API bundle + public assets + openapi spec (all placed in dist/ by build.js)
COPY --chown=node:node --from=builder /app/dist ./dist
# React UI static build
COPY --chown=node:node --from=ui-builder /ui/dist ./dist/public/ui

USER node

EXPOSE 3001
# healthy once the API answers and reaches its database (Docker and Portainer show it;
# a minute to start, then every 30 seconds)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/bundle.js"]
