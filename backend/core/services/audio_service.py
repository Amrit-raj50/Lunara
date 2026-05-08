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

class AudioService:
    @staticmethod
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

    @staticmethod
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

    @staticmethod
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

    @staticmethod
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

    def transcribe(self, audio_path: str, language: str = "en") -> list[dict]:
        try:
            import whisper
        except ImportError:
            raise Exception("openai-whisper not installed. Please install it to use captions.")
        model = whisper.load_model("base")
        result = model.transcribe(audio_path, language=language, word_timestamps=False)
        return result["segments"]

    @staticmethod
    def format_time(seconds: float) -> str:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        msecs = int((seconds - int(seconds)) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{msecs:03d}"

    def segments_to_srt(self, segments: list[dict], output_path: str) -> str:
        with open(output_path, "w", encoding="utf-8") as f:
            for i, segment in enumerate(segments, 1):
                start = self.format_time(segment["start"])
                end = self.format_time(segment["end"])
                text = segment["text"].strip()
                f.write(f"{i}\n")
                f.write(f"{start} --> {end}\n")
                f.write(f"{text}\n\n")
        return output_path

    def burn_subtitles(self, input_video: str, srt_path: str, output_path: str):
        abs_srt = os.path.abspath(srt_path).replace("\\", "\\\\").replace(":", "\\:")
        cmd = [
            "ffmpeg", "-y",
            "-i", input_video,
            "-vf", f"subtitles='{abs_srt}':force_style='FontName=Arial,FontSize=18,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=1,Alignment=2'",
            "-c:a", "copy",
            output_path
        ]
        try:
            subprocess.run(cmd, check=True, stderr=subprocess.PIPE)
            return output_path
        except subprocess.CalledProcessError as e:
            error_output = e.stderr.decode() if e.stderr else str(e)
            raise Exception(f"FFmpeg subtitle burn failed: {error_output}")
