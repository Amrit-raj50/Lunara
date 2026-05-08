from fastapi import APIRouter
from .endpoints import media, templates, render

api_router = APIRouter()

api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])
api_router.include_router(render.router, prefix="/render", tags=["render"])
