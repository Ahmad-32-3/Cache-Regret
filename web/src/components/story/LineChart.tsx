export type Series = {
  label: string
  color: string
  values: number[]
  dash?: string
  width?: number
}

type Props = {
  series: Series[]
  ticks: number
  yLabel?: string
  yMin?: number
  yMax?: number
}

const W = 660
const H = 300
const PAD = { l: 44, r: 16, t: 16, b: 34 }

export function LineChart({ series, ticks, yLabel = '% right', yMin = 0, yMax }: Props) {
  const lo = yMin
  const hi = yMax ?? Math.ceil(Math.max(...series.flatMap((s) => s.values)) + 2)
  const span = Math.max(hi - lo, 1)
  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const x = (i: number) => PAD.l + (i / Math.max(ticks - 1, 1)) * plotW
  const y = (v: number) => PAD.t + plotH - ((v - lo) / span) * plotH
  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const grid = [lo, lo + span / 2, hi]

  return (
    <div className="chart-wrap">
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Line chart, ${yLabel} over ${ticks} ticks. Series: ${series.map((s) => s.label).join(', ')}.`}>
        {grid.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--chart-label)" fontFamily="var(--font-mono)">
              {Math.round(t)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 8} fontSize="11" fill="var(--chart-label)" fontFamily="var(--font-mono)">
          first test tick
        </text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end" fontSize="11" fill="var(--chart-label)" fontFamily="var(--font-mono)">
          tick {ticks}
        </text>
        {series.map((s) => (
          <path
            key={s.label}
            className="draw-line"
            d={path(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width ?? 2}
            strokeDasharray={s.dash}
            strokeLinejoin="round"
            pathLength={1}
          />
        ))}
      </svg>
      <ul className="legend">
        {series.map((s) => (
          <li key={s.label}>
            <svg width="26" height="10" aria-hidden="true" style={{ flex: '0 0 auto' }}>
              <line x1="1" y1="5" x2="25" y2="5" stroke={s.color} strokeWidth={s.width ?? 2} strokeDasharray={s.dash} />
            </svg>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
