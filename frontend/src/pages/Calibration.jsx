// src/pages/Calibration.jsx
import { useState } from 'react'
import { Card, CardTitle, MetricGrid, Metric, Badge, ErrorBox, Spinner } from '../components/ui.jsx'
import { useApi } from '../hooks/useApi.js'

const ASSET_OPTIONS = ['TBills','NSE_Equity','GovtBonds','CorpBonds','RealEstate']

export default function Calibration() {
  const { loading, error, post, get } = useApi()
  const [file, setFile]         = useState(null)
  const [assetName, setAsset]   = useState('NSE_Equity')
  const [priceCol, setPriceCol] = useState('price')
  const [result, setResult]     = useState(null)
  const [defaults, setDefaults] = useState(null)
  const [manPrices, setManPrices] = useState('')
  const [manResult, setManResult] = useState(null)

  const loadDefaults = async () => {
    const d = await get('/api/calibrate/kenya-defaults')
    if (d) setDefaults(d)
  }

  const uploadCSV = async () => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    const url = `/api/calibrate/csv?asset_name=${assetName}&price_col=${priceCol}`
    const res = await post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res) setResult(res)
  }

  const calibrateManual = async () => {
    const prices = manPrices.split(/[\s,\n]+/).map(Number).filter(n => !isNaN(n) && n > 0)
    if (prices.length < 12) { alert('Need at least 12 prices.'); return }
    const res = await post('/api/calibrate', { prices, asset_name: assetName })
    if (res) setManResult(res)
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <ErrorBox msg={error} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* CSV Upload */}
        <Card>
          <CardTitle sub="upload price series">Calibrate from CSV</CardTitle>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Asset class</div>
            <select value={assetName} onChange={e => setAsset(e.target.value)}
              style={{ width: '100%' }}>
              {ASSET_OPTIONS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Price column name</div>
            <input type="text" value={priceCol} onChange={e => setPriceCol(e.target.value)}
              placeholder="price" style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>CSV file</div>
            <input type="file" accept=".csv"
              onChange={e => setFile(e.target.files[0])}
              style={{ fontSize: 12, width: '100%' }} />
          </div>
          <button className="primary" onClick={uploadCSV} disabled={loading || !file}
            style={{ width: '100%' }}>
            {loading ? 'Calibrating…' : 'Calibrate from CSV'}
          </button>

          {result && (
            <div style={{ marginTop: 16 }}>
              <MetricGrid cols={2}>
                <Metric label="p (noise)" value={result.p.toFixed(4)}
                  color={result.used_default ? 'var(--amber)' : 'var(--teal)'} />
                <Metric label="q (trend)" value={result.q.toFixed(4)} />
              </MetricGrid>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Badge variant={result.used_default ? 'warning' : 'success'}>
                  {result.used_default ? 'IRA default used' : 'From data'}
                </Badge>
                <Badge>{result.n_observations} observations</Badge>
                {result.db_id && <Badge variant="info">Saved — ID {result.db_id}</Badge>}
              </div>
            </div>
          )}
        </Card>

        {/* Manual entry */}
        <Card>
          <CardTitle sub="paste price series">Manual price entry</CardTitle>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Asset class</div>
            <select value={assetName} onChange={e => setAsset(e.target.value)}
              style={{ width: '100%' }}>
              {ASSET_OPTIONS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              Prices (comma or newline separated, min 12)
            </div>
            <textarea
              value={manPrices}
              onChange={e => setManPrices(e.target.value)}
              rows={7}
              placeholder="100.0, 101.2, 99.8, 102.1, 103.4…"
              style={{ width: '100%', resize: 'vertical', fontSize: 12 }}
            />
          </div>
          <button className="primary" onClick={calibrateManual} disabled={loading}
            style={{ width: '100%' }}>
            {loading ? 'Calibrating…' : 'Calibrate'}
          </button>

          {manResult && (
            <div style={{ marginTop: 16 }}>
              <MetricGrid cols={2}>
                <Metric label="p (noise)" value={manResult.p.toFixed(4)}
                  color={manResult.used_default ? 'var(--amber)' : 'var(--teal)'} />
                <Metric label="q (trend)" value={manResult.q.toFixed(4)} />
              </MetricGrid>
              <div style={{ display: 'flex', gap: 6 }}>
                <Badge variant={manResult.used_default ? 'warning' : 'success'}>
                  {manResult.used_default ? 'IRA default used' : 'From data'}
                </Badge>
                <Badge>{manResult.n_observations} log-returns</Badge>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* IRA Kenya defaults */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginBottom: 14 }}>
          <span style={{ fontWeight: 500, fontSize: 13 }}>IRA Kenya published parameters</span>
          <button onClick={loadDefaults} disabled={loading}>
            {loading ? 'Loading…' : 'Load defaults'}
          </button>
        </div>

        {defaults ? (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th style={{ textAlign: 'right' }}>μ (p.a.)</th>
                  <th style={{ textAlign: 'right' }}>σ (p.a.)</th>
                  <th style={{ textAlign: 'right' }}>p</th>
                  <th style={{ textAlign: 'right' }}>q</th>
                  <th style={{ textAlign: 'right' }}>α_p</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(defaults.parameters).map(([name, d]) => (
                  <tr key={name}>
                    <td style={{ fontWeight: 500 }}>{name}</td>
                    <td style={{ textAlign: 'right' }}>{(d.mu * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'right' }}>{(d.sigma * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{d.p.toFixed(3)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{d.q.toFixed(3)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{d.alpha_p.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 10 }}>
              Pooled α_p = {defaults.alpha_p_pooled} · rf = {(defaults.risk_free_rate * 100).toFixed(1)}% (CBK 91-day T-bill)
              <br />Source: {defaults.source}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
            Click "Load defaults" to view IRA Kenya calibrated parameters
          </div>
        )}
      </Card>
    </div>
  )
}
