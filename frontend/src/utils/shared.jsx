const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const C = {
  blue:'#3b6ef6', green:'#0e9f6e', yellow:'#d97706',
  red:'#dc2626', purple:'#7c3aed', teal:'#0891b2',
  orange:'#ea580c', pink:'#db2777', gray:'#6b7280',
}
export const BG = {
  page:'#f4f6fb', card:'#ffffff', inner:'#f8f9fd',
  sidebar:'#ffffff', topbar:'#ffffff',
}
export const TINTED = {
  blue:  {bg:'#eef2fe', border:'#dbe4fd', text:'#1e40af'},
  green: {bg:'#e8faf4', border:'#c3f4e2', text:'#065f46'},
  yellow:{bg:'#fffbeb', border:'#fde68a', text:'#78350f'},
  red:   {bg:'#fef2f2', border:'#fecaca', text:'#991b1b'},
  purple:{bg:'#f5f3ff', border:'#ddd6fe', text:'#4c1d95'},
  teal:  {bg:'#ecfeff', border:'#a5f3fc', text:'#164e63'},
  orange:{bg:'#fff7ed', border:'#fed7aa', text:'#7c2d12'},
}
export const BORDERS = {t1:'#e8ecf4', t2:'#d0d7e8', t3:'#b8c2d8'}
export const TEXT    = {t1:'#0f1624', t2:'#4a5578', t3:'#8b97b8'}

export const CATEGORY_COLORS = {
  streaming:'#7c3aed', food_delivery:'#ea580c', ecommerce:'#d97706',
  sports:'#0e9f6e', saas:'#3b6ef6', maintenance:'#6b7280', custom:'#0891b2',
}
export const CATEGORY_ICONS = {
  streaming:'📺', food_delivery:'🍔', ecommerce:'🛒',
  sports:'⚽', saas:'💼', maintenance:'🔧', custom:'⚡',
}

export const api = {
  get:  path => fetch(`${BASE}${path}`).then(r=>r.json()),
  post: (path,body) => fetch(`${BASE}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()),
  del:  path => fetch(`${BASE}${path}`,{method:'DELETE'}).then(r=>r.json()),
  patch:(path,body={}) => fetch(`${BASE}${path}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()),
}

export const fmt   = ts => ts ? new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : ''
export const fmtDT = ts => ts ? new Date(ts).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : ''
export const ago   = ts => { const d=(Date.now()-new Date(ts))/1000; return d<60?`${Math.round(d)}s ago`:d<3600?`${Math.round(d/60)}m ago`:`${Math.round(d/3600)}h ago` }

export function KPI({label,value,unit='',color=C.blue,tint,sub,small=false}) {
  const t = tint || 'blue'
  const tc = TINTED[t] || {bg:`${color}10`,border:`${color}30`,text:color}
  return (
    <div style={{background:tc.bg,border:`1px solid ${tc.border}`,borderRadius:11,padding:small?'9px 11px':'11px 13px'}}>
      <div style={{fontSize:9,color:TEXT.t3,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5,fontWeight:500}}>{label}</div>
      <div style={{display:'flex',alignItems:'baseline',gap:3}}>
        <span style={{fontSize:small?20:23,fontWeight:800,color:tc.text,lineHeight:1,letterSpacing:'-0.8px'}}>{value??'—'}</span>
        {unit&&<span style={{fontSize:10,color:TEXT.t2}}>{unit}</span>}
      </div>
      {sub&&<div style={{fontSize:9,color:TEXT.t3,marginTop:3}}>{sub}</div>}
    </div>
  )
}

export function Card({title,children,style={}}) {
  return (
    <div className="ccard" style={style}>
      {title&&<div className="ccard-h"><span className="ccard-t">{title}</span></div>}
      {children}
    </div>
  )
}

export function Badge({text,tint='blue'}) {
  const tc = TINTED[tint] || TINTED.blue
  return (
    <span style={{fontSize:9.5,padding:'2px 8px',borderRadius:6,background:tc.bg,color:tc.text,border:`1px solid ${tc.border}`,fontWeight:500}}>
      {text}
    </span>
  )
}

export const TT = ({active,payload,label}) => {
  if(!active||!payload?.length) return null
  return (
    <div style={{background:'#fff',border:'1px solid #e8ecf4',borderRadius:9,padding:'8px 12px',fontSize:11,boxShadow:'0 4px 12px rgba(0,0,0,.08)'}}>
      <div style={{color:TEXT.t3,marginBottom:4,fontSize:10}}>{label}</div>
      {payload.map(p=>(
        <div key={p.dataKey} style={{color:p.color,marginBottom:2}}>
          {p.name}: <b>{typeof p.value==='number'?p.value.toFixed(1):p.value}</b>
        </div>
      ))}
    </div>
  )
}

export const GRID = 'rgba(0,0,0,.04)'
export const axTick = {color:TEXT.t3,font:{size:8}}
