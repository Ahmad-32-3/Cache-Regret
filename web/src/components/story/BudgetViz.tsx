import { METRICS } from '../../data'

const SLOTS = 40

export function BudgetViz() {
  const k = METRICS.k
  const shown = Math.min(SLOTS, k)
  const timer = Array.from({ length: shown }, () => 'old')
  const impact = Array.from({ length: shown }, () => 'hot')

  return (
    <div className="teach-card">
      <h3 className="teach-card__title">Same {k} refresh slots, two ways to fill them</h3>
      <p className="meta" style={{ textTransform: 'none', letterSpacing: 0, margin: '0 0 0.75rem' }}>
        Each square is one key the policy may refresh this tick. {shown} of {k} slots are drawn.
      </p>
      <div className="slot-row">
        <span className="slot-row__label">Timer</span>
        <div className="slots" role="img" aria-label="Timer fills every slot with old low-impact keys">
          {timer.map((kind, i) => (
            <span key={`t${i}`} className={`slot slot--${kind}`} />
          ))}
        </div>
      </div>
      <div className="slot-row">
        <span className="slot-row__label">Impact</span>
        <div className="slots" role="img" aria-label="Impact score fills every slot with high-impact keys">
          {impact.map((kind, i) => (
            <span key={`i${i}`} className={`slot slot--${kind}`} />
          ))}
        </div>
      </div>
      <ul className="legend">
        <li>
          <span className="swatch" style={{ background: 'var(--amber-soft)', borderColor: 'var(--amber)' }} />
          old, low-impact key
        </li>
        <li>
          <span className="swatch" style={{ background: 'var(--good-soft)', borderColor: 'var(--good)' }} />
          key that would move the score
        </li>
      </ul>
    </div>
  )
}
