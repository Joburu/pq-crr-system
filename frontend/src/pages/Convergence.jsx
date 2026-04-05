// src/pages/Convergence.jsx
import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { Card, CardTitle, MetricGrid, Metric, Slider, ErrorBox, Spinner } from '../components/ui.jsx'
import { useApi } from '../hooks/useApi.js'

export default function Convergence() {
  const { loading, error, get } = useApi()
  const [p, setP] = useState(0.710)
  const [q, setQ] = useState(0.534)
  const [S0, setS0] = useState(100)
  const [K, setK]   = useState(95)
  const [r, setR]   = useState(0.094)
  const [sig, setSig] = useState(0.20)
  const [result, setResult] = useState(null)

  const load = async () => {
    const res = await get(
      `/api/convergence?p=${p}&q=${q}&S0=${S0}&K=${K}&r=${r}&sigma=${sig}`
    )
    if (res) setResult(res)
  }

  useEffect(() => {
    const t = setTimeout(load, 600)
    return () => clearTimeout(t)
  }, [p, q, S0, K, r, sig])

  const chartData = result?.results?.map(row => ({
    N: row.N,
    pq_price: row.price_pq,
    bs_price: row.black_scholes,
    error: row.abs_error,
  }))

  const bestRow = result?.results?.[result.results.length - 1]

  return (
    <div style={{ maxWidth: 900 }}>
      <ErrorBox msg={error} />

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>

        {/* Controls */}
        <div>
          <Card style={{ marginBottom: 14 }}>
            <CardTitle>(p,q) parameters</CardTitle>
            <Slider label="Noise p" value={p} min={0.52} max={0.97} step={0.01}
              onChange={v => { setP(v); if (v <= q + 0.02) setQ(Math.max(0.05, v - 0.03)) }}
              format={v => v.toFixed(3)} />
            <Slider label="Trend q" value={q} min={0.05} max={p - 0.03} step={0.01}
              onChange={setQ} format={v => v.toFixed(3)} />
          </Card>

          <Card style={{ marginBottom: 14 }}>
            <CardTitle>Option parameters</CardTitle>
            <Slider label="Spot S₀" value={S0} min={50} max={200} step={5}
              onChange={setS0} format={v => 'KES ' + v} />
            <Slider label="Strike K" value={K} min={50} max={200} step={5}
              onChange={setK} format={v => 'KES ' + v} />
            <Slider label="Risk-free r" value={r} min={0.05} max={0.20} step={0.005}
              onChange={setR} format={v => (v * 100).toFixed(1) + '%'} />
            <Slider label="Volatility σ" value={sig} min={0.05} max={0.50} step={0.01}
              onChange={setSig} format={v => (v * 100).toFixed(0) + '%'} />
          </Card>

          <Card>
            <CardTitle>Theorem reference</CardTitle>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--text)', fontWeight: 500 }}>Theorem 4.2</strong><br />
              The (p,q)-CRR price converges to the Black-Scholes price as N → ∞ at rate O(N<sup>−½</sup>).
              <br /><br />
              Error ∝ N<sup>−0.5</sup> implies halving N quarters the error.
            </p>
          </Card>
        </div>

        {/* Results */}
        <div>
          {loading && !result && <Spinner />}

          {result && (
            <>
              <MetricGrid cols={4}>
                <Metric label="Black-Scholes price"
                  value={'KES ' + result.black_scholes.toFixed(4)}
                  sub="benchmark" />
                <Metric label="(p,q)-CRR at N=1000"
                  value={'KES ' + (result.results[6]?.price_pq.toFixed(4) ?? '—')} />
                <Metric label="|Error| at N=1000"
                  value={result.results[6]?.abs_error.toFixed(6) ?? '—'}
                  color={result.results[6]?.abs_error < 0.001 ? 'var(--teal)' : undefined} />
                <Metric label="Converging"
                  value={bestRow?.abs_error < 0.0001 ? 'Yes ✓' : 'In progress'}
                  color={bestRow?.abs_error < 0.0001 ? 'var(--teal)' : 'var(--amber)'} />
              </MetricGrid>

              <Card style={{ marginBottom: 16 }}>
                <CardTitle sub="T=1yr · log scale on N">
                  (p,q)-CRR price vs Black-Scholes benchmark
                </CardTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f4" />
                    <XAxis dataKey="N" scale="log" type="number"
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 11, fill: 'var(--muted)' }}
                      tickFormatter={v => v >= 1000 ? v/1000 + 'k' : v}
                      label={{ value: 'N steps (log)', position: 'insideBottom',
                               offset: -2, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }}
                      tickFormatter={v => v.toFixed(2)}
                      label={{ value: 'Call price', angle: -90,
                               position: 'insideLeft', fontSize: 11 }} />
                    <Tooltip formatter={(v, name) => [v.toFixed(4), name]} />
                    <Line dataKey="pq_price" name="(p,q)-CRR" stroke="#1D9E75"
                      dot={{ r: 3, fill: '#1D9E75' }} strokeWidth={2} />
                    <Line dataKey="bs_price" name="Black-Scholes" stroke="#D85A30"
                      dot={false} strokeDasharray="5 3" strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card style={{ marginBottom: 16 }}>
                <CardTitle sub="log-log confirms O(N⁻½)">Convergence error</CardTitle>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f4" />
                    <XAxis dataKey="N" scale="log" type="number" domain={['auto', 'auto']}
                      tick={{ fontSize: 11, fill: 'var(--muted)' }}
                      tickFormatter={v => v >= 1000 ? v/1000 + 'k' : v} />
                    <YAxis scale="log" tick={{ fontSize: 11, fill: 'var(--muted)' }}
                      tickFormatter={v => v.toExponential(0)} />
                    <Tooltip formatter={(v) => [v.toFixed(6), '|Error|']} />
                    <Line dataKey="error" name="|Error|" stroke="#BA7517"
                      dot={{ r: 3, fill: '#BA7517' }} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <CardTitle sub="Theorems 4.1–4.2">Convergence table</CardTitle>
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'right' }}>N steps</th>
                      <th style={{ textAlign: 'right' }}>(p,q)-CRR price</th>
                      <th style={{ textAlign: 'right' }}>Black-Scholes</th>
                      <th style={{ textAlign: 'right' }}>|Error|</th>
                      <th style={{ textAlign: 'right' }}>% error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map(row => (
                      <tr key={row.N}>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{row.N}</td>
                        <td style={{ textAlign: 'right' }}>{row.price_pq.toFixed(4)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--muted)' }}>
                          {row.black_scholes.toFixed(4)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {row.abs_error.toFixed(6)}</td>
                        <td style={{ textAlign: 'right',
                                     color: row.pct_error < 0.1 ? 'var(--teal)' : 'var(--text)' }}>
                          {row.pct_error.toFixed(4)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
