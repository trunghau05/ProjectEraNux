import warnings

import core.loader as loader
from services.audio import load_audio


def run_diarization(audio_path):
    if loader.pipeline is None:
        waveform, sr = load_audio(audio_path)
        duration = len(waveform) / sr if sr else 0.0
        return [{
            "start": 0.0,
            "end": float(duration),
            "speaker": "SPEAKER_00"
        }]

    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            message=r"std\(\): degrees of freedom is <= 0\..*",
            category=UserWarning,
            module=r"pyannote\.audio\.models\.blocks\.pooling",
        )
        diar = loader.pipeline(audio_path)

    segments = []
    for turn, _, speaker in diar.itertracks(yield_label=True):
        segments.append({
            "start": float(turn.start),
            "end": float(turn.end),
            "speaker": speaker
        })
    return sorted(segments, key=lambda item: item.get("start", 0.0))
