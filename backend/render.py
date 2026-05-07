from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import datetime
import os
import subprocess
import imageio_ffmpeg
import tempfile
import shutil
from template import VideoTemplate

class RenderJob(BaseModel):
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    template: VideoTemplate
    body_clips: List[str]
    output_folder: str
    output_prefix: str
    status: str = "pending"
    progress: float = 0.0
    error_message: str = ""
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    completed_at: Optional[datetime.datetime] = None

class RenderResult(BaseModel):
    job_id: str
    video_index: int
    output_path: str
    thumbnail_path: str = ""
    srt_path: str = ""
    duration_seconds: float = 0.0
    success: bool
    error_message: str = ""

def estimate_render_time(job: RenderJob) -> str:
    minutes = len(job.body_clips) * 3
    return f"approximately {minutes} minutes"

def get_stream_info(path):
    """Check if a file has audio and video streams using ffmpeg."""
    try:
        cmd = ["ffmpeg", "-i", os.path.abspath(path)]
        res = subprocess.run(cmd, stderr=subprocess.PIPE, text=True, timeout=5)
        # Search for Stream #0:x: Video: ... and Stream #0:x: Audio: ...
        has_v = "Video:" in res.stderr
        has_a = "Audio:" in res.stderr
        return has_v, has_a
    except:
        return False, False

def get_video_duration(path):
    """Get duration of a video file in seconds."""
    try:
        cmd = ["ffmpeg", "-i", os.path.abspath(path)]
        res = subprocess.run(cmd, stderr=subprocess.PIPE, text=True, timeout=5)
        import re
        match = re.search(r"Duration:\s+(\d+):(\d+):(\d+\.\d+)", res.stderr)
        if match:
            h, m, s = match.groups()
            return int(h) * 3600 + int(m) * 60 + float(s)
    except:
        pass
    return None

def assemble_video(template: VideoTemplate, body_clip_path: str, output_path: str, job_id: str, is_preview: bool = False):
    """
    Complex filtergraph rendering for multi-track NLE timelines.
    """
    inputs = []
    video_clips = []
    audio_clips = []
    
    # 1. Handle Body Track and Placeholder Durations
    body_duration = None
    if body_clip_path:
        body_duration = get_video_duration(body_clip_path)
        
    # Find the primary placeholder and handle auto-insertion for "Body" tracks
    placeholders = []
    primary_ph = None
    
    for track in template.tracks:
        is_body_track = "body" in track.name.lower()
        
        # Auto-add logic: If "Body" track is empty, add the body clip after existing content
        if is_body_track and not track.clips and body_clip_path:
            # Find the latest end time of ANY clip on any OTHER track to avoid overlap with Intro
            max_other_end = 0.0
            for t2 in template.tracks:
                if t2 != track:
                    for c2 in t2.clips:
                        max_other_end = max(max_other_end, c2.start_time + c2.duration)
            
            from template import TemplateClip
            new_clip = TemplateClip(
                start_time=max_other_end,
                duration=body_duration or 5.0,
                is_placeholder=True,
                label="Dynamic Body Content",
                clip_type="video"
            )
            track.clips.append(new_clip)
        
        for clip in track.clips:
            if clip.is_placeholder:
                placeholders.append(clip)
                if not primary_ph: primary_ph = clip

    # Apply Timeline Rippling
    if primary_ph and body_duration:
        original_dur = primary_ph.duration
        original_end = primary_ph.start_time + original_dur
        delta = body_duration - original_dur
        
        # Update all placeholders to the actual body duration
        for ph in placeholders:
            ph.duration = body_duration
            
        # Shift all OTHER clips that start after the primary placeholder
        if abs(delta) > 0.01:
            for track in template.tracks:
                for clip in track.clips:
                    if clip not in placeholders and clip.start_time >= original_end - 0.05:
                        clip.start_time += delta
        
    # 2. Flatten all clips from tracks and resolve file paths
    total_duration = 0.0
    input_idx = 0
    
    for track in template.tracks:
        if track.muted: continue # Skip muted tracks
        
        for clip in track.clips:
            clip_path = body_clip_path if clip.is_placeholder else clip.file_path
            
            if not clip_path or not os.path.exists(clip_path):
                continue
                
            end_time = clip.start_time + clip.duration
            if end_time > total_duration:
                total_duration = end_time
                
            inputs.append(clip_path)
            
            # Check for stream presence to avoid FFmpeg mapping errors
            has_v, has_a = get_stream_info(clip_path)
            
            if (track.track_type == "video" or track.track_type == "overlay") and has_v:
                video_clips.append({
                    "idx": input_idx,
                    "start": clip.start_time,
                    "end": end_time
                })
                # Add audio track from video file as well, IF it exists
                if has_a:
                    audio_clips.append({
                        "idx": input_idx,
                        "start": clip.start_time
                    })
            elif (track.track_type == "audio" or track.track_type == "music") and has_a:
                # This is an audio/music track
                audio_clips.append({
                    "idx": input_idx,
                    "start": clip.start_time
                })
                
            input_idx += 1

    if not inputs:
        # Instead of crashing, return a blank video if it's a preview or raise a cleaner error
        if is_preview:
            # Create a 1-second black dummy preview
            total_duration = 1.0
            filters.append(f"color=c=black:s={res}:d={total_duration},setsar=1 [vout_final]")
            filters.append(f"anullsrc=d={total_duration} [aout_final]")
            video_out_pad = "vout_final"
            audio_out_pad = "aout_final"
        else:
            raise Exception("The timeline is empty. Add at least one clip with a valid file or placeholder to render.")
    else:
        if total_duration <= 0:
            total_duration = 5.0 # safe fallback
        
    # Build filter_complex
    filters = []
    
    # --- VIDEO GRAPH ---
    res = "1280x720" if is_preview else "1920x1080"
    
    if video_clips:
        filters.append(f"color=c=black:s={res}:d={total_duration},setsar=1 [vbase]")
        prev_out = "vbase"
        
        for i, vc in enumerate(video_clips):
            v_idx = vc["idx"]
            start = vc["start"]
            end = vc["end"]
            
            # Format PTS to start at the specified time and scale to output resolution
            w, h = res.split('x')
            filters.append(f"[{v_idx}:v]scale={res}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,setsar=1,setpts=PTS-STARTPTS+{start}/TB[v{i}_pts]")
            
            # Overlay onto the base
            next_out = f"vout{i}"
            filters.append(f"[{prev_out}][v{i}_pts]overlay=enable='between(t,{start},{end})':eof_action=pass[{next_out}]")
            prev_out = next_out
            
        video_out_pad = prev_out
    else:
        # Dummy video if audio only
        filters.append(f"color=c=black:s={res}:d={total_duration},setsar=1 [vout_final]")
        video_out_pad = "vout_final"
        
    # --- AUDIO GRAPH ---
    if audio_clips:
        filters.append(f"anullsrc=d={total_duration} [abase]")
        mix_inputs = "[abase]"
        
        for i, ac in enumerate(audio_clips):
            a_idx = ac["idx"]
            start_ms = int(ac["start"] * 1000)
            
            # Delay audio to the start time (using all=1 for multi-channel support)
            filters.append(f"[{a_idx}:a]adelay={start_ms}:all=1[a{i}_dly]")
            mix_inputs += f"[a{i}_dly]"
            
        num_inputs = len(audio_clips) + 1
        filters.append(f"{mix_inputs}amix=inputs={num_inputs}:duration=first:dropout_transition=2[aout_final]")
        audio_out_pad = "aout_final"
    else:
        # If no audio clips, provide silence
        filters.append(f"anullsrc=d={total_duration} [aout_final]")
        audio_out_pad = "aout_final"
        
    filter_graph = ";\n".join(filters) # Use newlines for readability in script file
    
    # Build command
    cmd = ["ffmpeg", "-y"]
    for path in inputs:
        abs_path = os.path.abspath(path).replace('\\', '/')
        cmd.extend(["-i", abs_path])
        
    preset = "ultrafast" if is_preview else "fast"
    
    # Use filter_complex_script to avoid Windows command line length limits
    fd, filter_script_path = tempfile.mkstemp(suffix='.txt', prefix='ffmpeg_nle_')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(filter_graph)
        
        cmd.extend([
            "-filter_complex_script", filter_script_path.replace('\\', '/'),
            "-map", f"[{video_out_pad}]",
            "-map", f"[{audio_out_pad}]",
            "-c:v", "libx264",
            "-preset", preset,
            "-crf", "28" if is_preview else "23",
            "-c:a", "aac",
            "-t", str(total_duration),
            output_path
        ])
        
        print(f"RUNNING FFMPEG (script-mode): {output_path}")
        
        process = subprocess.run(cmd, capture_output=True, text=True)
        
        if process.returncode != 0:
            error_output = process.stderr
            # Extract last few lines for more relevant error info
            last_lines = "\n".join(error_output.strip().split("\n")[-15:])
            print(f"FFMPEG ERROR: {last_lines}")
            raise Exception(f"FFmpeg NLE build failed: {last_lines}")
            
        return output_path
    finally:
        if os.path.exists(filter_script_path):
            try:
                os.remove(filter_script_path)
            except:
                pass


