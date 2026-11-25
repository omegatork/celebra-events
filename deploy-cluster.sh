#!/usr/bin/env bash
# Deploys celebra.events to the MicroK8s home cluster.
#
#   ./deploy-cluster.sh stage   -> celebra-stage (http://192.168.100.240)
#   ./deploy-cluster.sh prod    -> celebra-prod  (https://celebra.omegatork.com, http://192.168.100.241)
#
# INTERIM process until container images + GitOps exist (Documentation/adr/0003):
#   1. apply the namespace manifest (DB cluster is in k8s/db/, applied separately)
#   2. build a new release in /app/runtime/releases/<timestamp> inside the running pod
#      (the live server keeps serving the previous release while this builds)
#   3. run DB migrations + one-time JSON import
#   4. switch the "current" symlink and restart the pod so it serves the new release
set -euo pipefail
cd "$(dirname "$0")"

ENV_TARGET="${1:-stage}"
case "$ENV_TARGET" in
  stage) BUILD_ENV="staging";    MANIFEST="k8s/stage.yaml"; NAMESPACE="celebra-stage"; CHECK_URL="http://192.168.100.240" ;;
  prod)  BUILD_ENV="production"; MANIFEST="k8s/prod.yaml";  NAMESPACE="celebra-prod";  CHECK_URL="http://192.168.100.241" ;;
  *) echo "Usage: ./deploy-cluster.sh [stage|prod]"; exit 1 ;;
esac

RELEASE="$(date +%Y%m%d%H%M%S)"
TARBALL="/tmp/celebra-release-${RELEASE}.tar.gz"

echo "==> [1/5] Applying $MANIFEST"
kubectl get secret celebra-db-app -n "$NAMESPACE" >/dev/null \
  || { echo "Missing secret celebra-db-app. Apply k8s/db/${ENV_TARGET}-db.yaml first."; exit 1; }
kubectl get secret celebra-auth -n "$NAMESPACE" >/dev/null \
  || { echo "Missing secret celebra-auth (admin-password, session-secret). See README."; exit 1; }
kubectl apply -f "$MANIFEST"

echo "==> [2/5] Waiting for a running pod"
# If the manifest changed, Recreate replaces the pod; give the rollout a chance to settle.
# (A brand-new environment has no build yet, so its pod won't be Ready; that's expected.)
kubectl rollout status deployment/celebra-web -n "$NAMESPACE" --timeout=120s >/dev/null 2>&1 || true
POD=""
for _ in $(seq 1 60); do
  POD="$(kubectl get pods -n "$NAMESPACE" -l app=celebra-web --field-selector=status.phase=Running \
          -o custom-columns=NAME:.metadata.name,DEL:.metadata.deletionTimestamp --no-headers 2>/dev/null \
          | awk '$2=="<none>"{print $1}' | tail -n 1 || true)"
  [[ -n "$POD" ]] && break
  sleep 3
done
[[ -n "$POD" ]] || { echo "No running pod in $NAMESPACE"; exit 1; }
echo "    pod: $POD"

echo "==> [3/5] Uploading release $RELEASE"
mkdir -p public
# COPYFILE_DISABLE + --no-xattrs: stop macOS tar from adding "._*" AppleDouble files.
COPYFILE_DISABLE=1 tar --no-xattrs -czf "$TARBALL" package.json next.config.mjs tsconfig.json tailwind.config.ts postcss.config.js \
  public src migrations scripts
kubectl cp "$TARBALL" "$NAMESPACE/$POD:/tmp/release.tar.gz"
rm -f "$TARBALL"

echo "==> [4/5] Building, migrating and switching release (takes ~2-3 min)"
kubectl exec -n "$NAMESPACE" "$POD" -- sh -c "
  set -e
  R=/app/runtime/releases/$RELEASE
  mkdir -p \$R
  tar -xzf /tmp/release.tar.gz -C \$R && rm -f /tmp/release.tar.gz
  cd \$R
  npm install --no-audit --no-fund
  NEXT_PUBLIC_APP_ENV=$BUILD_ENV npm run build
  cp -r public .next/standalone/public
  cp -r .next/static .next/standalone/.next/static
  node scripts/migrate.mjs
  node scripts/import-json.mjs
  ln -sfn \$R /app/runtime/current
  # keep the 3 most recent releases
  cd /app/runtime/releases && ls -1t | tail -n +4 | xargs -r rm -rf
  echo \"current -> \$(readlink /app/runtime/current)\"
"

echo "==> [5/5] Restarting to serve the new release"
kubectl rollout restart deployment/celebra-web -n "$NAMESPACE"
kubectl rollout status deployment/celebra-web -n "$NAMESPACE" --timeout=180s

for _ in $(seq 1 20); do
  if curl -fsS "$CHECK_URL/api/readyz" >/dev/null 2>&1; then
    echo ""
    echo "Deployed release $RELEASE to $ENV_TARGET: $CHECK_URL (readyz OK)"
    exit 0
  fi
  sleep 3
done
echo "Release $RELEASE deployed but $CHECK_URL/api/readyz is not healthy. Check: kubectl logs -n $NAMESPACE deploy/celebra-web"
exit 1
