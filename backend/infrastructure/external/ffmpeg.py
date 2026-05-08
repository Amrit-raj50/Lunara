import subprocess
import os
import re

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
        match = re.search(r"Duration:\s+(\d+):(\d+):(\d+\.\d+)", res.stderr)
        if match:
            h, m, s = match.groups()
            return int(h) * 3600 + int(m) * 60 + float(s)
    except:
        pass
    return None
