import json

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import text

from app.lib.db import get_engine

router = APIRouter(tags=["entities"])


class NearbyEntity(BaseModel):
    id: int
    name: str
    lat: float
    lon: float


class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: dict
    properties: dict


class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: list[GeoJSONFeature]


@router.get(
    "/entities",
    response_model=list[NearbyEntity] | GeoJSONFeatureCollection,
    summary="Lista todas as entidades",
    description="Retorna todas as entidades cadastradas. Pode devolver GeoJSON.",
)
def list_entities(
    geojson: bool = Query(
        False,
        description="Quando true, retorna GeoJSON (FeatureCollection).",
    ),
) -> list[NearbyEntity] | GeoJSONFeatureCollection:
    query = text(
        """
        SELECT id,
               name,
               ST_Y(geom) AS lat,
               ST_X(geom) AS lon,
               ST_AsGeoJSON(geom) AS geojson
        FROM public.rj_entities
        ORDER BY name
        """
    )
    with get_engine().connect() as connection:
        rows = connection.execute(query)
        items = rows.mappings().all()
        if not geojson:
            return [NearbyEntity(**row) for row in items]
        features = [
            GeoJSONFeature(
                geometry=json.loads(item["geojson"]),
                properties={
                    "id": item["id"],
                    "name": item["name"],
                    "lat": item["lat"],
                    "lon": item["lon"],
                    "is_base": False,
                },
            )
            for item in items
        ]
        return GeoJSONFeatureCollection(features=features)


@router.get(
    "/entities/nearby",
    response_model=list[NearbyEntity] | GeoJSONFeatureCollection,
    summary="Entidades em um raio (metros) da entidade informada",
    description=(
        "Busca entidades dentro de um raio em metros a partir de uma entidade base, "
        "usando PostGIS com ST_DWithin."
    ),
)
def get_entities_nearby(
    entity: str = Query(..., min_length=1, description="Nome da entidade base."),
    range_meters: int = Query(
        ...,
        alias="range",
        ge=1,
        description="Raio de busca em metros.",
    ),
    geojson: bool = Query(
        False,
        description="Quando true, retorna GeoJSON (FeatureCollection).",
    ),
) -> list[NearbyEntity] | GeoJSONFeatureCollection:
    if geojson:
        query = text(
            """
            WITH base AS (
                SELECT id, name, geom
                FROM public.rj_entities
                WHERE name = :entity
            )
            SELECT e2.id,
                   e2.name,
                   ST_Y(e2.geom) AS lat,
                   ST_X(e2.geom) AS lon,
                   ST_AsGeoJSON(e2.geom) AS geojson,
                   false AS is_base
            FROM base e1
            JOIN public.rj_entities e2
              ON ST_DWithin(e1.geom::geography, e2.geom::geography, :range_meters)
            WHERE e2.name <> e1.name
            UNION ALL
            SELECT e1.id,
                   e1.name,
                   ST_Y(e1.geom) AS lat,
                   ST_X(e1.geom) AS lon,
                   ST_AsGeoJSON(e1.geom) AS geojson,
                   true AS is_base
            FROM base e1
            """
        )
    else:
        query = text(
            """
            SELECT e2.id,
                   e2.name,
                   ST_Y(e2.geom) AS lat,
                   ST_X(e2.geom) AS lon
            FROM public.rj_entities e1
            JOIN public.rj_entities e2
              ON ST_DWithin(e1.geom::geography, e2.geom::geography, :range_meters)
            WHERE e1.name = :entity
              AND e2.name <> e1.name
            """
        )
    with get_engine().connect() as connection:
        rows = connection.execute(query, {"entity": entity, "range_meters": range_meters})
        items = rows.mappings().all()
        if not geojson:
            return [NearbyEntity(**row) for row in items]
        features = [
            GeoJSONFeature(
                geometry=json.loads(item["geojson"]),
                properties={
                    "id": item["id"],
                    "name": item["name"],
                    "lat": item["lat"],
                    "lon": item["lon"],
                    "is_base": item["is_base"],
                },
            )
            for item in items
        ]
        return GeoJSONFeatureCollection(features=features)
