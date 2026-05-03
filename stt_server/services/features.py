import torch
import torchaudio
from core.config import *

mel = torchaudio.transforms.MelSpectrogram(
    sample_rate=SAMPLE_RATE,
    n_fft=N_FFT,
    hop_length=HOP_LENGTH,
    n_mels=N_MELS
)

def extract_feature(wav):
    feat = torch.log(mel(wav) + 1e-9).transpose(0, 1)
    return feat[:MAX_FRAMES]