# 🤖 AI PDF Chatbot (Enterprise RAG Platform)

A production-ready full-stack AI Document Chatbot built with **Next.js 16**, **FastAPI**, **Google Gemini 2.5 Flash**, and **MySQL**. Upload multiple PDF documents, ask complex questions, get grounded citations with page numbers, generate instant study guides, and export structured summaries.

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│        Next.js Frontend         │  (Vercel / Docker)
│  React 19, TailwindCSS, SSE    │
└────────────────┬────────────────┘
                 │ HTTP / Server-Sent Events (SSE)
                 ▼
┌─────────────────────────────────┐
│         FastAPI Backend         │  (Render / Railway / Cloud Run)
│  PyMuPDF, SlowAPI Rate Limiting │
└───────┬─────────────────┬───────┘
        │                 │
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│ Google Gemini│   │ MySQL 8.0 DB │ (AWS RDS / Aiven / PlanetScale)
│ Embed + Chat │   │ Chunks & Auth│
└──────────────┘   └──────────────┘
```

---

## ✨ Features

- **Document Processing**: Fast, page-aware PDF text extraction and semantic chunking with PyMuPDF.
- **RAG with Google Gemini**: Semantic embeddings and streaming answers via Server-Sent Events (SSE) with page citations.
- **Study Guide Generator**: On-demand generation of study guides, practice quizzes, and summaries.
- **Hybrid Multi-Factor Auth**: Google OAuth 2.0 & Email/SMS OTP verification with distributed database persistence.
- **Observability & Tracing**: LLM request tracing with latency, token usage, and error logging.
- **Rate Limiting & Security**: SlowAPI rate limiting, JWT token authentication, and parameterized CORS protection.

---

## 🚀 Quick Start (Docker)

The fastest way to run the complete stack (MySQL + Backend + Frontend):

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/AI-PDF-CHATBOT.git
   cd AI-PDF-CHATBOT
   ```

2. **Configure environment**:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```
   Add your `GEMINI_API_KEY` in `backend/.env`.

3. **Start the containers**:
   ```bash
   docker compose up --build
   ```
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8001](http://localhost:8001)
   - **Swagger Docs**: [http://localhost:8001/docs](http://localhost:8001/docs)

---

## 💻 Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL Server 8.0+

### 1. Database Setup
Create a MySQL database:
```sql
CREATE DATABASE chatbot;
```
Tables will automatically be created on backend startup via `backend/schema.sql`.

### 2. Backend Setup
```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials

uvicorn main:app --reload --port 8001
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local

npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 🌐 Production Deployment Guide

### Recommended Stack:
- **Frontend**: [Vercel](https://vercel.com)
- **Backend**: [Render](https://render.com) or [Railway](https://railway.app)
- **Database**: [Aiven](https://aiven.io), [PlanetScale](https://planetscale.com), or AWS RDS MySQL

### 1. Backend Deployment (Render / Railway)
1. Set the root or build context to `backend/`.
2. Set the build command:
   ```bash
   pip install -r requirements.txt
   ```
3. Set the start command:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
4. Set Environment Variables:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (or `DATABASE_URL`).
   - `JWT_SECRET`: A secure random 64-character secret.
   - `ALLOWED_ORIGINS`: Comma-separated list including your Vercel frontend domain (e.g., `https://your-app.vercel.app`).

### 2. Frontend Deployment (Vercel)
1. Import the repository in Vercel and set the Root Directory to `frontend`.
2. Set Environment Variables:
   - `NEXT_PUBLIC_BACKEND_URL`: URL of your deployed backend (e.g., `https://ai-pdf-backend.onrender.com`).
   - `JWT_SECRET`: Same secret as backend.
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
   - `SMTP_USER` & `SMTP_PASS`: For email OTP delivery.

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/health` | Server health check | No |
| `POST` | `/upload` | Upload PDF file for processing | Yes (Bearer) |
| `GET` | `/upload/status/{task_id}` | Poll background processing status | Yes (Bearer) |
| `POST` | `/chat` | SSE streaming RAG query | Yes (Bearer) |
| `POST` | `/generate` | Generate study guides/summaries | Yes (Bearer) |
| `GET` | `/documents` | List uploaded user documents | Yes (Bearer) |
| `GET` | `/documents/{id}/file` | Download original PDF file | No |
| `GET` | `/sessions` | Retrieve conversation history | Yes (Bearer) |
| `POST` | `/login` | User login / creation | No |
| `POST` | `/auth/otp/store` | Save OTP (internal) | No |
| `POST` | `/auth/otp/verify` | Verify OTP (internal) | No |

---

## 📄 License
MIT License

