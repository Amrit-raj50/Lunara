import os
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://amrit-123:amrit-123@cluster0.hgh6hxe.mongodb.net/Lunara")

class Database:
    def __init__(self):
        self.client = MongoClient(MONGO_URI)
        self.db = self.client["Lunara"]
        self.library = self.db["library_assets"]
        self.analytics = self.db["analytics_logs"]
        self.settings = self.db["user_settings"]
        self.wardrobe = self.db["wardrobe_items"]
        self.templates = self.db["video_templates"]
        self.jobs = self.db["render_jobs"]

db = Database()

def get_db():
    return db
