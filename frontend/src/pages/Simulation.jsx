// src/pages/Simulation.jsx
import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Card, CardTitle, MetricGrid, Metric, Slider, ErrorBox, Spinner, Badge } from '../components/ui.jsx'
import { useApi } from '../hooks/useApi.js'

const SIM_COLORS = {
  portfolio_value:        '#1D9E75',
  noisy_observation:      '#5DCAA5',
  cumulative_liabilities: '#D85A30',
  optimisation_threshold: '#BA7517',
}

const LEGEND = [
  { key: 'portfolio_value',        label: 'True portfolio',       color: '#1D9E75' },
  { key: 'noisy_observation',      label: 'Noisy observation',    color: '#5DCAA5' },
  { key: 'cumulative_liabilities', label: 'Cumulative liabilities', color: '#D85A30' },
  { key: 'optimisation_threshold', label: 'Solvency threshold',   color: '#BA7517' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 500, marginBottom: 4, color: 'var(--muted)' }}>Year {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed(4)}
        </div>
      ))}
    </div>
  )
}

export default function Simulation() {
  const { loading, error, post } = useApi()

  const [params, setParams] = useState({
    p: 0.710, q: 0.534, alpha_p: 0.176,
    target_return: 0.10, risk_free_rate: 0.094,
    policy_years: 30, n_policyholders: 1000,
    mortality_rate: 0.015, seed: 42, save: false, notes: ''
  })
  const [result, setResult] = useState(null)

  const set = (key, val) => setParams(p => ({ ...p, [key]: val }))

  const run = async () => {
    const res = await post('/api/simulate', params)
    if (res) setResult(res)
  }

  const chartData = result?.time_series?.year?.map((yr, i) => ({
    year: yr,
    portfolio_value:        result.time_series.portfolio_value[i],
    noisy_observation:      result.time_series.noisy_observation[i],
    cumulative_liabilities: result.time_series.cumulative_liabilities[i],
    optimisation_threshold: result.time_series.optimisation_threshold[i],
    surplus:                result.time_series.surplus[i],
    active_policyholders:   result.time_series.active_policyholders[i],
  }))

  const ruinColor = result ? (
    result.ruin_probability === 0 ? 'var(--teal)' :
    result.ruin_probability < 0.1 ? 'var(--amber)' : 'var(--red)'
  ) : undefined

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>

      {/* Controls */}
      <div>
        <Card style={{ marginBottom: 14 }}>
          <CardTitle>Model parameters</CardTitle>
          <Slider label="Noise p" value={params.p} min={0.52} max={0.97} step={0.01}
            onChange={v => set('p', v)} format={v => v.toFixed(3)} />
          <Slider label="Trend q" value={params.q} min={0.05} max={params.p - 0.03} step={0.01}
            onChange={v => set('q', v)} format={v => v.toFixed(3)} />
          <Slider label="α_p" value={params.alpha_p} min={0.05} max={0.50} step={0.01}
            onChange={v => set('alpha_p', v)} format={v => v.toFixed(3)} />
          <Slider label="Target return" value={params.target_return} min={0.07} max={0.20} step={0.005}
            onChange={v => set('target_return', v)} format={v => (v * 100).toFixed(1) + '%'} />
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <CardTitle>Insurance parameters</CardTitle>
          <Slider label="Policy years" value={params.policy_years} min={5} max={50} step={1}
            onChange={v => set('policy_years', v)} format={v => v + ' yrs'} />
          <Slider label="Policyholders" value={params.n_policyholders} min={100} max={5000} step={100}
            onChange={v => set('n_policyholders', v)} format={v => v.toLocaleString()} />
          <Slider label="Mortality rate" value={params.mortality_rate} min={0.005} max={0.05} step={0.001}
            onChange={v => set('mortality_rate', v)} format={v => (v * 100).toFixed(1) + '%'} />
          <Slider label="Random seed" value={params.seed} min={1} max={999} step={1}
            onChange={v => set('seed', v)} format={v => v} />
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <CardTitle>Save options</CardTitle>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                            cursor: 'pointer' }}>
              <input type="checkbox" checked={params.save}
                onChange={e => set('save', e.target.checked)} />
              Save to reports
            </label>
          </div>
          <textarea value={params.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Notes (optional)" rows={3}
            style={{ width: '100%', fontSize: 12, resize: 'none' }} />
        </Card>

        <button className="primary" onClick={run} disabled={loading}
          style={{ width: '100%', padding: '10px' }}>
          {loading ? 'Simulating…' : '▶ Run simulation'}
        </button>
      </div>

      {/* Results */}
      <div>
        <ErrorBox msg={error} />

        {loading && <Spinner />}

        {result && !loading && (
          <>
            <MetricGrid cols={4}>
              <Metric label="Ruin probability" value={(result.ruin_probability * 100).toFixed(1) + '%'}
                color={ruinColor} sub="Prop 6.1 threshold" />
              <Metric label="Final surplus"
                value={result.final_surplus.toFixed(3) + '×'}
                color={result.final_surplus > 1 ? 'var(--teal)' : 'var(--red)'}
                sub={`after ${params.policy_years} years`} />
              <Metric label="Active lives"
                value={result.final_active.toLocaleString()}
                sub={`of ${params.n_policyholders.toLocaleString()} initial`} />
              <Metric label="Sharpe ratio"
                value={result.sharpe_ratio.toFixed(3)}
                color={result.sharpe_ratio > 0 ? 'var(--teal)' : 'var(--red)'} />
            </MetricGrid>

            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>30-year portfolio evolution</span>
                {result.db_id && <Badge variant="success">Saved — ID {result.db_id}</Badge>}
              </div>
              <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
                {LEGEND.map(({ label, color }) => (
                  <span key={label} style={{ display: 'flex', alignItems: 'center',
                                             gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                    <span style={{ width: 10, height: 10, background: color,
                                   borderRadius: 2, display: 'inline-block' }} />
                    {label}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f4" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--muted)' }}
                    label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }}
                    tickFormatter={v => v.toFixed(2)} />
                  <Tooltip content={<CustomTooltip />} />
                  {LEGEND.map(({ key, label, color }) => (
                    <Line key={key} dataKey={key} name={label} stroke={color}
                      dot={false} strokeWidth={key === 'portfolio_value' ? 2 : 1.2}
                      strokeDasharray={key === 'noisy_observation' || key === 'optimisation_threshold'
                        ? '4 3' : undefined} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <CardTitle sub="annual">Portfolio value and surplus</CardTitle>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th style={{ textAlign: 'right' }}>Portfolio</th>
                      <th style={{ textAlign: 'right' }}>Noisy obs.</th>
                      <th style={{ textAlign: 'right' }}>Liabilities</th>
                      <th style={{ textAlign: 'right' }}>Surplus</th>
                      <th style={{ textAlign: 'right' }}>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData?.filter((_, i) => i % 5 === 0 || i === chartData.length - 1)
                      .map(row => (
                        <tr key={row.year}>
                          <td>{row.year}</td>
                          <td style={{ textAlign: 'right' }}>{row.portfolio_value?.toFixed(4)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--muted)' }}>
                            {row.noisy_observation?.toFixed(4)}</td>
                          <td style={{ textAlign: 'right' }}>
                            {row.cumulative_liabilities?.toFixed(4)}</td>
                          <td style={{ textAlign: 'right',
                                       color: row.surplus > 0 ? 'var(--teal)' : 'var(--red)',
                                       fontWeight: 500 }}>
                            {row.surplus?.toFixed(4)}</td>
                          <td style={{ textAlign: 'right' }}>
                            {row.active_policyholders?.toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {!result && !loading && (
          <Card>
            <div style={{ textAlign: 'center', padding: '60px 0',
                          color: 'var(--muted)', fontSize: 13 }}>
              Configure parameters and click <strong>Run simulation</strong> to begin
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
