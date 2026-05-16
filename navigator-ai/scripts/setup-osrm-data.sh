#!/bin/bash
# Подготовка OSRM для России (центр). Запускать на VPS один раз: ~15–30 мин.
set -euo pipefail
DATA_DIR="${1:-./osrm-data}"
mkdir -p "$DATA_DIR"
cd "$DATA_DIR"

if [ -f map.osrm ]; then
  echo "map.osrm уже есть"
  exit 0
fi

echo "==> Скачивание extract (central-fedistrict)..."
wget -q -O region.osm.pbf https://download.geofabrik.de/russia/central-fedistrict-latest.osm.pbf

echo "==> Extract..."
docker run --rm -t -v "$(pwd):/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/region.osm.pbf -o /data/map.osrm

echo "==> Partition + customize..."
docker run --rm -t -v "$(pwd):/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/map.osrm
docker run --rm -t -v "$(pwd):/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/map.osrm

echo "==> Готово. Смонтируйте $DATA_DIR в docker-compose volume osrm_data"
