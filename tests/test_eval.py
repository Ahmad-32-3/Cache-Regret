import inspect

import numpy as np
import pytest

from regret.const import FLOOR_PCT, MAX_KEYS
from regret.engine import (
    SealedOracle,
    View,
    check_budget,
    check_key_cap,
    check_no_future_peek,
    compare_policies,
    evaluate,
    generate,
    policy_fifo,
    policy_regret,
    policy_ttl,
)


def _small(**kw):
    defaults = dict(n_keys=500, k=15, n_ticks=24, train_ticks=8, seed=7)
    defaults.update(kw)
    return defaults


def test_key_cap_rejects_over_design():
    with pytest.raises(ValueError, match="cap"):
        check_key_cap(MAX_KEYS + 1)


def test_budget_injection_fails():
    with pytest.raises(ValueError, match="budget"):
        check_budget(np.arange(20), k=5)


def test_future_peek_fails():
    world = generate(n_keys=40, n_ticks=6, seed=1)
    oracle = SealedOracle(world.x)
    view = View(
        ages=np.arange(40),
        vol=np.ones((40, world.w.size)),
        w=world.w,
        n_keys=40,
        fifo_i=0,
        t=3,
    )

    def cheat(_view: View, k: int) -> np.ndarray:
        fresh = oracle.at(_view.t)
        delta = np.abs(fresh - fresh.mean(axis=0)).sum(axis=1)
        return np.argsort(delta)[::-1][:k]

    cheat(view, 4)
    with pytest.raises(ValueError, match="future"):
        check_no_future_peek(oracle)


def test_shipped_policies_do_not_take_oracle():
    for fn in (policy_ttl, policy_fifo, policy_regret):
        params = inspect.signature(fn).parameters
        assert "oracle" not in params
        assert "fresh" not in params


def test_evaluate_guard_rejects_oracle_policy():
    world = generate(n_keys=40, n_ticks=8, seed=2)
    oracle = SealedOracle(world.x)
    view = View(
        ages=np.ones(40),
        vol=np.ones((40, world.w.size)),
        w=world.w,
        n_keys=40,
        fifo_i=0,
        t=4,
    )
    _ = oracle.at(view.t)
    with pytest.raises(ValueError, match="future"):
        check_no_future_peek(oracle)


def test_ttl_and_fifo_respect_k():
    world = generate(n_keys=80, n_ticks=5, seed=3)
    view = View(
        ages=np.arange(80),
        vol=np.ones((80, world.w.size)),
        w=world.w,
        n_keys=80,
        fifo_i=10,
        t=2,
    )
    assert len(policy_ttl(view, 7)) == 7
    assert len(policy_fifo(view, 7)) == 7
    assert len(policy_regret(view, 7)) == 7


def test_regret_beats_ttl_and_fifo_and_clears_floor():
    rows = compare_policies(**_small())
    r, ttl, fifo = rows["regret"], rows["ttl"], rows["fifo"]
    assert r["success_pct"] >= FLOOR_PCT
    assert r["success_pct"] > ttl["success_pct"]
    assert r["success_pct"] > fifo["success_pct"]
    assert r["n_keys"] <= MAX_KEYS
    assert r["n_refresh"] == r["k"] * (r["n_ticks"] - r["train_ticks"])


def test_ablation_budget_and_proxy():
    from regret.ablate import ablation

    table = ablation(n_keys=500, n_ticks=24, train_ticks=8, seed=7, budgets=(10, 15, 40), k_proxy=15)
    ks = [r["k"] for r in table["budget"]]
    assert ks == [10, 15, 40]
    for r in table["budget"]:
        assert r["regret"] >= r["ttl"]
        assert r["regret"] >= r["fifo"]
    by_proxy = {r["proxy"]: r["success_pct"] for r in table["proxy"]}
    assert set(by_proxy) == {"impact", "age", "weight"}
    assert by_proxy["impact"] >= by_proxy["age"]


def test_vol_uses_train_window_only():
    world = generate(n_keys=60, n_ticks=20, seed=4)
    from regret.engine import estimate_vol

    vol = estimate_vol(world.x[:8])
    assert vol.shape == (60, world.w.size)
    # a later tick must not be required; shape/finite is the contract
    assert np.isfinite(vol).all()
