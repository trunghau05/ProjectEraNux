import torch
import torchaudio
import numpy as np
import noisereduce as nr
from core.config import *

def load_audio(path):
    waveform, sr = torchaudio.load(path)
    waveform = waveform.mean(0)

    if sr != SAMPLE_RATE:
        waveform = torchaudio.functional.resample(waveform, sr, SAMPLE_RATE)
        sr = SAMPLE_RATE

    return waveform, sr


def denoise(wav, sr):
    wav_np = wav.cpu().numpy()
    reduced = nr.reduce_noise(
        y=wav_np,
        sr=sr,
        prop_decrease=0.2,
        stationary=False
    )
    reduced = np.clip(reduced, -1.0, 1.0)
    return torch.tensor(reduced, dtype=wav.dtype)