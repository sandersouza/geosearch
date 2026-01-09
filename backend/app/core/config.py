from functools import lru_cache
from pathlib import Path
import logging

from pydantic import Field
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Description:
    def __init__(self, description_path: Path | None = None) -> None:
        self._description_path = description_path or Path(__file__).resolve().parents[2] / "description.md"

    def load(self) -> str:
        if not self._description_path.exists():
            logger.warning("description.md not found at %s", self._description_path)
            return ""
        return self._description_path.read_text(encoding="utf-8")


def get_description() -> str:
    return Description().load()


class Settings(BaseSettings):
    app_name: str = "GeoSearch API"
    app_version: str = "0.1.0"
    database_url: str
    description: str = Field(default_factory=get_description)

    class Config:
        env_file = Path(__file__).resolve().parents[2] / ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
