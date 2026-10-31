import os

# Fix invalid Windows CURL_CA_BUNDLE if the path does not exist
if os.getenv("CURL_CA_BUNDLE") and not os.path.exists(os.getenv("CURL_CA_BUNDLE")):
    del os.environ["CURL_CA_BUNDLE"]
if os.getenv("SSL_CERT_FILE") and not os.path.exists(os.getenv("SSL_CERT_FILE")):
    del os.environ["SSL_CERT_FILE"]

import uuid
import jwt
from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import asyncio
from datetime import datetime, timedelta, timezone

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from rag import process_and_store_pdf, generate_rag_response_stream, generate_study_material, get_query_embedding
import database

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="AI PDF Chatbot Backend", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure allowed origins dynamically for production
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]
if allowed_origins_env:
    for origin in allowed_origins_env.split(","):
        stripped = origin.strip()
        if stripped and stripped not in allowed_origins:
            allowed_origins.append(stripped)

# Regex to match localhost, local network IPs, Vercel deployments, and production domains
allow_origin_regex = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:[0-9]+)?$|^https://.*\.vercel\.app$"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    if os.getenv("ENVIRONMENT") == "production":
        raise ValueError("CRITICAL: JWT_SECRET environment variable must be set in production!")
    JWT_SECRET = "saksham_jwt_secret_key_2006"

UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
@app.get("/health")
async def health_check():
    """Production health check endpoint."""
    return {
        "status": "healthy",
        "service": "AI PDF Chatbot Backend",
        "database": "connected" if database._db_pool else "pool_uninitialized",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

class ChatRequest(BaseModel):
    message: str
    session_id: str
    history: Optional[List[Dict[str, Any]]] = None
    active_doc_ids: Optional[List[str]] = None

class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = None
    name: Optional[str] = None

class OTPStoreRequest(BaseModel):
    identifier: str
    otp: str
    expiresAt: int

class OTPVerifyRequest(BaseModel):
    identifier: str
    otp: str

class StudyMaterialRequest(BaseModel):
    document_id: str
    material_type: str

class FolderSaveRequest(BaseModel):
    name: str
    content: str

global_folders = {}
# In-memory registry — tracks all PDFs uploaded this server session.
# This is the fallback when Supabase tables don't exist yet.
_doc_registry: dict[str, str] = {}  # {document_id: filename}

# Background processing status registry
upload_status_registry: dict[str, dict] = {} # {task_id: {"status": "processing"|"completed"|"failed", "documents": [...], "error": "..."}}

def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """FastAPI Dependency to verify JWT in Authorization header and return the user's email."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token missing or invalid")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if "email" not in payload:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return payload["email"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Authentication token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

@app.post("/clear")
async def clear_pdf(email: str = Depends(get_current_user)):
    """Reset active chat session context without wiping stored documents from database."""
    return {"success": True, "message": "Cleared session context."}

MAX_FILE_SIZE = 10 * 1024 * 1024 # 10 MB

@app.post("/upload")
@limiter.limit("10/minute")
async def upload_pdf(request: Request, background_tasks: BackgroundTasks, files: List[UploadFile] = File(...), email: str = Depends(get_current_user)):
    """Uploads PDFs and queues them for background processing."""
    task_id = str(uuid.uuid4())
    upload_status_registry[task_id] = {"status": "processing", "documents": []}
    
    # Read files into memory before returning response
    # (UploadFile objects are closed after the request finishes)
    file_data_list = []
    for file in files:
        if not file.filename.lower().endswith(".pdf") or file.content_type not in ["application/pdf", ""]:
            upload_status_registry[task_id] = {"status": "failed", "error": f"Invalid file type for {file.filename}. Only PDFs are allowed."}
            return {"success": True, "task_id": task_id, "status": "failed"}
            
        pdf_bytes = await file.read()
        if len(pdf_bytes) > MAX_FILE_SIZE:
            upload_status_registry[task_id] = {"status": "failed", "error": f"File {file.filename} is too large. Max size is 10MB."}
            return {"success": True, "task_id": task_id, "status": "failed"}
            
        file_data_list.append((pdf_bytes, file.filename))
        
    def process_files_background(task_id: str, files_data: list, user_email: str):
        try:
            uploaded_docs = []
            upload_dir = UPLOAD_DIR
            for pdf_bytes, filename in files_data:
                document_id = str(uuid.uuid4())
                # Persist raw PDF file to disk for viewing & downloading
                file_path = os.path.join(upload_dir, f"{document_id}.pdf")
                try:
                    with open(file_path, "wb") as f:
                        f.write(pdf_bytes)
                except Exception as save_err:
                    print(f"Warning: could not write upload file {file_path}: {save_err}")

                doc_id = process_and_store_pdf(pdf_bytes, filename, document_id, user_email=user_email)
                _doc_registry[doc_id] = filename
                uploaded_docs.append({"id": doc_id, "name": filename})
            upload_status_registry[task_id] = {"status": "completed", "documents": uploaded_docs}
        except Exception as e:
            print(f"Background upload task {task_id} failed: {e}")
            upload_status_registry[task_id] = {"status": "failed", "error": str(e)}

    background_tasks.add_task(process_files_background, task_id, file_data_list, email)
    
    return {"success": True, "task_id": task_id, "status": "processing"}

@app.get("/upload/status/{task_id}")
async def get_upload_status(task_id: str, email: str = Depends(get_current_user)):
    if task_id not in upload_status_registry:
        raise HTTPException(status_code=404, detail="Task ID not found")
    return upload_status_registry[task_id]

@app.post("/login")
async def login_user(request: LoginRequest):
    """Simulated login route that works with frontend authentication."""
    print(f"User login attempt: {request.email}")
    if not request.email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Create user id for new sign in, no action if user exists
    user_id = await asyncio.to_thread(database.get_or_create_user, request.email, request.name)
    
    # Generate token for python backend local testing
    expiration = datetime.now(timezone.utc) + timedelta(hours=1) # Token expires in 1 hour
    token = jwt.encode({"email": request.email, "exp": expiration}, JWT_SECRET, algorithm="HS256")
    return {"success": True, "message": "Login successful", "email": request.email, "user_id": user_id, "token": token}

@app.post("/logout")
async def logout_user():
    return {"success": True, "message": "Logout successful"}

@app.post("/refresh")
async def refresh_token(email: str = Depends(get_current_user)):
    """Refresh the JWT token to extend its expiration."""
    expiration = datetime.now(timezone.utc) + timedelta(hours=1)
    new_token = jwt.encode({"email": email, "exp": expiration}, JWT_SECRET, algorithm="HS256")
    return {"success": True, "message": "Token refreshed", "token": new_token}

@app.get("/documents")
async def get_documents(email: str = Depends(get_current_user)):
    """Fetch all unique documents — merges Supabase results with in-memory registry."""
    db_docs = await asyncio.to_thread(database.get_unique_documents)   # may be [] if tables don't exist
    db_ids = {d["id"] for d in db_docs}
    # Merge in-memory registry (covers case where tables are missing or doc wasn't saved to DB)
    merged = list(db_docs)
    for doc_id, filename in _doc_registry.items():
        if doc_id not in db_ids:
            merged.append({"id": doc_id, "name": filename})
    return {"success": True, "documents": merged}

@app.get("/documents/{document_id}/file")
async def get_document_file(document_id: str):
    """Serve the raw PDF file for viewing or downloading."""
    upload_dir = UPLOAD_DIR
    # Try exact match or with .pdf
    candidates = [
        os.path.join(upload_dir, f"{document_id}.pdf"),
        os.path.join(upload_dir, document_id),
    ]
    for path in candidates:
        if os.path.exists(path):
            return FileResponse(path, media_type="application/pdf", filename=os.path.basename(path))
    raise HTTPException(status_code=404, detail="Document file not found on server")

@app.get("/documents/{document_id}/chunks")
async def get_document_chunks_endpoint(document_id: str):
    """Retrieve indexed text chunks for document preview."""
    chunks = await asyncio.to_thread(database.get_document_chunks, document_id)
    return {"success": True, "chunks": chunks}

@app.get("/folders")
async def get_folders(email: str = Depends(get_current_user)):
    return {"success": True, "folders": global_folders}

@app.post("/folders")
async def save_folder(request: FolderSaveRequest, email: str = Depends(get_current_user)):
    if request.name not in global_folders:
        global_folders[request.name] = []
    global_folders[request.name].append(request.content)
    return {"success": True, "folders": global_folders}

@app.get("/sessions")
async def get_sessions(email: str = Depends(get_current_user)):
    """Retrieve all unique chat sessions for the authenticated user."""
    sessions = await asyncio.to_thread(database.get_user_sessions, email)
    return {"success": True, "sessions": sessions}

@app.get("/history/{session_id}")
async def get_history(session_id: str, email: str = Depends(get_current_user)):
    """Retrieve chat history for a specific session."""
    messages = await asyncio.to_thread(database.get_chat_history, email, session_id)
    if not messages:
        # For simplicity, if we get [] we still return success instead of 404 to handle empty UI gracefully
        return {"success": True, "messages": []}
    return {"success": True, "messages": messages}

@app.delete("/history/{session_id}")
async def delete_history(session_id: str, email: str = Depends(get_current_user)):
    success = await asyncio.to_thread(database.delete_chat_history, email, session_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete chat history")
    return {"success": True}

@app.post("/chat")
@limiter.limit("20/minute")
async def chat_with_pdf(request: Request, chat_request: ChatRequest, email: str = Depends(get_current_user)):
    """Generate RAG answer and stream it to the frontend via SSE."""
    if not chat_request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    try:
        # Generate question embedding using the helper
        try:
            q_emb = await asyncio.to_thread(get_query_embedding, chat_request.message)
        except Exception:
            q_emb = None
            
        generator = generate_rag_response_stream(
            user_query=chat_request.message,
            history=chat_request.history,
            active_doc_ids=chat_request.active_doc_ids,
            session_id=chat_request.session_id,
            email=email,
            q_emb=q_emb
        )
        
        return StreamingResponse(generator, media_type="text/event-stream")
        
    except Exception as e:
        import traceback
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(f"Error generating chat response:\n{error_msg}")
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")

@app.post("/generate")
async def generate_study_material_endpoint(request: StudyMaterialRequest, email: str = Depends(get_current_user)):
    if not request.document_id or not request.material_type:
        raise HTTPException(status_code=400, detail="Missing document_id or material_type")
        
    try:
        data = generate_study_material(request.document_id, request.material_type)
        return {"success": True, "data": data["text"]}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(f"Error generating study material:\n{error_msg}")
        raise HTTPException(status_code=500, detail=f"Failed to generate study material: {str(e)}")

class DBInsertRequest(BaseModel):
    data: Dict[str, Any]

@app.get("/api/db/{table_name}")
async def get_db_table(table_name: str, email: str = Depends(get_current_user)):
    valid_tables = ["users", "folders", "documents", "document_chunks", "conversations", "messages", "feedback"]
    if table_name not in valid_tables:
        raise HTTPException(status_code=403, detail="Access denied to this table")
    rows = await asyncio.to_thread(database.get_all_rows, table_name)
    return {"success": True, "data": rows}

@app.post("/api/db/{table_name}")
async def post_db_table(table_name: str, request: DBInsertRequest, email: str = Depends(get_current_user)):
    valid_tables = ["users", "folders", "documents", "document_chunks", "conversations", "messages", "feedback"]
    if table_name not in valid_tables:
        raise HTTPException(status_code=403, detail="Access denied to this table")
    success = await asyncio.to_thread(database.insert_row, table_name, request.data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to insert data")
    return {"success": True}

@app.post("/auth/otp/store")
async def store_otp_endpoint(req: OTPStoreRequest):
    """Store OTP in database for distributed serverless access."""
    success = await asyncio.to_thread(database.store_otp, req.identifier, req.otp, req.expiresAt)
    return {"success": success}

@app.post("/auth/otp/verify")
async def verify_otp_endpoint(req: OTPVerifyRequest):
    """Verify OTP against database for distributed serverless access."""
    valid = await asyncio.to_thread(database.verify_otp, req.identifier, req.otp)
    return {"success": True, "valid": valid}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    host = os.getenv("HOST", "0.0.0.0")
    is_dev = os.getenv("ENVIRONMENT", "development").lower() != "production"
    print(f"Starting FastAPI server on http://{host}:{port} (reload={is_dev})")
    uvicorn.run("main:app", host=host, port=port, reload=is_dev)
