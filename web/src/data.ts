import {
  ABLATION_BUDGET as RAW_BUDGET,
  ABLATION_PROXY as RAW_PROXY,
  FIFO_TICKS,
  ILLUSTRATIVE,
  METRICS as RAW,
  REGRET_TICKS,
  TTL_TICKS,
} from './metrics.gen'

export { FIFO_TICKS, ILLUSTRATIVE, REGRET_TICKS, TTL_TICKS }

function pct(x: number) {
  return Math.round(x * 10) / 10
}

export const METRICS = {
  regretPct: pct(RAW.regretPct),
  ttlPct: pct(RAW.ttlPct),
  fifoPct: pct(RAW.fifoPct),
  nKeys: RAW.nKeys,
  k: RAW.k,
  nTicks: RAW.nTicks,
  trainTicks: RAW.trainTicks,
  nHeld: RAW.nHeld,
  nQueries: RAW.nQueries,
  seed: RAW.seed,
}

export type BudgetRow = { k: number; regret: number; ttl: number; fifo: number }
export const ABLATION_BUDGET: BudgetRow[] = RAW_BUDGET.map((r) => ({
  k: r.k,
  regret: pct(r.regret),
  ttl: pct(r.ttl),
  fifo: pct(r.fifo),
}))

export type ProxyRow = { proxy: string; success_pct: number; k: number }
export const ABLATION_PROXY: ProxyRow[] = RAW_PROXY.map((r) => ({
  proxy: r.proxy,
  success_pct: pct(r.success_pct),
  k: r.k,
}))

export type Counter = { key: string; label: string; value: number; unit: string; note: string }
export const COUNTERS: Counter[] = [
  {
    key: 'regret',
    label: 'Impact-aware policy',
    value: METRICS.regretPct,
    unit: '%',
    note: 'right on held-out queries after the same budget',
  },
  {
    key: 'ttl',
    label: 'Timer (oldest first)',
    value: METRICS.ttlPct,
    unit: '%',
    note: 'same model, same K refreshes per tick',
  },
  {
    key: 'fifo',
    label: 'Queue (first in)',
    value: METRICS.fifoPct,
    unit: '%',
    note: 'cycles keys in arrival order',
  },
  {
    key: 'keys',
    label: 'Keys in the store',
    value: METRICS.nKeys,
    unit: '',
    note: `${METRICS.nQueries.toLocaleString()} held-out queries, seed ${METRICS.seed}`,
  },
]

export const COMPARISON = [
  { metric: 'Held-out success', regret: `${METRICS.regretPct}%`, ttl: `${METRICS.ttlPct}%`, fifo: `${METRICS.fifoPct}%`, best: 'regret' },
  { metric: 'Refreshes per tick', regret: String(METRICS.k), ttl: String(METRICS.k), fifo: String(METRICS.k), best: 'tie' },
  { metric: 'What it ranks by', regret: 'age × weight × jumpiness', ttl: 'age only', fifo: 'queue order', best: 'regret' },
] as const

export const DECISIONS = [
  {
    first: 'Refresh every cached key on a timer',
    built: 'Spend a fixed K slots on the keys that would move the score',
  },
  {
    first: 'Let the policy peek at tomorrow’s fresh values',
    built: 'Rank with age, model weights, and jumpiness from early ticks only',
  },
  {
    first: 'Score on the same keys the timer already refreshed',
    built: 'Score held-out queries after every policy spends the same budget',
  },
  {
    first: 'Stand up Redis, Kafka, and Postgres before the test exists',
    built: 'In-process store and tick loop, same get/set/age API',
  },
] as const

export type Tool = { name: string; tag: string; plain: string; tech: string }
export const STACK: Tool[] = [
  {
    name: 'numpy store',
    tag: 'cache',
    plain: 'Keeps each key’s current features and the tick they were last written.',
    tech: 'An in-process array stands in for a Redis hash plus a last_updated field. Same get, set, and age calls.',
  },
  {
    name: 'tick loop',
    tag: 'stream',
    plain: 'Each tick, up to K keys may be refreshed from the live source.',
    tech: 'A simple loop is the candidate stream. Kafka would feed the same key ids if a broker were up.',
  },
  {
    name: 'impact score',
    tag: 'policy',
    plain: 'Ranks keys by how much a stale value would move the model.',
    tech: 'age × |weight| × train-window std. The policy never reads a fresh value it has not refreshed.',
  },
  {
    name: 'timer and queue',
    tag: 'baseline',
    plain: 'Two ordinary refresh rules, given the same budget.',
    tech: 'TTL takes the oldest keys. FIFO walks the key list in order. Both ignore the model.',
  },
  {
    name: 'held-out score',
    tag: 'metric',
    plain: 'How often the cached prediction matches the fresh one, on later ticks.',
    tech: 'Jumpiness is estimated on ticks 1–12. Queries are ticks 13–48 on 400 held-out keys.',
  },
  {
    name: 'Vite, React, motion',
    tag: 'page',
    plain: 'Builds this page and draws the charts from the numbers above.',
    tech: 'React and Tailwind on Vite. Charts are SVG that read data.ts. No network calls.',
  },
]

export const NEXT = [
  'Swap the dict store for Redis when a broker is up. The get/set/age API stays.',
  'Feed candidate keys from Kafka instead of the tick loop.',
  'Keep the fresh-feature oracle in Postgres and read it only at scoring.',
]

export const SECTORS = [
  {
    name: 'Real-time pricing',
    job: 'Refresh the product keys whose stale price features would actually change the quote, not the ones that have simply been sitting longest.',
  },
  {
    name: 'Fraud features',
    job: 'Spend the feature-store budget on accounts where an old velocity flag would flip the score, not on quiet accounts that aged out on a timer.',
  },
  {
    name: 'Personalization stores',
    job: 'Update the user keys that would change the next ranking, instead of cycling every profile in arrival order.',
  },
]
