from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://invoice_user:dev_password@localhost:5432/invoice_db"
    
    # JWT
    JWT_SECRET: str = "dev_secret_key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24
    
    # Auth (hardcoded)
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "1q2w3e4R"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"
    
    # App
    APP_ENV: str = "development"
    PDF_STORAGE_PATH: str = "/app/pdfs"
    
    # Encryption key for SMTP password
    ENCRYPTION_KEY: Optional[str] = None
    
    # SMTP (from .env)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = ""
    
    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
