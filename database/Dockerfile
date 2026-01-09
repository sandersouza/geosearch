FROM postgis/postgis:15-3.4

ENV POSTGRES_USER=postgres \
    POSTGRES_PASSWORD=postgres

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgis \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=postgres:postgres maps /data/maps

COPY initdb/01-load-maps.sh /docker-entrypoint-initdb.d/01-load-maps.sh
COPY scripts/generate_entities.sql /docker-entrypoint-initdb.d/02-generate-entities.sql

RUN chmod +x /docker-entrypoint-initdb.d/01-load-maps.sh