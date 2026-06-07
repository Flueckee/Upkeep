import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str
    avatar_url: str | None = None
    primary_color: str | None = None
    created_at: datetime


class UserUpdateRequest(BaseModel):
    """Accepted by PATCH /api/users/me — all fields optional."""
    name: str | None = None
    primary_color: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        if len(v) > 40:
            raise ValueError("Name must be at most 40 characters")
        return v

    @field_validator("primary_color")
    @classmethod
    def validate_hex_color(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if not re.fullmatch(r"#[0-9A-Fa-f]{6}", v):
            raise ValueError("primary_color must be a valid 6-digit hex colour (e.g. #5C6EFF)")
        return v.upper()


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters")
        return v
