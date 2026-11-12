"""Write the synthetic practice samples (stdlib only, deterministic).

Each file imitates a failure shape seen in public trainer_state.json files, without copying any
third-party file. Python's json module writes NaN / Infinity as bare tokens, exactly like the
Hugging Face Trainer does, which is what the app's tolerant parser has to cope with.

Usage: python3 -I tools/make-samples/make_synthetic.py  (run from the repo root)
"""
import json
import math
import pathlib
import random

OUT = pathlib.Path(__file__).resolve().parents[2] / "samples"
NAN = float("nan")
INF = float("inf")


def top(global_step, max_steps, epochs, logging_steps, eval_steps=500, save_steps=500, **extra):
    base = {
        "best_global_step": None,
        "best_metric": None,
        "best_model_checkpoint": None,
        "epoch": epochs * global_step / max_steps,
        "eval_steps": eval_steps,
        "global_step": global_step,
        "is_hyper_param_search": False,
        "logging_steps": logging_steps,
        "max_steps": max_steps,
        "num_train_epochs": epochs,
        "save_steps": save_steps,
        "total_flos": 0.0,
        "train_batch_size": 4,
    }
    base.update(extra)
    return base


def cosine(step, total, peak, warmup, floor=0.0):
    if step < warmup:
        return peak * step / warmup
    p = (step - warmup) / max(total - warmup, 1)
    return peak * (floor + (1 - floor) * 0.5 * (1 + math.cos(math.pi * p)))


def write(name, state):
    (OUT / f"{name}.json").write_text(json.dumps(state, separators=(",", ":"), allow_nan=True))
    print("wrote", name)


def nan_broken():
    rows = []
    for i in range(1, 22):
        step = i * 7
        rows.append({
            "epoch": round(step / 148, 4),
            "grad_norm": NAN,
            "learning_rate": cosine(step, 148, 5e-5, 21),
            "loss": 0.0,
            "step": step,
        })
    state = top(148, 148, 3, 7)
    state["log_history"] = rows
    write("synthetic-nan-broken", state)


def eval_nan():
    rnd = random.Random(2)
    rows = []
    evals = {10: 2.0, 20: NAN, 30: 1.5, 40: 1.6, 50: NAN, 60: 1.75, 70: 1.9}
    for step in range(1, 77):
        rows.append({
            "epoch": round(step / 92 * 2, 4),
            "grad_norm": round(1.2 + rnd.uniform(-0.1, 0.1), 4),
            "learning_rate": cosine(step, 92, 8e-6, 15),
            "loss": round(2.4 * math.exp(-step / 25) + 0.25 + rnd.uniform(-0.02, 0.02), 4),
            "step": step,
        })
        if step in evals:
            rows.append({
                "epoch": round(step / 92 * 2, 4),
                "eval_loss": evals[step],
                "eval_runtime": 1.5,
                "step": step,
            })
    state = top(76, 92, 2, 1, eval_steps=10, save_steps=500)
    state["log_history"] = rows
    write("synthetic-eval-nan", state)


def infinity_best():
    rnd = random.Random(3)
    rows = []
    for step in range(5, 105, 5):
        rows.append({
            "epoch": round(step / 100, 4),
            "grad_norm": round(0.9 + rnd.uniform(-0.05, 0.05), 4),
            "learning_rate": cosine(step, 100, 2e-5, 10),
            "loss": round(1.6 * math.exp(-step / 40) + 0.4 + rnd.uniform(-0.01, 0.01), 4),
            "step": step,
        })
        if step % 20 == 0:
            rows.append({"epoch": round(step / 100, 4), "eval_loss": round(1.5 * math.exp(-step / 40) + 0.45, 4),
                         "step": step})
    state = top(100, 100, 1, 5, eval_steps=20, save_steps=50, best_metric=INF)
    state["log_history"] = rows
    write("synthetic-infinity-best", state)


def flat_jitter():
    rnd = random.Random(1)
    rows = []
    for step in range(1, 201):
        rows.append({
            "epoch": round(step / 200, 4),
            "grad_norm": round(0.3 + rnd.uniform(-0.001, 0.001), 5),
            "learning_rate": 1e-5,
            "loss": round(0.05 + rnd.uniform(-1e-4, 1e-4), 6),
            "step": step,
        })
    state = top(200, 200, 1, 1)
    state["log_history"] = rows
    write("synthetic-flat-jitter", state)


def diverge():
    rnd = random.Random(4)
    rows = []
    for step in range(1, 301):
        if step <= 150:
            loss = 2.5 * math.exp(-step / 70) + 0.7
            gn = 1.0 + 0.2 * math.exp(-step / 40)
        else:
            k = (step - 150) / 150
            loss = 0.98 + 5.5 * k ** 2
            gn = 1.0 + 800 * k ** 3
        loss += rnd.uniform(-0.01, 0.01)
        row = {
            "epoch": round(step / 300, 4),
            "grad_norm": round(gn, 4),
            "learning_rate": 3e-4 * (1 if step > 20 else step / 20),
            "loss": round(loss, 4),
            "step": step,
        }
        if step > 290:  # the run blows up at the very end
            row["loss"] = NAN
            row["grad_norm"] = INF if step % 2 else NAN
        rows.append(row)
    state = top(300, 300, 1, 1)
    state["log_history"] = rows
    write("synthetic-diverge", state)


def grpo_stall():
    rnd = random.Random(5)
    rows = []
    for step in range(1, 61):
        rows.append({
            "completions/clipped_ratio": 0.1,
            "entropy": round(2.6 - 0.01 * step, 4),
            "epoch": round(step / 60, 4),
            "frac_reward_zero_std": round(0.8 + rnd.uniform(-0.05, 0.05), 3),
            "grad_norm": round(0.02 + rnd.uniform(-0.002, 0.002), 5),
            "kl": round(0.001 + 0.0033 * step, 5),
            "learning_rate": 1e-6,
            "loss": round(rnd.uniform(-0.002, 0.002), 5),
            "reward": round(0.12 + rnd.uniform(-0.003, 0.003), 4),
            "reward_std": round(0.01 + rnd.uniform(-0.002, 0.002), 4),
            "step": step,
        })
    state = top(60, 60, 1, 1)
    state["log_history"] = rows
    write("synthetic-grpo-stall", state)


if __name__ == "__main__":
    nan_broken()
    eval_nan()
    infinity_best()
    flat_jitter()
    diverge()
    grpo_stall()
