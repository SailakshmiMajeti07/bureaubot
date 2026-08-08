import os
import sys
from contextlib import asynccontextmanager

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.mutagent import router as mutagent_router
from app.api.routes import router
from app.config import get_settings
from app.db.init_db import initialize_database
from app.models import HealthResponse

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ensure database schema exists and seed data is populated on startup
    try:
        initialize_database()
    except Exception as exc:
        print(f"Warning: Database initialization skipped or deferred: {exc}")
    yield


app = FastAPI(title="BureauBot API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(mutagent_router)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

