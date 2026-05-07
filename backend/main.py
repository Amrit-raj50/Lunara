from fastapi import FastAPI, UploadFile, File, Form, WebSocket, BackgroundTasks, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import uuid
import asyncio
import time
import datetime
import threading
from pymongo import MongoClient
from typing import List, Optional
from audio_processor import process_media, process_single_frame
from template import VideoTemplate
from render import RenderJob, RenderResult, assemble_video
from captions import transcribe_audio, segments_to_srt, burn_subtitles
from thumbnail import extract_best_thumbnail, add_thumbnail_overlay

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://amrit-123:amrit-123@cluster0.hgh6hxe.mongodb.net/Lunara")
BASE_URL = os.getenv("BASE_URL")
if not BASE_URL:
    railway_domain = os.getenv("RAILWAY_PUBLIC_DOMAIN")
    if railway_domain:
        BASE_URL = f"https://{railway_domain}"
    else:
        BASE_URL = "http://localhost:8000"

client = MongoClient(MONGO_URI)
db = client["Lunara"]
library_collection = db["library_assets"]
analytics_collection = db["analytics_logs"]
settings_collection = db["user_settings"]
wardrobe_collection = db["wardrobe_items"] # Added for completeness if needed
templates_collection = db["video_templates"]
jobs_collection = db["render_jobs"]

if settings_collection.count_documents({}) == 0:
    settings_collection.insert_one({"export_quality": "1080p", "hardware_acceleration": "Auto"})

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Set to False to allow "*" with modern browsers
    allow_methods=["*"],
    allow_headers=["*"],
)

tasks_progress = {}
os.makedirs("temp_files", exist_ok=True)
os.makedirs("storage", exist_ok=True)

@app.post("/api/enhance")
async def enhance_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    noise_reduce: int = Form(75),
    voice_boost: int = Form(6),
    eq_clarity: int = Form(50),
    lufs_target: int = Form(14),
    remove_bg: str = Form("false"),
    bg_image: UploadFile = File(None),
    subject_scale: float = Form(1.0),
    offset_x: int = Form(0),
    offset_y: int = Form(0),
    bg_blur: int = Form(0),
    video_filter: str = Form("None"),
    subject_brightness: int = Form(0),
    subject_contrast: int = Form(0),
    skin_smoothing: int = Form(0),
    light_match: int = Form(0)
):
    task_id = str(uuid.uuid4())
    input_path = f"temp_files/{task_id}_{file.filename}"
    output_path = f"storage/{task_id}_enhanced.mp4"
    bg_image_path = None
    
    with open(input_path, "wb") as buffer:
        buffer.write(await file.read())
        
    if bg_image and bg_image.filename:
        bg_image_path = f"temp_files/{task_id}_bg_{bg_image.filename}"
        with open(bg_image_path, "wb") as buffer:
            buffer.write(await bg_image.read())
            
    is_remove_bg = remove_bg.lower() == "true"
        
    tasks_progress[task_id] = {"step": -1, "progress": 0.0, "message": "Queued"}
    
    def sync_progress_callback(step, progress, message):
        tasks_progress[task_id] = {"step": step, "progress": progress, "message": message}
        
    def run_processing():
        start_time = time.time()
        process_media(
            task_id, input_path, output_path, noise_reduce, voice_boost, 
            eq_clarity, lufs_target, is_remove_bg, bg_image_path, sync_progress_callback,
            subject_scale, offset_x, offset_y, bg_blur, video_filter,
            subject_brightness, subject_contrast, skin_smoothing, light_match
        )
        end_time = time.time()
        compute_seconds = end_time - start_time
        
        tool_used = "Video Studio" if is_remove_bg else "Audio Lab"
        analytics_collection.insert_one({
            "compute_seconds": compute_seconds,
            "tool_used": tool_used,
            "created_at": datetime.datetime.utcnow()
        })
        
        file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
        library_collection.insert_one({
            "id": task_id,
            "filename": f"{file.filename.split('.')[0]}_enhanced.mp4",
            "file_type": "video/mp4",
            "url": f"{BASE_URL}/api/download/{task_id}",
            "size": file_size,
            "created_at": datetime.datetime.utcnow()
        })
        
        # Cleanup input files
        for p in [input_path, bg_image_path]:
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except:
                    pass
                
    background_tasks.add_task(run_processing)
    
    return {"task_id": task_id}

@app.websocket("/api/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await websocket.accept()
    try:
        last_state = None
        while True:
            if task_id in tasks_progress:
                current_state = tasks_progress[task_id]
                if current_state != last_state:
                    await websocket.send_json(current_state)
                    last_state = current_state
                    if current_state["step"] in [6, -1]: # Done or Error
                        break
            await asyncio.sleep(0.5)
    except Exception:
        pass
    finally:
        try:
            await websocket.close()
        except:
            pass

@app.post("/api/preview")
async def preview_endpoint(
    preview_frame: str = Form(...),
    bg_image: UploadFile = File(None),
    subject_scale: float = Form(1.0),
    offset_x: int = Form(0),
    offset_y: int = Form(0),
    bg_blur: int = Form(0),
    video_filter: str = Form("None"),
    remove_bg: str = Form("false"),
    subject_brightness: int = Form(0),
    subject_contrast: int = Form(0),
    skin_smoothing: int = Form(0),
    light_match: int = Form(0)
):
    bg_image_path = None
    if bg_image and bg_image.filename:
        bg_image_path = f"temp_files/preview_bg_{bg_image.filename}"
        with open(bg_image_path, "wb") as buffer:
            buffer.write(await bg_image.read())
            
    is_remove_bg = remove_bg.lower() == "true"
            
    try:
        result_base64 = process_single_frame(
            preview_frame, bg_image_path, subject_scale, offset_x, offset_y, bg_blur, video_filter, is_remove_bg,
            subject_brightness, subject_contrast, skin_smoothing, light_match
        )
        return {"preview_result": result_base64}
    except Exception as e:
        return {"error": str(e)}
    finally:
        if bg_image_path and os.path.exists(bg_image_path):
            try:
                os.remove(bg_image_path)
            except:
                pass

@app.get("/api/download/{task_id}")
async def download_file(task_id: str):
    output_path = f"storage/{task_id}_enhanced.mp4"
    if os.path.exists(output_path):
        return FileResponse(output_path, media_type="video/mp4", filename="enhanced_audio.mp4")
    return {"error": "File not found"}

@app.get("/api/library")
async def get_library():
    assets = list(library_collection.find({}, {"_id": 0}))
    return {"assets": assets}

@app.delete("/api/library/{asset_id}")
async def delete_library_item(asset_id: str):
    library_collection.delete_one({"id": asset_id})
    output_path = f"storage/{asset_id}_enhanced.mp4"
    if os.path.exists(output_path):
        try:
            os.remove(output_path)
        except:
            pass
    return {"status": "deleted"}

@app.get("/api/analytics")
async def get_analytics():
    total_compute = sum(doc["compute_seconds"] for doc in analytics_collection.find())
    total_files = library_collection.count_documents({})
    audio_count = analytics_collection.count_documents({"tool_used": "Audio Lab"})
    video_count = analytics_collection.count_documents({"tool_used": "Video Studio"})
    
    return {
        "total_compute_seconds": total_compute,
        "total_files": total_files,
        "audio_count": audio_count,
        "video_count": video_count
    }

@app.get("/api/settings")
async def get_settings():
    settings = settings_collection.find_one({}, {"_id": 0})
    return settings

@app.post("/api/settings")
async def update_settings(export_quality: str = Form(...), hardware_acceleration: str = Form(...)):
    settings_collection.update_one({}, {"$set": {"export_quality": export_quality, "hardware_acceleration": hardware_acceleration}}, upsert=True)
    return {"status": "updated"}

# --- WORKFLOW & TEMPLATE ENDPOINTS ---
os.makedirs("storage/clips", exist_ok=True)
os.makedirs("storage/outputs", exist_ok=True)
os.makedirs("storage/previews", exist_ok=True)

@app.post("/api/upload_clip")
async def upload_clip(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    path = f"storage/clips/{file_id}_{file.filename}"
    with open(path, "wb") as buffer:
        buffer.write(await file.read())
    return {"file_path": path}

@app.get("/api/templates")
async def list_templates():
    templates = list(templates_collection.find({}, {"_id": 0}))
    return {"templates": templates}

@app.post("/api/templates")
async def save_template(template: VideoTemplate):
    templates_collection.update_one({"template_id": template.template_id}, {"$set": template.to_dict()}, upsert=True)
    return {"status": "saved", "template_id": template.template_id}

@app.get("/api/templates/{template_id}")
async def load_template(template_id: str):
    tmpl = templates_collection.find_one({"template_id": template_id}, {"_id": 0})
    if tmpl:
        return tmpl
    return {"error": "Not found"}

# Global semaphore for batch rendering (max 2 concurrent ffmpeg jobs)
render_semaphore = threading.Semaphore(2)

@app.post("/api/render/batch")
async def start_batch_render(
    background_tasks: BackgroundTasks,
    template_id: str = Form(...),
    body_clips: str = Form(...), # Comma separated paths
    output_prefix: str = Form(...),
    thumbnail_title: str = Form(...),
    export_srt: str = Form("true"),
    burn_subs: str = Form("false")
):
    import json
    try:
        clips_list = json.loads(body_clips)
    except:
        clips_list = [c.strip() for c in body_clips.split(",")]
        
    tmpl_data = templates_collection.find_one({"template_id": template_id}, {"_id": 0})
    if not tmpl_data:
        return {"error": "Template not found"}
        
    template = VideoTemplate(**tmpl_data)
    
    job = RenderJob(
        template=template,
        body_clips=clips_list,
        output_folder="storage/outputs",
        output_prefix=output_prefix
    )
    jobs_collection.insert_one(job.model_dump())
    
    def process_job(job_data):
        for idx, clip in enumerate(job_data["body_clips"], 1):
            with render_semaphore:
                # Create a fresh template instance for each render to avoid cumulative rippling
                template_obj = VideoTemplate(**job_data["template"])
                output_name = f"{job_data['output_prefix']}_{idx:02d}.mp4"
                output_path = os.path.join(job_data["output_folder"], output_name)
                
                try:
                    # Render Video
                    result_path = assemble_video(template_obj, clip, output_path, job_data["job_id"])
                    
                    # Captions
                    srt_path = ""
                    if export_srt.lower() == "true" or burn_subs.lower() == "true":
                        segments = transcribe_audio(result_path)
                        srt_path = output_path.replace(".mp4", ".srt")
                        segments_to_srt(segments, srt_path)
                        
                        if burn_subs.lower() == "true":
                            burned_path = output_path.replace(".mp4", "_subbed.mp4")
                            burn_subtitles(result_path, srt_path, burned_path)
                            # Replace original with burned
                            import shutil
                            shutil.move(burned_path, result_path)
                            
                    # Thumbnail
                    thumb_path = output_path.replace(".mp4", ".jpg")
                    best_thumb = extract_best_thumbnail(result_path, thumb_path)
                    
                    if best_thumb and thumbnail_title:
                        title = thumbnail_title.replace("{n}", f"{idx:02d}")
                        add_thumbnail_overlay(best_thumb, title, best_thumb, badge_text="NEW")
                        
                    jobs_collection.update_one({"job_id": job_data["job_id"]}, {
                        "$push": {"results": {
                            "video_index": idx, 
                            "success": True, 
                            "output_path": result_path,
                            "output_name": output_name
                        }},
                        "$set": {"progress": idx / len(job_data["body_clips"])}
                    })
                except Exception as e:
                    jobs_collection.update_one({"job_id": job_data["job_id"]}, {
                        "$push": {"results": {"video_index": idx, "success": False, "error": str(e)}},
                        "$set": {"status": "error"}
                    })
        
        jobs_collection.update_one({"job_id": job_data["job_id"]}, {
            "$set": {"status": "done", "progress": 1.0, "completed_at": datetime.datetime.utcnow()}
        })
        
    background_tasks.add_task(process_job, job.model_dump())
    return {"job_id": job.job_id}

@app.post("/api/render/preview")
async def render_preview(template: VideoTemplate = Body(...), body_clip: Optional[str] = Body(None)):
    preview_id = str(uuid.uuid4())
    output_name = f"preview_{preview_id}.mp4"
    output_path = os.path.join("storage/previews", output_name)
    
    try:
        # Use first 10 seconds or full for preview if possible, but assemble_video handles duration
        assemble_video(template, body_clip or "", output_path, "preview_job", is_preview=True)
        return {"preview_url": f"{BASE_URL}/api/render/preview/{output_name}"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/render/preview/{filename}")
async def get_preview_file(filename: str):
    path = os.path.join("storage/previews", filename)
    if os.path.exists(path):
        return FileResponse(path, media_type="video/mp4")
    return {"error": "Preview not found"}

@app.get("/api/render/{job_id}")
async def get_job_status(job_id: str):
    job = jobs_collection.find_one({"job_id": job_id}, {"_id": 0})
    if job:
        return job
    return {"error": "Not found"}

@app.get("/api/render/output/{filename}")
async def download_render_output(filename: str):
    path = os.path.join("storage", "outputs", filename)
    if os.path.exists(path):
        media = "video/mp4" if filename.endswith(".mp4") else "application/octet-stream"
        return FileResponse(path, media_type=media, filename=filename)
    return {"error": "File not found"}


@app.post("/api/template/preview")
async def preview_template(template: VideoTemplate):
    """Return a visual summary of the template for quick preview."""
    total_duration = 0.0
    track_info = []
    for track in template.tracks:
        clips_info = []
        for clip in track.clips:
            end = clip.start_time + clip.duration
            if end > total_duration:
                total_duration = end
            clips_info.append({
                "label": clip.label,
                "start": clip.start_time,
                "duration": clip.duration,
                "is_placeholder": clip.is_placeholder,
                "has_file": bool(clip.file_path),
            })
        track_info.append({
            "name": track.name,
            "type": track.track_type,
            "clip_count": len(track.clips),
            "clips": clips_info,
        })
    return {
        "total_duration": total_duration,
        "track_count": len(template.tracks),
        "tracks": track_info,
    }

