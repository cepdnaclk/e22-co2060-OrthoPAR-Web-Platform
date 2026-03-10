from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .api import patients, scans, landmarks

# Create tables in DB (for simple setups; use Alembic for production)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Orthodontic PAR Index API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(scans.router, prefix="/api/scans", tags=["scans"])
app.include_router(landmarks.router, prefix="/api/landmarks", tags=["landmarks"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Orthodontic PAR Index API"}
