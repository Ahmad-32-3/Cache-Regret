"""Ablation: budget size and regret-proxy type. Same world, same seed."""

from regret.const import K, N_KEYS, N_TICKS, SEED, TRAIN_TICKS
from regret.engine import evaluate, generate

BUDGETS = (20, 40, 80, 160)
PROXIES = ("impact", "age", "weight")


def ablation(
    n_keys: int = N_KEYS,
    n_ticks: int = N_TICKS,
    train_ticks: int = TRAIN_TICKS,
    seed: int = SEED,
    budgets: tuple[int, ...] = BUDGETS,
    k_proxy: int = K,
) -> dict:
    world = generate(n_keys, n_ticks, seed=seed)
    budget_rows = []
    for k in budgets:
        row = {"k": k}
        for name in ("regret", "ttl", "fifo"):
            m = evaluate(
                world=world, policy=name, k=k, n_ticks=n_ticks, train_ticks=train_ticks, seed=seed
            )
            row[name] = m["success_pct"]
        budget_rows.append(row)

    proxy_rows = []
    for proxy in PROXIES:
        m = evaluate(
            world=world,
            policy="regret",
            proxy=proxy,
            k=k_proxy,
            n_ticks=n_ticks,
            train_ticks=train_ticks,
            seed=seed,
        )
        proxy_rows.append({"proxy": proxy, "success_pct": m["success_pct"], "k": k_proxy})

    return {"budget": budget_rows, "proxy": proxy_rows}
