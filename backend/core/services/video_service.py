import os
import subprocess
import cv2
import mediapipe as mp
import numpy as np
import base64
import tempfile
import imageio_ffmpeg
from PIL import Image, ImageFilter, ImageDraw, ImageFont
from .template_service import TemplateService # We'll need this for assembling
from infrastructure.external.ffmpeg import get_stream_info, get_video_duration
from core.models.template import VideoTemplate, TemplateClip

class VideoService:
    def __init__(self):
        self.mp_selfie_segmentation = mp.solutions.selfie_segmentation

    def _apply_video_filter(self, frame, filter_name):
        if filter_name == "Cinematic":
            frame = cv2.convertScaleAbs(frame, alpha=1.1, beta=10)
            b, g, r = cv2.split(frame)
            b = cv2.add(b, 15)
            r = cv2.add(r, 10)
            frame = cv2.merge((b, g, r))
        elif filter_name == "Vibrant":
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            hsv[:,:,1] = cv2.convertScaleAbs(hsv[:,:,1], alpha=1.3, beta=0)
            frame = cv2.cvtColor(hsv, cv2.HSV_BGR)
        elif filter_name == "Studio B&W":
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.convertScaleAbs(gray, alpha=1.2, beta=0)
            frame = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        return frame

    def _apply_subject_lighting(self, fg_image, bg_image, alpha, subject_brightness, subject_contrast, skin_smoothing, light_match):
        if skin_smoothing > 0:
            d = 9
            sigma = skin_smoothing
            fg_image = cv2.bilateralFilter(fg_image, d, sigma, sigma)
            
        if subject_brightness != 0 or subject_contrast != 0:
            alpha_c = 1.0 + (subject_contrast / 100.0)
            beta_c = subject_brightness
            fg_image = cv2.convertScaleAbs(fg_image, alpha=alpha_c, beta=beta_c)
            
        if light_match > 0 and bg_image is not None:
            bg_lab = cv2.cvtColor(bg_image, cv2.COLOR_BGR2LAB).astype("float32")
            fg_lab = cv2.cvtColor(fg_image, cv2.COLOR_BGR2LAB).astype("float32")
            mask = (alpha[:, :, 0] * 255).astype(np.uint8)
            _, mask_bin = cv2.threshold(mask, 1, 255, cv2.THRESH_BINARY)
            bg_mean, bg_std = cv2.meanStdDev(bg_lab)
            fg_mean, fg_std = cv2.meanStdDev(fg_lab, mask=mask_bin)
            fg_std[fg_std == 0] = 1
            bg_std[bg_std == 0] = 1
            res_lab = ((fg_lab - fg_mean.reshape((1,1,3))) * (bg_std.reshape((1,1,3)) / fg_std.reshape((1,1,3)))) + bg_mean.reshape((1,1,3))
            res_lab = np.clip(res_lab, 0, 255).astype("uint8")
            transferred_fg = cv2.cvtColor(res_lab, cv2.COLOR_LAB2BGR)
            transferred_fg = (transferred_fg * alpha).astype(np.uint8)
            ratio = light_match / 100.0
            fg_image = cv2.addWeighted(transferred_fg, ratio, fg_image, 1.0 - ratio, 0)
        return fg_image

    def process_video_background(self, input_video, output_video, bg_image_path, progress_callback, step_idx, params):
        cap = cv2.VideoCapture(input_video)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_video, fourcc, fps, (width, height))
        
        base_bg_image = None
        if bg_image_path and os.path.exists(bg_image_path):
            base_bg_image = cv2.imread(bg_image_path)
            base_bg_image = cv2.resize(base_bg_image, (width, height))
        elif params.get('bg_blur', 0) == 0:
            base_bg_image = np.zeros((height, width, 3), dtype=np.uint8)
            base_bg_image[:] = (42, 17, 18)
            
        with self.mp_selfie_segmentation.SelfieSegmentation(model_selection=1) as selfie_segmentation:
            frame_count = 0
            while cap.isOpened():
                success, frame = cap.read()
                if not success: break
                frame_count += 1
                if frame_count % 15 == 0 and total_frames > 0:
                    progress_callback(step_idx, frame_count / float(total_frames), "Removing video background...")
                
                if params.get('video_filter', "None") != "None":
                    frame = self._apply_video_filter(frame, params['video_filter'])
                
                bg_image = base_bg_image
                if bg_image is None:
                    if params.get('bg_blur', 0) > 0:
                        ksize = int(params['bg_blur'] / 100.0 * 50) | 1
                        bg_image = cv2.GaussianBlur(frame, (ksize, ksize), 0)
                    else:
                        bg_image = frame
                
                results = selfie_segmentation.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                condition = results.segmentation_mask
                if condition is not None:
                    kernel = np.ones((5, 5), np.float32)
                    condition = cv2.erode(condition, kernel, iterations=1)
                    condition = cv2.GaussianBlur(condition, (7, 7), 0)
                    alpha = np.stack((condition,) * 3, axis=-1)
                    alpha = np.clip(alpha, 0, 1)
                    fg_image = (frame * alpha).astype(np.uint8)
                    fg_image = self._apply_subject_lighting(fg_image, bg_image, alpha, params.get('subject_brightness', 0), params.get('subject_contrast', 0), params.get('skin_smoothing', 0), params.get('light_match', 0))
                    
                    if params.get('subject_scale', 1.0) != 1.0 or params.get('offset_x', 0) != 0 or params.get('offset_y', 0) != 0:
                        new_w, new_h = int(width * params['subject_scale']), int(height * params['subject_scale'])
                        fg_resized = cv2.resize(fg_image, (new_w, new_h))
                        alpha_resized = cv2.resize(alpha, (new_w, new_h))
                        final_fg = np.zeros((height, width, 3), dtype=np.uint8)
                        final_alpha = np.zeros((height, width, 3), dtype=np.float32)
                        start_x, start_y = (width // 2 + params.get('offset_x', 0)) - (new_w // 2), (height // 2 + params.get('offset_y', 0)) - (new_h // 2)
                        c_sy, c_ey = max(0, start_y), min(height, start_y + new_h)
                        c_sx, c_ex = max(0, start_x), min(width, start_x + new_w)
                        s_sy, s_ey = max(0, -start_y), new_h - max(0, (start_y + new_h) - height)
                        s_sx, s_ex = max(0, -start_x), new_w - max(0, (start_x + new_w) - width)
                        if c_ey > c_sy and c_ex > c_sx:
                            final_fg[c_sy:c_ey, c_sx:c_ex] = fg_resized[s_sy:s_ey, s_sx:s_ex]
                            final_alpha[c_sy:c_ey, c_sx:c_ex] = alpha_resized[s_sy:s_ey, s_sx:s_ex]
                        fg_image, alpha = final_fg, final_alpha
                    output_image = (fg_image + bg_image * (1 - alpha)).astype(np.uint8)
                else:
                    output_image = frame
                out.write(output_image)
        cap.release()
        out.release()

    def process_single_frame(self, base64_img, bg_image_path, params):
        if ',' in base64_img: base64_img = base64_img.split(',')[1]
        img_data = base64.b64decode(base64_img)
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None: raise Exception("Failed to decode image")
        height, width = frame.shape[:2]
        if params.get('video_filter', "None") != "None":
            frame = self._apply_video_filter(frame, params['video_filter'])
        if not params.get('remove_bg', False):
            _, buffer = cv2.imencode('.jpg', frame)
            return base64.b64encode(buffer).decode('utf-8')
        base_bg_image = None
        if bg_image_path and os.path.exists(bg_image_path):
            base_bg_image = cv2.imread(bg_image_path)
            base_bg_image = cv2.resize(base_bg_image, (width, height))
        elif params.get('bg_blur', 0) == 0:
            base_bg_image = np.zeros((height, width, 3), dtype=np.uint8)
            base_bg_image[:] = (42, 17, 18)
        bg_image = base_bg_image
        if bg_image is None:
            if params.get('bg_blur', 0) > 0:
                ksize = int(params['bg_blur'] / 100.0 * 50) | 1
                bg_image = cv2.GaussianBlur(frame, (ksize, ksize), 0)
            else:
                bg_image = frame
        with self.mp_selfie_segmentation.SelfieSegmentation(model_selection=1) as selfie_segmentation:
            results = selfie_segmentation.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            condition = results.segmentation_mask
            if condition is None:
                output_image = frame
            else:
                kernel = np.ones((5, 5), np.float32)
                condition = cv2.erode(condition, kernel, iterations=1)
                condition = cv2.GaussianBlur(condition, (7, 7), 0)
                alpha = np.stack((condition,) * 3, axis=-1)
                alpha = np.clip(alpha, 0, 1)
                fg_image = (frame * alpha).astype(np.uint8)
                fg_image = self._apply_subject_lighting(fg_image, bg_image, alpha, params.get('subject_brightness', 0), params.get('subject_contrast', 0), params.get('skin_smoothing', 0), params.get('light_match', 0))
                if params.get('subject_scale', 1.0) != 1.0 or params.get('offset_x', 0) != 0 or params.get('offset_y', 0) != 0:
                    new_w, new_h = int(width * params['subject_scale']), int(height * params['subject_scale'])
                    fg_resized = cv2.resize(fg_image, (new_w, new_h))
                    alpha_resized = cv2.resize(alpha, (new_w, new_h))
                    final_fg, final_alpha = np.zeros((height, width, 3), dtype=np.uint8), np.zeros((height, width, 3), dtype=np.float32)
                    start_x, start_y = (width // 2 + params.get('offset_x', 0)) - (new_w // 2), (height // 2 + params.get('offset_y', 0)) - (new_h // 2)
                    c_sy, c_ey = max(0, start_y), min(height, start_y + new_h)
                    c_sx, c_ex = max(0, start_x), min(width, start_x + new_w)
                    s_sy, s_ey = max(0, -start_y), new_h - max(0, (start_y + new_h) - height)
                    s_sx, s_ex = max(0, -start_x), new_w - max(0, (start_x + new_w) - width)
                    if c_ey > c_sy and c_ex > c_sx:
                        final_fg[c_sy:c_ey, c_sx:c_ex] = fg_resized[s_sy:s_ey, s_sx:s_ex]
                        final_alpha[c_sy:c_ey, c_sx:c_ex] = alpha_resized[s_sy:s_ey, s_sx:s_ex]
                    fg_image, alpha = final_fg, final_alpha
                output_image = (fg_image + bg_image * (1 - alpha)).astype(np.uint8)
        _, buffer = cv2.imencode('.jpg', output_image)
        return base64.b64encode(buffer).decode('utf-8')

    def assemble_video(self, template: VideoTemplate, body_clip_path: str, output_path: str, is_preview: bool = False):
        inputs, video_clips, audio_clips = [], [], []
        body_duration = get_video_duration(body_clip_path) if body_clip_path else None
        placeholders, primary_ph = [], None
        for track in template.tracks:
            if "body" in track.name.lower() and not track.clips and body_clip_path:
                max_other_end = max([c2.start_time + c2.duration for t2 in template.tracks if t2 != track for c2 in t2.clips] + [0.0])
                track.clips.append(TemplateClip(start_time=max_other_end, duration=body_duration or 5.0, is_placeholder=True, label="Dynamic Body Content"))
            for clip in track.clips:
                if clip.is_placeholder:
                    placeholders.append(clip)
                    if not primary_ph: primary_ph = clip
        if primary_ph and body_duration:
            original_end, delta = primary_ph.start_time + primary_ph.duration, body_duration - primary_ph.duration
            for ph in placeholders: ph.duration = body_duration
            if abs(delta) > 0.01:
                for track in template.tracks:
                    for clip in track.clips:
                        if clip not in placeholders and clip.start_time >= original_end - 0.05: clip.start_time += delta
        total_duration, input_idx = 0.0, 0
        for track in template.tracks:
            if track.muted: continue
            for clip in track.clips:
                clip_path = body_clip_path if clip.is_placeholder else clip.file_path
                if not clip_path or not os.path.exists(clip_path): continue
                end_time = clip.start_time + clip.duration
                if end_time > total_duration: total_duration = end_time
                inputs.append(clip_path)
                has_v, has_a = get_stream_info(clip_path)
                if (track.track_type in ["video", "overlay"]) and has_v:
                    video_clips.append({"idx": input_idx, "start": clip.start_time, "end": end_time})
                    if has_a: audio_clips.append({"idx": input_idx, "start": clip.start_time})
                elif (track.track_type in ["audio", "music"]) and has_a:
                    audio_clips.append({"idx": input_idx, "start": clip.start_time})
                input_idx += 1
        res = "1280x720" if is_preview else "1920x1080"
        filters = []
        if video_clips:
            filters.append(f"color=c=black:s={res}:d={total_duration},setsar=1 [vbase]")
            prev_out = "vbase"
            for i, vc in enumerate(video_clips):
                w, h = res.split('x')
                filters.append(f"[{vc['idx']}:v]scale={res}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,setsar=1,setpts=PTS-STARTPTS+{vc['start']}/TB[v{i}_pts]")
                filters.append(f"[{prev_out}][v{i}_pts]overlay=enable='between(t,{vc['start']},{vc['end']})':eof_action=pass[vout{i}]")
                prev_out = f"vout{i}"
            video_out_pad = prev_out
        else:
            filters.append(f"color=c=black:s={res}:d={total_duration},setsar=1 [vout_final]"); video_out_pad = "vout_final"
        if audio_clips:
            filters.append(f"anullsrc=d={total_duration} [abase]"); mix_inputs = "[abase]"
            for i, ac in enumerate(audio_clips):
                filters.append(f"[{ac['idx']}:a]adelay={int(ac['start'] * 1000)}:all=1[a{i}_dly]")
                mix_inputs += f"[a{i}_dly]"
            filters.append(f"{mix_inputs}amix=inputs={len(audio_clips) + 1}:duration=first:dropout_transition=2[aout_final]"); audio_out_pad = "aout_final"
        else:
            filters.append(f"anullsrc=d={total_duration} [aout_final]"); audio_out_pad = "aout_final"
        
        fd, script_path = tempfile.mkstemp(suffix='.txt', prefix='ffmpeg_nle_')
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as f: f.write(";\n".join(filters))
            cmd = ["ffmpeg", "-y"]
            for path in inputs: cmd.extend(["-i", os.path.abspath(path).replace('\\', '/')])
            cmd.extend(["-filter_complex_script", script_path.replace('\\', '/'), "-map", f"[{video_out_pad}]", "-map", f"[{audio_out_pad}]", "-c:v", "libx264", "-preset", "fast" if not is_preview else "ultrafast", "-crf", "23" if not is_preview else "28", "-c:a", "aac", "-t", str(total_duration), output_path])
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
        finally:
            if os.path.exists(script_path): os.remove(script_path)

    def extract_best_thumbnail(self, video_path: str, output_path: str, count: int = 10) -> str:
        duration = get_video_duration(video_path) or 10.0
        interval = duration / (count + 1)
        os.makedirs("temp_files/frames", exist_ok=True)
        temp_prefix = f"temp_files/frames/thumb_{os.path.basename(video_path)}_%03d.jpg"
        cmd = ["ffmpeg", "-y", "-i", video_path, "-vf", f"fps=1/{interval}", "-frames:v", str(count), "-q:v", "2", temp_prefix]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        best_score, best_frame = -1, None
        for i in range(1, count + 1):
            frame_path = temp_prefix.replace("%03d", f"{i:03d}")
            if not os.path.exists(frame_path): continue
            try:
                img = Image.open(frame_path).convert("L")
                lap = img.filter(ImageFilter.Kernel(size=(3,3), kernel=[-1,-1,-1,-1,8,-1,-1,-1,-1], scale=1))
                pixels = list(lap.getdata()); sharpness = sum(pixels) / len(pixels)
                orig_pixels = list(img.getdata()); avg_bright = sum(orig_pixels) / len(orig_pixels)
                brightness_score = 1.0 - abs(avg_bright - 130) / 130
                variance = sum((p - avg_bright)**2 for p in orig_pixels) / len(orig_pixels)
                score = sharpness * 0.5 + (variance**0.5) * 0.3 + brightness_score * 0.2
                if score > best_score: best_score, best_frame = score, frame_path
            except: pass
        if best_frame:
            import shutil
            shutil.copy2(best_frame, output_path)
        for i in range(1, count + 1):
            p = temp_prefix.replace("%03d", f"{i:03d}")
            if os.path.exists(p): os.remove(p)
        return output_path

    def add_thumbnail_overlay(self, image_path: str, title_text: str, output_path: str, badge_text: str = ""):
        if not os.path.exists(image_path): return
        try:
            base = Image.open(image_path).convert("RGBA")
            width, height = base.size
            overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)
            bar_height = int(height * 0.25); bar_y = height - bar_height
            draw.rectangle([(0, bar_y), (width, height)], fill=(0, 0, 0, 160))
            if badge_text:
                draw.rectangle([(width - 80, 20), (width - 20, 50)], fill=(124, 106, 247, 255))
                try: font_badge = ImageFont.truetype("arial.ttf", 16)
                except: font_badge = ImageFont.load_default()
                draw.text((width - 70, 28), badge_text, font=font_badge, fill=(255, 255, 255, 255))
            try: font_title = ImageFont.truetype("arialbd.ttf", int(bar_height * 0.4))
            except: font_title = ImageFont.load_default()
            text_y = bar_y + (bar_height // 2) - (int(bar_height * 0.4) // 2)
            draw.text((20, text_y), title_text, font=font_title, fill=(255, 255, 255, 255))
            Image.alpha_composite(base, overlay).convert("RGB").save(output_path, "JPEG", quality=92)
        except Exception as e: print(f"Overlay failed: {e}")
