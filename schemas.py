from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class User(BaseModel):
    id: int
    email: EmailStr
    full_name: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ModelResponse(BaseModel):
    model_id: str
    file_name: str
    status: str

    class Config:
        from_attributes = True
