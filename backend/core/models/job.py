from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import datetime
from .template import VideoTemplate

class RenderJob(BaseModel):
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    template: VideoTemplate
    body_clips: List[str]
    output_folder: str
    output_prefix: str
    status: str = "pending"
    progress: float = 0.0
    error_message: str = ""
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    completed_at: Optional[datetime.datetime] = None

class RenderResult(BaseModel):
    job_id: str
    video_index: int
    output_path: str
    thumbnail_path: str = ""
    srt_path: str = ""
    duration_seconds: float = 0.0
    success: bool
    error_message: str = ""
