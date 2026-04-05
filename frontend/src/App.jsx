import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Dashboard   from './pages/Dashboard.jsx'
import Calibration from './pages/Calibration.jsx'
import Simulation  from './pages/Simulation.jsx'
import Reports     from './pages/Reports.jsx'
import Convergence from './pages/Convergence.jsx'

const NAV = [
  { to: '/',            label: 'Portfolio',    icon: '◈' },
  { to: '/calibration', label: 'Calibration',  icon: '⟳' },
  { to: '/simulation',  label: 'Simulation',   icon: '▶' },
  { to: '/convergence', label: 'Convergence',  icon: '∿' },
  { to: '/reports',     label: 'Reports',      icon: '☰' },
]

function Sidebar() {
  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: '#0f2744',
      display: 'flex', flexDirection: 'column', flexShrink: 0
    }}>
      <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '.01em' }}>
          (p,q)-CRR System
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 3 }}>
          IRA Kenya · RBS Phase II
        </div>
      </div>

      <nav style={{ flex: 1, padding: '10px 0' }}>
        {NAV.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 18px', fontSize: 13,
            color: isActive ? '#fff' : 'rgba(255,255,255,.55)',
            background: isActive ? 'rgba(29,158,117,.18)' : 'transparent',
            borderLeft: isActive ? '2px solid #1D9E75' : '2px solid transparent',
            textDecoration: 'none', transition: 'all .15s'
          })}>
            <span style={{ fontSize: 15, opacity: .8 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,.08)',
                    fontSize: 10, color: 'rgba(255,255,255,.3)', lineHeight: 1.6 }}>
        Oburu (2025)<br />
        Stochastic Models ID 267719680<br />
        JOOUST · Kenya
      </div>
    </aside>
  )
}

function TopBar() {
  const loc = useLocation()
  const page = NAV.find(n => n.to === loc.pathname)?.label || 'Dashboard'
  return (
    <div style={{
      height: 52, borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', background: 'var(--surface)', flexShrink: 0
    }}>
      <div style={{ fontWeight: 500, fontSize: 14 }}>{page}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 11, padding: '3px 8px', borderRadius: 4,
          background: 'var(--teal-lt)', color: 'var(--teal)', fontWeight: 500
        }}>Live — CBK + IRA Kenya 2023</span>
        <a href="/docs" target="_blank" style={{
          fontSize: 12, color: 'var(--muted)', textDecoration: 'none'
        }}>API docs ↗</a>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <TopBar />
          <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <Routes>
              <Route path="/"            element={<Dashboard />} />
              <Route path="/calibration" element={<Calibration />} />
              <Route path="/simulation"  element={<Simulation />} />
              <Route path="/convergence" element={<Convergence />} />
              <Route path="/reports"     element={<Reports />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}
