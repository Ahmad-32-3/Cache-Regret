# Cache Regret

Live models often read features from a fast cache (Redis). Those values age. You cannot refresh every key on every tick without blowing the budget.

A timer (TTL) or a simple queue (FIFO) refreshes keys that barely change the prediction, and skips keys that would have fixed a wrong score. Stale features are not equally expensive. Some hurt a lot. That gap is feature-store regret.

I keep online features in Redis with an age stamp. Each tick I may refresh only K keys. One policy picks keys by a cheap model-impact score. Other policies use TTL or FIFO. I score the same downstream predictor after each policy spends the same budget. The impact-aware policy should win if regret was real.

## Run

```bash
python -m pytest tests/ -q
python scripts/run.py
npm --prefix web install
npm --prefix web run dev
```

`scripts/run.py` prints regret-aware success next to TTL/FIFO. Pytest must fail if the policy peeks at future freshness or ignores the budget.

## Layout

- `src/` age stamps, refresh policies, eval
- `scripts/run.py`
- `tests/` future-peek and budget checks
- `web/` case-study page
