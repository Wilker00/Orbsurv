"""FastAPI backend for Orbsurv prototypes."""
import os
import hashlib
import hmac
import secrets
from typing import Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from storage import JsonStore

# --- Configuration & Setup ---

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_ROOT = os.environ.get("ORBSURV_DATA_DIR", os.path.join(BASE_DIR, "data"))

app = FastAPI(title="Orbsurv API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("ORBSURV_ALLOWED_ORIGIN", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Stores ---

stores = {
    "interest": JsonStore(os.path.join(DATA_ROOT, "early_interest.json")),
    "pilot": JsonStore(os.path.join(DATA_ROOT, "pilot_signups.json")),
    "waitlist": JsonStore(os.path.join(DATA_ROOT, "waitlist.json")),
    "contact": JsonStore(os.path.join(DATA_ROOT, "contact_messages.json")),
    "users": JsonStore(os.path.join(DATA_ROOT, "users.json")),
}

# --- Pydantic Models for Request Validation ---

class EmailSubmission(BaseModel):
    email: EmailStr

class ContactSubmission(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    message: str = Field(..., min_length=10)

class UserRegistration(BaseModel):
    name: Optional[str] = None
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# --- Security (Copied from server.py) ---

PBKDF2_ITERATIONS = 120_000

def normalize_email(email: str) -> str:
    return email.strip().lower()

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"{salt.hex()}${derived.hex()}"

def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, hash_hex = stored.split("$", 1)
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    expected = bytes.fromhex(hash_hex)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return hmac.compare_digest(derived, expected)

# --- API Endpoints ---

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/waitlist", status_code=status.HTTP_201_CREATED)
async def add_to_waitlist(submission: EmailSubmission):
    stores["waitlist"].append({"email": submission.email})
    return {"status": "ok", "message": "Successfully added to waitlist."}

@app.post("/api/interest", status_code=status.HTTP_201_CREATED)
async def add_to_interest_list(submission: EmailSubmission):
    stores["interest"].append({"email": submission.email})
    return {"status": "ok", "message": "Successfully added to interest list."}

@app.post("/api/pilot", status_code=status.HTTP_201_CREATED)
async def add_to_pilot_list(submission: EmailSubmission):
    stores["pilot"].append({"email": submission.email})
    return {"status": "ok", "message": "Successfully added to pilot list."}

@app.post("/api/contact", status_code=status.HTTP_201_CREATED)
async def handle_contact_form(submission: ContactSubmission):
    stores["contact"].append(submission.model_dump())
    return {"status": "ok", "message": "Contact form submitted."}

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register_user(user: UserRegistration):
    email = normalize_email(user.email)
    if any(u.get("email") == email for u in stores["users"].all()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with that email already exists",
        )
    
    password_hash = hash_password(user.password)
    stores["users"].append({
        "email": email,
        "name": user.name,
        "password_hash": password_hash,
    })
    return {"status": "ok", "stored": {"email": email}}

@app.post("/api/auth/login")
async def login_user(user_login: UserLogin):
    email = normalize_email(user_login.email)
    user_record = next((u for u in stores["users"].all() if u.get("email") == email), None)

    if not user_record or not verify_password(user_login.password, user_record.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password",
        )
    
    profile = {"email": email}
    if user_record.get("name"):
        profile["name"] = user_record["name"]
        
    return {"status": "ok", "profile": profile}

# --- New GET Endpoints for Admin Dashboard ---

@app.get("/api/data/counts")
async def get_all_counts():
    """Returns the counts for all datasets."""
    return {key: len(store.all()) for key, store in stores.items()}