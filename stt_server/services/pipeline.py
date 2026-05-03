from core.config import MAX_DECODE_WINDOW_SEC
from services.audio import load_audio, denoise
from services.diarization import run_diarization
from services.features import extract_feature
from services.stt import decode


def _iter_windows(start_sec, end_sec, max_window_sec):
    cursor = max(0.0, float(start_sec))
    safe_end = max(cursor, float(end_sec))

    while cursor < safe_end:
        next_cursor = min(cursor + max_window_sec, safe_end)
        if next_cursor <= cursor:
            break
        yield cursor, next_cursor
        cursor = next_cursor


def run_pipeline(audio_path):
    waveform, sr = load_audio(audio_path)
    duration = len(waveform) / sr if sr else 0.0

    segments = run_diarization(audio_path)
    if not segments:
        segments = [{"start": 0.0, "end": duration, "speaker": "SPEAKER_00"}]

    results = []
    for seg in sorted(segments, key=lambda item: item.get("start", 0.0)):
        seg_start = max(0.0, float(seg.get("start", 0.0)))
        seg_end = min(duration, float(seg.get("end", duration)))
        speaker = seg.get("speaker", "SPEAKER_00")

        if seg_end <= seg_start:
            continue

        for chunk_start, chunk_end in _iter_windows(
            seg_start,
            seg_end,
            max_window_sec=max(MAX_DECODE_WINDOW_SEC, 1.0),
        ):
            start_idx = int(chunk_start * sr)
            end_idx = int(chunk_end * sr)
            chunk = waveform[start_idx:end_idx]

            if len(chunk) < 400:
                continue

            chunk = denoise(chunk, sr)
            feat = extract_feature(chunk)
            text = decode(feat)

            results.append(
                {
                    "speaker": speaker,
                    "start": chunk_start,
                    "end": chunk_end,
                    "text": text,
                }
            )

    return results
