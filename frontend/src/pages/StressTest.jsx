// src/pages/StressTest.jsx
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { Card, CardTitle, Spinner, ErrorBox } from '../components/ui.jsx'
import { useApi } from '../hooks/useApi.js'

const SCENARIOS = [
  {
    id: 'calm',
    label: 'Calm Market',
    description: 'Low noise — stable CBK rates, orderly NSE trading (e.g. 2015-2017)',
    p: 0.55, q: 0.52,
    color: '#1D9E75',
    icon: '🟢'
  },
  {
    id: 'current',
    label: 'Current Market',
    description: 'Baseline — IRA Kenya calibrated values 2015-2023',
    p: 0.710, q: 0.534,
    color: '#185FA5',
    icon: '🔵'
  },
  {
    id: 'stressed',
    label: 'Stressed Market',
    description: 'High noise — CBK rate spike, NSE crash (e.g. Q3 2023)',
    p: 0.87, q: 0.51,
    color: '#D85A30',
    icon: '🔴'
  }
]

const ASSET_LABELS = {
  TBills: 'T-Bills',
  NSE_Equity: 'NSE Equity',
  GovtBonds: 'Govt Bonds',
  CorpBonds: 'Corp Bonds',
  RealEstate: 'Real Estate'
}

const ASSET_KEYS = ['TBills', 'NSE_Equity', 'GovtBonds', 'CorpBonds', 'RealEstate']

const fmt = v => (v * 100).toFixed(1) + '%'
const fmtBuf = v => 'KES ' + (v * 1000).toFixed(0) + 'M per KES 1B'

export default function StressTest() {
  const { post } = useApi()
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [targetReturn, setTargetReturn] = useState(0.10)

  const runAll = async (tr) => {
    setLoading(true)
    setError(null)
    try {
      const responses = await Promise.all(
        SCENARIOS.map(s => post('/api/optimise', {
          p: s.p, q: s.q,
          target_return: tr,
          alpha_p: 0.176
        }))
      )
      const newResults = {}
      SCENARIOS.forEach((s, i) => {
        if (responses[i]) newResults[s.id] = responses[i]
      })
      setResults(newResults)
    } catch (e) {
      setError('Could not reach the API. The backend may be waking up — please wait 30 seconds and try again.')
    }
    setLoading(false)
  }

  useEffect(() => { runAll(targetReturn) }, [targetReturn])

  // Build comparison chart data
  const chartData = ASSET_KEYS.map(asset => {
    const row = { asset: ASSET_LABELS[asset] }
    SCENARIOS.forEach(s => {
      row[s.label] = results[s.id]?.weights?.[asset] ?? 0
    })
    return row
  })

  // Capital buffer data
  const bufferData = SCENARIOS.map(s => ({
    scenario: s.label,
    buffer: results[s.id] ? s.p * 0.176 * 100 : 0,
    color: s.color
  }))

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2744', margin: 0 }}>
          Stress Testing — Three Market Scenarios
        </h2>
        <p style={{ color: '#555', marginTop: '6px', fontSize: '14px' }}>
          Shows the optimal portfolio allocation and capital buffer required under calm,
          current, and stressed Kenyan market conditions. For IRA Kenya RBS Phase II compliance.
        </p>
      </div>

      {/* Target return slider */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: '#0f2744', whiteSpace: 'nowrap' }}>Target return:</span>
          <input type="range" min={0.07} max={0.18} step={0.005}
            value={targetReturn}
            onChange={e => setTargetReturn(parseFloat(e.target.value))}
            style={{ flex: 1, minWidth: '200px' }} />
          <span style={{ fontWeight: 700, color: '#1D9E75', fontSize: '18px', minWidth: '50px' }}>
            {(targetReturn * 100).toFixed(1)}%
          </span>
          <span style={{ fontSize: '13px', color: '#888' }}>IRA minimum: 7%</span>
        </div>
      </Card>

      {loading && <Spinner />}
      {error && <ErrorBox msg={error} />}

      {!loading && !error && (
        <>
          {/* Scenario cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {SCENARIOS.map(s => {
              const r = results[s.id]
              const bufferKES = r ? (s.p * 0.176 * 100).toFixed(1) : '—'
              return (
                <Card key={s.id} style={{ borderTop: `4px solid ${s.color}` }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: s.color, marginBottom: '4px' }}>
                    {s.icon} {s.label}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>{s.description}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ background: '#f8f9fb', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#888' }}>Noise p</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f2744' }}>{s.p}</div>
                    </div>
                    <div style={{ background: '#f8f9fb', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#888' }}>Trend q</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f2744' }}>{s.q}</div>
                    </div>
                  </div>
                  {r && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#888' }}>Return</div>
                          <div style={{ fontWeight: 700, color: '#1D9E75' }}>{fmt(r.expected_return)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#888' }}>Volatility</div>
                          <div style={{ fontWeight: 700, color: '#D85A30' }}>{fmt(r.volatility)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#888' }}>Sharpe</div>
                          <div style={{ fontWeight: 700, color: '#185FA5' }}>{r.sharpe_ratio.toFixed(3)}</div>
                        </div>
                      </div>
                      <div style={{ background: '#fff3e0', borderRadius: '6px', padding: '8px', textAlign: 'center', borderLeft: `3px solid ${s.color}` }}>
                        <div style={{ fontSize: '11px', color: '#888' }}>Noise Capital Buffer</div>
                        <div style={{ fontWeight: 700, color: s.color, fontSize: '14px' }}>+{bufferKES}M per KES 1B</div>
                      </div>
                      <div style={{ marginTop: '10px' }}>
                        {ASSET_KEYS.map(a => (
                          <div key={a} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <span style={{ fontSize: '12px', color: '#555' }}>{ASSET_LABELS[a]}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: `${(r.weights[a] ?? 0) * 120}px`, height: '6px', background: s.color, borderRadius: '3px', minWidth: '4px' }} />
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f2744', minWidth: '38px', textAlign: 'right' }}>{fmt(r.weights[a] ?? 0)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Grouped bar chart */}
          <Card style={{ marginBottom: '20px' }}>
            <CardTitle>Portfolio Allocation Comparison Across Scenarios</CardTitle>
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
              How the optimal allocation shifts as market conditions change. Each group shows one asset class across all three scenarios.
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="asset" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => (v * 100).toFixed(0) + '%'} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                {SCENARIOS.map(s => (
                  <Bar key={s.id} dataKey={s.label} fill={s.color} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Capital buffer comparison */}
          <Card>
            <CardTitle>Capital Buffer Required per KES 1 Billion Portfolio</CardTitle>
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
              The additional capital an insurer must hold above the standard requirement due to market noise. Directly relevant to IRA Kenya RBS Phase II compliance.
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bufferData} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tickFormatter={v => 'KES ' + v.toFixed(0) + 'M'} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="scenario" tick={{ fontSize: 12 }} width={110} />
                <Tooltip formatter={v => 'KES ' + v.toFixed(1) + 'M per KES 1B'} />
                <Bar dataKey="buffer" radius={[0, 4, 4, 0]}>
                  {bufferData.map((entry, i) => (
                    <rect key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '12px', padding: '10px', background: '#f0f7ff', borderRadius: '6px', fontSize: '13px', color: '#555' }}>
              <strong style={{ color: '#0f2744' }}>How to read this:</strong> Under calm conditions an insurer needs an extra KES {(0.55 * 0.176 * 100).toFixed(0)}M buffer per KES 1B portfolio. Under stressed conditions (p=0.87) this rises to KES {(0.87 * 0.176 * 100).toFixed(0)}M — a difference that could determine whether an insurer passes IRA solvency requirements.
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
