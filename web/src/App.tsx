import { AblationBars } from './components/story/AblationBars'
import { BudgetViz } from './components/story/BudgetViz'
import { LineChart } from './components/story/LineChart'
import { ResultBento } from './components/story/ResultBento'
import { SplitViz } from './components/story/SplitViz'
import { StackGrid } from './components/story/StackGrid'
import { StoryBeat } from './components/story/StoryBeat'
import {
  ABLATION_PROXY,
  COMPARISON,
  DECISIONS,
  FIFO_TICKS,
  ILLUSTRATIVE,
  METRICS,
  NEXT,
  REGRET_TICKS,
  SECTORS,
  TTL_TICKS,
} from './data'

const TOC = [
  { href: '#problem', label: 'The problem' },
  { href: '#answer', label: 'The approach' },
  { href: '#result', label: 'The result' },
  { href: '#stack', label: 'How it works' },
  { href: '#decisions', label: 'Design choices' },
  { href: '#use', label: 'Running it' },
  { href: '#next', label: 'What is next' },
]

const NOTE = ILLUSTRATIVE ? ' These are placeholder numbers until the pipeline runs.' : ''

export function App() {
  return (
    <>
      <a className="skip-link" href="#problem">
        Skip to the walkthrough
      </a>

      <div className="masthead">
        <div className="masthead__inner">
          <div className="masthead__mark">
            <b>Cache Regret</b> · spend the refresh budget on keys that move the score
          </div>
          <ul className="masthead__nav">
            <li><a href="#problem">problem</a></li>
            <li><a href="#answer">approach</a></li>
            <li><a href="#result">result</a></li>
            <li><a href="#stack">how</a></li>
          </ul>
        </div>
      </div>

      <main className="page">
        <header className="page-hero">
          <p className="meta">A walkthrough · budgeted refresh of a stale feature cache</p>
          <h1>Cache Regret</h1>
          <p className="lead">
            Live models often read their inputs from a fast cache. Those numbers get old. You cannot
            refresh every cached key on every tick, the budget is too small. I spend that budget on
            the keys that would most change the prediction, and I compare that to a timer and a
            queue. The number I trust is how often the model is still right after the same refresh
            budget is spent.
          </p>
          <p className="intro-detail">
            The store has {METRICS.nKeys.toLocaleString()} keys. Each tick I may refresh {METRICS.k} of
            them. I score {METRICS.nQueries.toLocaleString()} held-out queries on later ticks, after
            jumpiness was estimated on the early ones. Seed {METRICS.seed}.
            {NOTE}
          </p>
          <nav aria-label="On this page">
            <ul className="toc">
              {TOC.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <StoryBeat
          id="problem"
          kicker="The problem"
          title="A timer refreshes the wrong keys"
          caption={`Success on held-out queries, tick by tick, when the budget always goes to the oldest keys. The line dips when high-impact features go stale.${NOTE}`}
          visual={
            <LineChart
              ticks={TTL_TICKS.length}
              yMin={50}
              yMax={100}
              series={[
                { label: 'timer', color: 'var(--chart-raw)', values: TTL_TICKS, dash: '7 4' },
                { label: 'queue', color: 'var(--steel)', values: FIFO_TICKS, dash: '2 4', width: 2 },
              ]}
            />
          }
        >
          <p>
            A fraud model, a price model, or a ranking model does not recompute every feature from
            scratch on every request. It reads a cached value. That cache is fast. It is also late.
          </p>
          <p>
            You cannot refresh every key on every tick. There are thousands of keys and only a handful
            of refresh slots. A common fix is a timer: refresh whatever has been sitting longest. A
            queue does the same thing in arrival order. Both treat every stale key as equally
            expensive.
          </p>
          <p>
            They are not. Some stale features barely move the prediction. Some would have flipped it.
            Spending the budget on the first kind, and skipping the second, is the gap this page
            measures.
          </p>
        </StoryBeat>

        <StoryBeat
          id="answer"
          kicker="The approach"
          title="Rank keys by how much they would move the score"
          caption="Both policies get the same 80 slots. The timer fills them with old low-impact keys. The impact score fills them with keys that would change the prediction."
          visual={
            <>
              <BudgetViz />
              <SplitViz />
            </>
          }
        >
          <p>
            I keep each key’s features and the tick they were last written. Each tick I may refresh
            only {METRICS.k} keys from the live source. One policy ranks keys by a cheap impact
            score: how old the value is, how large its model weight is, and how jumpy that key was in
            an early window. The other two policies are a timer and a queue.
          </p>
          <p>
            Jumpiness is estimated on ticks 1–{METRICS.trainTicks} only. The policy then spends its
            budget on ticks {METRICS.trainTicks + 1}–{METRICS.nTicks}. It never reads a fresh value
            for a key it has not chosen to refresh. That would be peeking at the future.
          </p>
          <p>
            After each policy spends the same budget, I ask the same downstream model to classify the
            held-out queries from the cache. The number is how often that answer still matches what
            the model would have said with up-to-date features.
          </p>
        </StoryBeat>

        <StoryBeat
          id="result"
          kicker="The result"
          title="The impact-aware policy keeps the score up"
          caption={`Held-out success after the same ${METRICS.k} refreshes per tick. Impact-aware stays near the top; the timer and the queue fall when the hot keys go stale.${NOTE}`}
          visual={
            <LineChart
              ticks={REGRET_TICKS.length}
              yMin={50}
              yMax={100}
              series={[
                { label: 'impact-aware', color: 'var(--chart-corrected)', values: REGRET_TICKS, width: 2.6 },
                { label: 'timer', color: 'var(--chart-raw)', values: TTL_TICKS, dash: '7 4' },
                { label: 'queue', color: 'var(--steel)', values: FIFO_TICKS, dash: '2 4', width: 2 },
              ]}
            />
          }
        >
          <p>
            Here is the headline. All three policies refresh {METRICS.k} keys per tick on a store of{' '}
            {METRICS.nKeys.toLocaleString()} keys. The only change is which keys they pick.
          </p>
          <ResultBento />
          <p style={{ marginTop: 'var(--space-5)' }}>
            Wider budgets help the impact-aware policy more than they help the timer. Ranking by age
            alone matches the timer. Ranking by weight without age is in between.
          </p>
          <div className="result-charts">
            <AblationBars />
            <table className="choice-table">
              <caption className="sr-only">Impact-aware, timer, and queue on the same held-out queries</caption>
              <thead>
                <tr>
                  <th scope="col">Same budget, same model</th>
                  <th scope="col">Impact-aware</th>
                  <th scope="col">Timer</th>
                  <th scope="col">Queue</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((r) => (
                  <tr key={r.metric}>
                    <td>{r.metric}</td>
                    <td style={{ color: r.best === 'regret' ? 'var(--good)' : 'var(--fg)' }}>{r.regret}</td>
                    <td>{r.ttl}</td>
                    <td>{r.fifo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="meta" style={{ textTransform: 'none', letterSpacing: 0, marginTop: 'var(--space-4)' }}>
            Proxy ablation at k={METRICS.k}: impact {ABLATION_PROXY[0].success_pct}%, weight-only{' '}
            {ABLATION_PROXY[2].success_pct}%, age-only {ABLATION_PROXY[1].success_pct}%. Age-only is
            the timer. {METRICS.nQueries.toLocaleString()} queries, seed {METRICS.seed}.{NOTE}
          </p>
        </StoryBeat>

        <section className="story-beat" id="stack">
          <p className="story-kicker">How it works</p>
          <h2>The tools, in plain terms</h2>
          <p className="stack-intro">
            Standard pieces for this kind of store, so anyone can clone the repo and rerun the
            numbers. Each card is one piece: what it does, then how it does it.
          </p>
          <StackGrid />
        </section>

        <StoryBeat
          id="decisions"
          kicker="Design choices"
          title="The calls I made"
          caption="What I first reached for, and what I built instead."
          visual={
            <div className="teach-card">
              <h3 className="teach-card__title">First idea, and what I built</h3>
              <table className="choice-table">
                <caption className="sr-only">Design choices</caption>
                <thead>
                  <tr>
                    <th scope="col">First idea</th>
                    <th scope="col">What I built</th>
                  </tr>
                </thead>
                <tbody>
                  {DECISIONS.map((d) => (
                    <tr key={d.first}>
                      <td>{d.first}</td>
                      <td>{d.built}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        >
          <p>
            The headline is the budget. I did not rebuild a multi-cloud research stack. A dict with
            an age stamp is enough to ask whether ranking by impact beats a timer.
          </p>
          <p>
            I scored later ticks, after jumpiness was estimated, so the policy cannot cheat by
            reading a future fresh value. Tests fail if a policy peeks, or if it spends more than K
            refreshes.
          </p>
          <p>
            Redis, Kafka, and Postgres are the production shape. They are not required to measure
            the gap. The in-process store keeps the same get, set, and age calls.
          </p>
        </StoryBeat>

        <section className="story-beat" id="use">
          <p className="story-kicker">Running it</p>
          <h2>Clone it and rerun the numbers</h2>
          <p style={{ maxWidth: 'var(--measure)' }}>
            The features are generated in-process from a planted store: a few high-impact keys drift,
            the rest are decoys a timer will prefer. No login or API key.
          </p>
          <ol className="stack-list" style={{ maxWidth: 'var(--measure)' }}>
            <li>From the repo root, run <code>python -m pytest tests/test_eval.py -q</code>. Leak and budget checks must fail inside that file.</li>
            <li>Run <code>python scripts/run.py</code>. It prints impact-aware success next to timer and queue, then writes <code>metrics.json</code>.</li>
            <li>Run <code>npm --prefix web install</code> then <code>npm --prefix web run dev</code> to read this page. The charts load from <code>data.ts</code>.</li>
          </ol>
        </section>

        <section className="story-beat" id="next">
          <p className="story-kicker">What is next</p>
          <h2>Where I would take it, and who can use it</h2>
          <ul className="stack-list" style={{ maxWidth: 'var(--measure)' }}>
            {NEXT.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <ul className="stack-list" style={{ maxWidth: 'var(--measure)', marginTop: 'var(--space-4)' }}>
            {SECTORS.map((s) => (
              <li key={s.name}>
                <strong>{s.name}.</strong> {s.job}
              </li>
            ))}
          </ul>
        </section>

        <footer
          id="close"
          style={{
            borderTop: '1px solid var(--line-rule)',
            paddingTop: 'var(--space-6)',
            marginTop: 'var(--space-6)',
            color: 'var(--fg-low)',
            fontSize: 'var(--fs-sm)',
          }}
        >
          <p style={{ maxWidth: 'var(--measure)' }}>
            I refresh what moves the score. Aging out on a timer alone is not the story. This is a
            portfolio project on a planted store of {METRICS.nKeys.toLocaleString()} keys, not a
            production feature platform.
          </p>
        </footer>
      </main>
    </>
  )
}
