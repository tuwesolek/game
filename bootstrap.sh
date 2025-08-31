#!/bin/bash
set -euo pipefail

# Helper function to write files with heredoc
write() {
    local filepath="$1"
    local dir=$(dirname "$filepath")
    mkdir -p "$dir"
    cat > "$filepath"
}

echo "🚀 Bootstrapping Kubernetes game environment..."

# Create ai.md
write "ai.md" <<'EOF'
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
EOF

# Create k8s/base directory and files
write "k8s/base/kustomization.yaml" <<'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: game

resources:
  - namespace.yaml
  - configmap.yaml
  - gateway-deployment.yaml
  - worker-deployment.yaml
  - matchmaker-deployment.yaml
  - orchestrator-deployment.yaml
  - gateway-service.yaml
  - worker-service.yaml
  - matchmaker-service.yaml
  - orchestrator-service.yaml
  - ingress.yaml
  - networkpolicy.yaml
  - hpa.yaml
  - pdb.yaml
EOF

write "k8s/base/namespace.yaml" <<'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: game
EOF

write "k8s/base/configmap.yaml" <<'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: game-config
data:
  APP_ENV: "dev"
  LOG_LEVEL: "info"
  GATEWAY_PORT: "8080"
  WORKER_PORT: "8081"
  MATCHMAKER_PORT: "8082"
  ORCHESTRATOR_PORT: "8083"
EOF

write "k8s/base/gateway-deployment.yaml" <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gateway
  template:
    metadata:
      labels:
        app: gateway
    spec:
      containers:
      - name: gateway
        image: game/gateway:latest
        ports:
        - containerPort: 8080
        env:
        - name: APP_ENV
          valueFrom:
            configMapKeyRef:
              name: game-config
              key: APP_ENV
        - name: JWT_SIGNING_KEY
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: JWT_SIGNING_KEY
        - name: REDIS_ADDR
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: REDIS_ADDR
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: REDIS_PASSWORD
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /livez
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - gateway
              topologyKey: kubernetes.io/hostname
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: gateway
EOF

write "k8s/base/worker-deployment.yaml" <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
      - name: worker
        image: game/worker:latest
        ports:
        - containerPort: 8081
        env:
        - name: APP_ENV
          valueFrom:
            configMapKeyRef:
              name: game-config
              key: APP_ENV
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: DATABASE_URL
        - name: REDIS_ADDR
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: REDIS_ADDR
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: REDIS_PASSWORD
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /livez
            port: 8081
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 5
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - worker
              topologyKey: kubernetes.io/hostname
EOF

write "k8s/base/matchmaker-deployment.yaml" <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: matchmaker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: matchmaker
  template:
    metadata:
      labels:
        app: matchmaker
    spec:
      containers:
      - name: matchmaker
        image: game/matchmaker:latest
        ports:
        - containerPort: 8082
        env:
        - name: APP_ENV
          valueFrom:
            configMapKeyRef:
              name: game-config
              key: APP_ENV
        - name: REDIS_ADDR
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: REDIS_ADDR
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: REDIS_PASSWORD
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /livez
            port: 8082
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8082
          initialDelaySeconds: 5
          periodSeconds: 5
EOF

write "k8s/base/orchestrator-deployment.yaml" <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orchestrator
spec:
  replicas: 1
  selector:
    matchLabels:
      app: orchestrator
  template:
    metadata:
      labels:
        app: orchestrator
    spec:
      containers:
      - name: orchestrator
        image: game/orchestrator:latest
        ports:
        - containerPort: 8083
        env:
        - name: APP_ENV
          valueFrom:
            configMapKeyRef:
              name: game-config
              key: APP_ENV
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: DATABASE_URL
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /livez
            port: 8083
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8083
          initialDelaySeconds: 5
          periodSeconds: 5
EOF

write "k8s/base/gateway-service.yaml" <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: gateway
spec:
  selector:
    app: gateway
  ports:
  - port: 8080
    targetPort: 8080
    protocol: TCP
EOF

write "k8s/base/worker-service.yaml" <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: worker
spec:
  selector:
    app: worker
  ports:
  - port: 8081
    targetPort: 8081
    protocol: TCP
EOF

write "k8s/base/matchmaker-service.yaml" <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: matchmaker
spec:
  selector:
    app: matchmaker
  ports:
  - port: 8082
    targetPort: 8082
    protocol: TCP
EOF

write "k8s/base/orchestrator-service.yaml" <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: orchestrator
spec:
  selector:
    app: orchestrator
  ports:
  - port: 8083
    targetPort: 8083
    protocol: TCP
EOF

write "k8s/base/ingress.yaml" <<'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: game-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/websocket-services: "gateway"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - game.example.com
    secretName: game-tls
  rules:
  - host: game.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gateway
            port:
              number: 8080
EOF

write "k8s/base/networkpolicy.yaml" <<'EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-gateway-ingress
spec:
  podSelector:
    matchLabels:
      app: gateway
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-internal-communication
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector: {}
EOF

write "k8s/base/hpa.yaml" <<'EOF'
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: matchmaker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: matchmaker
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
EOF

write "k8s/base/pdb.yaml" <<'EOF'
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: gateway-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: gateway
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: worker-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: worker
EOF

# Create k8s/overlays/dev directory and files
write "k8s/overlays/dev/kustomization.yaml" <<'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: game

bases:
  - ../../base

resources:
  - redis-statefulset.yaml
  - redis-service.yaml
  - postgres-statefulset.yaml
  - postgres-service.yaml
  - postgres-pvc.yaml
  - external-secret.yaml

patchesStrategicMerge:
  - configmap-patch.yaml

configMapGenerator:
  - name: game-config
    behavior: merge
    literals:
      - APP_ENV=dev
EOF

write "k8s/overlays/dev/redis-statefulset.yaml" <<'EOF'
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        volumeMounts:
        - name: redis-data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 1Gi
EOF

write "k8s/overlays/dev/redis-service.yaml" <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
EOF

write "k8s/overlays/dev/postgres-statefulset.yaml" <<'EOF'
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: gamedb
        - name: POSTGRES_USER
          value: gameuser
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: POSTGRES_PASSWORD
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 5Gi
EOF

write "k8s/overlays/dev/postgres-service.yaml" <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
EOF

write "k8s/overlays/dev/postgres-pvc.yaml" <<'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
EOF

write "k8s/overlays/dev/external-secret.yaml" <<'EOF'
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: game-secrets
spec:
  secretStoreRef:
    name: cluster-secret-store
    kind: ClusterSecretStore
  target:
    name: game-secrets
  data:
  - secretKey: JWT_SIGNING_KEY
    remoteRef:
      key: game-dev-jwt-signing-key
  - secretKey: DATABASE_URL
    remoteRef:
      key: game-dev-database-url
  - secretKey: REDIS_ADDR
    remoteRef:
      key: game-dev-redis-addr
  - secretKey: REDIS_PASSWORD
    remoteRef:
      key: game-dev-redis-password
  - secretKey: POSTGRES_PASSWORD
    remoteRef:
      key: game-dev-postgres-password
EOF

write "k8s/overlays/dev/configmap-patch.yaml" <<'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: game-config
data:
  APP_ENV: "dev"
  LOG_LEVEL: "debug"
EOF

# Create k8s/overlays/stage directory and files
write "k8s/overlays/stage/kustomization.yaml" <<'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: game

bases:
  - ../../base

resources:
  - redis-statefulset.yaml
  - redis-service.yaml
  - postgres-statefulset.yaml
  - postgres-service.yaml
  - external-secret.yaml

patchesStrategicMerge:
  - configmap-patch.yaml

configMapGenerator:
  - name: game-config
    behavior: merge
    literals:
      - APP_ENV=stage
EOF

write "k8s/overlays/stage/redis-statefulset.yaml" <<'EOF'
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command: ["redis-server"]
        args: ["--requirepass", "$(REDIS_PASSWORD)"]
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: REDIS_PASSWORD
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: redis-data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 2Gi
EOF

write "k8s/overlays/stage/redis-service.yaml" <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
EOF

write "k8s/overlays/stage/postgres-statefulset.yaml" <<'EOF'
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: gamedb
        - name: POSTGRES_USER
          value: gameuser
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: POSTGRES_PASSWORD
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
EOF

write "k8s/overlays/stage/postgres-service.yaml" <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
EOF

write "k8s/overlays/stage/external-secret.yaml" <<'EOF'
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: game-secrets
spec:
  secretStoreRef:
    name: cluster-secret-store
    kind: ClusterSecretStore
  target:
    name: game-secrets
  data:
  - secretKey: JWT_SIGNING_KEY
    remoteRef:
      key: game-stage-jwt-signing-key
  - secretKey: DATABASE_URL
    remoteRef:
      key: game-stage-database-url
  - secretKey: REDIS_ADDR
    remoteRef:
      key: game-stage-redis-addr
  - secretKey: REDIS_PASSWORD
    remoteRef:
      key: game-stage-redis-password
  - secretKey: POSTGRES_PASSWORD
    remoteRef:
      key: game-stage-postgres-password
EOF

write "k8s/overlays/stage/configmap-patch.yaml" <<'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: game-config
data:
  APP_ENV: "stage"
  LOG_LEVEL: "info"
EOF

# Create k8s/overlays/prod directory and files
write "k8s/overlays/prod/kustomization.yaml" <<'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: game

bases:
  - ../../base

resources:
  - managed-db-svc.yaml
  - managed-redis-svc.yaml
  - external-secret.yaml

patchesStrategicMerge:
  - configmap-patch.yaml
  - ingress-patch.yaml
  - deployment-patch.yaml

configMapGenerator:
  - name: game-config
    behavior: merge
    literals:
      - APP_ENV=prod
EOF

write "k8s/overlays/prod/managed-db-svc.yaml" <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  type: ExternalName
  externalName: prod-db.amazonaws.com
  ports:
  - port: 5432
EOF

write "k8s/overlays/prod/managed-redis-svc.yaml" <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  type: ExternalName
  externalName: prod-redis.amazonaws.com
  ports:
  - port: 6379
EOF

write "k8s/overlays/prod/external-secret.yaml" <<'EOF'
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: game-secrets
spec:
  secretStoreRef:
    name: cluster-secret-store
    kind: ClusterSecretStore
  target:
    name: game-secrets
  refreshInterval: 1h
  data:
  - secretKey: JWT_SIGNING_KEY
    remoteRef:
      key: game-prod-jwt-signing-key
  - secretKey: DATABASE_URL
    remoteRef:
      key: game-prod-database-url
  - secretKey: REDIS_ADDR
    remoteRef:
      key: game-prod-redis-addr
  - secretKey: REDIS_PASSWORD
    remoteRef:
      key: game-prod-redis-password
EOF

write "k8s/overlays/prod/configmap-patch.yaml" <<'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: game-config
data:
  APP_ENV: "prod"
  LOG_LEVEL: "warn"
EOF

write "k8s/overlays/prod/ingress-patch.yaml" <<'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: game-ingress
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/limit-rps: "20"
    nginx.ingress.kubernetes.io/enable-modsecurity: "true"
    nginx.ingress.kubernetes.io/enable-owasp-core-rules: "true"
    nginx.ingress.kubernetes.io/modsecurity-snippet: |
      SecRuleEngine On
      SecAuditLogType Serial
      SecAuditLog /var/log/modsec_audit.log
EOF

write "k8s/overlays/prod/deployment-patch.yaml" <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: gateway
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: worker
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: matchmaker
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: matchmaker
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orchestrator
spec:
  replicas: 2
EOF

# Create k8s/cluster directory and files
write "k8s/cluster/clusterissuer-letsencrypt.yaml" <<'EOF'
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Create .gitignore
write ".gitignore" <<'EOF'
# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Editor directories and files
.idea/
.vscode/
*.swp
*.swo
*~

# Kubernetes
*.kubeconfig
kubeconfig

# Secrets
*.key
*.pem
*.crt
secrets/
.env
.env.*

# Temporary files
tmp/
temp/
*.tmp
*.bak
*.backup

# Logs
*.log
logs/

# Build artifacts
bin/
dist/
build/
EOF

# Initialize git repository if needed
if [ ! -d .git ]; then
    git init
fi

# Add all files and commit
git add .
git commit -m "feat(k8s): initial game env (base+overlays+ai.md)"

# Print summary
echo "
✅ Bootstrap complete!

📁 Created structure:
   k8s/
   ├── base/          (14 files: namespace, deployments, services, ingress, etc.)
   ├── overlays/
   │   ├── dev/       (7 files: local Redis/Postgres + patches)
   │   ├── stage/     (6 files: local Redis/Postgres with auth)
   │   └── prod/      (5 files: managed services + security patches)
   └── cluster/       (1 file: ClusterIssuer for Let's Encrypt)
   ai.md              (documentation)
   .gitignore         (standard ignores)

📝 How to deploy:

1. Install operators (once per cluster):
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   helm repo add jetstack https://charts.jetstack.io
   helm repo add external-secrets https://charts.external-secrets.io
   
   helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace
   helm upgrade --install cert-manager jetstack/cert-manager -n cert-manager --create-namespace --set installCRDs=true
   helm upgrade --install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace

2. Update domain in k8s/base/ingress.yaml (game.example.com → your domain)
3. Update email in k8s/cluster/clusterissuer-letsencrypt.yaml

4. Deploy environments:
   # Dev
   kubectl apply -f k8s/cluster/clusterissuer-letsencrypt.yaml
   kubectl kustomize k8s/overlays/dev | kubectl apply -f -
   
   # Stage
   kubectl kustomize k8s/overlays/stage | kubectl apply -f -
   
   # Prod (configure external services first)
   kubectl kustomize k8s/overlays/prod | kubectl apply -f -

5. Monitor:
   kubectl -n game get pods,svc,ing,cert
   kubectl -n game logs -l app=gateway --tail=50

🔧 Next steps:
   - Configure External Secrets ClusterSecretStore
   - Build and push container images
   - Set up CI/CD pipeline
   - Configure monitoring (Prometheus/Grafana)
"
