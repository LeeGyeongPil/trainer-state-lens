"""Train tiny random-init models on CPU with Trainer / TRL SFT, DPO, GRPO and keep the real trainer_state.json.

No network: the tokenizer is a local WordLevel vocab, the model is a 2-layer GPT-2 built from a config.
Usage: uv run python train_tiny.py <sft|dpo|grpo|all>
"""
import json
import pathlib
import random
import sys
import time

import torch
from datasets import Dataset
from tokenizers import Tokenizer, models, pre_tokenizers
from transformers import GPT2Config, GPT2LMHeadModel, PreTrainedTokenizerFast

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "runs"
OUT.mkdir(exist_ok=True)
random.seed(0)
torch.manual_seed(0)

WORDS = "the a cat dog sat ran on under mat log fast slow red blue yes no good bad answer is one two three four five".split()
SPECIAL = ["<pad>", "<unk>", "<bos>", "<eos>"]


def make_tokenizer():
    vocab = {w: i for i, w in enumerate(SPECIAL + WORDS)}
    tok = Tokenizer(models.WordLevel(vocab=vocab, unk_token="<unk>"))
    tok.pre_tokenizer = pre_tokenizers.Whitespace()
    fast = PreTrainedTokenizerFast(
        tokenizer_object=tok, pad_token="<pad>", unk_token="<unk>", bos_token="<bos>", eos_token="<eos>"
    )
    fast.chat_template = None
    return fast


def make_model(tok):
    cfg = GPT2Config(
        vocab_size=len(tok), n_positions=64, n_embd=32, n_layer=2, n_head=2,
        bos_token_id=tok.bos_token_id, eos_token_id=tok.eos_token_id, pad_token_id=tok.pad_token_id,
    )
    # DPO/GRPO reload the reference model by name_or_path, so save a local copy first
    path = OUT / "tiny-gpt2"
    if not path.exists():
        torch.manual_seed(0)
        GPT2LMHeadModel(cfg).save_pretrained(str(path))
        tok.save_pretrained(str(path))
    return GPT2LMHeadModel.from_pretrained(str(path))


def sentence(n=6):
    return " ".join(random.choice(WORDS) for _ in range(n))


def summarise(path):
    d = json.loads(path.read_text())
    lh = d["log_history"]
    keys = sorted({k for e in lh for k in e})
    return {"file": str(path.relative_to(ROOT)), "global_step": d["global_step"], "entries": len(lh), "keys": keys,
            "top": sorted(k for k in d if k != "log_history")}


def run_sft():
    from trl import SFTConfig, SFTTrainer
    tok = make_tokenizer()
    # tiny train set + different eval set -> memorises train, eval loss turns up (overfit on purpose)
    train = Dataset.from_list([{"text": sentence()} for _ in range(16)])
    evals = Dataset.from_list([{"text": sentence()} for _ in range(16)])
    args = SFTConfig(
        output_dir=str(OUT / "sft"), max_steps=120, per_device_train_batch_size=8, learning_rate=3e-3,
        lr_scheduler_type="cosine", warmup_steps=10, logging_steps=5, eval_strategy="steps", eval_steps=10,
        save_steps=60, save_total_limit=3, report_to="none", use_cpu=True, max_length=32,
        load_best_model_at_end=True, metric_for_best_model="eval_loss", greater_is_better=False,
        dataset_text_field="text", seed=0,
    )
    tr = SFTTrainer(model=make_model(tok), args=args, train_dataset=train, eval_dataset=evals, processing_class=tok)
    tr.train()
    tr.state.save_to_json(str(OUT / "sft" / "trainer_state.json"))
    return OUT / "sft" / "trainer_state.json"


def run_dpo():
    from trl import DPOConfig, DPOTrainer
    tok = make_tokenizer()
    rows = [{"prompt": sentence(3), "chosen": "yes good " + sentence(2), "rejected": "no bad " + sentence(2)} for _ in range(32)]
    args = DPOConfig(
        output_dir=str(OUT / "dpo"), max_steps=40, per_device_train_batch_size=8, learning_rate=1e-3,
        logging_steps=2, eval_strategy="steps", eval_steps=10, save_steps=40, report_to="none", use_cpu=True,
        max_length=32, beta=0.1, seed=0,
    )
    tr = DPOTrainer(model=make_model(tok), args=args, train_dataset=Dataset.from_list(rows),
                    eval_dataset=Dataset.from_list(rows[:8]), processing_class=tok)
    tr.train()
    tr.state.save_to_json(str(OUT / "dpo" / "trainer_state.json"))
    return OUT / "dpo" / "trainer_state.json"


def run_grpo():
    from trl import GRPOConfig, GRPOTrainer
    tok = make_tokenizer()
    rows = [{"prompt": sentence(3)} for _ in range(32)]

    def reward_yes(completions, **kw):
        return [float(c.split().count("yes")) for c in completions]

    args = GRPOConfig(
        output_dir=str(OUT / "grpo"), max_steps=20, per_device_train_batch_size=8, num_generations=4,
        max_completion_length=8, learning_rate=1e-3, logging_steps=1, save_steps=20, report_to="none",
        use_cpu=True, beta=0.04, seed=0,
    )
    tr = GRPOTrainer(model=make_model(tok), reward_funcs=reward_yes, args=args,
                     train_dataset=Dataset.from_list(rows), processing_class=tok)
    tr.train()
    tr.state.save_to_json(str(OUT / "grpo" / "trainer_state.json"))
    return OUT / "grpo" / "trainer_state.json"


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    todo = ["sft", "dpo", "grpo"] if which == "all" else [which]
    for name in todo:
        t = time.time()
        try:
            p = {"sft": run_sft, "dpo": run_dpo, "grpo": run_grpo}[name]()
            res = {"run": name, "ok": True, "seconds": round(time.time() - t, 1), **summarise(p)}
        except Exception as e:  # noqa: BLE001
            res = {"run": name, "ok": False, "seconds": round(time.time() - t, 1), "error": repr(e)[:800]}
        print(json.dumps(res))
        with open(ROOT / "train_results.jsonl", "a") as f:
            f.write(json.dumps(res) + "\n")
