
import os
import sys

# Add backend to path
sys.path.append(os.path.abspath("e:/Lunara/Lunara/backend"))

from render import assemble_video
from template import VideoTemplate, TemplateTrack, TemplateClip

# Use an existing clip
clip_path = "e:/Lunara/Lunara/backend/storage/clips/011f55e1-460c-4fb5-a6c7-abbeb5159d11_2026-05-05 22-21-33.mp4"

template = VideoTemplate(
    name="Test Template",
    tracks=[
        TemplateTrack(
            name="Video Track",
            track_type="video",
            clips=[
                TemplateClip(
                    start_time=0.0,
                    duration=5.0,
                    file_path=clip_path,
                    label="Test Clip"
                )
            ]
        )
    ]
)

output_path = "e:/Lunara/Lunara/backend/storage/previews/repro_test.mp4"
os.makedirs(os.path.dirname(output_path), exist_ok=True)

try:
    print("Starting assembly...")
    assemble_video(template, "", output_path, "test_job", is_preview=True)
    print("Success!")
except Exception as e:
    print(f"FAILED: {e}")
