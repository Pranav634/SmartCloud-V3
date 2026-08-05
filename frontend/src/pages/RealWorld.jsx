import React, { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, RadialBarChart, RadialBar,
} from 'recharts'
import { api, C, BG, Card, Badge, TT, GRID, axTick, fmt } from '../utils/shared'

// ── SLA Breach Gauge ────────────────────────────────────────────────────────
function SLAGauge({ forecast }) {
  if (!forecast) return null
  const p   = forecast.probability_pct || 0
  const lvl = forecast.level || 'low'
  const col = lvl === 'critical' ? C.red : lvl === 'high' ? C.orange : lvl === 'medium' ? C.yellow : C.green

  const radius = 54, cx = 70, cy = 70
  const startAngle = Math.PI * 0.8
  const endAngle   = Math.PI * 2.2
  const totalArc   = endAngle - startAngle
  const fillArc    = totalArc * (p / 100)

  const arcPath = (start, end, r) => {
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end)
    const large = end - start > Math.PI ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  return (
    <div style={{ background: BG.card, border: '1px solid #2d3148', borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#f1f5f9', marginBottom: 10 }}>
        SLA breach probability — next 5 minutes
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width={140} height={100} style={{ flexShrink: 0 }}>
          <path d={arcPath(startAngle, endAngle, radius)} fill="none" stroke="#252840" strokeWidth={10} strokeLinecap="round" />
          {p > 0 && (
            <path d={arcPath(startAngle, startAngle + fillArc, radius)} fill="none" stroke={col} strokeWidth={10} strokeLinecap="round" />
          )}
          <text x={cx} y={cy - 4} textAnchor="middle" style={{ fill: col, fontSize: 22, fontWeight: 700, fontFamily: 'system-ui' }}>
            {p.toFixed(0)}%
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" style={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'system-ui' }}>
            breach risk
          </text>
          <text x={cx} y={cy + 30} textAnchor="middle" style={{ fill: '#475569', fontSize: 9, fontFamily: 'system-ui' }}>
            proj. CPU {forecast.projected_cpu}%
          </text>
        </svg>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: col, textTransform: 'capitalize' }}>{lvl} risk</span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>{forecast.reason}</div>
          {lvl === 'critical' && (
            <div style={{ marginTop: 8, padding: '5px 8px', background: 'rgba(248,113,113,.12)', border: `1px solid ${C.red}`, borderRadius: 5, fontSize: 10, color: C.red }}>
              ⚡ Auto scale-out triggered
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Multi-Tenant Panel ──────────────────────────────────────────────────────
function TenantPanel({ tenants }) {
  if (!tenants?.tiers) return null
  const icons = { gold: '🥇', silver: '🥈', bronze: '🥉' }
  const cols  = { gold: C.yellow, silver: '#94a3b8', bronze: C.orange }

  return (
    <Card title="Multi-tenant SLA tiers — Gold / Silver / Bronze">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(tenants.tiers).map(([name, m]) => {
          const c = cols[name]
          const cfg = tenants.tier_config?.[name]
          return (
            <div key={name} style={{ background: `${c}10`, border: `1px solid ${c}30`, borderRadius: 8, padding: '9px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{icons[name]}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: c, textTransform: 'capitalize' }}>{name} tier</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{m.users?.toLocaleString()} users</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#f1f5f9' }}>{m.rt?.toFixed(0)} ms</span>
                  {m.breach
                    ? <Badge text="SLA BREACH" color={C.red} />
                    : <Badge text="Within SLA" color={C.green} />}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#94a3b8' }}>
                <span>SLA target: {cfg?.max_latency_ms}ms</span>
                <span>Revenue: ${m.revenue?.toLocaleString()}/mo</span>
              </div>
              {/* Latency bar */}
              <div style={{ marginTop: 6, height: 4, background: '#252840', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${Math.min((m.rt / (cfg?.max_latency_ms * 1.5)) * 100, 100)}%`,
                  background: m.breach ? C.red : c,
                  transition: 'width .5s ease',
                }} />
              </div>
            </div>
          )
        })}
        {tenants.revenue_at_risk > 0 && (
          <div style={{ padding: '7px 10px', background: 'rgba(248,113,113,.1)', border: `1px solid ${C.red}40`, borderRadius: 7, fontSize: 11, color: C.red }}>
            ⚠ Revenue at risk: ${tenants.revenue_at_risk.toFixed(0)}/mo from current breaches
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Geographic Load ─────────────────────────────────────────────────────────
function GeoPanel({ regions }) {
  if (!regions?.length) return null
  return (
    <Card title="Geographic load distribution — US · EU · Asia">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {regions.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 2, height: 36, background: r.color, borderRadius: 1, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#f1f5f9' }}>{r.name}</span>
                  <span style={{ fontSize: 9, color: '#475569' }}>{r.code}</span>
                  {r.is_peak && <Badge text="peak hour" color={r.color} />}
                </div>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                  {r.rps_contrib} rps · local {r.local_hour?.toFixed(0)}:00
                </span>
              </div>
              <div style={{ height: 5, background: '#252840', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${r.load_pct}%`, background: r.color, opacity: 0.7, transition: 'width .8s ease' }} />
              </div>
            </div>
            <div style={{ textAlign: 'right', minWidth: 36 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.load_pct?.toFixed(0)}%</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, color: '#475569', marginTop: 8 }}>
        Traffic follows local business hours. Asia peaks at 20:00 IST, US at 14:00 EST, EU at 10:00 CET.
      </div>
    </Card>
  )
}

// ── Incident Response ───────────────────────────────────────────────────────
function IncidentPanel({ incidents, stats }) {
  const sevColor = { P1: C.red, P2: C.orange, P3: C.yellow }
  const statusColor = { detecting: C.red, mitigating: C.orange, resolved: C.green }

  return (
    <Card title={`Self-healing incidents${stats?.open > 0 ? ` — ${stats.open} open` : ''}`}>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
          {[
            { l: 'Total', v: stats.total, c: C.blue },
            { l: 'Open', v: stats.open, c: C.red },
            { l: 'Resolved', v: stats.resolved, c: C.green },
            { l: 'Avg MTTR', v: `${stats.avg_mttr_seconds}s`, c: C.teal },
          ].map((s, i) => (
            <div key={i} style={{ background: `${s.c}10`, border: `1px solid ${s.c}25`, borderRadius: 7, padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 9, color: '#94a3b8' }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {(!incidents || incidents.length === 0) && (
          <div style={{ color: C.green, fontSize: 11, textAlign: 'center', padding: '16px 0' }}>✓ No incidents</div>
        )}
        {(incidents || []).map((inc, i) => {
          const sc = sevColor[inc.severity] || C.blue
          const stc = statusColor[inc.status] || C.blue
          return (
            <div key={i} style={{ background: BG.inner, border: `1px solid ${sc}30`, borderRadius: 8, padding: '9px 11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <Badge text={inc.severity} color={sc} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.title}</span>
                </div>
                <Badge text={inc.status} color={stc} />
              </div>
              {/* Playbook progress */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ height: 4, background: '#252840', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ height: '100%', background: stc, borderRadius: 2, width: `${inc.progress_pct}%`, transition: 'width .5s' }} />
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>
                  {inc.steps_done?.length > 0 ? `✓ ${inc.steps_done[inc.steps_done.length - 1]}` : 'Initialising...'}
                </div>
              </div>
              {inc.mttr_seconds && (
                <div style={{ fontSize: 9, color: C.green }}>Resolved in {inc.mttr_seconds}s</div>
              )}
              <div style={{ fontSize: 9, color: '#475569' }}>{inc.id}</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Cost Forecaster ─────────────────────────────────────────────────────────
function CostPanel({ report }) {
  if (!report) return null
  return (
    <Card title="Predictive cost forecasting vs reactive baseline">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        {[
          { l: 'Session cost', v: `$${report.session_cost?.toFixed(4)}`, c: C.blue, sub: 'SmartCloud' },
          { l: 'Reactive would cost', v: `$${report.reactive_cost?.toFixed(4)}`, c: C.red, sub: 'threshold-based' },
          { l: 'Session saved', v: `$${report.session_saved?.toFixed(4)}`, c: C.green, sub: 'this session' },
          { l: 'Efficiency', v: `${report.efficiency_pct?.toFixed(1)}%`, c: C.teal, sub: 'vs reactive' },
        ].map((s, i) => (
          <div key={i} style={{ background: `${s.c}10`, border: `1px solid ${s.c}25`, borderRadius: 7, padding: '7px 9px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 9, color: '#94a3b8' }}>{s.l}</div>
            <div style={{ fontSize: 9, color: '#475569' }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 10px', background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.2)', borderRadius: 7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
          <span style={{ color: '#94a3b8' }}>Projected monthly (SmartCloud)</span>
          <span style={{ color: C.green, fontWeight: 600 }}>${report.monthly_projected?.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
          <span style={{ color: '#94a3b8' }}>Projected monthly (reactive)</span>
          <span style={{ color: C.red }}>${report.monthly_reactive?.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, paddingTop: 5, borderTop: '1px solid rgba(52,211,153,.2)', marginTop: 3 }}>
          <span style={{ color: C.green, fontWeight: 500 }}>Monthly savings</span>
          <span style={{ color: C.green, fontWeight: 700 }}>${report.monthly_saved?.toFixed(2)}</span>
        </div>
      </div>
      <div style={{ fontSize: 9, color: '#475569', marginTop: 6 }}>
        Reactive baseline assumes threshold-triggered scaling with 2 extra instances always warm. SmartCloud scales to exact need.
      </div>
    </Card>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function RealWorld() {
  const [tenants,   setTenants]   = useState(null)
  const [geo,       setGeo]       = useState([])
  const [incidents, setIncidents] = useState([])
  const [incStats,  setIncStats]  = useState(null)
  const [slaForecast, setSlaForecast] = useState(null)
  const [cost,      setCost]      = useState(null)

  const load = useCallback(async () => {
    try {
      const [t, g, inc, sla, c] = await Promise.all([
        api.get('/api/realworld/tenants'),
        api.get('/api/realworld/geo'),
        api.get('/api/realworld/incidents'),
        api.get('/api/realworld/sla-forecast'),
        api.get('/api/realworld/cost'),
      ])
      setTenants(t)
      setGeo(g.regions || [])
      setIncidents(inc.incidents || [])
      setIncStats(inc.stats)
      setSlaForecast(sla.forecast)
      setCost(c.report)
    } catch {}
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 2500); return () => clearInterval(t) }, [load])

  return (
    <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>Real-World Operations</h1>
      <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>
        Multi-tenant SLA tiers · Geographic load · Self-healing incidents · Cost forecasting — the same capabilities used by Netflix, Uber, and AWS.
      </p>

      {/* Top strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <SLAGauge forecast={slaForecast} />
        <CostPanel report={cost} />
      </div>

      {/* Mid strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <TenantPanel tenants={tenants} />
        <GeoPanel regions={geo} />
      </div>

      {/* Incidents full width */}
      <IncidentPanel incidents={incidents} stats={incStats} />
    </div>
  )
}
