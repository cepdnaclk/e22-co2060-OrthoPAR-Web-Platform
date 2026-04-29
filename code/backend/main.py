from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models, schemas, auth, storage, crud
import os

from app.routes import analysis

Base.metadata.create_all(bind=engine)

# --- Auto-seed ML Model Record ---
# Ensures the ML pipeline works out of the box for anyone starting the server.
# If no active ML model record exists, create one pointing to the default ml_models/ directory.
def _seed_ml_model():
    db = next(get_db())
    try:
        active_model = db.query(models.MLModel).filter(models.MLModel.is_active == True).first()
        if not active_model:
            seed = models.MLModel(
                name="Default Landmark Predictor",
                version="v1.0.0",
                file_path="ml_models",
                is_active=True
            )
            db.add(seed)
            db.commit()
            print("[Startup] Seeded default ML model record (ml_models/)")
        else:
            print(f"[Startup] Active ML model found: {active_model.name} ({active_model.version})")
    except Exception as e:
        print(f"[Startup] ML model seeding skipped: {e}")
        db.rollback()
    finally:
        db.close()

_seed_ml_model()

app = FastAPI(title="OrthoPAR Integrated API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router, prefix="/api")

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {".stl", ".obj"}

# ---------------- REGISTER ----------------
@app.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):

    existing_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = auth.hash_password(user.password)

    new_user = models.User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_pw,
        hospital_name=user.hospital_name,
        slmc_registration_number=user.slmc_registration_number,
        specialty=user.specialty,
        phone_number=user.phone_number
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully"}


# ---------------- LOGIN ----------------
@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm has username and password fields
    # We are using email as the username
    db_user = db.query(models.User).filter(
        models.User.email == form_data.username
    ).first()

    if not db_user or not auth.verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(
        data={"sub": db_user.email}
    )

    return {"access_token": access_token, "token_type": "bearer"}

# ---------------- MODEL UPLOAD ----------------
@app.post("/models/upload", response_model=schemas.ModelResponse)
async def upload_model(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint to upload 3D models (.stl, .obj).
    - Validates file type and size.
    - Saves file locally per user.
    - Stores metadata in PostgreSQL.
    """
    # 1. Validate File Extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Only {', '.join(ALLOWED_EXTENSIONS)} are allowed."
        )

    # 2. Validate File Size (check headers first for early exit)
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB.")

    try:
        # 3. Save file locally
        model_id, file_path = await storage.storage_manager.save_file(file, current_user.id)

        # 4. Save metadata to Database
        crud.save_model_metadata(
            db=db,
            user_id=current_user.id,
            model_id=model_id,
            file_name=file.filename,
            file_path=file_path,
            file_type=file_ext.strip(".")
        )

        return {
            "model_id": model_id,
            "file_name": file.filename,
            "status": "uploaded"
        }

    except HTTPException:
        raise
    except Exception as e:
        # Generic error handler
        print(f"Unexpected error during upload: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred during upload.")

# ---------------- USER SETTINGS ----------------
@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.put("/users/me", response_model=schemas.User)
def update_user_me(user_update: schemas.UserUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if user_update.full_name is not None: current_user.full_name = user_update.full_name
    if user_update.hospital_name is not None: current_user.hospital_name = user_update.hospital_name
    if user_update.slmc_registration_number is not None: current_user.slmc_registration_number = user_update.slmc_registration_number
    if user_update.specialty is not None: current_user.specialty = user_update.specialty
    if user_update.phone_number is not None: current_user.phone_number = user_update.phone_number
    db.commit()
    db.refresh(current_user)
    return current_user

@app.put("/users/me/password")
def update_user_password(pass_update: schemas.UserPasswordUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if not auth.verify_password(pass_update.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    current_user.hashed_password = auth.hash_password(pass_update.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

# TODO: Migrate seed_uploads.py dev utility once E2E verification passes
