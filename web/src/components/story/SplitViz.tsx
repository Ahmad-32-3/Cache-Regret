import { METRICS } from '../../data'

export function SplitViz() {
  return (
    <div className="teach-card">
      <h3 className="teach-card__title">Volatility from early ticks, score on later ones</h3>
      <div className="split-row">
        <div className="split-col">
          <p className="meta split-col__head">Estimate how jumpy each key is</p>
          <div className="split-chips">
            <span className="chip chip--train">ticks 1–{METRICS.trainTicks}</span>
          </div>
        </div>
        <div className="split-arrow" aria-hidden="true">→</div>
        <div className="split-col">
          <p className="meta split-col__head">Spend the budget, then score</p>
          <div className="split-chips">
            <span className="chip chip--held">ticks {METRICS.trainTicks + 1}–{METRICS.nTicks}</span>
          </div>
        </div>
      </div>
      <p className="meta" style={{ margin: '0.75rem 0 0', textTransform: 'none', letterSpacing: 0 }}>
        The policy never sees the fresh value of a key it has not refreshed. It only sees age, the
        model weights, and how jumpy that key was in the early window.
      </p>
    </div>
  )
}
