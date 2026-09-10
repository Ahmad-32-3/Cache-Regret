"""Budgeted feature refresh. In-process store + tick loop.

ponytail: dict store stands in for Redis HASH + last_updated. Swap to redis-py
HSET when a broker is up. Same get/set/age API.
ponytail: a tick loop is the candidate stream. Upgrade: consume key ids from Kafka.
ponytail: numpy tensor is the eval oracle. Upgrade: Postgres table of fresh
features, read only at scoring, never at policy select.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from regret.const import (
    FLOOR_PCT,
    HELD_FRAC,
    K,
    MAX_KEYS,
    N_FEATURES,
    N_KEYS,
    N_TICKS,
    SEED,
    TRAIN_TICKS,
    VOLATILE_FRAC,
)


class SealedOracle:
    """Fresh values the policy must not read. Scoring may read them after refresh."""

    def __init__(self, fresh: np.ndarray):
        self._fresh = fresh
        self.accessed = False

    def at(self, t: int) -> np.ndarray:
        self.accessed = True
        return self._fresh[t]


def check_no_future_peek(oracle: SealedOracle) -> None:
    if oracle.accessed:
        raise ValueError("future peek: policy read freshness it had not refreshed")


def check_budget(chosen: np.ndarray | list, k: int) -> None:
    n = len(chosen)
    if n > k:
        raise ValueError(f"budget: {n} refreshes exceeds k={k}")


def check_key_cap(n_keys: int) -> None:
    if n_keys > MAX_KEYS:
        raise ValueError(f"cap: {n_keys} keys exceeds MAX_KEYS={MAX_KEYS}")


@dataclass
class World:
    x: np.ndarray  # (ticks, keys, feats)
    y: np.ndarray  # (ticks, keys) bool, from fresh features
    w: np.ndarray
    volatile: np.ndarray
    held: np.ndarray
    vol_amp: np.ndarray


@dataclass
class Store:
    values: np.ndarray  # (keys, feats)
    last_updated: np.ndarray  # (keys,) int
    fifo_i: int = 0

    def refresh(self, keys: np.ndarray, fresh_row: np.ndarray, t: int) -> None:
        if keys.size == 0:
            return
        self.values[keys] = fresh_row[keys]
        self.last_updated[keys] = t

    def ages(self, t: int) -> np.ndarray:
        return t - self.last_updated


@dataclass
class View:
    """What a policy is allowed to see. No fresh / future tensor."""

    ages: np.ndarray
    vol: np.ndarray  # (keys, feats) from train ticks only
    w: np.ndarray
    n_keys: int
    fifo_i: int
    t: int


def generate(
    n_keys: int = N_KEYS,
    n_ticks: int = N_TICKS,
    n_features: int = N_FEATURES,
    seed: int = SEED,
    volatile_frac: float = VOLATILE_FRAC,
    held_frac: float = HELD_FRAC,
) -> World:
    check_key_cap(n_keys)
    rng = np.random.default_rng(seed)
    w = np.array([3.2, 2.6, 0.12, 0.08, 0.06, 0.04], dtype=float)[:n_features]
    if w.size < n_features:
        w = np.concatenate([w, np.full(n_features - w.size, 0.03)])

    n_held = max(8, int(n_keys * held_frac))
    n_vol = max(4, int(n_keys * volatile_frac))
    n_vol = min(n_vol, n_held)
    held = np.arange(n_keys - n_held, n_keys)
    volatile = np.zeros(n_keys, dtype=bool)
    volatile[-n_vol:] = True

    base = rng.normal(0.0, 1.0, (n_keys, n_features))
    phase = rng.uniform(0.0, 2.0 * np.pi, n_keys)
    amp = np.full((n_keys, n_features), 0.08)
    amp[volatile, 0] = 2.4
    if n_features > 1:
        amp[volatile, 1] = 1.8

    ticks = np.arange(n_ticks, dtype=float)
    osc = np.sin(2.0 * np.pi * ticks[:, None] / 16.0 + phase[None, :])
    noise = rng.normal(0.0, 0.04, (n_ticks, n_keys, n_features))
    x = base[None, :, :] + amp[None, :, :] * osc[:, :, None] + noise
    y = (x @ w) > 0.0
    return World(x=x, y=y, w=w, volatile=volatile, held=held, vol_amp=amp)


def estimate_vol(x_train: np.ndarray) -> np.ndarray:
    """Per-key feature std on the train window. No test-tick values."""
    return x_train.std(axis=0) + 1e-6


def predict(x: np.ndarray, w: np.ndarray) -> np.ndarray:
    return (x @ w) > 0.0


def policy_ttl(view: View, k: int) -> np.ndarray:
    return np.argsort(view.ages, kind="mergesort")[::-1][:k]


def policy_fifo(view: View, k: int) -> np.ndarray:
    idx = (np.arange(k) + view.fifo_i) % view.n_keys
    return idx.astype(int)


def policy_regret(view: View, k: int, proxy: str = "impact") -> np.ndarray:
    impact = np.abs(view.w) * view.vol
    if proxy == "age":
        score = view.ages.astype(float)
    elif proxy == "weight":
        score = impact.sum(axis=1)
    else:
        score = view.ages.astype(float) * impact.sum(axis=1)
    return np.argsort(score, kind="mergesort")[::-1][:k]


POLICIES = {
    "regret": policy_regret,
    "ttl": policy_ttl,
    "fifo": policy_fifo,
}


def _select(name: str, view: View, k: int, proxy: str = "impact") -> np.ndarray:
    if name == "regret":
        return policy_regret(view, k, proxy=proxy)
    return POLICIES[name](view, k)


def evaluate(
    n_keys: int = N_KEYS,
    k: int = K,
    n_ticks: int = N_TICKS,
    train_ticks: int = TRAIN_TICKS,
    seed: int = SEED,
    policy: str = "regret",
    proxy: str = "impact",
    world: World | None = None,
) -> dict:
    check_key_cap(n_keys)
    world = world or generate(n_keys, n_ticks, seed=seed)
    n_keys = world.x.shape[1]
    oracle = SealedOracle(world.x)
    vol = estimate_vol(world.x[:train_ticks])
    store = Store(world.x[0].copy(), np.zeros(n_keys, dtype=int), fifo_i=0)

    correct = 0
    total = 0
    per_tick: list[float] = []
    n_refresh = 0

    for t in range(train_ticks, n_ticks):
        view = View(
            ages=store.ages(t),
            vol=vol,
            w=world.w,
            n_keys=n_keys,
            fifo_i=store.fifo_i,
            t=t,
        )
        chosen = _select(policy, view, k, proxy=proxy)
        check_budget(chosen, k)
        check_no_future_peek(oracle)
        store.refresh(chosen, world.x[t], t)
        store.fifo_i = (store.fifo_i + k) % n_keys
        n_refresh += int(chosen.size)

        yhat = predict(store.values[world.held], world.w)
        y = world.y[t, world.held]
        hit = int((yhat == y).sum())
        n = int(y.size)
        correct += hit
        total += n
        per_tick.append(100.0 * hit / n)

    success = 100.0 * correct / total if total else 0.0
    return {
        "policy": policy,
        "proxy": proxy,
        "success_pct": round(success, 4),
        "n_keys": n_keys,
        "k": k,
        "n_ticks": n_ticks,
        "train_ticks": train_ticks,
        "n_held": int(world.held.size),
        "n_queries": total,
        "n_refresh": n_refresh,
        "seed": seed,
        "per_tick": per_tick,
        "floor": FLOOR_PCT,
    }


def compare_policies(**kwargs) -> dict:
    rows = {}
    shared = kwargs.pop("world", None) or generate(
        kwargs.get("n_keys", N_KEYS),
        kwargs.get("n_ticks", N_TICKS),
        seed=kwargs.get("seed", SEED),
    )
    for name in ("regret", "ttl", "fifo"):
        rows[name] = evaluate(world=shared, policy=name, **kwargs)
    return rows


def print_report(rows: dict) -> None:
    for name in ("regret", "ttl", "fifo"):
        m = rows[name]
        print(f"{name:8} success_pct {m['success_pct']:.2f}")
    r = rows["regret"]
    print(f"keys={r['n_keys']} k={r['k']} seed={r['seed']} queries={r['n_queries']}")
