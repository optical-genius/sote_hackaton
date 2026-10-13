import os
import tempfile
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from ..services.speech_service import speech_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transcribe", tags=["Transcription"])

@router.post("")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("fi")
):
    """
    Accepts an uploaded audio file (e.g. webm, wav, mp3, mp4, ogg) and
    transcribes it into text using the local Whisper engine.
    """
    if not file:
        raise HTTPException(status_code=400, detail="Ei äänitiedostoa (No audio file provided)")

    suffix = os.path.splitext(file.filename or "")[1] or ".webm"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            temp_path = tmp.name
            content = await file.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="Äänitiedosto on tyhjä (Audio file is empty)")
            tmp.write(content)

        text = speech_service.transcribe(temp_path, language=language)
        return {
            "text": text,
            "language": language,
            "filename": file.filename
        }
    except Exception as e:
        logger.error(f"Error during audio transcription: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
