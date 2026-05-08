import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Lunara Backend"
    API_V1_STR: str = "/api/v1"
    
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb+srv://amrit-123:amrit-123@cluster0.hgh6hxe.mongodb.net/Lunara")
    
    BASE_URL: str = os.getenv("BASE_URL", "")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.BASE_URL:
            railway_domain = os.getenv("RAILWAY_PUBLIC_DOMAIN")
            if railway_domain:
                self.BASE_URL = f"https://{railway_domain}"
            else:
                self.BASE_URL = "http://localhost:8000"

settings = Settings()
