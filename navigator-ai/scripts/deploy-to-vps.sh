#!/bin/bash
set -euo pipefail

HOST="${DEPLOY_HOST:-31.128.42.170}"
PASS="${DEPLOY_PASS:?Set DEPLOY_PASS}"
PUBLIC_HOST="${PUBLIC_HOST:-31-128-42-170.sslip.io}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(dirname "$0")"

run_ssh() {
  expect "$SCRIPT_DIR/remote-install.exp" "$HOST" "$PASS" "$1"
}

run_scp() {
  local src="$1"
  local dest="$2"
  expect -c "
    set timeout 600
    spawn scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null {$src} root@${HOST}:${dest}
    expect \"password:\"
    send \"${PASS}\r\"
    expect eof
  "
}

echo "==> Preparing archive..."
TMP=$(mktemp /tmp/navigai.XXXXXX.tgz)
COPYFILE_DISABLE=1 tar -czf "$TMP" -C "$(dirname "$ROOT")" \
  --exclude='navigator-ai/.venv' \
  --exclude='navigator-ai/frontend/node_modules' \
  --exclude='navigator-ai/frontend/dist' \
  --exclude='navigator-ai/*.db' \
  --exclude='navigator-ai/.env' \
  --exclude='._*' \
  --exclude='**/__pycache__' \
  --exclude='**/.DS_Store' \
  "$(basename "$ROOT")"

echo "==> Installing Docker on server..."
run_ssh "apt-get update -qq && apt-get install -y -qq ca-certificates curl && \
  if ! command -v docker >/dev/null; then \
    curl -fsSL https://get.docker.com | sh; \
  fi && \
  mkdir -p /opt/navigai"

echo "==> Uploading project..."
run_scp "$TMP" "/tmp/navigai.tgz"
run_ssh "rm -rf /opt/navigai/app && mkdir -p /opt/navigai/app && tar -xzf /tmp/navigai.tgz -C /opt/navigai/app --strip-components=1 && rm /tmp/navigai.tgz"

if [[ ! -f "$ROOT/.env.production" ]]; then
  echo "ERROR: Create $ROOT/.env.production first"
  exit 1
fi

echo "==> Uploading .env.production..."
run_scp "$ROOT/.env.production" "/opt/navigai/app/.env"

echo "==> Starting stack..."
run_ssh "cd /opt/navigai/app && docker compose -f docker-compose.prod.yml up -d --build"

rm -f "$TMP"
echo "==> Done. API: https://${PUBLIC_HOST}"
