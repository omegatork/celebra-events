#!/usr/bin/env bash
set -euo pipefail

# Deploy script for celebra.events to your MicroK8s Home Cluster
# Control Plane: mllse1 (192.168.100.54)
# Worker Node:   mllse02 (192.168.100.38)
# MetalLB Pool:  192.168.100.240 (Stage) | 192.168.100.241 (Prod)

ENV_TARGET="${1:-stage}"

if [[ "$ENV_TARGET" != "stage" && "$ENV_TARGET" != "prod" ]]; then
  echo "Usage: ./deploy-cluster.sh [stage|prod]"
  exit 1
fi

if [[ "$ENV_TARGET" == "stage" ]]; then
  BUILD_ENV="staging"
  MANIFEST="k8s/stage.yaml"
  NAMESPACE="celebra-stage"
  LB_IP="192.168.100.240"
else
  BUILD_ENV="production"
  MANIFEST="k8s/prod.yaml"
  NAMESPACE="celebra-prod"
  LB_IP="192.168.100.241"
fi

echo "==> [1/3] Applying Kubernetes manifest ($MANIFEST)..."
kubectl apply -f "$MANIFEST"

echo "==> [2/3] Waiting for pod in namespace $NAMESPACE to enter Running state..."
for i in {1..30}; do
  POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app=celebra-web -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  POD_PHASE=$(kubectl get pods -n "$NAMESPACE" -l app=celebra-web -o jsonpath='{.items[0].status.phase}' 2>/dev/null || true)
  if [[ -n "$POD_NAME" && "$POD_PHASE" == "Running" ]]; then
    break
  fi
  sleep 2
done

echo "==> [3/3] Packaging source, uploading to pod $POD_NAME, and building standalone server..."
mkdir -p public
tar --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='k8s' \
  -czf /tmp/celebra-src.tar.gz package.json next.config.mjs tsconfig.json tailwind.config.ts postcss.config.js public src

kubectl cp /tmp/celebra-src.tar.gz "$NAMESPACE/$POD_NAME:/tmp/celebra-src.tar.gz"
kubectl exec -n "$NAMESPACE" "$POD_NAME" -- sh -c \
  "tar -xzf /tmp/celebra-src.tar.gz -C /app/runtime && cd /app/runtime && npm install && NEXT_PUBLIC_APP_ENV=$BUILD_ENV npm run build && cp -r public .next/standalone/public 2>/dev/null || true && cp -r .next/static .next/standalone/.next/static"

rm -f /tmp/celebra-src.tar.gz

echo ""
echo "============================================================"
echo " Deployed celebra.events ($ENV_TARGET) successfully!"
echo " Access URL on your home network: http://$LB_IP"
echo " Dashboard URL:                   http://$LB_IP/dashboard"
echo "============================================================"
