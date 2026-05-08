from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, Depends, WebSocket
from fastapi.responses import FileResponse
import uuid
import os
import time
import datetime
from core.services.media_service import MediaService
from core.services.audio_service import AudioService
from core.services.video_service import VideoService
from core.models.media import LibraryAsset
from core.models.analytics import AnalyticsLog

router = APIRouter()

# In-memory progress tracking (could be moved to a service or Redis)
tasks_progress = {}

def get_media_service():
    return MediaService()

def get_audio_service():
    return AudioService()

def get_video_service():
    return VideoService()

@router.post("/enhance")
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
    light_match: int = Form(0),
    media_service: MediaService = Depends(get_media_service),
    audio_service: AudioService = Depends(get_audio_service),
    video_service: VideoService = Depends(get_video_service)
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
        
        # Audio Processing
        tmp_wav = f"temp_files/{task_id}_temp.wav"
        tmp_enhanced_audio = f"temp_files/{task_id}_enhanced_temp.wav"
        tmp_processed_video = f"temp_files/{task_id}_processed_video.mp4"
        
        try:
            sync_progress_callback(0, 0.0, "Extracting audio...")
            audio_service._ffmpeg_extract_audio(input_path, tmp_wav)
            
            sync_progress_callback(1, 0.2, "Reducing noise...")
            audio, sr = audio_service._apply_noise_reduction(tmp_wav, noise_reduce / 100.0)
            
            sync_progress_callback(2, 0.4, "Applying EQ...")
            audio = audio_service._apply_eq_and_boost(audio, sr, eq_clarity / 100.0 * 0.5, voice_boost)
            
            video_to_merge = input_path
            if is_remove_bg:
                sync_progress_callback(3, 0.0, "Applying AI Video Effects...")
                params = {
                    'subject_scale': subject_scale, 'offset_x': offset_x, 'offset_y': offset_y,
                    'bg_blur': bg_blur, 'video_filter': video_filter,
                    'subject_brightness': subject_brightness, 'subject_contrast': subject_contrast,
                    'skin_smoothing': skin_smoothing, 'light_match': light_match
                }
                video_service.process_video_background(input_path, tmp_processed_video, bg_image_path, sync_progress_callback, 3, params)
                video_to_merge = tmp_processed_video
            
            sync_progress_callback(4, 0.8, "Merging...")
            audio_service._save_and_normalize(audio, sr, tmp_enhanced_audio, output_path, video_to_merge, -lufs_target, reencode_video=is_remove_bg)
            sync_progress_callback(6, 1.0, "Done!")
            
            # Analytics & Library
            compute_seconds = time.time() - start_time
            media_service.log_analytics(AnalyticsLog(compute_seconds=compute_seconds, tool_used="Video Studio" if is_remove_bg else "Audio Lab"))
            
            file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
            # Note: BASE_URL handling moved to main app config
            media_service.add_to_library(LibraryAsset(
                id=task_id, 
                filename=f"{file.filename.split('.')[0]}_enhanced.mp4",
                file_type="video/mp4",
                url=f"/api/v1/media/download/{task_id}", # Relative URL or full based on config
                size=file_size
            ))
            
        except Exception as e:
            sync_progress_callback(-1, 0.0, f"Error: {str(e)}")
        finally:
            for p in [input_path, bg_image_path, tmp_wav, tmp_enhanced_audio, tmp_processed_video]:
                if p and os.path.exists(p):
                    try: os.remove(p)
                    except: pass
                
    background_tasks.add_task(run_processing)
    return {"task_id": task_id}

@router.get("/download/{task_id}")
async def download_file(task_id: str):
    output_path = f"storage/{task_id}_enhanced.mp4"
    if os.path.exists(output_path):
        return FileResponse(output_path, media_type="video/mp4", filename="enhanced_audio.mp4")
    return {"error": "File not found"}

@router.get("/library")
async def get_library(media_service: MediaService = Depends(get_media_service)):
    return {"assets": media_service.get_library()}

@router.delete("/library/{asset_id}")
async def delete_library_item(asset_id: str, media_service: MediaService = Depends(get_media_service)):
    media_service.delete_from_library(asset_id)
    output_path = f"storage/{asset_id}_enhanced.mp4"
    if os.path.exists(output_path):
        try: os.remove(output_path)
        except: pass
    return {"status": "deleted"}

@router.get("/analytics")
async def get_analytics(media_service: MediaService = Depends(get_media_service)):
    return media_service.get_analytics()

@router.get("/settings")
async def get_settings(media_service: MediaService = Depends(get_media_service)):
    return media_service.get_settings()

@router.post("/settings")
async def update_settings(export_quality: str = Form(...), hardware_acceleration: str = Form(...), media_service: MediaService = Depends(get_media_service)):
    media_service.update_settings(export_quality, hardware_acceleration)
    return {"status": "updated"}

@router.post("/upload_clip")
async def upload_clip(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    path = f"storage/clips/{file_id}_{file.filename}"
    os.makedirs("storage/clips", exist_ok=True)
    with open(path, "wb") as buffer:
        buffer.write(await file.read())
    return {"file_path": path}

@router.post("/preview")
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
    light_match: int = Form(0),
    video_service: VideoService = Depends(get_video_service)
):
    bg_image_path = None
    if bg_image and bg_image.filename:
        bg_image_path = f"temp_files/preview_bg_{bg_image.filename}"
        with open(bg_image_path, "wb") as buffer:
            buffer.write(await bg_image.read())
            
    is_remove_bg = remove_bg.lower() == "true"
    try:
        print(f"PREVIEW: Received request. remove_bg={is_remove_bg}, frame_size={len(preview_frame) if preview_frame else 0}")
        params = {
            'subject_scale': subject_scale, 'offset_x': offset_x, 'offset_y': offset_y,
            'bg_blur': bg_blur, 'video_filter': video_filter, 'remove_bg': is_remove_bg,
            'subject_brightness': subject_brightness, 'subject_contrast': subject_contrast,
            'skin_smoothing': skin_smoothing, 'light_match': light_match
        }
        print("PREVIEW: Processing frame...")
        result_base64 = video_service.process_single_frame(preview_frame, bg_image_path, params)
        print("PREVIEW: Success")
        return {"preview_result": result_base64}
    except Exception as e:
        print(f"PREVIEW ERROR: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    finally:
        if bg_image_path and os.path.exists(bg_image_path):
            try: os.remove(bg_image_path)
            except: pass
