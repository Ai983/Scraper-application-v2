import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")
    app_port: int = int(os.getenv("APP_PORT", "8000"))
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    google_places_api_key: str = os.getenv("GOOGLE_PLACES_API_KEY", "")
    apify_token: str = os.getenv("APIFY_TOKEN", "")
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")


settings = Settings()
