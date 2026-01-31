from pydantic import BaseModel, EmailStr, Field


class RegistrationIn(BaseModel):
    fio: str = Field(min_length=2, max_length=200)
    email: EmailStr
    team: str = Field(min_length=1, max_length=100)


class RegistrationOut(BaseModel):
    id: int
    fio: str
    email: EmailStr
    team: str
