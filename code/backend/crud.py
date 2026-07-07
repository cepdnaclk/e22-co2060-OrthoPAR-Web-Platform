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

def get_ml_model_by_id(db: Session, model_id: str) -> models.MLModel:
    return db.query(models.MLModel).filter(models.MLModel.id == model_id).first()

def get_active_model(db: Session) -> models.MLModel:
    return db.query(models.MLModel).filter(models.MLModel.is_active == True).first()

def get_all_ml_models(db: Session):
    return db.query(models.MLModel).order_by(models.MLModel.created_at.desc()).all()

def create_ml_model(db: Session, ml_model_data: dict) -> models.MLModel:
    db_model = models.MLModel(**ml_model_data)
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model

def set_active_model(db: Session, model_id: str) -> models.MLModel:
    try:
        db.query(models.MLModel).filter(models.MLModel.is_active == True).update({"is_active": False})
        
        target_model = db.query(models.MLModel).filter(models.MLModel.id == model_id).first()
        if target_model:
            target_model.is_active = True
            
        db.commit()
        if target_model:
            db.refresh(target_model)
        return target_model
    except Exception as e:
        db.rollback()
        raise e
