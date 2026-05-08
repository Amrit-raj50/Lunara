from infrastructure.database.connection import get_db
from core.models.template import VideoTemplate
from typing import List, Optional

class TemplateService:
    def __init__(self):
        self.db = get_db()

    def list_templates(self) -> List[dict]:
        return list(self.db.templates.find({}, {"_id": 0}))

    def save_template(self, template: VideoTemplate) -> str:
        self.db.templates.update_one(
            {"template_id": template.template_id},
            {"$set": template.to_dict()},
            upsert=True
        )
        return template.template_id

    def get_template(self, template_id: str) -> Optional[dict]:
        return self.db.templates.find_one({"template_id": template_id}, {"_id": 0})
