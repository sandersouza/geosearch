# GeoSearch Backend

FastAPI REST API for the GeoSearch project. Routers are auto-discovered from `app/routers` and exposed in Swagger.

## Requirements

- Python 3.12
- pip

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment

Create `backend/.env` with:

```
APP_NAME=GeoSearch API
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/geosearch
```

## Run locally

```bash
uvicorn app.main:app --reload
```

Open `http://localhost:8000/docs` for Swagger UI.

## Run with Podman

```bash
podman compose up --build
```

## Lint (flake8)

```bash
flake8 app
```

## Project structure

- `app/main.py`: app factory
- `app/core/router_loader.py`: auto-load routers from `app/routers`
- `app/routers`: API routes (each file exposes `router`)
- `app/lib`: helper libraries (e.g. database)
