# Re-creating the practice samples (optional)

The app and the tests use the committed files in `samples/`; nothing here runs in CI.

- `make_synthetic.py` writes the six `synthetic-*.json` files (standard library only, deterministic):

  ```bash
  python3 -I tools/make-samples/make_synthetic.py
  ```

- `train_tiny.py` trains tiny random-init GPT-2 models on CPU with Hugging Face Trainer / TRL (SFT, DPO, GRPO) and keeps the real `trainer_state.json`
  files (`tiny-*.json`). It needs torch, transformers, trl and datasets (a few GB of disk, about a minute on a laptop CPU, longer on a busy machine):

  ```bash
  cd tools/make-samples && uv run python train_tiny.py all
  ```

  Training results vary slightly between library versions, so re-created files can differ from the committed ones (the rules are tested against the committed files).

Requirements: [uv](https://docs.astral.sh/uv/) (`curl -LsSf https://astral.sh/uv/install.sh | sh`) and Python 3.12 or newer.
`train_tiny.py` writes its results under `runs/` at the repository root; copy the `trainer_state.json` files you want to keep into `samples/` yourself.
