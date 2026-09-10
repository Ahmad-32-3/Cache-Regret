import { STACK } from '../../data'

export function StackGrid() {
  return (
    <ul className="stack-grid">
      {STACK.map((t) => (
        <li key={t.name} className="stack-tool">
          <div className="stack-tool__head">
            <span className="stack-tool__name">{t.name}</span>
            <span className="stack-tool__tag">{t.tag}</span>
          </div>
          <p className="stack-tool__plain">{t.plain}</p>
          <p className="stack-tool__tech">{t.tech}</p>
        </li>
      ))}
    </ul>
  )
}
