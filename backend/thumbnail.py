import os
import subprocess
import json
from PIL import Image, ImageFilter, ImageDraw, ImageFont

def get_video_duration(video_path: str) -> float:
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(result.stdout)
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video":
                return float(stream.get("duration", 0))
    except Exception:
        pass
    return 0.0

def extract_best_thumbnail(video_path: str, output_path: str, count: int = 10) -> str:
    duration = get_video_duration(video_path)
    if duration <= 0:
        duration = 10.0 # fallback
        
    interval = duration / (count + 1)
    
    # Extract frames
    os.makedirs("temp_files/frames", exist_ok=True)
    temp_prefix = f"temp_files/frames/thumb_{os.path.basename(video_path)}_%03d.jpg"
    
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vf", f"fps=1/{interval}",
        "-frames:v", str(count),
        "-q:v", "2",
        temp_prefix
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    # Score frames
    best_score = -1
    best_frame = None
    
    for i in range(1, count + 1):
        frame_path = temp_prefix.replace("%03d", f"{i:03d}")
        if not os.path.exists(frame_path):
            continue
            
        try:
            img = Image.open(frame_path).convert("L")
            # Sharpness
            lap = img.filter(ImageFilter.Kernel(size=(3,3), kernel=[-1,-1,-1,-1,8,-1,-1,-1,-1], scale=1))
            pixels = list(lap.getdata())
            sharpness = sum(pixels) / len(pixels)
            
            # Brightness and contrast
            orig_pixels = list(img.getdata())
            avg_bright = sum(orig_pixels) / len(orig_pixels)
            brightness_score = 1.0 - abs(avg_bright - 130) / 130  # Peak score at 130
            
            variance = sum((p - avg_bright)**2 for p in orig_pixels) / len(orig_pixels)
            contrast = variance ** 0.5
            
            score = sharpness * 0.5 + contrast * 0.3 + brightness_score * 0.2
            
            if score > best_score:
                best_score = score
                best_frame = frame_path
        except Exception:
            pass
            
    if best_frame and os.path.exists(best_frame):
        import shutil
        shutil.copy2(best_frame, output_path)
        
    # Cleanup
    for i in range(1, count + 1):
        frame_path = temp_prefix.replace("%03d", f"{i:03d}")
        if os.path.exists(frame_path):
            try:
                os.remove(frame_path)
            except:
                pass
                
    return output_path

def add_thumbnail_overlay(image_path: str, title_text: str, output_path: str, badge_text: str = ""):
    if not os.path.exists(image_path):
        return
        
    try:
        base = Image.open(image_path).convert("RGBA")
        width, height = base.size
        
        # Overlay
        overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        
        # Gradient bar
        bar_height = int(height * 0.25)
        bar_y = height - bar_height
        draw.rectangle([(0, bar_y), (width, height)], fill=(0, 0, 0, 160))
        
        # Badge
        if badge_text:
            draw.rectangle([(width - 80, 20), (width - 20, 50)], fill=(124, 106, 247, 255), radius=4)
            try:
                font_badge = ImageFont.truetype("arial.ttf", 16)
            except:
                font_badge = ImageFont.load_default()
            draw.text((width - 70, 28), badge_text, font=font_badge, fill=(255, 255, 255, 255))
            
        # Title text
        try:
            font_title = ImageFont.truetype("arialbd.ttf", int(bar_height * 0.4))
        except:
            font_title = ImageFont.load_default()
            
        text_y = bar_y + (bar_height // 2) - (int(bar_height * 0.4) // 2)
        draw.text((20, text_y), title_text, font=font_title, fill=(255, 255, 255, 255))
        
        out = Image.alpha_composite(base, overlay)
        out.convert("RGB").save(output_path, "JPEG", quality=92)
    except Exception as e:
        print(f"Overlay failed: {e}")
