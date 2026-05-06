import os
import subprocess

def transcribe_audio(audio_path: str, language: str = "en") -> list[dict]:
    """
    Note: Whisper runs on CPU if no GPU is available. 
    The base model takes about 10-30 seconds for a 5-minute clip on CPU.
    """
    try:
        import whisper
    except ImportError:
        raise Exception("openai-whisper not installed. Please install it to use captions.")

    model = whisper.load_model("base")
    result = model.transcribe(audio_path, language=language, word_timestamps=False)
    
    return result["segments"]

def format_time(seconds: float) -> str:
    """Convert float seconds to SRT time format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    msecs = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{msecs:03d}"

def segments_to_srt(segments: list[dict], output_path: str) -> str:
    with open(output_path, "w", encoding="utf-8") as f:
        for i, segment in enumerate(segments, 1):
            start = format_time(segment["start"])
            end = format_time(segment["end"])
            text = segment["text"].strip()
            
            f.write(f"{i}\n")
            f.write(f"{start} --> {end}\n")
            f.write(f"{text}\n\n")
            
    return output_path

def burn_subtitles(input_video: str, srt_path: str, output_path: str):
    # FFmpeg requires escaping for path in filter
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
