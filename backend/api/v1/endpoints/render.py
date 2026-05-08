from fastapi import APIRouter, Form, BackgroundTasks, Depends, Body
from typing import Optional
from fastapi.responses import FileResponse
import json
import os
import uuid
import threading
import datetime
from core.services.video_service import VideoService
from core.services.audio_service import AudioService
from core.services.template_service import TemplateService
from core.models.template import VideoTemplate
from core.models.job import RenderJob
from infrastructure.database.connection import get_db

router = APIRouter()
render_semaphore = threading.Semaphore(2)

def get_video_service():
    return VideoService()

def get_audio_service():
    return AudioService()

def get_template_service():
    return TemplateService()

@router.post("/batch")
async def start_batch_render(
    background_tasks: BackgroundTasks,
    template_id: str = Form(...),
    body_clips: str = Form(...),
    output_prefix: str = Form(...),
    thumbnail_title: str = Form(...),
    export_srt: str = Form("true"),
    burn_subs: str = Form("false"),
    video_service: VideoService = Depends(get_video_service),
    audio_service: AudioService = Depends(get_audio_service),
    template_service: TemplateService = Depends(get_template_service)
):
    db = get_db()
    try:
        clips_list = json.loads(body_clips)
    except:
        clips_list = [c.strip() for c in body_clips.split(",")]
        
    tmpl_data = template_service.get_template(template_id)
    if not tmpl_data:
        return {"error": "Template not found"}
        
    template = VideoTemplate(**tmpl_data)
    job = RenderJob(
        template=template,
        body_clips=clips_list,
        output_folder="storage/outputs",
        output_prefix=output_prefix
    )
    db.jobs.insert_one(job.model_dump())
    
    def process_job(job_data):
        for idx, clip in enumerate(job_data["body_clips"], 1):
            with render_semaphore:
                template_obj = VideoTemplate(**job_data["template"])
                output_name = f"{job_data['output_prefix']}_{idx:02d}.mp4"
                os.makedirs(job_data["output_folder"], exist_ok=True)
                output_path = os.path.join(job_data["output_folder"], output_name)
                
                try:
                    result_path = video_service.assemble_video(template_obj, clip, output_path)
                    
                    if export_srt.lower() == "true" or burn_subs.lower() == "true":
                        segments = audio_service.transcribe(result_path)
                        srt_path = output_path.replace(".mp4", ".srt")
                        audio_service.segments_to_srt(segments, srt_path)
                        
                        if burn_subs.lower() == "true":
                            burned_path = output_path.replace(".mp4", "_subbed.mp4")
                            audio_service.burn_subtitles(result_path, srt_path, burned_path)
                            import shutil
                            shutil.move(burned_path, result_path)
                            
                    thumb_path = output_path.replace(".mp4", ".jpg")
                    best_thumb = video_service.extract_best_thumbnail(result_path, thumb_path)
                    if best_thumb and thumbnail_title:
                        title = thumbnail_title.replace("{n}", f"{idx:02d}")
                        video_service.add_thumbnail_overlay(best_thumb, title, best_thumb, badge_text="NEW")
                        
                    db.jobs.update_one({"job_id": job_data["job_id"]}, {
                        "$push": {"results": {
                            "video_index": idx, "success": True, "output_path": result_path, "output_name": output_name
                        }},
                        "$set": {"progress": idx / len(job_data["body_clips"])}
                    })
                except Exception as e:
                    db.jobs.update_one({"job_id": job_data["job_id"]}, {
                        "$push": {"results": {"video_index": idx, "success": False, "error": str(e)}},
                        "$set": {"status": "error"}
                    })
        db.jobs.update_one({"job_id": job_data["job_id"]}, {
            "$set": {"status": "done", "progress": 1.0, "completed_at": datetime.datetime.utcnow()}
        })
        
    background_tasks.add_task(process_job, job.model_dump())
    return {"job_id": job.job_id}

@router.post("/preview")
async def render_preview(
    template: VideoTemplate = Body(...), 
    body_clip: Optional[str] = Body(None),
    video_service: VideoService = Depends(get_video_service)
):
    preview_id = str(uuid.uuid4())
    output_name = f"preview_{preview_id}.mp4"
    os.makedirs("storage/previews", exist_ok=True)
    output_path = os.path.join("storage/previews", output_name)
    try:
        video_service.assemble_video(template, body_clip or "", output_path, is_preview=True)
        return {"preview_url": f"/api/v1/render/preview/{output_name}"}
    except Exception as e:
        return {"error": str(e)}

@router.get("/preview/{filename}")
async def get_preview_file(filename: str):
    path = os.path.join("storage/previews", filename)
    if os.path.exists(path):
        return FileResponse(path, media_type="video/mp4")
    return {"error": "Preview not found"}

@router.get("/{job_id}")
async def get_job_status(job_id: str):
    db = get_db()
    job = db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if job: return job
    return {"error": "Not found"}

@router.get("/output/{filename}")
async def download_render_output(filename: str):
    path = os.path.join("storage", "outputs", filename)
    if os.path.exists(path):
        media = "video/mp4" if filename.endswith(".mp4") else "application/octet-stream"
        return FileResponse(path, media_type=media, filename=filename)
    return {"error": "File not found"}
