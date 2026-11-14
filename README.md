# Acquisitions Service - Dockerization & Neon Database Setup

This project is fully dockerized with distinct workflows for **Development (Local with Neon Local)** and **Production (Direct Neon Cloud Serverless DB)**.

---

## 🏛 Architecture Overview

```
                      +------------------------------------------+
                      |               ENVIRONMENTS               |
                      +------------------------------------------+
                                    |              |
           [Development]            |              |            [Production]
                                    v              v
     +--------------------------+                      +--------------------------+
     |  docker-compose.dev.yml  |                      |  docker-compose.prod.yml |
     |  (or docker-compose.yml) |                      |                          |
     +--------------------------+                      +--------------------------+
          |                |                                        |
          v                v                                        v
   +-------------+  +---------------+                        +-------------+
   |   App Dev   |  |  Neon Local   |                        |  App Prod   |
   | (tsx watch) |->| Proxy Service |                        | (npm start) |
   +-------------+  +---------------+                        +-------------+
                           |                                        |
                           | TLS / REST                             | TLS / REST
                           v                                        v
             +----------------------------+           +----------------------------+
             | Neon Cloud Ephemeral Branch|           | Neon Cloud Production DB   |
             |   (auto-created on start   |           |   (main/production branch) |
             |     destroyed on stop)     |           |                            |
             +----------------------------+           +----------------------------+
```

| Feature | Development (Local) | Production |
| :--- | :--- | :--- |
| **Compose File** | `docker-compose.dev.yml` (or `docker-compose.yml`) | `docker-compose.prod.yml` |
| **Env File** | `.env.development` | `.env.production` |
| **Database Target** | **Neon Local Proxy** (`neon-local:5432`) | **Neon Cloud Serverless** (`*.neon.tech`) |
| **`DATABASE_URL`** | `postgres://user:password@neon-local:5432/dbname` | `postgresql://user:pass@ep-...neon.tech/neondb?sslmode=require` |
| **Proxy Service** | Included (`neondatabase/neon_local`) | **None** (direct cloud connection) |
| **Branching** | Ephemeral branches created/deleted automatically | Connected to production branch |
| **Code Reloading** | Live hot-reloading (`tsx watch` + volume mount) | Optimized standalone container (`npm start`) |

---

## 🔀 How `DATABASE_URL` and Neon Driver Switch Between Environments

In `src/config/database.ts`, the database connection logic automatically adapts depending on whether `DATABASE_URL` targets Neon Cloud or the Neon Local proxy:

```typescript
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../db/schema.ts";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env");
}

// Automatically configure HTTP proxy when running against Neon Local in development
if (!process.env.DATABASE_URL.includes("neon.tech")) {
    neonConfig.fetchEndpoint = (host, port) => {
        const targetPort = port || 5432;
        return `http://${host}:${targetPort}/sql`;
    };
    neonConfig.useSecureWebSocket = false;
    neonConfig.poolQueryViaFetch = true;
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
```

- **In Dev (`DATABASE_URL=postgres://user:password@neon-local:5432/dbname`)**:
  The driver detects that the URL does not point to `neon.tech`, re-routing HTTP queries via plain HTTP to the Neon Local proxy container at `http://neon-local:5432/sql`.
- **In Prod (`DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require`)**:
  The driver uses standard Neon Cloud HTTPS TLS endpoints directly. Zero code changes required.

---

## 🚀 1. Local Development with Neon Local

### Prerequisites
- Docker & Docker Compose installed.
- Neon Account API Key and Project ID ([Neon Console](https://console.neon.tech)):
  - **API Key**: Profile > Account Settings > API Keys
  - **Project ID**: Project Settings > General (`ep-...` or project ID)

### Step 1: Configure `.env.development`
Make sure `.env.development` contains your Neon API credentials:

```bash
# Copy template if needed
cp .env.example .env.development
```

Edit `.env.development`:
```env
NODE_ENV=development
PORT=8080
LOG_LEVEL=debug

# App inside docker connects to neon-local container
DATABASE_URL=postgres://user:password@neon-local:5432/dbname

# Neon API credentials for Neon Local proxy
NEON_API_KEY=napi_your_actual_neon_api_key
NEON_PROJECT_ID=your_neon_project_id
PARENT_BRANCH_ID=main
```

> **How Ephemeral Branches Work**: When `PARENT_BRANCH_ID` is defined, the `neon-local` container talks to the Neon API to spin up a dedicated, isolated branch branched off your `PARENT_BRANCH_ID`. When the container stops, the ephemeral branch is automatically deleted!

### Step 2: Start the Development Stack
Run Docker Compose:

```bash
docker-compose -f docker-compose.dev.yml up --build
```
*(Or simply `docker-compose up`, which defaults to the dev configuration)*

The terminal will show:
1. `neon-local` starting up, authenticating with Neon API, and spawning an ephemeral database branch.
2. `acquisitions-app-dev` starting up in watch mode (`tsx watch src/index.ts`).
3. Server listening on `http://localhost:8080`.

### Step 3: Running Migrations / Drizzle Studio from Host
Port `5432` from `neon-local` is forwarded to `localhost:5432` on your host machine.

To push schema changes or inspect your database from your terminal:
```bash
# Push schema changes to the active ephemeral branch
DATABASE_URL="postgres://user:password@localhost:5432/dbname" npm run db:push

# Launch Drizzle Studio
DATABASE_URL="postgres://user:password@localhost:5432/dbname" npm run db:studio
```

### Step 4: Stop the Development Stack
```bash
docker-compose -f docker-compose.dev.yml down
```
When stopped, the ephemeral branch in Neon Cloud is safely deleted, keeping your cloud account clean.

---

## 🚢 2. Production Deployment with Neon Cloud

In production, the application connects directly to the serverless Neon Cloud Postgres instance without any intermediate local proxy container.

### Step 1: Configure `.env.production`
Ensure `.env.production` is configured (or inject these environment variables via your cloud deployment provider, e.g., Kubernetes, AWS ECS, GCP Cloud Run, Docker Swarm, etc.):

```env
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Direct connection string to Neon Cloud
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-YOUR-ENDPOINT-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Step 2: Build and Run Production Container
Run Docker Compose with the production configuration:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### Step 3: Verify Production Service
- Check logs:
  ```bash
  docker-compose -f docker-compose.prod.yml logs -f app
  ```
- Check container status:
  ```bash
  docker-compose -f docker-compose.prod.yml ps
  ```

---

## 📁 File Structure Summary

- `Dockerfile`: Multi-stage Dockerfile containing `development` (with live reload) and `production` (lean, secure non-root user) stages.
- `docker-compose.dev.yml`: Runs the app container alongside `neondatabase/neon_local` proxy for ephemeral branch development.
- `docker-compose.prod.yml`: Runs the app in production mode connecting directly to Serverless Neon Cloud DB.
- `docker-compose.yml`: Default compose configuration mapping to local development.
- `.env.development`: Environment variables for development with Neon Local proxy.
- `.env.production`: Environment variables for production with Neon Cloud DB.
- `.env.example`: Safe configuration template.
- `.dockerignore`: Prevents `node_modules`, local logs, and secrets from being copied into Docker images.
