# ---- 1. install dependencies (cached unless package*.json changes) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./ # Any relative paths (like ./) now resolve relative to /app
RUN npm ci # clean install that matches the lockfile exactly

# ---- 2. build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . . # Copies everything from our project directory (on the host) into /app inside the container. This includes source code, config files, next.config.js, etc.
# NEXT_PUBLIC_* values are baked into the browser bundle at build time,
# so they must be build args, not runtime environment variables.
ARG NEXT_PUBLIC_API_URL=http://localhost:5000 # Declares a build-time argument with a default value. We can override it with `--build-arg NEXT_PUBLIC_API_URL=http://web:3000` when building the Docker image for production.
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1 # Disables Next.js telemetry (anonymous usage data collection).Common practice in production/CI environments.
RUN npm run build # This compiles the Next.js application and generates the optimized production output (normally in the .next folder)

# ---- 3. run (standalone output: no node_modules needed) ----
# This stage will become the actual image we run in production (very lightweight).
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \ # Enables production optimizations.
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \ # Tells the app which port to listen on. It actually affects the running process.
    HOSTNAME=0.0.0.0 # Makes the server listen on all network interfaces (required so the container is reachable from outside).
# --chown matters: ISR writes regenerated pages into .next at runtime.
# --chown=node:node -> Changes ownership of the copied files to the non-root node user (for better security).
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./ # The minimal standalone server + only the needed node_modules (created when we set output: 'standalone' in next.config.js)
COPY --from=build --chown=node:node /app/.next/static ./.next/static # The compiled static JS/CSS files that Next.js generates
USER node # Switches from the root user to the unprivileged node user.
EXPOSE 3000 # Documents that the container listens on port 3000; This is only documentation / metadata; it does not actually publish the port. The port is published in docker-compose.yml(or docker run -p 3000:3000 our-image).
CMD ["node", "server.js"] # Starts the Next.js standalone server.
