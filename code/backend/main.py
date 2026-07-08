from fastapi import FastAPI, Depends, HTTPException, Request, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models, schemas, auth, storage, crud, audit
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
def register(user: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):

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

    audit.record(
        db, audit.USER_REGISTERED,
        user_id=new_user.id,
        user_email=new_user.email,
        entity_type="user",
        entity_id=str(new_user.id),
        summary=f"New user registered: {new_user.email}",
        details={
            "full_name": new_user.full_name,
            "hospital_name": new_user.hospital_name,
            "specialty": new_user.specialty,
        },
        request=request,
    )

    return {"message": "User registered successfully"}


# ---------------- LOGIN ----------------
@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), request: Request = None, db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm has username and password fields
    # We are using email as the username
    db_user = db.query(models.User).filter(
        models.User.email == form_data.username
    ).first()

    if not db_user or not auth.verify_password(form_data.password, db_user.hashed_password):
        # Log the failure before raising so the audit entry is always written
        audit.record(
            db, audit.LOGIN_FAILURE,
            user_email=form_data.username,
            status=audit.AuditStatus.FAILURE,
            summary=f"Failed login attempt for: {form_data.username}",
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(
        data={"sub": db_user.email}
    )

    audit.record(
        db, audit.LOGIN_SUCCESS,
        user_id=db_user.id,
        user_email=db_user.email,
        entity_type="user",
        entity_id=str(db_user.id),
        summary=f"Login: {db_user.email}",
        request=request,
    )

    return {"access_token": access_token, "token_type": "bearer"}

# ---------------- MODEL UPLOAD ----------------
@app.post("/models/upload", response_model=schemas.ModelResponse)
async def upload_model(
    request: Request,
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
        audit.record(
            db, audit.MODEL_UPLOAD_FAILED,
            user_id=current_user.id,
            user_email=current_user.email,
            status=audit.AuditStatus.FAILURE,
            summary=f"Model upload failed: invalid extension '{file_ext}'",
            details={"filename": file.filename, "reason": "invalid_extension"},
            request=request,
        )
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Only {', '.join(ALLOWED_EXTENSIONS)} are allowed."
        )

    # 2. Validate File Size (check headers first for early exit)
    if file.size and file.size > MAX_FILE_SIZE:
        audit.record(
            db, audit.MODEL_UPLOAD_FAILED,
            user_id=current_user.id,
            user_email=current_user.email,
            status=audit.AuditStatus.FAILURE,
            summary=f"Model upload failed: file too large ({file.size} bytes)",
            details={"filename": file.filename, "size": file.size, "reason": "file_too_large"},
            request=request,
        )
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB.")

    try:
        # 3. Save file locally
        model_id, file_path = await storage.storage_manager.save_file(file, current_user.id)

        # 4. Save metadata to Database
        db_model = crud.save_model_metadata(
            db=db,
            user_id=current_user.id,
            model_id=model_id,
            file_name=file.filename,
            file_path=file_path,
            file_type=file_ext.strip(".")
        )

        audit.record(
            db, audit.MODEL_UPLOADED,
            user_id=current_user.id,
            user_email=current_user.email,
            entity_type="model",
            entity_id=str(model_id),
            summary=f"Model uploaded: {file.filename}",
            details={
                "model_id": str(model_id),
                "file_name": file.filename,
                "file_type": file_ext.strip("."),
            },
            request=request,
        )

        return {
            "model_id": model_id,
            "file_name": file.filename,
            "status": "uploaded"
        }

    except HTTPException as he:
        audit.record(
            db, audit.MODEL_UPLOAD_FAILED,
            user_id=current_user.id,
            user_email=current_user.email,
            status=audit.AuditStatus.FAILURE,
            summary=f"Model upload failed: HTTP {he.status_code}",
            details={"filename": file.filename, "detail": he.detail},
            request=request,
        )
        raise
    except Exception as e:
        audit.record(
            db, audit.MODEL_UPLOAD_FAILED,
            user_id=current_user.id,
            user_email=current_user.email,
            status=audit.AuditStatus.FAILURE,
            summary=f"Model upload failed: unexpected error",
            details={"filename": file.filename, "error": str(e)},
            request=request,
        )
        # Generic error handler
        print(f"Unexpected error during upload: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred during upload.")


# ---------------- USER SETTINGS ----------------
@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.put("/users/me", response_model=schemas.User)
def update_user_me(user_update: schemas.UserUpdate, request: Request, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if user_update.full_name is not None: current_user.full_name = user_update.full_name
    if user_update.hospital_name is not None: current_user.hospital_name = user_update.hospital_name
    if user_update.slmc_registration_number is not None: current_user.slmc_registration_number = user_update.slmc_registration_number
    if user_update.specialty is not None: current_user.specialty = user_update.specialty
    if user_update.phone_number is not None: current_user.phone_number = user_update.phone_number
    db.commit()
    db.refresh(current_user)
    audit.record(
        db, audit.PROFILE_UPDATED,
        user_id=current_user.id,
        user_email=current_user.email,
        entity_type="user",
        entity_id=str(current_user.id),
        summary=f"Profile updated: {current_user.email}",
        details=user_update.model_dump(exclude_none=True),
        request=request,
    )
    return current_user

@app.put("/users/me/password")
def update_user_password(pass_update: schemas.UserPasswordUpdate, request: Request, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if not auth.verify_password(pass_update.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    current_user.hashed_password = auth.hash_password(pass_update.new_password)
    db.commit()
    audit.record(
        db, audit.PASSWORD_CHANGED,
        user_id=current_user.id,
        user_email=current_user.email,
        entity_type="user",
        entity_id=str(current_user.id),
        summary=f"Password changed: {current_user.email}",
        request=request,
    )
    return {"message": "Password updated successfully"}

# ---------------- ML MODEL MANAGEMENT ----------------
@app.get("/api/ml-models", response_model=list[schemas.MLModelResponse])
def get_ml_models(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_admin)):
    return crud.get_all_ml_models(db)

@app.post("/api/ml-models/upload", response_model=schemas.MLModelResponse)
async def upload_ml_model(
    name: str = Form(...),
    version: str = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db)
):
    import shutil
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext != '.zip':
        raise HTTPException(status_code=400, detail="Must upload a .zip containing the .h5 model files")
        
    base_dir = os.path.dirname(os.path.abspath(__file__))
    target_dir = os.path.join(base_dir, "ml_models", version)
    os.makedirs(target_dir, exist_ok=True)
    
    file_path = os.path.join(target_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    import zipfile
    try:
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            target_dir_abs = os.path.abspath(target_dir) + os.sep
            for member in zip_ref.namelist():
                member_path = os.path.abspath(os.path.join(target_dir, member))
                if not member_path.startswith(target_dir_abs):
                    raise Exception(f"Illegal path in zip: {member}")
            zip_ref.extractall(target_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid zip file: {str(e)}")

    ml_model_data = schemas.MLModelCreate(
        name=name,
        version=version,
        file_path=f"ml_models/{version}",
        is_active=False
    )
    return crud.create_ml_model(db, ml_model_data.model_dump())

@app.get("/api/ml-models/active", response_model=schemas.MLModelActiveResponse)
def get_active_model(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Get the currently active model (name and version only).
    Available to any authenticated clinician.
    """
    model = db.query(models.MLModel).filter(models.MLModel.is_active == True).first()
    if not model:
        raise HTTPException(status_code=404, detail="No active model found")
    return model

@app.put("/api/ml-models/{model_id}/activate", response_model=schemas.MLModelResponse)
def activate_ml_model(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    model = crud.get_ml_model_by_id(db, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="ML Model not found")
    return crud.set_active_model(db, model_id)

# TODO: Migrate seed_uploads.py dev utility once E2E verification passes
