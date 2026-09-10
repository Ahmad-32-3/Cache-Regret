import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { COUNTERS, type Counter } from '../../data'

function Cell({ c }: { c: Counter }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(c.value)
  const ref = useRef<HTMLDivElement>(null)
  const decimals = c.unit === '%' ? 1 : Number.isInteger(c.value) ? 0 : 1

  useEffect(() => {
    if (reduce) return
    const el = ref.current
    if (!el) return
    let controls: ReturnType<typeof animate> | undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        io.disconnect()
        setShown(0)
        controls = animate(0, c.value, {
          duration: 1,
          ease: [0.22, 1, 0.36, 1],
          onUpdate: (v) => setShown(v),
          onComplete: () => setShown(c.value),
        })
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      controls?.stop()
    }
  }, [c.value, reduce])

  return (
    <div className={`bento__cell bento__cell--${c.key}`} ref={ref}>
      <div className="bento__value">
        {shown.toFixed(decimals)}
        {c.unit ? <span className="bento__unit"> {c.unit}</span> : null}
      </div>
      <div className="bento__label">{c.label}</div>
      <div className="bento__note">{c.note}</div>
    </div>
  )
}

export function ResultBento() {
  return (
    <div className="bento" role="group" aria-label="Held-out success after the same refresh budget">
      {COUNTERS.map((c) => (
        <Cell key={c.key} c={c} />
      ))}
    </div>
  )
}
