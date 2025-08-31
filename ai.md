# Instructions for the agent/automation: building the K8s environment for the game (Godot Web + Go/Redis/SQL)

## Goal
Build and deploy three environments (**dev**, **stage**, **prod**) for the game backend (gateway, worker, matchmaker, orchestrator) with a focus on scalability and security. The front-end (Godot Web) is served outside the cluster/CDN – not included in this package.

## System requirements (Linux)
- `kubectl` >= 1.27
- `kustomize` >= 5 (or `kubectl kustomize` if available)
- `helm` >= 3.12 (to install ingress, cert-manager, external-secrets)
- A Kubernetes cluster with metrics-server
- DNS records pointing to the Ingress controller (e.g., `game.example.com`)

## Operator installation steps (once per cluster)
1. **NGINX Ingress Controller** (if not present):
   ```bash
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace
   ```

2. **cert-manager**:
   ```bash
   helm repo add jetstack https://charts.jetstack.io
   helm upgrade --install cert-manager jetstack/cert-manager -n cert-manager --create-namespace \
     --set installCRDs=true
   kubectl apply -f k8s/cluster/clusterissuer-letsencrypt.yaml
   ```

3. **External Secrets Operator** (to manage secrets from KMS/SM):
   ```bash
   helm repo add external-secrets https://charts.external-secrets.io
   helm upgrade --install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace
   # Ensure a ClusterSecretStore exists for dev/stage/prod (outside this repo).
   ```

## Structure
```
k8s/
  base/            # shared components
  overlays/
    dev/           # local Redis/PG (dev)
    stage/         # local Redis/PG (stage)
    prod/          # managed (external) Redis/DB, WAF/rate-limit
  cluster/         # ClusterIssuer (Let's Encrypt)
ai.md              # this file
```

## Quick start

1. Change the domain in `k8s/base/ingress.yaml` (host) and the email in `clusterissuer-letsencrypt.yaml`.

2. **Dev**:
   ```bash
   kubectl apply -f k8s/cluster/clusterissuer-letsencrypt.yaml
   kubectl kustomize k8s/overlays/dev | kubectl apply -f -
   # wait for TLS: kubectl -n game get cert,ing
   ```

3. **Stage**:
   ```bash
   kubectl kustomize k8s/overlays/stage | kubectl apply -f -
   ```

4. **Prod** (with managed services):
   - Set secrets in External Secrets for keys: `JWT_SIGNING_KEY`, `DATABASE_URL`, `REDIS_ADDR`, `REDIS_PASSWORD`.
   - Update `managed-db-svc.yaml` and `managed-redis-svc.yaml` (ExternalName).
   - Deploy:
     ```bash
     kubectl kustomize k8s/overlays/prod | kubectl apply -f -
     ```

## Domain and environment
- Set your domain in `k8s/base/ingress.yaml` (`game.example.com` → your own).
- `APP_ENV` is patched per overlay (dev/stage/prod).

## Scaling and security
- **HPA**: gateway/worker/matchmaker -> CPU (easy to extend with custom metrics).
- **PodAntiAffinity + TopologySpread** (balance across nodes/zones).
- **NetworkPolicy**: default deny; gateway is the only public entrypoint.
- **ExternalSecrets**: keys never land in the repo.
- **PDB**: gateway/worker, Redis/PG (in dev/stage).
- **Prod ingress** with WAF/OWASP CRS + rate limiting (NGINX annotations).

## DB migrations and init
- In production, run migrations (e.g., `golang-migrate`) via a separate job/CI.
- In dev/stage Postgres starts empty – remember seeds.

## Debug and health
- `/healthz` (readiness), `/livez` (liveness), `/metrics` (Prometheus) – exposed in base manifests.
- Include Prometheus Operator and Grafana (not part of this package).

## Environment switches
- **APP_ENV**: dev|stage|prod (ConfigMap).
- **Secrets** (DB/Redis/JWT) – via ExternalSecrets per environment.
- In prod there is no Redis/PG StatefulSet – we use managed services.

## Teardown
```bash
kubectl delete ns game
helm uninstall cert-manager -n cert-manager
helm uninstall ingress-nginx -n ingress-nginx
helm uninstall external-secrets -n external-secrets
```

## Notes
- Serve the Godot Web front (HTML5/WASM) via CDN/bucket; client connects to `wss://game.yourdomain/...`.
- If you need WebRTC/TURN – add a separate service and Ingress (out of scope here).
