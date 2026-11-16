# 🚀 Acquisitions Service: CI/CD Pipeline & Cloud Kubernetes Deployment Guide

A comprehensive, end-to-end guide covering the **Acquisitions Service** architecture, automated **CI/CD pipelines with GitHub Actions**, and production deployment on **Google Cloud Platform (GCP)** using **Kubernetes (K3s)** with automated **SSL/HTTPS certificates (Let's Encrypt & cert-manager)**.

---

## 📑 Table of Contents
1. [Project Overview & Tech Stack](#1-project-overview--tech-stack)
2. [System Architecture & CI/CD Workflow](#2-system-architecture--cicd-workflow)
3. [Configuring GitHub Repository Secrets](#3-configuring-github-repository-secrets)
4. [Step-by-Step Cloud Setup (GCP + K3s)](#4-step-by-step-cloud-setup-gcp--k3s)
5. [Kubernetes Manifests Breakdown](#5-kubernetes-manifests-breakdown)
6. [Domain Routing & Automated SSL/HTTPS](#6-domain-routing--automated-sslhttps)
7. [Operations & Troubleshooting Guide](#7-operations--troubleshooting-guide)

---

## 1. Project Overview & Tech Stack

- **Service Name:** Acquisitions Service
- **Runtime & Language:** Node.js 22 LTS, TypeScript.
- **Web Framework:** Express 5.
- **Validation & Security:** Zod, Helmet, CORS.
- **Logging:** Winston & Morgan with structured logging.
- **Database & ORM:** PostgreSQL Serverless ([Neon DB](https://neon.tech)) accessed through [Drizzle ORM](https://orm.drizzle.team/).
- **Testing:** Vitest with V8 code coverage report generation.
- **Containerization & Orchestration:** Docker (Multi-stage build) & Lightweight Kubernetes ([K3s](https://k3s.io)).

---

## 2. System Architecture & CI/CD Workflow

Every commit pushed to the `main` branch triggers an automated, zero-downtime deployment pipeline:

```
[Developer]
    │  git push origin main
    ▼
[GitHub Repository]
    │
    ├──► 1. Workflow: Tests (Vitest)
    │        ├── Install clean dependencies (npm ci)
    │        ├── Run unit tests & endpoint health tests
    │        └── Generate and archive code coverage artifact (30 days)
    │
    └──► 2. Workflow: Docker Build, Push & K8s Deploy
             ├── Build multi-platform image (linux/amd64, linux/arm64)
             ├── Push container image to Docker Hub (tags: sha-<commit>, latest, timestamp)
             └── Connect securely to Cloud Kubernetes Cluster via Kubeconfig:
                     ├── Apply ConfigMaps & inject database secrets
                     ├── Apply Services & Ingress routing
                     ├── Update Deployment with newly built commit image tag
                     └── Monitor rolling update for zero-downtime rollout
```

### GitHub Actions Workflows Breakdown:
1. **`tests.yml`**: Runs on pull requests and pushes to `main` and `staging`. Executes test suites and outputs a Markdown summary in the GitHub Actions dashboard.
2. **`docker-build-and-push.yml`**:
   - **`build-and-push`**: Uses Docker Buildx and QEMU to cross-compile images for both x86 (Intel/AMD) and ARM64 architectures, caching layers via GitHub Actions cache.
   - **`deploy`**: Connects to the remote K3s cluster, executes `kubectl apply`, updates image references to `sha-${{ github.sha }}`, and tracks `kubectl rollout status`.

---

## 3. Configuring GitHub Repository Secrets

Navigate to:
👉 **GitHub Repository -> Settings -> Secrets and variables -> Actions -> New repository secret**

Add the following required secrets:

| Secret Name | Required | Description | Example Value |
| :--- | :---: | :--- | :--- |
| `DOCKER_USERNAME` | ✅ Yes | Docker Hub account username | `congmanh270504` |
| `DOCKER_PASSWORD` | ✅ Yes | Docker Hub Personal Access Token (PAT) | `dckr_pat_xxxxxxxxxxxxxxxx` |
| `KUBE_CONFIG` | ✅ Yes | Raw content of `/etc/rancher/k3s/k3s.yaml` (with External IP) | `apiVersion: v1 ...` |
| `DATABASE_URL` | ⚠️ Recommended | Production PostgreSQL connection string (Neon DB) | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |

---

## 4. Step-by-Step Cloud Setup (GCP + K3s)

### Step 1: Provision a Compute Engine VM on GCP
1. Go to **GCP Console -> Compute Engine -> VM instances -> Create instance**.
2. **Recommended Specifications:**
   - **OS:** Ubuntu 22.04 LTS or 24.04 LTS (x86/64).
   - **Machine Type:** `e2-medium` (2 vCPU, 4GB RAM) or `e2-small` (2GB RAM).
   - **Boot Disk:** 20GB - 30GB Balanced Persistent Disk.
   - **Firewall Settings (Crucial):** Check both boxes:
     - ✅ **Allow HTTP traffic** (Port 80)
     - ✅ **Allow HTTPS traffic** (Port 443)
3. Note your VM's **External IP** (e.g., `34.136.218.3`).

### Step 2: Open Kubernetes API Port 6443 in GCP Firewall
For GitHub Actions to deploy manifests remotely, port 6443 must accept inbound connections:
1. Go to **GCP Console -> VPC network -> Firewall -> Create Firewall Rule**.
2. **Rule Name:** `allow-k8s-api`
3. **Targets:** *All instances in the network*.
4. **Source IPv4 ranges:** `0.0.0.0/0` (or GitHub Actions IP ranges for tighter security).
5. **Protocols and ports:** Select **Specified protocols and ports** -> check **TCP** -> enter `6443`.
6. Click **Create**.

### Step 3: Install K3s and Git on the Virtual Machine
Open the SSH terminal on your GCP instance, elevate to `root`:
```bash
sudo -i
```

Update package lists and install Git and curl:
```bash
apt update && apt install -y git curl
```

Install K3s (comes bundled with Traefik Ingress Controller):
```bash
curl -sfL https://get.k3s.io | sh -
```

Verify K3s is running:
```bash
kubectl get nodes
```

### Step 4: Extract Kubeconfig for GitHub Actions
1. View the admin kubeconfig file:
   ```bash
   cat /etc/rancher/k3s/k3s.yaml
   ```
2. Copy the entire output.
3. Replace the local loopback address:
   ```yaml
   server: https://127.0.0.1:6443
   ```
   with your VM's public External IP:
   ```yaml
   server: https://34.136.218.3:6443
   ```
4. Paste this modified YAML into the GitHub Actions secret named **`KUBE_CONFIG`**.

---

## 5. Kubernetes Manifests Breakdown

All configuration files reside in the [`k8s/`](./k8s) directory:

- **[`deployment.yaml`](./k8s/deployment.yaml)**:
  - Manages 2 replicas with `RollingUpdate` strategy (`maxSurge: 1`, `maxUnavailable: 0`) to guarantee zero-downtime releases.
  - Resource requests: `100m CPU / 128Mi RAM`; Limits: `500m CPU / 256Mi RAM`.
  - Configures `livenessProbe` and `readinessProbe` checking the `/health` endpoint.
- **[`service.yaml`](./k8s/service.yaml)**:
  - Exposes pods internally via a `ClusterIP` on port `8080`, acting as the backend target for the Ingress controller.
- **[`configmap.yaml`](./k8s/configmap.yaml)**:
  - Stores non-sensitive runtime variables: `NODE_ENV=production`, `PORT=8080`, `LOG_LEVEL=info`.
- **[`secret.example.yaml`](./k8s/secret.example.yaml)**:
  - Safe template demonstrating how `DATABASE_URL` is structured (the real `secret.yaml` is excluded by `.gitignore`).
- **[`ingress.yaml`](./k8s/ingress.yaml)**:
  - Traefik Ingress routing external HTTP/HTTPS traffic to `acquisitions-service:8080`.
- **[`cluster-issuer.yaml`](./k8s/cluster-issuer.yaml)**:
  - Declares the Let's Encrypt ACME ClusterIssuer using HTTP-01 challenge solving via Traefik.
- **[`migration-job.yaml`](./k8s/migration-job.yaml)**:
  - One-off batch Job to run Drizzle database migrations (`npm run db:migrate`) without stopping the API pods.

---

## 6. Domain Routing & Automated SSL/HTTPS

### Step 1: Install `cert-manager` on the Cluster
Run the official manifest on your VM (as root):
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml
```

Wait 30 seconds, then confirm all pods are in `Running` state:
```bash
kubectl get pods -n cert-manager
```

### Step 2: Apply the ClusterIssuer
Apply [`k8s/cluster-issuer.yaml`](./k8s/cluster-issuer.yaml):
```bash
kubectl apply -f k8s/cluster-issuer.yaml
```
*(Make sure to update `email:` inside the file with your valid email address).*

### Step 3: Configure Hostname in `ingress.yaml`
Choose one of the two options below:

- **Option A: Without a Custom Domain (Using Free Wildcard DNS):**
  Use `nip.io` or `sslip.io` matching your VM's External IP:
  ```yaml
  spec:
    ingressClassName: traefik
    tls:
      - hosts:
          - app.34.136.218.3.nip.io
        secretName: acquisitions-tls-cert
    rules:
      - host: app.34.136.218.3.nip.io
        http:
          paths:
            - path: /
              pathType: Prefix
              backend:
                service:
                  name: acquisitions-service
                  port:
                    number: 8080
  ```

- **Option B: Using Your Own Custom Domain (e.g. `api.yourdomain.com`):**
  1. Add an **A Record** in your DNS provider (Cloudflare, Namecheap, Route53, etc.) pointing `api.yourdomain.com` to `34.136.218.3`.
  2. Replace `app.34.136.218.3.nip.io` with `api.yourdomain.com` in [`k8s/ingress.yaml`](./k8s/ingress.yaml).

Apply the Ingress rule:
```bash
kubectl apply -f k8s/ingress.yaml
```

### Step 4: Verify SSL Certificate Issuance
Check certificate generation progress:
```bash
kubectl get certificate
```
Once the **`READY`** column displays **`True`**, Let's Encrypt has verified ownership and issued the certificate. You can access your API over secure HTTPS:
👉 **`https://app.34.136.218.3.nip.io/health`**

---

## 7. Operations & Troubleshooting Guide

### 📋 Essential Management Commands:

```bash
# View running pods and their assigned node IPs
kubectl get pods -o wide

# Stream real-time logs from all deployment pods
kubectl logs -f deployment/acquisitions-deployment --tail=100

# View services and ingress status
kubectl get svc,ingress

# Inspect certificate renewal and challenge events
kubectl describe certificate acquisitions-tls-cert
kubectl get challenges

# Trigger a zero-downtime manual restart
kubectl rollout restart deployment/acquisitions-deployment
```

### ❓ Common Issues & Solutions:

1. **`open /etc/rancher/k3s/k3s.yaml: permission denied`**
   - **Cause:** Non-root user attempting to access admin kubeconfig permissions (`0600`).
   - **Fix:** Switch to root using `sudo -i`, or grant read permissions via:
     ```bash
     sudo chmod 644 /etc/rancher/k3s/k3s.yaml
     ```

2. **GitHub Actions fails connecting to Cluster (`timed out` or `refused`):**
   - **Cause:** GCP firewall blocking port `6443`.
   - **Fix:** Ensure a firewall rule exists in GCP VPC Network allowing inbound TCP traffic on port `6443` from `0.0.0.0/0`.

3. **HTTP/HTTPS Requests Fail (`Connection Refused`):**
   - **Cause:** GCP instance firewall blocking ports 80/443.
   - **Fix:** Verify VM instance settings have both "Allow HTTP traffic" and "Allow HTTPS traffic" checked.

4. **SSL Certificate Stuck in `READY: False`:**
   - **Cause:** Rate limits on wildcard domains (`nip.io` occasionally hits Let's Encrypt rate limits) or DNS propagation delay.
   - **Fix:** Inspect reason using `kubectl describe certificate acquisitions-tls-cert`. If rate-limited, switch the domain suffix to `app.34.136.218.3.sslip.io` in [`k8s/ingress.yaml`](./k8s/ingress.yaml) and re-apply.
