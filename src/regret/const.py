# DESIGN left column. One ADR line if a cap moves.

SEED = 7
MAX_KEYS = 10_000
N_KEYS = 8_000
N_FEATURES = 6
N_TICKS = 48
TRAIN_TICKS = 12
K = 80
# Hot keys sit inside the held-out slice. The rest of the store is decoy
# keys a timer will refresh first. k=80 covers ~200 hot keys every few ticks.
VOLATILE_FRAC = 0.025
HELD_FRAC = 0.05
FLOOR_PCT = 85.0
