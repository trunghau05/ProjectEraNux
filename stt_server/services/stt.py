import torch
import torch.nn.functional as F
import core.loader as loader
from core.config import BEAM_WIDTH
from util.decoder_beam import ctc_beam_search_with_lm


def decode(feat):
    if loader.model is None or loader.vocab is None or loader.blank_id is None:
        raise RuntimeError("STT model is not ready yet.")

    device = next(loader.model.parameters()).device

    if feat.dim() == 2:
        feat = feat.unsqueeze(0)  # (1,T,80)

    feat = feat.to(device)
    feat_len = torch.tensor([feat.shape[1]], device=device)

    with torch.no_grad():
        logits, out_lens = loader.model(feat, feat_len)

    # (1,T,V) -> (T,V)
    logits = logits[0]

    # convert to log_probs
    log_probs = F.log_softmax(logits, dim=-1)

    text = ctc_beam_search_with_lm(
        log_probs=log_probs,
        vocab=loader.vocab,
        blank_id=loader.blank_id,
        lm_scorer=loader.lm_scorer,
        beam_width=BEAM_WIDTH,
    )

    return text
