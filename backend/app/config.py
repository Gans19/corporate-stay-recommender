"""Application configuration.

All connection secrets are read from environment variables (or a local .env
file during development) and are never hard-coded or committed to the repo.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- CognoDB / Neo4j connection ---
    neo4j_uri: str = "bolt+s://localhost"
    neo4j_user: str = "cognodb"
    neo4j_password: str = ""
    neo4j_database: str = "neo4j"

    # --- API ---
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance so the .env file is parsed only once."""
    return Settings()
