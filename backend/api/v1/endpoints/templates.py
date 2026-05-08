from fastapi import APIRouter, Depends, HTTPException
from core.services.template_service import TemplateService
from core.models.template import VideoTemplate
from typing import List

router = APIRouter()

def get_template_service():
    return TemplateService()

@router.get("/")
async def list_templates(service: TemplateService = Depends(get_template_service)):
    return {"templates": service.list_templates()}

@router.post("/")
async def save_template(template: VideoTemplate, service: TemplateService = Depends(get_template_service)):
    template_id = service.save_template(template)
    return {"status": "saved", "template_id": template_id}

@router.get("/{template_id}")
async def load_template(template_id: str, service: TemplateService = Depends(get_template_service)):
    tmpl = service.get_template(template_id)
    if tmpl:
        return tmpl
    raise HTTPException(status_code=404, detail="Template not found")
