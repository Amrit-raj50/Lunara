from pydantic import BaseModel, Field
import datetime

class AnalyticsLog(BaseModel):
    compute_seconds: float
    tool_used: str
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
