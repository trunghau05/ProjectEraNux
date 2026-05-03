import math
from collections import defaultdict

import kenlm

LOG_ZERO = -1e9


def log_sum_exp(a, b):
    if a < b:
        a, b = b, a
    if b == LOG_ZERO:
        return a
    return a + math.log1p(math.exp(b - a))


class LMScorer:
    def __init__(self, model_path, alpha=0.5, beta=1.0):
        self.model = kenlm.Model(model_path)
        self.alpha = alpha
        self.beta = beta

    def score(self, text):
        if len(text.strip()) == 0:
            return 0.0
        return self.model.score(text, bos=True, eos=True)


def ctc_beam_search_with_lm(
    log_probs,
    vocab,
    blank_id,
    lm_scorer=None,
    beam_width=10,
):
    """
    log_probs: (T, V)
    """
    beams = {(): (0.0, LOG_ZERO)}
    total_steps, vocab_size = log_probs.size()

    for step in range(total_steps):
        next_beams = defaultdict(lambda: (LOG_ZERO, LOG_ZERO))

        for prefix, (prob_blank, prob_non_blank) in beams.items():
            for token_id in range(vocab_size):
                token_prob = log_probs[step, token_id].item()

                if token_id == blank_id:
                    current = next_beams[prefix]
                    next_beams[prefix] = (
                        log_sum_exp(current[0], prob_blank + token_prob),
                        current[1],
                    )
                    continue

                last_token = prefix[-1] if prefix else None
                new_prefix = prefix + (token_id,)

                if token_id == last_token:
                    current_same = next_beams[prefix]
                    next_beams[prefix] = (
                        current_same[0],
                        log_sum_exp(current_same[1], prob_non_blank + token_prob),
                    )

                    current_new = next_beams[new_prefix]
                    next_beams[new_prefix] = (
                        current_new[0],
                        log_sum_exp(current_new[1], prob_blank + token_prob),
                    )
                else:
                    current_new = next_beams[new_prefix]
                    next_beams[new_prefix] = (
                        current_new[0],
                        log_sum_exp(
                            current_new[1],
                            log_sum_exp(
                                prob_blank + token_prob,
                                prob_non_blank + token_prob,
                            ),
                        ),
                    )

        scored_beams = []
        for prefix, (prob_blank, prob_non_blank) in next_beams.items():
            ctc_score = log_sum_exp(prob_blank, prob_non_blank)
            text = "".join(vocab[idx] for idx in prefix)

            if lm_scorer is not None and text:
                lm_score = lm_scorer.score(text)
                combined_score = (
                    ctc_score
                    + lm_scorer.alpha * lm_score
                    + lm_scorer.beta * len(text.split())
                )
            else:
                combined_score = ctc_score

            scored_beams.append((prefix, (prob_blank, prob_non_blank), combined_score))

        scored_beams.sort(key=lambda item: item[2], reverse=True)
        beams = {
            prefix: (prob_blank, prob_non_blank)
            for prefix, (prob_blank, prob_non_blank), _ in scored_beams[:beam_width]
        }

    best_prefix = max(
        beams.items(),
        key=lambda item: log_sum_exp(item[1][0], item[1][1]),
    )[0]
    return "".join(vocab[idx] for idx in best_prefix)
