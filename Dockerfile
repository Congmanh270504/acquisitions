# Stage 1: Base stage with dependencies
FROM node:22-slim AS base

# Install system dependencies required for native modules (e.g. bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source code
COPY . .

# Tạo thư mục logs và cấp toàn quyền cho user non-root node
RUN mkdir -p /app/logs && chown -R node:node /app

# Expose server port
EXPOSE 8080

# Stage 2: Production runtime stage
FROM base AS production
ENV NODE_ENV=production
ENV PORT=8080

USER node
CMD ["npm", "start"]

# Stage 3: Development runtime stage
FROM base AS development
ENV NODE_ENV=development
ENV PORT=8080

CMD ["npm", "run", "dev"]
