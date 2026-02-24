from sqlalchemy.orm import Session
import models

def save_model_metadata(db: Session, user_id: int, model_id: str, file_name: str, file_path: str, file_type: str):
    """
    Stores 3D model metadata in the PostgreSQL database.
    """
    new_model = models.Model(
        id=model_id,
        user_id=user_id,
        file_name=file_name,
        file_path=file_path,
        file_type=file_type,
        status="uploaded"
    )
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model
