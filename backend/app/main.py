import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from .routes import patients, form, submissions, transcribe, ai_questions

app = FastAPI(
    title="LUVN SOTE 2.1 - Asiakkaan valmiit esitiedot asioinnissa API",
    description="Backend API for pre-visit information prefill, AI gap-filling dialogue, and clinical summary generation.",
    version="1.0.0"
)

# Custom security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Enable CORS for local development & Docker Compose network
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(form.router)
app.include_router(submissions.router)
app.include_router(transcribe.router)
app.include_router(ai_questions.router)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "luvn-sote-previsit-backend",
        "llm_engine": "online",
        "dataset": "Veil.AI synthetic profiles (LUVN)"
    }

@app.get("/")
async def root():
    return {
        "message": "LUVN SOTE 2.1 API - Asiakkaan valmiit esitiedot asioinnissa",
        "docs_url": "/docs",
        "health_url": "/health"
    }
