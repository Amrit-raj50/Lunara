from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
import uuid
import datetime

class TemplateClip(BaseModel):
    model_config = ConfigDict(extra="ignore")

    clip_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    start_time: float = 0.0
    duration: float = 5.0
    file_path: str = ""
    is_placeholder: bool = False
    clip_type: str = "video"  # video, audio, overlay, music
    label: str = "Clip"
    # Audio properties
    volume: float = 1.0
    # Video properties
    opacity: float = 1.0

class TemplateTrack(BaseModel):
    model_config = ConfigDict(extra="ignore")

    track_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Track"
    track_type: str = "video"  # video, audio, overlay, music
    clips: List[TemplateClip] = []
    muted: bool = False
    locked: bool = False

class VideoTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    template_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    tracks: List[TemplateTrack] = []

    def to_dict(self):
        return self.model_dump()
