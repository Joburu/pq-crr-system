// src/components/ui.jsx
export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '18px 20px', ...style
    }}>
      {children}
    </div>
  )
}

export function CardTitle({ children, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                  marginBottom: 14 }}>
      <span style={{ fontWeight: 500, fontSize: 13 }}>{children}</span>
      {sub && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</span>}
    </div>
  )
}

export function MetricGrid({ children, cols = 4 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 12, marginBottom: 20
    }}>
      {children}
    </div>
  )
}

export function Metric({ label, value, sub, color }) {
  return (
    <div style={{
      background: '#f4f6f9', borderRadius: 8, padding: '12px 14px'
    }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase',
                    letterSpacing: '.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || 'var(--text)' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function Slider({ label, value, min, max, step = 1, onChange, format }) {
  const display = format ? format(value) : value
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: 12, color: 'var(--muted)', marginBottom: 5 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 500, color: 'var(--text)' }}>{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  )
}

export function Badge({ children, variant = 'default' }) {
  const colors = {
    default: { bg: '#f0f2f4', color: 'var(--muted)' },
    success: { bg: 'var(--teal-lt)', color: 'var(--teal)' },
    warning: { bg: '#fef3c7', color: '#92400e' },
    danger:  { bg: '#fee2e2', color: 'var(--red)' },
    info:    { bg: '#eff6ff', color: 'var(--blue)' },
  }
  const c = colors[variant] || colors.default
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 4,
      background: c.bg, color: c.color, fontWeight: 500
    }}>
      {children}
    </span>
  )
}

export function BarRow({ label, value, max, color, suffix = '%', extra }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
      <span style={{ width: 110, fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3,
                      transition: 'width .4s' }} />
      </div>
      <span style={{ width: 44, textAlign: 'right', fontSize: 12, fontWeight: 500 }}>
        {typeof value === 'number' ? value.toFixed(1) : value}{suffix}
      </span>
      {extra && <span style={{ fontSize: 11, width: 60, textAlign: 'right' }}>{extra}</span>}
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: 28, height: 28, border: '3px solid var(--border)',
        borderTop: '3px solid var(--teal)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export function ErrorBox({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5',
      borderRadius: 8, color: 'var(--red)', fontSize: 13, marginBottom: 14
    }}>
      {msg}
    </div>
  )
}

export function TwoCol({ children, gap = 16 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap, marginBottom: gap }}>
      {children}
    </div>
  )
}
