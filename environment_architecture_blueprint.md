# Environment Architecture Blueprint

This document describes the generic architecture for deploying a **Next.js frontend application** into the Jana AWS dev environment. It is extracted from the `jana-user-admin` service and intentionally omits application-specific code details. Use it as a checklist and reference when standing up a new frontend service in the same infrastructure.

---

## 1. Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Account                             │
│                     (us-east-2, 820228986158)                   │
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌───────────────┐   │
│  │  GitHub Repo  │────▶│  Amazon ECR   │────▶│  Amazon ECS   │   │
│  │  (source)     │     │  (images)     │     │  (runtime)    │   │
│  └──────────────┘     └──────────────┘     └───────┬───────┘   │
│                                                     │           │
│  ┌──────────────┐                            ┌──────▼───────┐   │
│  │   Route 53 / │◀───────────────────────────│     ALB      │   │
│  │   GoDaddy    │  CNAME                     │  (routing)   │   │
│  │   DNS        │                            └──────────────┘   │
│  └──────────────┘                                               │
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌───────────────┐   │
│  │  SSM Param   │     │    RDS        │     │    Redis      │   │
│  │  Store       │     │  (Postgres)   │     │               │   │
│  └──────────────┘     └──────────────┘     └───────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

All services run on a **shared ECS cluster** (`dev-jana-cluster`) backed by a single EC2 instance (Auto Scaling Group scales 0–1). Infrastructure is managed via **Terraform** in a separate `jana-terraform` repository — individual service repos do not contain Terraform.

---

## 2. Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20 (Alpine) |
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 3, PostCSS, Autoprefixer |
| Client state | Zustand 5 |
| Server state | TanStack React Query 5 |
| Build output | `standalone` (self-contained Node.js server) |
| Container | Docker multi-stage (builder + runner) |
| Registry | Amazon ECR |
| Orchestration | Amazon ECS (EC2 launch type) |
| Load balancer | Application Load Balancer (ALB) |
| CI/CD | GitHub Actions (manual `workflow_dispatch`) |
| Auth to AWS | GitHub OIDC → IAM role |

---

## 3. Repository Structure

A new service should follow this layout:

```
<service-name>/
├── .github/workflows/
│   ├── build-dev.yml          # Build image → push to ECR
│   └── deploy-dev.yml         # Deploy image → ECS
├── app/                       # Next.js App Router pages/layouts
├── components/                # React components
├── lib/                       # API client, types, utilities
├── public/                    # Static assets
├── stores/                    # Zustand stores
├── middleware.ts              # Next.js edge middleware
├── next.config.ts             # output: "standalone"
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
├── Dockerfile
├── docker-compose.yml         # Local testing
├── .dockerignore
├── .env.local.example         # Env var template (never commit actual .env)
└── .gitignore
```

---

## 4. Docker Build

### Dockerfile (template)

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://<default-api-host>
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

Key points:

- **Two stages:** `builder` installs deps and builds; `runner` copies only the standalone output.
- **`NEXT_PUBLIC_*` vars are baked in at build time** — they become part of the client JS bundle. They cannot be changed at runtime. Pass them via `--build-arg`.
- **Non-root user** (`nextjs`, uid 1001) for security.
- **Port 3000** — the Next.js standalone server listens here.
- No Nginx or reverse proxy inside the container.

### docker-compose.yml (local testing)

```yaml
services:
  web:
    build:
      context: .
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://<default-api-host>}
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    environment:
      - NODE_ENV=production
      - PORT=3000
```

### .dockerignore

```
node_modules
.next
.git
.env*
*.md
!README.md
```

---

## 5. Next.js Configuration

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- **`output: "standalone"`** produces a self-contained `server.js` with all dependencies inlined. This is what gets copied into the runner Docker stage.
- **Path alias:** `@/*` maps to project root (set in `tsconfig.json`).

---

## 6. Environment Variables

### Build-time variables (baked into client bundle)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Base URL of the backend API this frontend talks to |

Any variable prefixed with `NEXT_PUBLIC_` is embedded in the client-side JavaScript at build time. It cannot be changed after the image is built. To point the same image at a different API, you must rebuild.

### Runtime variables (set in ECS task definition via Terraform)

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3000` | Server listen port |

### Local development

Create `.env.local` from `.env.local.example`. Never commit `.env*` files.

---

## 7. AWS Infrastructure Components

### 7.1 ECS Cluster

| Property | Value |
|----------|-------|
| Cluster name | `dev-jana-cluster` |
| Launch type | EC2 (single instance via ASG) |
| Deployment strategy | `max_percent=100`, `min_healthy_percent=0` (stop-then-start) |

All services share this cluster. A deploy stops the old task before starting the new one — there is no rolling deployment on the dev cluster.

### 7.2 ECS Service & Task Definition

Each frontend service needs:

| Property | Example value |
|----------|---------------|
| Service name | `<service-name>` |
| Task family | `<service-name>` |
| Container name | As defined in Terraform |
| Container port | `3000` |
| Image | `<account-id>.dkr.ecr.us-east-2.amazonaws.com/<service-name>:latest` |

Task definitions (CPU, memory, health checks, environment variables, log configuration) are managed in **jana-terraform**, not in the service repo.

### 7.3 ECR Repository

Each service has a dedicated ECR repository:

| Property | Value |
|----------|-------|
| Repository name | `<service-name>` |
| Region | `us-east-2` |
| Tags | `latest` + git SHA |

### 7.4 Application Load Balancer (ALB)

The dev environment uses ALBs with **host-based** and **path-based** routing rules defined in Terraform:

| ALB | Purpose | Services routed |
|-----|---------|-----------------|
| `dev-jana-api-alb` | Public/analyst API | `jana-api` |
| `dev-jana-api-internal-alb` | Internal services | `jana-user` (path: `/api/auth/*`), `jana-user-admin` (host-based) |
| `dev-jana-mcp-alb` | MCP server | `jana-mcp` |

A new frontend service would typically be added to the **internal ALB** with a host-based routing rule, or a new ALB could be created in Terraform.

### 7.5 DNS (GoDaddy CNAMEs → ALB)

| Domain | Points to ALB | Service |
|--------|---------------|---------|
| `api-dev.jana.earth` | `dev-jana-api-alb-*.us-east-2.elb.amazonaws.com` | Analyst / public API |
| `auth-dev.jana.earth` | `dev-jana-api-internal-alb-*.us-east-2.elb.amazonaws.com` | Auth API (`jana-user`, path-routed `/api/auth/*`) |
| `admin-dev.jana.earth` | `dev-jana-api-internal-alb-*.us-east-2.elb.amazonaws.com` | Admin frontend (`jana-user-admin`, host-routed) |
| `mcp-dev.jana.earth` | `dev-jana-mcp-alb-*.us-east-2.elb.amazonaws.com` | MCP |

For a new service, add:
1. A new ALB listener rule in Terraform (host-based or path-based)
2. A CNAME record in GoDaddy pointing `<service>-dev.jana.earth` to the ALB DNS

### 7.6 SSM Parameter Store

Shared configuration is stored in SSM Parameter Store. Services read these at runtime or during CI/CD:

| Path | Description |
|------|-------------|
| `/dev/django/dev-user-password` | API dev-user password |
| `/dev/django/dev-user-username` | API dev-user username (`dev-user`) |
| `/dev/django/admin-password` | Django admin password |
| `/dev/django/admin-username` | Django admin username |
| `/dev/rds/database-url` | Full PostgreSQL `DATABASE_URL` |
| `/dev/rds/admin-password` | RDS admin password |
| `/dev/rds/admin-username` | RDS admin username |
| `/dev/redis/url` | Redis connection URL |
| `/dev/alb/api-dns` | API ALB DNS hostname |
| `/dev/alb/ingestion-dns` | Ingestion ALB DNS hostname |
| `/dev/alb/mcp-dns` | MCP ALB DNS hostname |
| `/dev/mcp/jana-password` | MCP jana user password |
| `/dev/mcp/jana-username` | MCP jana username |

Prefix convention: `/dev/<category>/`. Categories: `django`, `rds`, `redis`, `alb`, `mcp`.

---

## 8. CI/CD Workflows (GitHub Actions)

Both workflows use `workflow_dispatch` (manual trigger).

### 8.1 Build Workflow (`build-dev.yml`)

**Purpose:** Lint the code, build a Docker image, push to ECR.

**Template:**

```yaml
name: "Build Dev <Service Name>"

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: "Image tag (leave blank for git SHA)"
        required: false
        default: ""

env:
  AWS_REGION: us-east-2
  ECR_REPOSITORY: <service-name>

permissions:
  id-token: write
  contents: read

jobs:
  lint:
    name: Lint and type-check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npm run lint

  build:
    name: Build and push image to ECR
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: aws-actions/configure-aws-credentials@v5
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/dev-github-actions-jana
          aws-region: ${{ env.AWS_REGION }}

      - id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - uses: docker/setup-buildx-action@v4

      - name: Determine image tag
        id: tag
        run: |
          TAG="${{ github.event.inputs.image_tag }}"
          if [ -z "$TAG" ]; then TAG="${{ github.sha }}"; fi
          echo "IMAGE_TAG=$TAG" >> "$GITHUB_OUTPUT"

      - name: Build and push
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ steps.tag.outputs.IMAGE_TAG }}
        run: |
          docker build \
            --build-arg NEXT_PUBLIC_API_URL=http://<api-host> \
            --tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            --tag $ECR_REGISTRY/$ECR_REPOSITORY:latest \
            .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
```

**Key details:**

- AWS auth via **OIDC** (no long-lived credentials). The IAM role `dev-github-actions-jana` is assumed via GitHub's OIDC provider.
- The GitHub repo secret `AWS_ACCOUNT_ID` provides the AWS account number.
- Images are double-tagged: git SHA (or custom tag) + `latest`.
- `NEXT_PUBLIC_API_URL` is passed as a Docker build arg.

### 8.2 Deploy Workflow (`deploy-dev.yml`)

**Purpose:** Update the ECS service to run a new image.

**Template:**

```yaml
name: "Deploy Dev <Service Name>"

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: "Image tag to deploy (default: latest)"
        required: false
        default: "latest"

env:
  AWS_REGION: us-east-2
  ECS_CLUSTER: dev-jana-cluster
  ECS_SERVICE: <service-name>
  TASK_FAMILY: <service-name>
  ECR_REPOSITORY: <service-name>

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    name: Deploy to ECS
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v5
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/dev-github-actions-jana
          aws-region: ${{ env.AWS_REGION }}

      - id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Deploy service
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.event.inputs.image_tag || 'latest' }}
        run: |
          TASK_DEF=$(aws ecs describe-task-definition \
            --task-definition $TASK_FAMILY --query taskDefinition)

          NEW_IMAGE="$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG"

          NEW_DEF=$(echo "$TASK_DEF" | jq --arg IMG "$NEW_IMAGE" \
            '.containerDefinitions[0].image = $IMG |
             del(.taskDefinitionArn, .revision, .status, .requiresAttributes,
                 .compatibilities, .registeredAt, .registeredBy)')

          REV=$(aws ecs register-task-definition \
            --cli-input-json "$NEW_DEF" \
            --query 'taskDefinition.revision' --output text)

          aws ecs update-service \
            --cluster $ECS_CLUSTER --service $ECS_SERVICE \
            --task-definition $TASK_FAMILY:$REV \
            --force-new-deployment --no-cli-pager

          aws ecs wait services-stable \
            --cluster $ECS_CLUSTER --services $ECS_SERVICE
```

**Deploy pattern:**

1. Fetch current task definition from ECS
2. Replace the container image URI
3. Register a new task definition revision
4. Update the ECS service with the new revision
5. Wait for service stability

This pattern does **not** modify CPU, memory, env vars, or health checks — those are owned by Terraform.

---

## 9. Authentication Pattern

The Jana platform uses a **centralized auth API** (`jana-user`) that all frontends authenticate against.

### 9.1 Auth API endpoints

All auth endpoints live on the `jana-user` service, exposed via the internal ALB at `auth-dev.jana.earth`:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/login/` | Email + password login → JWT access + refresh tokens |
| `POST` | `/api/auth/refresh/` | Refresh access token using refresh token |
| `POST` | `/api/auth/logout/` | Invalidate tokens |
| `POST` | `/api/auth/accept-invite/` | Accept an organization invitation |
| `POST` | `/api/auth/device-authorize/` | Device authorization flow |

### 9.2 Token format

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access token (JWT) | Short-lived | In-memory only (not persisted) |
| Refresh token | Longer-lived | Persisted to `localStorage` (key: `auth-storage`) |

### 9.3 Auth flow

1. User submits email + password to `/api/auth/login/`
2. Backend returns `{ access, refresh, user, expires_at }`
3. Frontend stores refresh token + user + expiry in Zustand (persisted to `localStorage`)
4. Access token is held in-memory only
5. API requests include `Authorization: Bearer <access_token>`
6. Before each request, check if access token is near expiry (~60s buffer); if so, call `/api/auth/refresh/` first
7. On logout or auth failure, clear store and redirect to `/login`

### 9.4 Client-side auth guard

Protected routes are wrapped in an `AuthGuard` component that:

- Checks if the user is authenticated (has a valid, non-expired session)
- If not, attempts a token refresh
- If refresh fails, redirects to `/login?next=<current-url>`

### 9.5 Next.js middleware

Middleware runs on the edge for every non-static request. It defines:

- **Public paths** (e.g. `/login`, `/accept-invite`) — always pass through
- **Auth paths** (e.g. `/dashboard`, `/users`) — pass through (actual enforcement is client-side via AuthGuard)
- **Matcher** excludes `_next/static`, `_next/image`, `favicon.ico`, and image files

### 9.6 API client pattern

A centralized `apiFetch<T>()` function handles all backend communication:

- Reads `NEXT_PUBLIC_API_URL` (baked in at build time)
- Sets `Content-Type: application/json`
- Attaches `Authorization: Bearer <token>` when a token is provided
- Parses JSON responses and throws typed errors with HTTP status codes

---

## 10. Checklist: Adding a New Frontend Service

### 10.1 GitHub / Source

- [ ] Create a new GitHub repository
- [ ] Add `AWS_ACCOUNT_ID` as a repository secret
- [ ] Copy the `build-dev.yml` and `deploy-dev.yml` workflow templates (update service name, ECR repo name, and `NEXT_PUBLIC_API_URL`)

### 10.2 AWS — ECR

- [ ] Create an ECR repository named `<service-name>` in `us-east-2`
- [ ] Verify the `dev-github-actions-jana` IAM role has push permissions to the new repo

### 10.3 AWS — ECS (via Terraform)

In the `jana-terraform` repository:

- [ ] Create a new ECS **task definition** for `<service-name>`:
  - Container image: `<account-id>.dkr.ecr.us-east-2.amazonaws.com/<service-name>:latest`
  - Container port: `3000`
  - Environment variables: `NODE_ENV=production`, `PORT=3000`
  - Health check (if needed): HTTP GET on port 3000 (e.g. root `/`)
  - CPU/memory: Appropriate for a Node.js frontend (e.g. 256 CPU, 512 MB)
  - Log configuration: CloudWatch Logs

- [ ] Create a new ECS **service** in `dev-jana-cluster`:
  - Task definition: `<service-name>`
  - Desired count: 1
  - Deployment: `max_percent=100`, `min_healthy_percent=0`
  - Load balancer: attach to ALB target group

### 10.4 AWS — ALB (via Terraform)

- [ ] Create a new **target group** for port 3000, health check path `/`
- [ ] Add a **listener rule** on the appropriate ALB:
  - **Host-based** routing: `<service>-dev.jana.earth` → target group
  - OR **path-based** routing if sharing a domain

### 10.5 DNS

- [ ] Add a GoDaddy CNAME: `<service>-dev.jana.earth` → ALB DNS hostname

### 10.6 Environment start/stop

The dev environment has a scheduler Lambda (`dev-environment-scheduler`) that starts and stops all infrastructure:

```bash
# Stop
AWS_PROFILE=dev-admin aws lambda invoke --region us-east-2 \
  --function-name dev-environment-scheduler \
  --cli-binary-format raw-in-base64-out \
  --payload '{"action":"stop"}' \
  --invocation-type Event /tmp/lambda_resp.json

# Start
AWS_PROFILE=dev-admin aws lambda invoke --region us-east-2 \
  --function-name dev-environment-scheduler \
  --cli-binary-format raw-in-base64-out \
  --payload '{"action":"start"}' \
  --invocation-type Event /tmp/lambda_resp.json
```

New ECS services must be registered in this Lambda's configuration (in Terraform) to be included in start/stop cycles.

---

## 11. Existing Services in the Environment

For reference, these are the services currently running in `dev-jana-cluster`:

| Service | Type | Description |
|---------|------|-------------|
| `jana-api` | Django REST | Public analyst API |
| `jana-api-internal` | Django REST | Internal API (shared ALB with user/admin) |
| `jana-user` | Django REST | Auth and user management API |
| `jana-user-admin` | Next.js | Admin frontend for user management |
| `jana-worker` | Celery worker | Async task processing |
| `jana-beat` | Celery beat | Periodic task scheduling |
| `jana-mcp` | MCP server | Model Context Protocol server |

Shared infrastructure:

| Resource | Details |
|----------|---------|
| Database | RDS PostgreSQL (`dev-jana-postgres`) |
| Cache | Redis (ElastiCache or self-hosted) |
| Secrets | SSM Parameter Store (see Section 7.6) |
| Container registry | ECR (one repo per service) |
| Cluster | `dev-jana-cluster` (single EC2 via ASG) |

---

## 12. Important Constraints

1. **Single EC2 instance** — all services share one host. Memory and CPU are limited. Size new task definitions conservatively.

2. **Stop-then-start deploys** — ECS stops the old container before starting the new one. Expect brief downtime on each deploy. There is no zero-downtime rolling deployment in dev.

3. **All deploys kill Celery tasks** — deploying any service restarts the EC2 instance's containers. Worker tasks in progress will be terminated.

4. **Build-time env vars** — `NEXT_PUBLIC_*` variables are baked into the JavaScript bundle at `docker build` time. To change them, you must rebuild the image.

5. **Terraform owns infra** — ECS task definitions, ALB rules, target groups, and IAM roles are managed in `jana-terraform`. The service repo only controls the application code and Docker image.

6. **Manual CI/CD** — both build and deploy workflows are `workflow_dispatch` (manual trigger from GitHub Actions UI). There is no automatic deploy on merge.

7. **OIDC auth to AWS** — GitHub Actions authenticate to AWS via OIDC federation, not long-lived access keys. The role `dev-github-actions-jana` is shared across service repos.

---

## 13. Local Development

```bash
# Install dependencies
npm install

# Create env file
cp .env.local.example .env.local
# Edit .env.local with appropriate values

# Run dev server
npm run dev
# → http://localhost:3000

# Or test the Docker build locally
docker compose up --build
# → http://localhost:3000
```

**Package scripts:**

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Local dev server with hot reload |
| `build` | `next build` | Production build |
| `start` | `next start` | Run production server |
| `lint` | `next lint` | ESLint checks |
