# syntax=docker/dockerfile:1.4

# Define build arguments for Node.js version, pnpm registry, system user, and group ID
ARG NODE_VERSION=lts-alpine
ARG NPM_REGISTRY=https://registry.npmjs.org/
ARG YARN_REGISTRY=https://registry.npmjs.org/
ARG PNPM_REGISTRY=https://registry.npmjs.org/

# Base stage with platform specification and Node.js version argument
FROM --platform=$TARGETPLATFORM node:${NODE_VERSION} AS base

# Upgrade zlib to fix CVE-2026-22184 and CVE-2026-27171
RUN apk upgrade --no-cache zlib

# Set environment variables
ENV API_PORT=3000 \
  SYSTEM_USER=system \
  SYSTEM_GROUP=system \
  SYSTEM_UID=2000 \
  SYSTEM_GID=2000

# Install Corepack and enable it
RUN corepack enable

# Install pnpm globally using the registry argument
RUN npm install -g pnpm @nestjs/cli --registry=$PNPM_REGISTRY --force

# Set working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Set the appropriate registry for pnpm
RUN if [ -n "$NPM_REGISTRY" ]; then pnpm config set registry "$NPM_REGISTRY"; \
  elif [ -n "$YARN_REGISTRY" ]; then pnpm config set registry "$YARN_REGISTRY"; \
  else pnpm config set registry "$PNPM_REGISTRY"; \
  fi

# Fetch dependencies to cache them
RUN pnpm fetch

# Create a new group and user specified by SYSTEM_USER, SYSTEM_GROUP, SYSTEM_GID, and SYSTEM_UID arguments
RUN addgroup -g $SYSTEM_GID -S $SYSTEM_GROUP \
  && adduser -u $SYSTEM_UID -G $SYSTEM_GROUP -S $SYSTEM_USER

# Expose the API port defined by the environment variable
EXPOSE ${API_PORT}

# Development stage
FROM base AS dev

# Set NODE_ENV to development
ENV NODE_ENV=development

# Copy the rest of the application code with ownership set to SYSTEM_USER
COPY --chown=${SYSTEM_USER}:${SYSTEM_USER} . .

# Install development dependencies from cache
RUN pnpm install --offline

# Use system user
USER ${SYSTEM_USER}


# Set ENTRYPOINT and CMD for development environment
ENTRYPOINT ["pnpm", "run"]
CMD ["start:dev"]

# Build stage
FROM base AS build

# Set NODE_ENV to production for building the project
ENV NODE_ENV=production

# Copy the rest of the application code with ownership set to SYSTEM_USER
COPY --chown=${SYSTEM_USER}:${SYSTEM_USER} . .

# Install production dependencies from cache and build the project
RUN pnpm install --frozen-lockfile --offline --no-frozen-lockfile --ignore-scripts && pnpm build

# Use system user
USER ${SYSTEM_USER}

# Production stage
FROM base AS prod

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy production dependencies from build stage
COPY --from=build /app/node_modules ./node_modules

# Copy the rest of the application code from build stage
COPY --from=build /app/dist ./dist

# Prune development dependencies to reduce image size
RUN pnpm prune --prod --ignore-scripts

# Set ENTRYPOINT and CMD for production environment
ENTRYPOINT ["pnpm", "run"]
CMD ["start:prod"]
