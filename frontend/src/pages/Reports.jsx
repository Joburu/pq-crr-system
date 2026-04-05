// src/pages/Reports.jsx
import { useState, useEffect } from 'react'
import { Card, CardTitle, MetricGrid, Metric, Badge, ErrorBox, Spinner } from '../components/ui.jsx'
import { useApi } from '../hooks/useApi.js'

export default function Reports() {
  const { loading, error, get, delete: del } = useApi()
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail]   = useState(null)

  useEffect(() => { loadList() }, [])

  const loadList = async () => {
    const d = await get('/api/reports')
    if (d) setReports(d)
  }

  const loadDetail = async (id) => {
    setSelected(id); setDetail(null)
    const d = await get(`/api/reports/${id}`)
    if (d) setDetail(d)
  }

  const deleteReport = async (id) => {
    if (!confirm(`Delete report ${id}?`)) return
    await del(`/api/reports/${id}`)
    setReports(prev => prev.filter(r => r.id !== id))
    if (selected === id) { setSelected(null); setDetail(null) }
  }

  const ruinColor = (p) => {
    if (p === null || p === undefined) return 'var(--muted)'
    if (p === 0) return 'var(--teal)'
    if (p < 0.1) return 'var(--amber)'
    return 'var(--red)'
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, minHeight: 500 }}>

      {/* List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>Saved simulations</span>
          <button onClick={loadList} disabled={loading} style={{ fontSize: 12 }}>
            Refresh
          </button>
        </div>

        <ErrorBox msg={error} />
        {loading && reports.length === 0 && <Spinner />}

        {reports.length === 0 && !loading && (
          <Card>
            <div style={{ textAlign: 'center', padding: '30px 0',
                          color: 'var(--muted)', fontSize: 13 }}>
              No saved reports yet.<br />
              Run a simulation with "Save to reports" checked.
            </div>
          </Card>
        )}

        {reports.map(r => (
          <div
            key={r.id}
            onClick={() => loadDetail(r.id)}
            style={{
              padding: '12px 14px', marginBottom: 8,
              background: selected === r.id ? '#f0faf5' : 'var(--surface)',
              border: `1px solid ${selected === r.id ? 'var(--teal)' : 'var(--border)'}`,
              borderRadius: 8, cursor: 'pointer', transition: 'all .15s'
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontWeight: 500, fontSize: 13 }}>Report #{r.id}</span>
              <button
                onClick={e => { e.stopPropagation(); deleteReport(r.id) }}
                style={{ fontSize: 11, padding: '2px 6px', color: 'var(--red)',
                         borderColor: 'transparent', background: 'transparent' }}>
                ✕
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {new Date(r.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {r.ruin_probability !== null && (
                <Badge variant={r.ruin_probability === 0 ? 'success' :
                                r.ruin_probability < 0.1 ? 'warning' : 'danger'}>
                  Ruin {(r.ruin_probability * 100).toFixed(1)}%
                </Badge>
              )}
              {r.sharpe_ratio !== null && (
                <Badge variant={r.sharpe_ratio > 0.3 ? 'success' : 'default'}>
                  Sharpe {r.sharpe_ratio?.toFixed(3)}
                </Badge>
              )}
            </div>
            {r.notes && (
              <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 4,
                            fontStyle: 'italic' }}>
                {r.notes.slice(0, 80)}{r.notes.length > 80 ? '…' : ''}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detail */}
      <div>
        {!selected && (
          <Card>
            <div style={{ textAlign: 'center', padding: '60px 0',
                          color: 'var(--muted)', fontSize: 13 }}>
              Select a report from the list to view details
            </div>
          </Card>
        )}

        {selected && !detail && <Spinner />}

        {detail && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 500, fontSize: 14 }}>Report #{detail.id}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {new Date(detail.created_at).toLocaleString('en-GB')}
              </span>
            </div>

            <MetricGrid cols={4}>
              <Metric label="Ruin probability"
                value={(detail.ruin_probability * 100).toFixed(1) + '%'}
                color={ruinColor(detail.ruin_probability)} />
              <Metric label="Final surplus"
                value={detail.final_surplus?.toFixed(3) + '×'}
                color={detail.final_surplus > 1 ? 'var(--teal)' : 'var(--red)'} />
              <Metric label="Active lives (final)"
                value={detail.final_active?.toLocaleString()}
                sub={`of ${detail.n_policyholders?.toLocaleString()}`} />
              <Metric label="Sharpe ratio"
                value={detail.sharpe_ratio?.toFixed(3)}
                color={detail.sharpe_ratio > 0 ? 'var(--teal)' : 'var(--red)'} />
            </MetricGrid>

            <Card style={{ marginBottom: 16 }}>
              <CardTitle>Simulation parameters</CardTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
                {[
                  ['Policy years', detail.policy_years + ' yrs'],
                  ['Policyholders', detail.n_policyholders?.toLocaleString()],
                  ['Mortality rate', (detail.mortality_rate * 100).toFixed(1) + '%'],
                  ['Notes', detail.notes || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                                        padding: '6px 0', borderBottom: '1px solid var(--border)',
                                        fontSize: 12 }}>
                    <span style={{ color: 'var(--muted)' }}>{k}</span>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            {detail.time_series && (
              <Card>
                <CardTitle sub="every 5 years">Time series snapshot</CardTitle>
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'right' }}>Year</th>
                      <th style={{ textAlign: 'right' }}>Portfolio</th>
                      <th style={{ textAlign: 'right' }}>Liabilities</th>
                      <th style={{ textAlign: 'right' }}>Surplus</th>
                      <th style={{ textAlign: 'right' }}>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.time_series.year
                      ?.filter((_, i) => i % 5 === 0 || i === detail.time_series.year.length - 1)
                      .map((yr, i) => {
                        const idx = detail.time_series.year.indexOf(yr)
                        const surplus = detail.time_series.surplus?.[idx]
                        return (
                          <tr key={yr}>
                            <td style={{ textAlign: 'right' }}>{yr}</td>
                            <td style={{ textAlign: 'right' }}>
                              {detail.time_series.portfolio_value?.[idx]?.toFixed(4)}</td>
                            <td style={{ textAlign: 'right', color: 'var(--muted)' }}>
                              {detail.time_series.cumulative_liabilities?.[idx]?.toFixed(4)}</td>
                            <td style={{ textAlign: 'right',
                                         color: surplus > 0 ? 'var(--teal)' : 'var(--red)',
                                         fontWeight: 500 }}>
                              {surplus?.toFixed(4)}</td>
                            <td style={{ textAlign: 'right' }}>
                              {detail.time_series.active_policyholders?.[idx]?.toLocaleString()}</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
