import { ABLATION_BUDGET } from '../../data'

const W = 660
const H = 280
const PAD = { l: 44, r: 16, t: 16, b: 40 }

export function AblationBars() {
  const groups = ABLATION_BUDGET
  const n = groups.length
  const groupW = (W - PAD.l - PAD.r) / n
  const barW = Math.min(18, groupW / 5)
  const gap = 6
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / 100)
  const keys = [
    { key: 'regret' as const, color: 'var(--good)', label: 'impact-aware' },
    { key: 'ttl' as const, color: 'var(--amber)', label: 'timer' },
    { key: 'fifo' as const, color: 'var(--steel)', label: 'queue' },
  ]

  return (
    <div className="chart-wrap">
      <svg
        className="chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Success rate by refresh budget for impact-aware, timer, and queue policies."
      >
        {[50, 75, 85, 100].map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--chart-label)" fontFamily="var(--font-mono)">
              {t}
            </text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const cx = PAD.l + gi * groupW + groupW / 2
          return (
            <g key={g.k}>
              {keys.map((k, bi) => {
                const x = cx + (bi - 1) * (barW + gap) - barW / 2
                const top = y(g[k.key])
                const h = H - PAD.b - top
                return (
                  <rect
                    key={k.key}
                    className="bar-grow"
                    x={x}
                    y={top}
                    width={barW}
                    height={Math.max(h, 0)}
                    fill={k.color}
                    style={{ animationDelay: `${gi * 0.08 + bi * 0.04}s` }}
                  />
                )
              })}
              <text x={cx} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--chart-label)" fontFamily="var(--font-mono)">
                k={g.k}
              </text>
            </g>
          )
        })}
      </svg>
      <ul className="legend">
        {keys.map((k) => (
          <li key={k.key}>
            <span className="swatch" style={{ background: k.color }} />
            {k.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
