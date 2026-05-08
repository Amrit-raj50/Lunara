import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from api.v1.router import api_router
from app.config import settings
import asyncio

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
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
