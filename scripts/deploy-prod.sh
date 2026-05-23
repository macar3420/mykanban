#!/usr/bin/env bash
# Run on the EC2 server: bash scripts/deploy-prod.sh [IMAGE_TAG]
# IMAGE_TAG defaults to "latest" (must exist on ghcr.io from CI).
set -euo pipefail

WORK_DIR="${WORK_DIR:-/home/macar/mykanban}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
IMAGE_TAG="${1:-latest}"

cd "$WORK_DIR"
test -f "$COMPOSE_FILE"
test -f .env || { echo "Missing .env in $WORK_DIR"; exit 1; }

export IMAGE_TAG
COMPOSE="docker-compose -f ${COMPOSE_FILE}"

echo "==> Deploy tag: ${IMAGE_TAG}"
echo "==> Work dir: ${WORK_DIR}"

if ! grep -q '"ghcr.io"' "${HOME}/.docker/config.json" 2>/dev/null; then
  echo "Log in first: echo TOKEN | docker login ghcr.io -u macar3420 --password-stdin"
  exit 1
fi

echo "==> Stopping old stack"
$COMPOSE down --remove-orphans || true

echo "==> Pulling images (may take several minutes on slow links)"
docker pull mysql:8.0
docker pull "ghcr.io/macar3420/mykanban-backend:${IMAGE_TAG}"
docker pull "ghcr.io/macar3420/mykanban-frontend:${IMAGE_TAG}"

echo "==> Starting stack"
$COMPOSE up -d
$COMPOSE ps

echo "==> Health"
sleep 5
curl -fsS http://localhost:3001/health
echo ""
curl -fsS -o /dev/null -w "frontend HTTP %{http_code}\n" http://localhost:8083/
