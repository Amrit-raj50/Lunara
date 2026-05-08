from infrastructure.database.connection import get_db
from core.models.media import LibraryAsset
from core.models.analytics import AnalyticsLog
from typing import List
import datetime
import datetime

class MediaService:
    def __init__(self):
        self.db = get_db()

    def add_to_library(self, asset: LibraryAsset):
        self.db.library.insert_one(asset.model_dump())

    def get_library(self) -> List[dict]:
        return list(self.db.library.find({}, {"_id": 0}))

    def delete_from_library(self, asset_id: str):
        self.db.library.delete_one({"id": asset_id})

    def log_analytics(self, log: AnalyticsLog):
        self.db.analytics.insert_one(log.model_dump())

    def get_analytics(self) -> dict:
        total_compute = sum(doc["compute_seconds"] for doc in self.db.analytics.find())
        total_files = self.db.library.count_documents({})
        audio_count = self.db.analytics.count_documents({"tool_used": "Audio Lab"})
        video_count = self.db.analytics.count_documents({"tool_used": "Video Studio"})
        
        return {
            "total_compute_seconds": total_compute,
            "total_files": total_files,
            "audio_count": audio_count,
            "video_count": video_count
        }

    def get_settings(self) -> dict:
        settings = self.db.settings.find_one({}, {"_id": 0})
        return settings or {"export_quality": "1080p", "hardware_acceleration": "Auto"}

    def update_settings(self, export_quality: str, hardware_acceleration: str):
        self.db.settings.update_one(
            {},
            {"$set": {"export_quality": export_quality, "hardware_acceleration": hardware_acceleration}},
            upsert=True
        )
