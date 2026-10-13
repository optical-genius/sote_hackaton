import os
import logging
from typing import Optional
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

class SpeechService:
    def __init__(self):
        self.model_size = os.getenv("WHISPER_MODEL", "base")
        self.device = os.getenv("WHISPER_DEVICE", "cpu")
        self.compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
        self._model: Optional[WhisperModel] = None

    def _get_model(self) -> WhisperModel:
        if self._model is None:
            logger.info(
                f"Initializing faster-whisper model '{self.model_size}' "
                f"(device={self.device}, compute_type={self.compute_type})..."
            )
            self._model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type
            )
            logger.info("faster-whisper model loaded and ready.")
        return self._model

    def transcribe(self, audio_file_path: str, language: Optional[str] = "fi") -> str:
        """
        Transcribes the given audio file using faster-whisper.
        Language can be 'fi', 'sv', 'en', or None (auto-detect).
        """
        model = self._get_model()
        lang = language if language in ["fi", "sv", "en"] else None

        logger.info(f"Transcribing audio file '{audio_file_path}' with language='{lang}'...")
        segments, info = model.transcribe(
            audio_file_path,
            language=lang,
            beam_size=5,
            vad_filter=True
        )

        text_pieces = [segment.text.strip() for segment in segments]
        full_text = " ".join(text_pieces).strip()
        logger.info(
            f"Transcription complete (detected lang: {info.language}, prob: {info.language_probability:.2f}): "
            f"{full_text}"
        )
        return full_text

speech_service = SpeechService()
