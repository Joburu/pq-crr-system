// src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { Card, CardTitle, MetricGrid, Metric, Slider, BarRow, Spinner, ErrorBox, TwoCol } from '../components/ui.jsx'
import { useApi } from '../hooks/useApi.js'

const COLORS = ['#1D9E75','#185FA5','#BA7517','#D85A30','#7C3AED']
const ASSETS = ['TBills','NSE_Equity','GovtBonds','CorpBonds','RealEstate']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 500, marginBottom: 4, color: 'var(--muted)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(4) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { loading, error, get, post } = useApi()

  const [params, setParams] = useState({
    p: 0.710, q: 0.534, alpha_p: 0.176,
    target_return: 0.10, risk_free_rate: 0.094
  })
  const [result, setResult]   = useState(null)
  const [sensData, setSensData] = useState(null)
  const [market, setMarket]   = useState(null)

  useEffect(() => { get('/api/market/kenya').then(setMarket) }, [])

  const runOptimise = useCallback(async (p = params) => {
    const res = await post('/api/optimise', p)
    if (res) setResult(res)
  }, [params])

  useEffect(() => {
    const t = setTimeout(() => runOptimise(params), 400)
    return () => clearTimeout(t)
  }, [params])

  useEffect(() => {
    get(`/api/sensitivity?q=${params.q}&alpha_p=${params.alpha_p}&target_return=${params.target_return}`)
      .then(d => {
        if (!d) return
        const chart = d.p_grid.map((p, i) => {
          const row = { p }
          ASSETS.forEach((a, ai) => { row[a] = d.sensitivities[d.asset_names[ai]]?.[i] ?? 0 })
          return row
        })
        setSensData(chart)
      })
  }, [params.q, params.alpha_p, params.target_return])

  const set = (key, val) => setParams(prev => {
    const next = { ...prev, [key]: val }
    if (key === 'p' && val <= next.q + 0.02) next.q = Math.max(0.05, val - 0.03)
    if (key === 'q' && val >= next.p - 0.02) next.p = Math.min(0.99, val + 0.03)
    return next
  })

  const weights = result?.weights ?? {}
  const sens    = result?.noise_sensitivity ?? {}
  const maxW    = Math.max(...Object.values(weights), 0.01)
  const maxS    = Math.max(...Object.values(sens).map(Math.abs), 0.01)

  return (
    <div>
      <ErrorBox msg={error} />
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>

        {/* Controls */}
        <div>
          <Card style={{ marginBottom: 16 }}>
            <CardTitle>Parameters</CardTitle>
            <Slider label="Noise level p" value={params.p} min={0.52} max={0.97} step={0.01}
              onChange={v => set('p', v)} format={v => v.toFixed(3)} />
            <Slider label="Trend q" value={params.q} min={0.05} max={params.p - 0.03} step={0.01}
              onChange={v => set('q', v)} format={v => v.toFixed(3)} />
            <Slider label="α_p scale" value={params.alpha_p} min={0.05} max={0.50} step={0.01}
              onChange={v => set('alpha_p', v)} format={v => v.toFixed(3)} />
            <Slider label="Target return" value={params.target_return} min={0.07} max={0.20} step={0.005}
              onChange={v => set('target_return', v)} format={v => (v * 100).toFixed(1) + '%'} />
          </Card>

          {market && (
            <Card>
              <CardTitle>Kenyan market</CardTitle>
              {Object.entries(market.mu_annual).map(([name, mu], i) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between',
                                         fontSize: 12, padding: '4px 0',
                                         borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ color: 'var(--muted)' }}>{name}</span>
                  <span style={{ fontWeight: 500 }}>{(mu * 100).toFixed(1)}%</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 8 }}>
                Source: IRA Kenya 2023 · CBK
              </div>
            </Card>
          )}
        </div>

        {/* Results */}
        <div>
          {loading && !result ? <Spinner /> : (
            <>
              <MetricGrid cols={4}>
                <Metric label="Expected return"
                  value={result ? (result.expected_return * 100).toFixed(2) + '%' : '—'}
                  sub="(p,q)-adjusted, annual" />
                <Metric label="Volatility"
                  value={result ? (result.volatility * 100).toFixed(2) + '%' : '—'}
                  sub="noise-scaled, annual" />
                <Metric label="Sharpe ratio"
                  value={result?.sharpe_ratio?.toFixed(3) ?? '—'}
                  sub={`rf = ${(params.risk_free_rate * 100).toFixed(1)}%`}
                  color={result?.sharpe_ratio > 0.3 ? 'var(--teal)' : undefined} />
                <Metric label="Optimised"
                  value={result?.optimisation_success ? 'Yes ✓' : 'Relaxed'}
                  sub={`p = ${params.p.toFixed(3)}`}
                  color={result?.optimisation_success ? 'var(--teal)' : 'var(--amber)'} />
              </MetricGrid>

              <TwoCol>
                <Card>
                  <CardTitle sub="IRA 40% limit">Optimal weights w*(p,q)</CardTitle>
                  {ASSETS.map((a, i) => (
                    <BarRow key={a} label={a}
                      value={(weights[a] ?? 0) * 100}
                      max={40} color={COLORS[i]} />
                  ))}
                </Card>

                <Card>
                  <CardTitle sub="Theorem 5.1">Noise sensitivity ∂w_i*/∂p</CardTitle>
                  {ASSETS.map((a, i) => {
                    const v = sens[a] ?? 0
                    return (
                      <BarRow key={a} label={a}
                        value={Math.abs(v)} max={maxS}
                        color={v >= 0 ? '#1D9E75' : '#D85A30'}
                        suffix=""
                        extra={
                          <span style={{ color: v >= 0 ? 'var(--teal)' : 'var(--red)' }}>
                            {v >= 0 ? '+' : ''}{v.toFixed(3)}
                          </span>
                        } />
                    )
                  })}
                </Card>
              </TwoCol>

              {sensData && (
                <Card>
                  <CardTitle sub="across p range">Noise sensitivity surface ∂w_i*/∂p</CardTitle>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={sensData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f4" />
                      <XAxis dataKey="p" tick={{ fontSize: 11, fill: 'var(--muted)' }}
                        tickFormatter={v => v.toFixed(2)} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }}
                        tickFormatter={v => v.toFixed(2)} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
                      {ASSETS.map((a, i) => (
                        <Line key={a} dataKey={a} stroke={COLORS[i]}
                          dot={false} strokeWidth={1.5} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 6 }}>
                    Lines above zero = noise-resilient · Below zero = noise-sensitive
                  </div>
                </Card>
              )}

              {result?.interpretation && (
                <Card>
                  <CardTitle>Interpretation</CardTitle>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                    {result.interpretation}
                  </p>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
