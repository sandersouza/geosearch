from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from app.core.config import get_settings


_engine: Optional[Engine] = None


def get_engine(database_url: Optional[str] = None) -> Engine:
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_engine(database_url or settings.database_url, pool_pre_ping=True)
    return _engine
