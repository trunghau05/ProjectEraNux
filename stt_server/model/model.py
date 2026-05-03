import torch
import torch.nn as nn
import torch.nn.utils.rnn as rnn_utils


class ConvSubsampling(nn.Module):
    """
    Subsampling x4
    (B,T,80) -> (B,T/4, C*F)
    """
    def __init__(self):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(1, 32, 3, stride=2, padding=1),
            nn.ReLU(),
            nn.Conv2d(32, 32, 3, stride=2, padding=1),
            nn.ReLU(),
        )

    def forward(self, x, lengths):
        x = x.unsqueeze(1)             # (B,1,T,80)
        x = self.conv(x)
        b, c, t, f = x.size()
        x = x.permute(0, 2, 1, 3).contiguous()
        x = x.view(b, t, c * f)
        lengths = lengths // 4
        return x, lengths


class STTModel(nn.Module):
    """
    CNN + BiLSTM + CTC
    """
    def __init__(self, vocab_size):
        super().__init__()

        self.subsample = ConvSubsampling()

        self.lstm = nn.LSTM(
            input_size=32 * 20,   # 80 / 4 = 20
            hidden_size=512,
            num_layers=3,
            batch_first=True,
            bidirectional=True
        )

        self.fc = nn.Linear(1024, vocab_size)

    def forward(self, feats, feat_lens):
        """
        feats: (B,T,80)
        """
        x, out_lens = self.subsample(feats, feat_lens)

        out_lens_cpu = out_lens.cpu()

        packed = rnn_utils.pack_padded_sequence(
            x,
            out_lens_cpu,
            batch_first=True,
            enforce_sorted=False
        )

        packed_out, _ = self.lstm(packed)

        out, out_lens = rnn_utils.pad_packed_sequence(
            packed_out,
            batch_first=True
        )

        logits = self.fc(out)
        return logits, out_lens.to(feat_lens.device)
