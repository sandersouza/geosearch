#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -c "CREATE EXTENSION IF NOT EXISTS postgis;"

shp2pgsql -I -s 4674 /data/RJ_UF_2024.shp public.rj_uf_2024 \
  | psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"
