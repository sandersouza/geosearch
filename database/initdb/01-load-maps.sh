#!/bin/bash
set -euo pipefail

DB_NAME="${POSTGRES_DB:-postgres}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$DB_NAME" \
  -c "CREATE EXTENSION IF NOT EXISTS postgis;"

export SHAPE_RESTORE_SHX=YES

MAP_ROOT="/data/maps"
MAP_SRID="${MAP_SRID:-4674}"

if [ ! -d "$MAP_ROOT" ]; then
  echo "No maps directory found at $MAP_ROOT; skipping import."
  exit 0
fi

find "$MAP_ROOT" -type f -name "*.shp" -print0 | while IFS= read -r -d '' shp; do
  rel="${shp#"$MAP_ROOT"/}"
  country="$(printf '%s' "$rel" | cut -d/ -f1 | tr '[:upper:]' '[:lower:]')"
  uf="$(printf '%s' "$rel" | cut -d/ -f2 | tr '[:upper:]' '[:lower:]')"

  if [ -z "$country" ] || [ -z "$uf" ]; then
    echo "Skipping $shp (expected structure /country/uf/*.shp)."
    continue
  fi

  case "$country" in
    ptbr|pt-br|pt_br)
      country="br"
      ;;
  esac

  table_name="${country}-${uf}"
  safe_table="$(printf '%s' "${country}_${uf}" | tr -c '[:alnum:]_' '_')"
  cpg="${shp%.shp}.cpg"
  encoding=""

  if [ -f "$cpg" ]; then
    encoding="$(tr -d '\r\n' < "$cpg" | tr '[:lower:]' '[:upper:]')"
    case "$encoding" in
      1252) encoding="LATIN1" ;;
      65001) encoding="UTF-8" ;;
    esac
  fi

  echo "Importing $shp -> public.\"$table_name\" (SRID $MAP_SRID${encoding:+, encoding $encoding})"

  encoding_opt=()
  if [ -n "$encoding" ]; then
    encoding_opt=(-W "$encoding")
  fi

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$DB_NAME" \
    -c "DROP TABLE IF EXISTS public.\"$table_name\" CASCADE;" \
    -c "DROP TABLE IF EXISTS public.\"$safe_table\" CASCADE;"

  shp2pgsql -I -s "$MAP_SRID" "${encoding_opt[@]}" "$shp" "public.$safe_table" \
    | psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$DB_NAME"

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$DB_NAME" \
    -c "ALTER TABLE public.\"$safe_table\" RENAME TO \"$table_name\";"
done
