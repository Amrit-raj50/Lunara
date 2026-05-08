# Welcome to the Lunara Wiki

This wiki contains comprehensive documentation for Lunara - the AI-powered video & audio enhancement platform.

---

## Quick Navigation

| Section | Description |
|---------|-------------|
| [Getting Started](#getting-started) | Installation & first run |
| [Features](#features) | Detailed feature guides |
| [API Reference](#api-reference) | Backend API documentation |
| [Troubleshooting](#troubleshooting) | Common issues & solutions |
| [Development](#development) | Contributing & local dev setup |

---

## Getting Started

### Installation

#### Option 1: Docker (Recommended)
```bash
docker pull ghcr.io/amrit-raj50/lunara:latest
docker run -p 8000:8000 -e MONGO_URI="your_mongodb_uri" ghcr.io/amrit-raj50/lunara:latest
```

#### Option 2: Local Development
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Features

### Audio Lab

Enhance audio with professional-grade processing:

| Control | Range | Description |
|---------|-------|-------------|
| Noise Reduction | 0-100% | Removes background noise using AI |
| Voice Boost | 0-20 dB | Amplifies voice frequencies |
| EQ Clarity | 0-100% | Enhances vocal presence |
| LUFS Target | -23 to -14 | Broadcast loudness standard |

**Presets:**
- **YouTube** (65/40/82/14) - Optimized for online content
- **Podcast** (85/20/60/16) - Clean podcast audio
- **Interview** (60/30/40/14) - Natural conversation
- **Online Class** (70/25/55/14) - Educational content

### Video Studio

AI-powered video enhancement:

| Feature | Description |
|---------|-------------|
| Background Removal | AI segmentation using MediaPipe |
| Custom Backgrounds | Upload your own or blur original |
| Subject Scaling | Resize and reposition subject |
| Skin Smoothing | Subtle AI beauty enhancement |
| Light Matching | Match subject lighting to background |
| Cinematic Filters | Cinematic, Vibrant, Studio B&W |

### NLE Workflow Editor

Visual timeline for template creation:
- **Tracks**: Video, Audio, Overlay, Music layers
- **Clips**: Drag-and-drop placement
- **Placeholders**: Auto-fill with batch clips
- **Preview**: Real-time render before export

---

## API Reference

### Authentication
Currently open API (no auth required for local dev).

### Endpoints

#### Process Media
```http
POST /api/enhance
Content-Type: multipart/form-data

Parameters:
- file: Video file (required)
- noise_reduce: 0-100
- voice_boost: 0-20
- eq_clarity: 0-100
- lufs_target: -23 to -14
- remove_bg: "true" or "false"
- bg_image: Background image (optional)
```

**Response:**
```json
{
  "task_id": "uuid-string"
}
```

#### WebSocket Progress
```
ws://localhost:8000/api/ws/{task_id}
```

**Messages:**
```json
{
  "step": 0,
  "progress": 0.25,
  "message": "Extracting audio..."
}
```

#### Batch Render
```http
POST /api/render/batch
Content-Type: multipart/form-data

Parameters:
- template_id: Template ID
- body_clips: JSON array of clip paths
- output_prefix: Filename prefix
- thumbnail_title: Title with {n} placeholder
- export_srt: "true" or "false"
- burn_subs: "true" or "false"
```

#### Get Job Status
```http
GET /api/render/{job_id}
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "done",
  "progress": 1.0,
  "results": [...]
}
```

---

## Troubleshooting

### Backend won't start
**Issue:** `ModuleNotFoundError: No module named 'cv2'`

**Fix:**
```bash
pip install opencv-python
# Or on Linux:
sudo apt-get install python3-opencv
```

### FFmpeg not found
**Issue:** `FFmpeg extraction failed`

**Fix:**
- **Windows:** Download from https://ffmpeg.org/download.html and add to PATH
- **macOS:** `brew install ffmpeg`
- **Linux:** `sudo apt-get install ffmpeg`

### MongoDB connection error
**Issue:** `pymongo.errors.ServerSelectionTimeoutError`

**Fix:**
1. Check `MONGO_URI` in `.env` file
2. Ensure MongoDB is running locally or use MongoDB Atlas
3. Whitelist your IP in Atlas settings

### Docker image build fails
**Issue:** Build hangs on pip install

**Fix:**
```bash
# Clear Docker cache
docker build --no-cache -t lunara ./backend
```

### Frontend blank screen
**Issue:** White screen after `npm run dev`

**Fix:**
1. Check backend is running on port 8000
2. Check `apiConfig.js` has correct `API_BASE_URL`
3. Clear browser cache

---

## Development

### Project Structure
```
Lunara/
├── backend/
│   ├── main.py           # FastAPI entry
│   ├── audio_processor.py # Audio pipeline
│   ├── render.py         # Video rendering
│   ├── template.py       # Data models
│   ├── captions.py       # Whisper integration
│   └── thumbnail.py      # Thumbnail generation
└── frontend/
    └── src/
        ├── App.jsx       # Main app
        ├── Workflows.jsx # Template editor
        └── NLETimeline.jsx # Timeline component
```

### Adding New Features

1. **Backend:** Add endpoint in `main.py`
2. **Processing:** Create module (e.g., `effects.py`)
3. **Frontend:** Add UI in `App.jsx` or new component
4. **API:** Update `apiConfig.js` if URL changes

### Testing
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

---

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `MONGO_URI` | Yes | MongoDB connection string | - |
| `BASE_URL` | No | Public URL for downloads | Auto-detected |
| `PORT` | No | Server port | 8000 |

---

## Support

- 🐛 **Issues:** https://github.com/Amrit-raj50/Lunara/issues
- 💬 **Discussions:** Use GitHub Discussions for Q&A
- 📧 **Email:** (your-email@example.com)

---

*Last updated: May 2026*
