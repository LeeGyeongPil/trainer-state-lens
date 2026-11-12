# Practice samples: sources and licenses

All files are `trainer_state.json` logs (whitespace removed, content unchanged). They are practice material for the diagnosis rules.
Hub files were downloaded on 2026-11-13; their licenses come from the model cards (`cardData.license` in the Hub API, checked the same day).

## Own runs (label `own`, MIT, same license as this repository)

Tiny 2-layer GPT-2 models trained on CPU with the Hugging Face Trainer and TRL (transformers 5.22.2, trl 1.17.1, torch 2.15.0).
Re-create them with `tools/make-samples/train_tiny.py` (see the README of this repository).

| File | What it shows |
|---|---|
| `tiny-sft.json` | SFT that memorises 16 sentences: eval loss minimum at step 30, then rising |
| `tiny-sft-checkpoint-60.json` | The `checkpoint-60/trainer_state.json` of the same run: merges into `tiny-sft` |
| `tiny-dpo.json` | Small DPO run, healthy reference |
| `tiny-grpo.json` | Small GRPO run, healthy reference |

## Hub files (label `hub`)

| File | Source | License |
|---|---|---|
| `zephyr-7b-beta.json` | https://huggingface.co/HuggingFaceH4/zephyr-7b-beta (trainer_state.json) | MIT |
| `mistral-7b-sft-beta.json` | https://huggingface.co/HuggingFaceH4/mistral-7b-sft-beta (trainer_state.json) | MIT |
| `smollm2-1.7b-instruct.json` | https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct (trainer_state.json) | Apache-2.0 |
| `openr1-distill-7b.json` | https://huggingface.co/open-r1/OpenR1-Distill-7B (trainer_state.json) | Apache-2.0 |

Not bundled: `HuggingFaceH4/zephyr-7b-gemma-v0.1` (license `other`). Open it from the Hub yourself if you want another DPO example.

## Synthetic files (label `synthetic`, MIT)

Written by `tools/make-samples/make_synthetic.py` (deterministic, no third-party data). They imitate failure shapes seen in public files.

| File | What it shows |
|---|---|
| `synthetic-nan-broken.json` | 21 entries with loss 0.0 and grad_norm NaN |
| `synthetic-eval-nan.json` | NaN mixed into eval_loss, run stopped at 76 of 92 steps |
| `synthetic-infinity-best.json` | `best_metric` is Infinity at the top level |
| `synthetic-flat-jitter.json` | converged loss with 1e-4 jitter: must not be reported as spikes |
| `synthetic-diverge.json` | loss climbs, grad_norm explodes, the run ends in NaN |
| `synthetic-grpo-stall.json` | flat reward, 80% zero-variance groups, rising KL |
