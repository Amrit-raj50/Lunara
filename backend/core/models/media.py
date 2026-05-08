from pydantic import BaseModel, Field
from typing import Optional
import datetime

class LibraryAsset(BaseModel):
    id: str
    filename: str
    file_type: str
    url: str
    size: int
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
