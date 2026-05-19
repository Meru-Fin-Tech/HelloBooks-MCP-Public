# syntax=docker/dockerfile:1.7

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Explicit COPY of only the lockfile + manifest avoids the glob warning
# (SonarQube docker:S6470) that broad `COPY . /app` patterns surface.
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Strip dev deps for the runtime image.
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Run as non-root.
RUN addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

# Application files are owned by root and copied read-only-for-others (chmod
# a-w) so the non-root `app` user can READ + EXECUTE but cannot mutate the
# image at runtime (SonarQube docker:S6504 — non-root write permissions).
COPY --chown=root:root --chmod=555 --from=build /app/node_modules ./node_modules
COPY --chown=root:root --chmod=555 --from=build /app/dist ./dist
COPY --chown=root:root --chmod=444 --from=build /app/package.json ./package.json

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8080/health || exit 1

CMD ["node", "dist/http.js"]
