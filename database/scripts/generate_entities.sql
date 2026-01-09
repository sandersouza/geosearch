-- Generate random named entities inside a polygon table (SRID 4674).
-- Usage: \set source_table 'br-rj' \set count 1000 then run this file in psql.
\set source_table 'br-rj'
\set count 1000

CREATE TABLE IF NOT EXISTS public.entities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    geom GEOMETRY(Point, 4674) NOT NULL
);

CREATE INDEX IF NOT EXISTS entities_geom_idx
    ON public.entities
    USING GIST (geom);

WITH src AS (
    SELECT geom
    FROM public.:"source_table"
    LIMIT 1
),
pts AS (
    SELECT (ST_Dump(ST_GeneratePoints(src.geom, :count))).geom AS geom
    FROM src
)
INSERT INTO public.entities (name, geom)
SELECT
    'entidade_' || lpad((row_number() OVER ())::text, 4, '0') || '_' || substr(md5(random()::text), 1, 6),
    geom
FROM pts;

-- Generate random named entities inside a polygon table (SRID 4674).
-- Usage: \set source_table 'br-sp' \set count 1000 then run this file in psql.
\set source_table 'br-sp'
\set count 3000

WITH src AS (
    SELECT geom
    FROM public.:"source_table"
    LIMIT 1
),
pts AS (
    SELECT (ST_Dump(ST_GeneratePoints(src.geom, :count))).geom AS geom
    FROM src
)
INSERT INTO public.entities (name, geom)
SELECT
    'entidade_' || lpad((row_number() OVER ())::text, 4, '0') || '_' || substr(md5(random()::text), 1, 6),
    geom
FROM pts;

-- Generate random named entities inside a polygon table (SRID 4674).
-- Usage: \set source_table 'br-mg' \set count 1000 then run this file in psql.
\set source_table 'br-mg'
\set count 5000

WITH src AS (
    SELECT geom
    FROM public.:"source_table"
    LIMIT 1
),
pts AS (
    SELECT (ST_Dump(ST_GeneratePoints(src.geom, :count))).geom AS geom
    FROM src
)
INSERT INTO public.entities (name, geom)
SELECT
    'entidade_' || lpad((row_number() OVER ())::text, 4, '0') || '_' || substr(md5(random()::text), 1, 6),
    geom
FROM pts;
