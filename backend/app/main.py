import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from api.v1.router import api_router
from app.config import settings
import asyncio

app = FastAPI(title=settings.PROJECT_NAME)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://lunara-vjib-git-main-amrit-rajs-projects-d86d2d35.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Keep wildcard for flexibility, but explicit handler below will catch issues
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"GLOBAL ERROR: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

# Legacy API support to prevent breaking the frontend
from api.v1.endpoints import media, templates, render
app.include_router(media.router, prefix="/api", tags=["legacy"])
app.include_router(templates.router, prefix="/api/templates", tags=["legacy"])
app.include_router(render.router, prefix="/api/render", tags=["legacy"])

# WebSocket Handling (Moved from main.py but needs to be accessible)
# Note: In a real app, this might be in a dedicated router or service
from api.v1.endpoints.media import tasks_progress

@app.websocket("/api/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await websocket.accept()
    try:
        last_state = None
        while True:
            if task_id in tasks_progress:
                current_state = tasks_progress[task_id]
                if current_state != last_state:
                    await websocket.send_json(current_state)
                    last_state = current_state
                    if current_state["step"] in [6, -1]: # Done or Error
                        break
            await asyncio.sleep(0.5)
    except Exception:
        pass
    finally:
        try: await websocket.close()
        except: pass

@app.get("/")
async def root():
    return {"message": "Lunara API is running", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
