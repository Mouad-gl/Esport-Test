from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./esport_photoshoot.db"

    NANO_BANANA_API_URL: str = "https://api.nanobanana.ai/v2"
    NANO_BANANA_API_KEY: str = "demo_key"
    NANO_BANANA_MODEL: str = "nano-banana-2"
    NANO_BANANA_TIMEOUT: int = 120

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    QUALITY_MIN_RESOLUTION: int = 512
    QUALITY_MIN_SCORE: int = 60

    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key"

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def upload_originals_dir(self) -> Path:
        return Path(self.UPLOAD_DIR) / "originals"

    @property
    def upload_generated_dir(self) -> Path:
        return Path(self.UPLOAD_DIR) / "generated"


settings = Settings()
