FROM postgis/postgis:15-3.4

ENV POSTGRES_USER=postgres \
    POSTGRES_PASSWORD=postgres

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgis \
    && rm -rf /var/lib/apt/lists/*

COPY RJ_UF_2024.cpg /data/RJ_UF_2024.cpg
COPY RJ_UF_2024.dbf /data/RJ_UF_2024.dbf
COPY RJ_UF_2024.prj /data/RJ_UF_2024.prj
COPY RJ_UF_2024.shp /data/RJ_UF_2024.shp
COPY RJ_UF_2024.shx /data/RJ_UF_2024.shx

COPY initdb/01-load-rj.sh /docker-entrypoint-initdb.d/01-load-rj.sh
COPY scripts/generate_entities.sql /docker-entrypoint-initdb.d/02-generate-entities.sql

RUN chmod +x /docker-entrypoint-initdb.d/01-load-rj.sh
