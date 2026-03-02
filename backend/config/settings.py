"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Industry Brain"
    debug: bool = True

    # Database
    postgres_url: str = "postgresql+asyncpg://brain:brain@localhost:5432/industry_brain"
    neo4j_url: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "brain_dev"
    redis_url: str = "redis://localhost:6379/0"

    # LiteLLM
    litellm_config_path: str = "backend/config/litellm_config.yaml"

    # Industry
    default_industry_id: str = "petrochemical"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = {"env_prefix": "BRAIN_", "env_file": ".env"}


settings = Settings()
