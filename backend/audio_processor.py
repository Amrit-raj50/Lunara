import os
import subprocess
import noisereduce as nr
import scipy.signal
import soundfile as sf
import numpy as np
import imageio_ffmpeg
import cv2
import mediapipe as mp
import base64

def _ffmpeg_extract_audio(video_path, wav_path):
    cmd = [
        imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "1",
        wav_path
    ]
    startupinfo = None
    if os.name == 'nt':
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, startupinfo=startupinfo)
    if result.returncode != 0:
        err_msg = result.stderr[-500:] if result.stderr else "Unknown ffmpeg error"
        raise Exception(f"FFmpeg extraction failed:\n{err_msg}")

def _apply_noise_reduction(wav_path, strength):
    audio, sr = sf.read(wav_path)
    
    profile_len = int(0.5 * sr)
    if len(audio) > profile_len:
        noise_clip = audio[:profile_len]
    else:
        noise_clip = audio
        
    if strength > 0:
        reduced_audio = nr.reduce_noise(y=audio, y_noise=noise_clip, sr=sr, prop_decrease=strength)
    else:
        reduced_audio = audio
        
    return reduced_audio, sr

def _apply_eq_and_boost(audio, sr, eq_clarity, boost_db):
    if eq_clarity > 0:
        nyq = 0.5 * sr
        low = 1000.0 / nyq
        high = 4000.0 / nyq
        b, a = scipy.signal.butter(4, [low, high], btype='band')
        voice_band = scipy.signal.filtfilt(b, a, audio)
        audio = audio + (voice_band * eq_clarity)
        
    if boost_db > 0:
        multiplier = 10 ** (boost_db / 20.0)
        audio = audio * multiplier
        
    audio = np.tanh(audio * 0.8) / 0.8
    return audio

def _apply_video_filter(frame, filter_name):
    if filter_name == "Cinematic":
        # Boost contrast and apply subtle teal/orange
        frame = cv2.convertScaleAbs(frame, alpha=1.1, beta=10)
        b, g, r = cv2.split(frame)
        b = cv2.add(b, 15)
        r = cv2.add(r, 10)
        frame = cv2.merge((b, g, r))
    elif filter_name == "Vibrant":
        # Boost saturation
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        hsv[:,:,1] = cv2.convertScaleAbs(hsv[:,:,1], alpha=1.3, beta=0)
        frame = cv2.cvtColor(hsv, cv2.HSV_BGR)
    elif filter_name == "Studio B&W":
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.convertScaleAbs(gray, alpha=1.2, beta=0) # High contrast
        frame = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    return frame

def _apply_subject_lighting(fg_image, bg_image, alpha, subject_brightness, subject_contrast, skin_smoothing, light_match):
    # Skin Smoothing
    if skin_smoothing > 0:
        d = 9
        sigma = skin_smoothing
        fg_image = cv2.bilateralFilter(fg_image, d, sigma, sigma)
        
    # Brightness & Contrast
    if subject_brightness != 0 or subject_contrast != 0:
        alpha_c = 1.0 + (subject_contrast / 100.0)
        beta_c = subject_brightness
        fg_image = cv2.convertScaleAbs(fg_image, alpha=alpha_c, beta=beta_c)
        
    # Reinhard Color Transfer (Light Matching)
    if light_match > 0 and bg_image is not None:
        bg_lab = cv2.cvtColor(bg_image, cv2.COLOR_BGR2LAB).astype("float32")
        fg_lab = cv2.cvtColor(fg_image, cv2.COLOR_BGR2LAB).astype("float32")
        
        # Create 1-channel uint8 mask for stats
        mask = (alpha[:, :, 0] * 255).astype(np.uint8)
        _, mask_bin = cv2.threshold(mask, 1, 255, cv2.THRESH_BINARY)
        
        bg_mean, bg_std = cv2.meanStdDev(bg_lab)
        fg_mean, fg_std = cv2.meanStdDev(fg_lab, mask=mask_bin)
        
        fg_std[fg_std == 0] = 1
        bg_std[bg_std == 0] = 1
        
        res_lab = ((fg_lab - fg_mean.reshape((1,1,3))) * (bg_std.reshape((1,1,3)) / fg_std.reshape((1,1,3)))) + bg_mean.reshape((1,1,3))
        res_lab = np.clip(res_lab, 0, 255).astype("uint8")
        transferred_fg = cv2.cvtColor(res_lab, cv2.COLOR_LAB2BGR)
        
        # Mask out the transfer so black background stays black
        transferred_fg = (transferred_fg * alpha).astype(np.uint8)
        
        ratio = light_match / 100.0
        fg_image = cv2.addWeighted(transferred_fg, ratio, fg_image, 1.0 - ratio, 0)
        
    return fg_image

def _process_video_background(input_video, output_video, bg_image_path, progress_callback, step_idx, subject_scale, offset_x, offset_y, bg_blur, video_filter, subject_brightness, subject_contrast, skin_smoothing, light_match):
    mp_selfie_segmentation = mp.solutions.selfie_segmentation
    
    cap = cv2.VideoCapture(input_video)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0 or fps is None or np.isnan(fps):
        fps = 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video, fourcc, fps, (width, height))
    
    # Load or generate background
    base_bg_image = None
    if bg_image_path and os.path.exists(bg_image_path):
        base_bg_image = cv2.imread(bg_image_path)
        base_bg_image = cv2.resize(base_bg_image, (width, height))
    elif bg_blur == 0:
        # Default clean studio-dark background
        base_bg_image = np.zeros((height, width, 3), dtype=np.uint8)
        base_bg_image[:] = (42, 17, 18)
        
    with mp_selfie_segmentation.SelfieSegmentation(model_selection=1) as selfie_segmentation:
        frame_count = 0
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
                
            frame_count += 1
            if frame_count % 15 == 0 and total_frames > 0:
                progress_callback(step_idx, frame_count / float(total_frames), "Removing video background...")
                
            # Process frame
            if video_filter != "None":
                frame = _apply_video_filter(frame, video_filter)
                
            # Generate blurred background if requested and no custom bg
            if base_bg_image is not None:
                bg_image = base_bg_image
            else:
                if bg_blur > 0:
                    ksize = int(bg_blur / 100.0 * 50) | 1 # Odd number
                    bg_image = cv2.GaussianBlur(frame, (ksize, ksize), 0)
                else:
                    bg_image = frame
                
            results = selfie_segmentation.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            
            condition = results.segmentation_mask
            
            # Erode the mask to remove the background halo
            kernel = np.ones((5, 5), np.float32)
            condition = cv2.erode(condition, kernel, iterations=1)
            
            # Apply a smaller Gaussian Blur for sharp but smooth edges
            condition = cv2.GaussianBlur(condition, (7, 7), 0)
            
            alpha = np.stack((condition,) * 3, axis=-1)
            alpha = np.clip(alpha, 0, 1)
            
            # Isolate foreground
            fg_image = (frame * alpha).astype(np.uint8)
            
            # Apply Lighting & Beauty to isolated foreground
            fg_image = _apply_subject_lighting(fg_image, bg_image, alpha, subject_brightness, subject_contrast, skin_smoothing, light_match)
            
            # Transform: Scale and Translate
            if subject_scale != 1.0 or offset_x != 0 or offset_y != 0:
                # Resize FG and Alpha
                new_w = int(width * subject_scale)
                new_h = int(height * subject_scale)
                fg_resized = cv2.resize(fg_image, (new_w, new_h))
                alpha_resized = cv2.resize(alpha, (new_w, new_h))
                
                # Create empty canvases
                final_fg = np.zeros((height, width, 3), dtype=np.uint8)
                final_alpha = np.zeros((height, width, 3), dtype=np.float32)
                
                # Calculate placement coordinates
                center_x = int(width / 2) + offset_x
                center_y = int(height / 2) + offset_y
                
                start_x = center_x - int(new_w / 2)
                start_y = center_y - int(new_h / 2)
                
                # Canvas cropping
                c_start_y = max(0, start_y)
                c_end_y = min(height, start_y + new_h)
                c_start_x = max(0, start_x)
                c_end_x = min(width, start_x + new_w)
                
                # Source cropping
                s_start_y = max(0, -start_y)
                s_end_y = new_h - max(0, (start_y + new_h) - height)
                s_start_x = max(0, -start_x)
                s_end_x = new_w - max(0, (start_x + new_w) - width)
                
                if c_end_y > c_start_y and c_end_x > c_start_x:
                    final_fg[c_start_y:c_end_y, c_start_x:c_end_x] = fg_resized[s_start_y:s_end_y, s_start_x:s_end_x]
                    final_alpha[c_start_y:c_end_y, c_start_x:c_end_x] = alpha_resized[s_start_y:s_end_y, s_start_x:s_end_x]
                    
                fg_image = final_fg
                alpha = final_alpha
            
            # Blend
            output_image = (fg_image + bg_image * (1 - alpha)).astype(np.uint8)
            
            out.write(output_image)
            
    cap.release()
    out.release()

def _save_and_normalize(audio, sr, tmp_enhanced_audio, output_path, video_path, lufs_target, reencode_video=False):
    sf.write(tmp_enhanced_audio, audio, sr)
    
    cmd = [
        imageio_ffmpeg.get_ffmpeg_exe(), "-y", 
        "-i", video_path, 
        "-i", tmp_enhanced_audio, 
    ]
    
    if reencode_video:
        cmd.extend(["-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p"])
    else:
        cmd.extend(["-c:v", "copy"])
        
    cmd.extend([
        "-map", "0:v:0", 
        "-map", "1:a:0", 
        "-af", f"loudnorm=I={lufs_target}:TP=-1.5:LRA=11", 
        "-c:a", "aac", "-b:a", "192k", 
        output_path
    ])
    
    startupinfo = None
    if os.name == 'nt':
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, startupinfo=startupinfo)
    if result.returncode != 0:
        err_msg = result.stderr[-500:] if result.stderr else "Unknown ffmpeg error"
        raise Exception(f"FFmpeg merge failed:\n{err_msg}")

def process_media(task_id, video_path, output_path, noise_reduce, voice_boost, eq_clarity, lufs_target, remove_bg, bg_image_path, progress_callback, subject_scale=1.0, offset_x=0, offset_y=0, bg_blur=0, video_filter="None", subject_brightness=0, subject_contrast=0, skin_smoothing=0, light_match=0):
    tmp_wav = f"temp_files/{task_id}_temp.wav"
    tmp_enhanced_audio = f"temp_files/{task_id}_enhanced_temp.wav"
    tmp_processed_video = f"temp_files/{task_id}_processed_video.mp4"
    
    try:
        progress_callback(0, 0.0, "Extracting audio with ffmpeg...")
        _ffmpeg_extract_audio(video_path, tmp_wav)
        
        progress_callback(1, 0.2, "Reducing background noise...")
        strength = noise_reduce / 100.0
        audio, sr = _apply_noise_reduction(tmp_wav, strength)
        
        progress_callback(2, 0.4, "Applying EQ and voice boost...")
        eq = eq_clarity / 100.0 * 0.5
        audio = _apply_eq_and_boost(audio, sr, eq, voice_boost)
        
        # New Step: Video Processing
        video_to_merge = video_path
        if remove_bg:
            progress_callback(3, 0.0, "Applying AI Video Effects...")
            _process_video_background(
                video_path, tmp_processed_video, bg_image_path, progress_callback, 3, 
                subject_scale, offset_x, offset_y, bg_blur, video_filter,
                subject_brightness, subject_contrast, skin_smoothing, light_match
            )
            video_to_merge = tmp_processed_video
        
        progress_callback(4, 0.8, "Normalizing loudness & merging...")
        _save_and_normalize(audio, sr, tmp_enhanced_audio, output_path, video_to_merge, -lufs_target, reencode_video=remove_bg)
        
        progress_callback(6, 1.0, "Done!") # 6 is completion state
        
    except Exception as e:
        progress_callback(-1, 0.0, f"Error: {str(e)}")
    finally:
        for tmp in [tmp_wav, tmp_enhanced_audio, tmp_processed_video]:
            if os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except:
                    pass

def process_single_frame(base64_img, bg_image_path, subject_scale, offset_x, offset_y, bg_blur, video_filter, remove_bg, subject_brightness, subject_contrast, skin_smoothing, light_match):
    # Decode base64 to OpenCV image
    if ',' in base64_img:
        base64_img = base64_img.split(',')[1]
    img_data = base64.b64decode(base64_img)
    np_arr = np.frombuffer(img_data, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    
    if frame is None:
        raise Exception("Failed to decode image")
        
    height, width = frame.shape[:2]
    
    if video_filter != "None":
        frame = _apply_video_filter(frame, video_filter)
        
    if not remove_bg:
        # Just return the filtered frame
        _, buffer = cv2.imencode('.jpg', frame)
        return base64.b64encode(buffer).decode('utf-8')
        
    # Load or generate background
    base_bg_image = None
    if bg_image_path and os.path.exists(bg_image_path):
        base_bg_image = cv2.imread(bg_image_path)
        base_bg_image = cv2.resize(base_bg_image, (width, height))
    elif bg_blur == 0:
        base_bg_image = np.zeros((height, width, 3), dtype=np.uint8)
        base_bg_image[:] = (42, 17, 18)
        
    if base_bg_image is not None:
        bg_image = base_bg_image
    else:
        if bg_blur > 0:
            ksize = int(bg_blur / 100.0 * 50) | 1
            bg_image = cv2.GaussianBlur(frame, (ksize, ksize), 0)
        else:
            bg_image = frame
            
    mp_selfie_segmentation = mp.solutions.selfie_segmentation
    with mp_selfie_segmentation.SelfieSegmentation(model_selection=1) as selfie_segmentation:
        results = selfie_segmentation.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        if results.segmentation_mask is None:
            # Fallback if no person found
            output_image = frame
        else:
            condition = results.segmentation_mask
            kernel = np.ones((5, 5), np.float32)
            condition = cv2.erode(condition, kernel, iterations=1)
            condition = cv2.GaussianBlur(condition, (7, 7), 0)
            
            alpha = np.stack((condition,) * 3, axis=-1)
            alpha = np.clip(alpha, 0, 1)
            
            fg_image = (frame * alpha).astype(np.uint8)
            
            fg_image = _apply_subject_lighting(fg_image, bg_image, alpha, subject_brightness, subject_contrast, skin_smoothing, light_match)
            
            if subject_scale != 1.0 or offset_x != 0 or offset_y != 0:
                new_w = int(width * subject_scale)
                new_h = int(height * subject_scale)
                fg_resized = cv2.resize(fg_image, (new_w, new_h))
                alpha_resized = cv2.resize(alpha, (new_w, new_h))
                
                final_fg = np.zeros((height, width, 3), dtype=np.uint8)
                final_alpha = np.zeros((height, width, 3), dtype=np.float32)
                
                center_x = int(width / 2) + offset_x
                center_y = int(height / 2) + offset_y
                
                start_x = center_x - int(new_w / 2)
                start_y = center_y - int(new_h / 2)
                
                c_start_y = max(0, start_y)
                c_end_y = min(height, start_y + new_h)
                c_start_x = max(0, start_x)
                c_end_x = min(width, start_x + new_w)
                
                s_start_y = max(0, -start_y)
                s_end_y = new_h - max(0, (start_y + new_h) - height)
                s_start_x = max(0, -start_x)
                s_end_x = new_w - max(0, (start_x + new_w) - width)
                
                if c_end_y > c_start_y and c_end_x > c_start_x:
                    final_fg[c_start_y:c_end_y, c_start_x:c_end_x] = fg_resized[s_start_y:s_end_y, s_start_x:s_end_x]
                    final_alpha[c_start_y:c_end_y, c_start_x:c_end_x] = alpha_resized[s_start_y:s_end_y, s_start_x:s_end_x]
                    
                fg_image = final_fg
                alpha = final_alpha
                
            output_image = (fg_image + bg_image * (1 - alpha)).astype(np.uint8)

    _, buffer = cv2.imencode('.jpg', output_image)
    return base64.b64encode(buffer).decode('utf-8')
