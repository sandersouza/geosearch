-- Generate random named entities inside the RJ polygon (SRID 4674).
-- Usage: \set count 10000 then run this file in psql.
\set count 10000

CREATE TABLE IF NOT EXISTS public.rj_entities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    geom GEOMETRY(Point, 4674) NOT NULL
);

CREATE INDEX IF NOT EXISTS rj_entities_geom_idx
    ON public.rj_entities
    USING GIST (geom);

WITH src AS (
    SELECT geom
    FROM public.rj_uf_2024
    LIMIT 1
),
pts AS (
    SELECT (ST_Dump(ST_GeneratePoints(src.geom, :count))).geom AS geom
    FROM src
)
INSERT INTO public.rj_entities (name, geom)
SELECT
    'entidade_' || lpad((row_number() OVER ())::text, 4, '0') || '_' || substr(md5(random()::text), 1, 6),
    geom
FROM pts;
