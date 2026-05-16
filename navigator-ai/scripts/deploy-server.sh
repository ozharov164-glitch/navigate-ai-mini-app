#!/bin/bash
# Деплой на VPS (запускать на сервере из /opt/navigai)
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml ps
