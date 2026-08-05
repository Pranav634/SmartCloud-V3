import React from 'react'
import { NavLink } from 'react-router-dom'

const NAV = [
  { section: 'Overview' },
  { to:'/',          label:'Dashboard',    sub:'Live overview',
    bg:'#eef2fe', ic:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3b6ef6" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { section: 'Scaling' },
  { to:'/events',    label:'Events',       sub:'Pre-warm planner',
    bg:'#fff7ed', ic:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { to:'/realworld', label:'Operations',   sub:'Tenants · Geo · SLA',
    bg:'#e8faf4', ic:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0e9f6e" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { section: 'Intelligence' },
  { to:'/models',    label:'Models',       sub:'Ensemble analytics',
    bg:'#f5f3ff', ic:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { to:'/assistant', label:'AI Assistant', sub:'Ask your system',
    bg:'#ecfeff', ic:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { section: 'System' },
  { to:'/reports',   label:'Reports',      sub:'History & audit',
    bg:'#fffbeb', ic:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { to:'/config',    label:'Config',       sub:'Weights & settings',
    bg:'#f8f9fd', ic:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8b97b8" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
]

export default function Sidebar({ health }) {
  const sc = health?.status==='healthy' ? '#0e9f6e' : health?.status==='warning' ? '#d97706' : '#dc2626'
  const scBg = health?.status==='healthy' ? '#e8faf4' : health?.status==='warning' ? '#fffbeb' : '#fef2f2'
  const scBd = health?.status==='healthy' ? '#c3f4e2' : health?.status==='warning' ? '#fde68a' : '#fecaca'
  return (
    <aside className="sidebar">
      <div className="sb-top">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div className="sb-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <div>
            <div className="sb-name">SmartCloud</div>
            <div className="sb-ver">v3 · 12 innovations</div>
          </div>
        </div>
      </div>
      <nav className="sb-nav">
        {NAV.map((n,i) => n.section
          ? <div key={i} className="sb-sect">{n.section}</div>
          : (
            <NavLink key={n.to} to={n.to} end={n.to==='/'} className={({isActive})=>`ni${isActive?' active':''}`}>
              {({isActive}) => (<>
                <div className="ni-ic" style={{background:isActive?n.bg:'#f8f9fd'}}>{n.ic}</div>
                <div>
                  <div className="ni-lbl">{n.label}</div>
                  <div className="ni-sub">{n.sub}</div>
                </div>
              </>)}
            </NavLink>
          )
        )}
      </nav>
      <div className="sb-foot">
        <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:scBg,border:`1px solid ${scBd}`,marginBottom:6}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:sc,animation:'pulse 2s infinite'}}/>
          <span style={{fontSize:10,color:sc,fontWeight:500}}>{health?.status||'connecting'} · Live</span>
        </div>
        <div style={{fontSize:9.5,color:'#8b97b8'}}>{health?.current_instances||'—'} instances · {health?.current_scenario||'—'}</div>
      </div>
    </aside>
  )
}
