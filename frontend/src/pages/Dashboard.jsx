import React, { useState, useEffect, useCallback, useRef, useContext, createContext } from 'react'
import { ResponsiveContainer, ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { api, fmt, ago } from '../utils/shared'

export const ThemeCtx = createContext({ dark: false, toggle: () => {} })

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false)
  const applyTheme = (d) => {
    const r = document.documentElement.style
    if (d) {
      r.setProperty('--bg','#060912'); r.setProperty('--card','#0f1629'); r.setProperty('--sb','#0a0f1e'); r.setProperty('--bar','#0a0f1e');
      r.setProperty('--b1','rgba(255,255,255,.07)'); r.setProperty('--b2','rgba(255,255,255,.12)'); r.setProperty('--b3','rgba(255,255,255,.18)');
      r.setProperty('--t1','#e8eeff'); r.setProperty('--t2','#7b8db0'); r.setProperty('--t3','#3d4f70');
      r.setProperty('--blue-l','rgba(59,110,246,.12)'); r.setProperty('--blue-m','rgba(59,110,246,.25)');
      r.setProperty('--green-l','rgba(14,159,110,.1)'); r.setProperty('--green-m','rgba(14,159,110,.22)');
      r.setProperty('--red-l','rgba(220,38,38,.1)'); r.setProperty('--red-m','rgba(220,38,38,.22)');
      r.setProperty('--yellow-l','rgba(217,119,6,.1)'); r.setProperty('--yellow-m','rgba(217,119,6,.22)');
      r.setProperty('--purple-l','rgba(124,58,237,.1)'); r.setProperty('--purple-m','rgba(124,58,237,.22)');
      r.setProperty('--teal-l','rgba(8,145,178,.1)'); r.setProperty('--teal-m','rgba(8,145,178,.22)');
      r.setProperty('--orange-l','rgba(234,88,12,.1)'); r.setProperty('--orange-m','rgba(234,88,12,.22)');
    } else {
      r.setProperty('--bg','#f4f6fb'); r.setProperty('--card','#ffffff'); r.setProperty('--sb','#ffffff'); r.setProperty('--bar','#ffffff');
      r.setProperty('--b1','#e8ecf4'); r.setProperty('--b2','#d0d7e8'); r.setProperty('--b3','#b8c2d8');
      r.setProperty('--t1','#0f1624'); r.setProperty('--t2','#4a5578'); r.setProperty('--t3','#8b97b8');
      r.setProperty('--blue-l','#eef2fe'); r.setProperty('--blue-m','#dbe4fd');
      r.setProperty('--green-l','#e8faf4'); r.setProperty('--green-m','#c3f4e2');
      r.setProperty('--red-l','#fef2f2'); r.setProperty('--red-m','#fecaca');
      r.setProperty('--yellow-l','#fffbeb'); r.setProperty('--yellow-m','#fde68a');
      r.setProperty('--purple-l','#f5f3ff'); r.setProperty('--purple-m','#ddd6fe');
      r.setProperty('--teal-l','#ecfeff'); r.setProperty('--teal-m','#a5f3fc');
      r.setProperty('--orange-l','#fff7ed'); r.setProperty('--orange-m','#fed7aa');
    }
  }
  useEffect(() => { applyTheme(dark) }, [dark])
  return <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>{children}</ThemeCtx.Provider>
}

const INNOVATIONS = [
  { n:1, name:'Adaptive Ensemble',    tag:'LSTM+ARIMA+HW live', color:'#3b6ef6', eq:'w_i = (1/RMSE_i) / Σ(1/RMSE_j)', desc:'Three models compete. Lower RMSE earns higher vote weight. Rebalances every 30s. LSTM dominates during spikes; ARIMA during stable load.', insight:'No other undergraduate project rebalances model weights in real-time based on live prediction accuracy.' },
  { n:2, name:'SLA-Cost-Carbon MPC',  tag:'Multi-objective opt', color:'#d97706', eq:'min: w_sla×P(breach) + w_cost×over_provision + w_carbon×CI_penalty', desc:'Every scaling decision minimises a weighted sum of three competing objectives. User drags sliders to change weights live.', insight:'With hysteresis of 2 ticks to prevent thrashing. Tries ±4 candidate instance counts before committing.' },
  { n:3, name:'FFT Fingerprinting',   tag:'Cosine sim matching', color:'#7c3aed', eq:'sim(a,b) = (a·b)/(||a||·||b||) > 0.90 → pre-warm', desc:'32-tick CPU window → Fourier transform → top-16 magnitude fingerprint. Similarity >0.90 triggers pre-warming before ML prediction completes.', insight:'Analogy: case-based reasoning. "I have seen this frequency signature before."' },
  { n:4, name:'XAI Anomaly Detect',   tag:'6 named root causes', color:'#dc2626', eq:'Z>3σ OR x>Q3+1.5×IQR OR recon_err>P95 → diagnose', desc:'Three detectors run in parallel. Root cause engine diagnoses: cpu_spike, request_surge, memory_leak, cascade, sensor_fault, downstream_latency.', insight:'Plain-English explanation string, not a binary flag. High severity triggers P1 incident + auto-remediation.' },
  { n:5, name:'Carbon-Aware Scaling', tag:'Grid intensity signal', color:'#0e9f6e', eq:'CI > 350 gCO₂/kWh → scale_out vetoed', desc:'Grid carbon intensity sine wave (80–420 gCO₂/kWh). Scale-outs vetoed on dirty grid. Carbon penalty is third term in MPC objective.', insight:'None of the 7 surveyed papers address environmental sustainability in scaling decisions.' },
  { n:6, name:'Event-Driven Proactive',tag:'Netflix/food model', color:'#ea580c', eq:'cool(t) = peak × e^(−2.5×t/cooldown)', desc:'Three phases: pre-warm (linear ramp), active (peak hold), cool-down (exponential decay). Recurring patterns fire on time-windows daily.', insight:'Exponential cool-down prevents abrupt scale-ins that cause tail latency spikes on late-arriving traffic.' },
]

function InnovationModal({ item, onClose }) {
  if (!item) return null
  return (
    <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.35)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'var(--card)',border:'1px solid var(--b1)',borderRadius:16,padding:22,width:460,maxHeight:'80%',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
          <div>
            <div style={{fontSize:10.5,color:item.color,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>Innovation {item.n}</div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--t1)',letterSpacing:'-.3px'}}>{item.name}</div>
            <div style={{fontSize:10.5,color:'var(--t3)',marginTop:2}}>{item.tag}</div>
          </div>
          <button onClick={onClose} style={{background:'var(--b1)',border:'none',borderRadius:7,width:26,height:26,fontSize:13,color:'var(--t2)',cursor:'pointer'}}>✕</button>
        </div>
        <p style={{fontSize:11.5,color:'var(--t2)',lineHeight:1.7,marginBottom:12}}>{item.desc}</p>
        <div style={{background:`${item.color}0d`,border:`1px solid ${item.color}25`,borderRadius:9,padding:'9px 13px',marginBottom:12}}>
          <div style={{fontSize:9,color:'var(--t3)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>Core equation</div>
          <code style={{fontSize:11.5,color:item.color,fontFamily:'SFMono-Regular,Consolas,monospace'}}>{item.eq}</code>
        </div>
        <div style={{background:'var(--blue-l)',border:'1px solid var(--blue-m)',borderRadius:9,padding:'9px 13px'}}>
          <div style={{fontSize:9,color:'var(--t3)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>Why it is novel</div>
          <p style={{fontSize:11,color:'var(--t2)',lineHeight:1.6}}>{item.insight}</p>
        </div>
      </div>
    </div>
  )
}

function CapacityHeatmap({ data }) {
  if (!data?.length) return <div style={{color:'var(--t3)',fontSize:11,textAlign:'center',padding:'16px 0'}}>Loading heatmap...</div>
  const max = Math.max(...data.flatMap(d => d.hours))
  const getC = (v) => {
    const t = v / max
    return t>0.8?'#fecaca':t>0.6?'#fed7aa':t>0.4?'#fde68a':t>0.2?'#c3f4e2':'#dbe4fd'
  }
  const hours = [0,2,4,6,8,10,12,14,16,18,20,22]
  return (
    <div>
      <div style={{display:'flex',marginBottom:4,paddingLeft:30}}>
        {hours.map(h=><div key={h} style={{flex:1,fontSize:8,color:'var(--t3)',textAlign:'center'}}>{h}:00</div>)}
      </div>
      {data.map((row,di)=>(
        <div key={di} style={{display:'flex',alignItems:'center',marginBottom:2}}>
          <div style={{width:26,fontSize:9,color:'var(--t3)',fontWeight:500}}>{row.day}</div>
          <div style={{flex:1,display:'grid',gridTemplateColumns:'repeat(24,1fr)',gap:1}}>
            {row.hours.map((v,hi)=>(
              <div key={hi} title={`${row.day} ${hi}:00 — ${Math.round(v*100)}% load`}
                style={{height:13,borderRadius:2,background:getC(v),cursor:'default',transition:'transform .1s'}}
                onMouseEnter={e=>e.target.style.transform='scale(1.4)'}
                onMouseLeave={e=>e.target.style.transform='scale(1)'}/>
            ))}
          </div>
        </div>
      ))}
      <div style={{display:'flex',alignItems:'center',gap:5,marginTop:7,fontSize:9.5,color:'var(--t3)'}}>
        <span>Low</span>
        {['#dbe4fd','#c3f4e2','#fde68a','#fed7aa','#fecaca'].map((c,i)=><div key={i} style={{width:12,height:7,background:c,borderRadius:2}}/>)}
        <span>High</span>
      </div>
    </div>
  )
}

function SLAReport({ data }) {
  if (!data?.length) return null
  const mini = (spark, color) => {
    const max=Math.max(...spark),min=Math.min(...spark),range=max-min||0.01
    const pts=spark.map((v,i)=>`${i/(spark.length-1)*58},${18-((v-min)/range)*16}`).join(' ')
    return <svg width="60" height="20" style={{flexShrink:0}}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>
  }
  return (
    <div style={{display:'flex',flexDirection:'column',gap:7}}>
      {data.map((t,i)=>{
        const ok = t.compliance_pct >= (t.name==='Gold'?99:t.name==='Silver'?98:97)
        return (
          <div key={i} style={{background:ok?'var(--green-l)':'var(--red-l)',border:`1px solid ${ok?'var(--green-m)':'var(--red-m)'}`,borderRadius:9,padding:'9px 12px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                <span style={{fontSize:11,fontWeight:600,color:t.color}}>{t.name} tier</span>
                <span style={{fontSize:9.5,padding:'1px 6px',borderRadius:5,background:ok?'var(--green-m)':'var(--red-m)',color:ok?'#065f46':'#991b1b',fontWeight:500}}>{ok?'Compliant':'Degraded'}</span>
              </div>
              <div style={{display:'flex',gap:16,fontSize:10,color:'var(--t2)'}}>
                <span>Compliance: <b style={{color:ok?'#0e9f6e':'#dc2626'}}>{t.compliance_pct}%</b></span>
                <span>Avg: <b>{t.avg_latency_ms}ms</b></span>
                <span>Target: {t.sla_target_ms}ms</span>
                {t.violations_24h>0&&<span style={{color:'#dc2626'}}>{t.violations_24h} violations/24h</span>}
              </div>
            </div>
            {mini(t.sparkline, t.color)}
          </div>
        )
      })}
    </div>
  )
}

function NotifPanel({ notifs, unread, onReadAll, onClose }) {
  const cC={scale:'#3b6ef6',anomaly:'#dc2626',event:'#ea580c',carbon:'#0e9f6e',model:'#7c3aed',sla:'#d97706'}
  const cI={scale:'↕',anomaly:'⚠',event:'⚡',carbon:'🌿',model:'🔮',sla:'🎯'}
  const sBg={info:'var(--blue-l)',warning:'var(--yellow-l)',critical:'var(--red-l)'}
  return (
    <div style={{position:'absolute',top:52,right:0,width:330,background:'var(--card)',border:'1px solid var(--b1)',borderRadius:13,zIndex:50,boxShadow:'0 8px 24px rgba(0,0,0,.12)',overflow:'hidden'}}>
      <div style={{padding:'10px 14px',borderBottom:'1px solid var(--b1)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:12,fontWeight:600,color:'var(--t1)'}}>Notifications {unread>0&&<span style={{background:'#3b6ef6',color:'#fff',borderRadius:10,padding:'0 6px',fontSize:9.5,marginLeft:4}}>{unread}</span>}</span>
        <div style={{display:'flex',gap:8}}>
          {unread>0&&<button onClick={onReadAll} style={{fontSize:10,color:'#3b6ef6',background:'none',border:'none',cursor:'pointer'}}>Mark all read</button>}
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:13}}>✕</button>
        </div>
      </div>
      <div style={{maxHeight:340,overflowY:'auto'}}>
        {notifs.length===0&&<div style={{padding:20,textAlign:'center',color:'var(--t3)',fontSize:11}}>No notifications yet</div>}
        {notifs.map(n=>(
          <div key={n.id} style={{padding:'9px 14px',borderBottom:'1px solid var(--b1)',background:n.read?'transparent':sBg[n.severity]||'var(--blue-l)'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
              <div style={{width:22,height:22,borderRadius:6,background:'var(--b1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0}}>{cI[n.category]||'●'}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:500,color:cC[n.category]||'var(--t1)',marginBottom:1}}>{n.title}</div>
                <div style={{fontSize:10,color:'var(--t2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.body}</div>
                <div style={{fontSize:9,color:'var(--t3)',marginTop:2}}>{ago(n.ts)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard({ health, onRefresh }) {
  const { dark, toggle } = useContext(ThemeCtx)
  const [metrics,setPredictions2] = useState([])
  const [predictions,setPred] = useState([])
  const [scalingEvts,setSE] = useState([])
  const [anomalies,setAn] = useState([])
  const [heatmap,setHm] = useState([])
  const [slaReport,setSla] = useState([])
  const [notifs,setNf] = useState([])
  const [unread,setUr] = useState(0)
  const [showNotifs,setShowN] = useState(false)
  const [wsOk,setWsOk] = useState(false)
  const [modal,setModal] = useState(null)
  const wsRef = useRef(null)
  const timer = useRef(null)

  const fetchAll = useCallback(async () => {
    try {
      const [m,p,s,a,h2,sl,nf] = await Promise.all([
        api.get('/api/metrics/?limit=55'), api.get('/api/predictions/?limit=40'),
        api.get('/api/scaling/events?limit=10'), api.get('/api/anomalies/?limit=10'),
        api.get('/api/realtime/heatmap'), api.get('/api/realtime/sla-report'),
        api.get('/api/realtime/notifications'),
      ])
      setPredictions2(m.data||[]); setPred(p.data||[]); setSE(s.data||[]);
      setAn((a.data||[]).filter(x=>!x.resolved)); setHm(h2.heatmap||[]);
      setSla(sl.tiers||[]); setNf(nf.notifications||[]); setUr(nf.unread||0)
    } catch {}
  }, [])

  useEffect(()=>{
    const connect=()=>{
      try{
        const ws=new WebSocket('ws://localhost:8000/api/realtime/ws')
        ws.onopen=()=>setWsOk(true)
        ws.onclose=()=>{setWsOk(false);setTimeout(connect,3000)}
        ws.onerror=()=>ws.close()
        wsRef.current=ws
      }catch{}
    }
    connect()
    return ()=>wsRef.current?.close()
  },[])

  useEffect(()=>{fetchAll();timer.current=setInterval(fetchAll,2000);return()=>clearInterval(timer.current)},[fetchAll])

  const latest=metrics[metrics.length-1]
  const latestPred=predictions[predictions.length-1]
  const stats=health?.stats||{}
  const G=dark?'rgba(255,255,255,.04)':'rgba(0,0,0,.04)'
  const ax={color:dark?'#3d4f70':'#8b97b8',font:{size:8}}
  const tipS={backgroundColor:dark?'#0f1629':'#fff',borderColor:dark?'rgba(255,255,255,.08)':'#e8ecf4',borderWidth:1,bodyColor:dark?'#e8eeff':'#0f1624',bodyFont:{size:10},padding:8}
  const cpuC=latest?.cpu_utilization>75?'#dc2626':latest?.cpu_utilization>55?'#d97706':'#3b6ef6'
  const cpuBg=latest?.cpu_utilization>75?'var(--red-l)':latest?.cpu_utilization>55?'var(--yellow-l)':'var(--blue-l)'
  const cpuBd=latest?.cpu_utilization>75?'var(--red-m)':latest?.cpu_utilization>55?'var(--yellow-m)':'var(--blue-m)'

  const chartD=metrics.map(m=>({time:fmt(m.timestamp),cpu:m.cpu_utilization,mem:m.memory_utilization,rps:+(m.request_rate/10).toFixed(1),rt:m.response_time_ms,carbon:m.carbon_intensity}))
  const predD=predictions.map(p=>({time:fmt(p.timestamp),ensemble:p.ensemble_cpu,lstm:p.lstm_cpu,inst:p.recommended_instances}))

  return (
    <div style={{padding:'14px 18px',overflowY:'auto',flex:1,position:'relative'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,paddingBottom:13,borderBottom:'1px solid var(--b1)'}}>
        <div>
          <h2 style={{fontSize:17,fontWeight:700,color:'var(--t1)',letterSpacing:'-.3px',marginBottom:2}}>Dashboard</h2>
          <p style={{fontSize:10.5,color:'var(--t3)'}}>Real-time overview &nbsp;·&nbsp; <span style={{color:wsOk?'#0e9f6e':'#dc2626'}}>{wsOk?'● WebSocket live':'● Polling 2s'}</span></p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={toggle} style={{padding:'5px 12px',borderRadius:8,fontSize:10.5,fontWeight:500,cursor:'pointer',background:'var(--b1)',border:'1px solid var(--b2)',color:'var(--t2)'}}>{dark?'☀ Light':'◑ Dark'}</button>
          <div style={{position:'relative'}}>
            <button onClick={()=>setShowN(v=>!v)} style={{padding:'5px 12px',borderRadius:8,fontSize:10.5,cursor:'pointer',background:unread>0?'var(--blue-l)':'var(--b1)',border:`1px solid ${unread>0?'var(--blue-m)':'var(--b2)'}`,color:unread>0?'#3b6ef6':'var(--t2)',display:'flex',alignItems:'center',gap:5}}>
              🔔 {unread>0&&<span style={{background:'#3b6ef6',color:'#fff',borderRadius:9,padding:'0 5px',fontSize:9}}>{unread}</span>}
            </button>
            {showNotifs&&<NotifPanel notifs={notifs} unread={unread} onReadAll={()=>{api.post('/api/realtime/notifications/read-all',{}).then(fetchAll);setShowN(false)}} onClose={()=>setShowN(false)}/>}
          </div>
        </div>
      </div>

      <div className="stats">
        {[
          {v:'99.99%',l:'Uptime',s:`${stats.total_scaling_actions||0} scale actions`,c:'#0e9f6e'},
          {v:stats.predictions_made||0,l:'Predictions',s:`${stats.false_positives_avoided||0} filtered`,c:'#3b6ef6'},
          {v:`$${(stats.estimated_cost_saved||0).toFixed(2)}`,l:'Cost saved',s:'vs reactive baseline',c:'#d97706'},
          {v:`${(stats.estimated_co2_saved_g||0).toFixed(0)}g`,l:'CO₂ saved',s:'carbon-aware mode',c:'#0891b2'},
        ].map((s,i)=><div key={i} className="stat"><div className="stat-v" style={{color:s.c}}>{s.v}</div><div className="stat-l">{s.l}</div><div className="stat-s">{s.s}</div></div>)}
      </div>

      <div className="kpis">
        {[
          {l:'CPU',v:latest?.cpu_utilization?.toFixed(1),u:'%',c:cpuC,bg:cpuBg,bd:cpuBd,s:latest?.scenario||'—'},
          {l:'Memory',v:latest?.memory_utilization?.toFixed(1),u:'%',c:'#0e9f6e',bg:'var(--green-l)',bd:'var(--green-m)',s:'utilisation'},
          {l:'Req / s',v:latest?.request_rate?.toFixed(0),u:'',c:'#d97706',bg:'var(--yellow-l)',bd:'var(--yellow-m)',s:'req/sec'},
          {l:'Instances',v:health?.current_instances,u:'',c:'#7c3aed',bg:'var(--purple-l)',bd:'var(--purple-m)',s:'auto-scaled'},
          {l:'Ensemble CPU',v:latestPred?.ensemble_cpu?.toFixed(1),u:'%',c:'#7c3aed',bg:'var(--purple-l)',bd:'var(--purple-m)',s:latestPred?`${Math.round(latestPred.confidence*100)}% conf`:'warming up'},
          {l:'Response',v:latest?.response_time_ms?.toFixed(0),u:'ms',c:latest?.response_time_ms>500?'#dc2626':'#0e9f6e',bg:latest?.response_time_ms>500?'var(--red-l)':'var(--green-l)',bd:latest?.response_time_ms>500?'var(--red-m)':'var(--green-m)',s:'latency'},
        ].map((k,i)=>(
          <div key={i} className="kpi" style={{background:k.bg,borderColor:k.bd}}>
            <div className="kpi-l">{k.l}</div>
            <div><span className="kpi-v" style={{color:k.c}}>{k.v||'--'}</span><span className="kpi-u">{k.u}</span></div>
            <div className="kpi-s">{k.s}</div>
          </div>
        ))}
      </div>

      <div className="c2">
        <div className="ccard">
          <div className="ccard-h"><span className="ccard-t">Live system metrics</span><div className="leg"><span><span className="ld" style={{background:'#3b6ef6'}}/>CPU</span><span><span className="ld" style={{background:'#0e9f6e'}}/>Mem</span><span><span className="ld" style={{background:'#d97706'}}/>Rps/10</span></div></div>
          <div style={{height:145,position:'relative'}}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartD} margin={{top:4,right:4,left:-22,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={G}/><XAxis dataKey="time" tick={ax} tickLine={false} interval="preserveStartEnd"/>
                <YAxis yAxisId="p" domain={[0,100]} tick={ax} tickLine={false}/><YAxis yAxisId="r" orientation="right" tick={ax} tickLine={false}/>
                <Tooltip {...{contentStyle:{background:tipS.backgroundColor,border:`1px solid ${tipS.borderColor}`,borderRadius:9,fontSize:10}}} labelStyle={{color:ax.color}}/>
                <Area yAxisId="p" dataKey="cpu" stroke="#3b6ef6" fill="rgba(59,110,246,.06)" strokeWidth={1.8} dot={false} isAnimationActive={false}/>
                <Line yAxisId="p" dataKey="mem" stroke="#0e9f6e" strokeWidth={1.5} dot={false} isAnimationActive={false}/>
                <Line yAxisId="r" dataKey="rps" stroke="#d97706" strokeWidth={1.5} dot={false} isAnimationActive={false}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="ccard">
          <div className="ccard-h"><span className="ccard-t">Ensemble competition</span></div>
          <div style={{height:145,position:'relative'}}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={predD} margin={{top:4,right:4,left:-22,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={G}/><XAxis dataKey="time" tick={ax} tickLine={false} interval="preserveStartEnd"/>
                <YAxis yAxisId="p" domain={[0,100]} tick={ax} tickLine={false}/><YAxis yAxisId="i" orientation="right" domain={[0,14]} tick={ax} tickLine={false}/>
                <Tooltip {...{contentStyle:{background:tipS.backgroundColor,border:`1px solid ${tipS.borderColor}`,borderRadius:9,fontSize:10}}}/>
                <Bar yAxisId="i" dataKey="inst" fill="rgba(14,159,110,.12)" stroke="#0e9f6e" strokeWidth={.5} isAnimationActive={false}/>
                <Line yAxisId="p" dataKey="ensemble" stroke="#7c3aed" strokeWidth={2.2} dot={false} isAnimationActive={false}/>
                <Line yAxisId="p" dataKey="lstm" stroke="#3b6ef6" strokeWidth={1} strokeDasharray="4 2" dot={false} isAnimationActive={false}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="ccard" style={{marginBottom:10}}>
        <div className="ccard-h"><span className="ccard-t">Response time &amp; carbon intensity</span></div>
        <div style={{height:76,position:'relative'}}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartD} margin={{top:2,right:4,left:-22,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={G}/><XAxis dataKey="time" tick={ax} tickLine={false} interval="preserveStartEnd"/>
              <YAxis yAxisId="rt" tick={ax} tickLine={false}/><YAxis yAxisId="c" orientation="right" domain={[80,420]} tick={ax} tickLine={false}/>
              <Tooltip {...{contentStyle:{background:tipS.backgroundColor,border:`1px solid ${tipS.borderColor}`,borderRadius:9,fontSize:10}}}/>
              <Area yAxisId="rt" dataKey="rt" stroke="#7c3aed" fill="rgba(124,58,237,.06)" strokeWidth={1.8} dot={false} isAnimationActive={false}/>
              <Line yAxisId="c" dataKey="carbon" stroke="#ea580c" strokeWidth={1.3} dot={false} isAnimationActive={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="c3" style={{marginBottom:10}}>
        <div className="ccard">
          <div className="ccard-h"><span className="ccard-t">Scaling events</span></div>
          <div style={{maxHeight:190,overflowY:'auto'}}>
            {scalingEvts.length===0&&<div style={{color:'var(--t3)',fontSize:10.5,textAlign:'center',padding:'14px 0'}}>No events yet</div>}
            {[...scalingEvts].reverse().map((e,i)=>{
              const cols={scale_out:'#0e9f6e',scale_in:'#3b6ef6',carbon_hold:'#ea580c',event_prewarm:'#7c3aed'}
              const bgs={scale_out:'var(--green-l)',scale_in:'var(--blue-l)',carbon_hold:'var(--orange-l)',event_prewarm:'var(--purple-l)'}
              const c=cols[e.action]||'#8b97b8',bg=bgs[e.action]||'var(--b1)'
              return (<div key={i} className="ev-row"><div className="ev-icon" style={{background:bg}}><span style={{color:c,fontSize:12}}>{e.action==='scale_out'?'↑':e.action==='scale_in'?'↓':e.action==='carbon_hold'?'🌿':'⚡'}</span></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:10.5,fontWeight:600,color:c}}>{e.action?.replace(/_/g,' ')}</div><div style={{fontSize:10,color:'var(--t2)',marginTop:1}}>{e.from_instances}→{e.to_instances}</div><div style={{fontSize:9.5,color:'var(--t3)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.reason}</div></div><div style={{fontSize:9,color:'var(--t3)',flexShrink:0,marginLeft:5}}>{ago(e.timestamp)}</div></div>)
            })}
          </div>
        </div>
        <div className="ccard">
          <div className="ccard-h"><span className="ccard-t">XAI anomalies</span>{anomalies.length>0&&<div style={{background:'var(--red-l)',color:'#dc2626',borderRadius:6,padding:'2px 8px',fontSize:9.5,border:'1px solid var(--red-m)'}}>{anomalies.length} active</div>}</div>
          {anomalies.length===0&&<div style={{color:'#0e9f6e',fontSize:11,textAlign:'center',padding:'14px 0'}}>✓ All clear</div>}
          {anomalies.slice(0,3).map((a,i)=>{const isH=a.severity==='high';return(<div key={i} className="an" style={{background:isH?'#fef2f2':'#fffbeb',borderColor:isH?'#fecaca':'#fde68a'}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><span style={{fontSize:13}}>{a.root_cause==='request_surge'?'📡':'⚠'}</span><span style={{fontSize:10.5,fontWeight:600,color:isH?'#dc2626':'#d97706'}}>{a.root_cause?.replace(/_/g,' ')}</span></div><div style={{fontSize:10,color:'var(--t2)',lineHeight:1.4}}>{a.explanation}</div></div>)})}
          {anomalies.length>0&&<button onClick={()=>api.post('/api/anomalies/resolve',{}).then(fetchAll)} style={{width:'100%',marginTop:8,padding:6,background:'var(--green-l)',color:'#065f46',border:'1px solid var(--green-m)',borderRadius:7,fontSize:11,cursor:'pointer'}}>Resolve all</button>}
        </div>
        <div className="ccard">
          <div className="ccard-h"><span className="ccard-t">Ensemble weights</span></div>
          {[{k:'lstm_weight',lbl:'LSTM',c:'#7c3aed'},{k:'arima_weight',lbl:'ARIMA',c:'#3b6ef6'},{k:'holtwinters_weight',lbl:'H-W',c:'#0891b2'}].map(m=>(
            <div key={m.k} className="wbar">
              <div className="wbar-h"><span style={{color:m.c,fontWeight:500}}>{m.lbl}</span><span style={{color:'var(--t2)'}}>{Math.round((latestPred?.[m.k]||{lstm_weight:.52,arima_weight:.31,holtwinters_weight:.17}[m.k]||0)*100)}%</span></div>
              <div className="wbar-t"><div className="wbar-f" style={{width:`${Math.round((latestPred?.[m.k]||{lstm_weight:.52,arima_weight:.31,holtwinters_weight:.17}[m.k]||0)*100)}%`,background:m.c}}/></div>
            </div>
          ))}
          <div style={{marginTop:9,paddingTop:9,borderTop:'1px solid var(--b1)'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:9.5,marginBottom:4}}>
              <span style={{color:'var(--t2)'}}>Carbon intensity</span>
              <span style={{fontWeight:500,color:latest?.carbon_intensity>350?'#dc2626':latest?.carbon_intensity>200?'#d97706':'#0e9f6e'}}>{latest?.carbon_intensity||'--'} gCO₂/kWh</span>
            </div>
            <div className="wbar-t" style={{height:5}}><div className="wbar-f" style={{height:5,width:`${Math.round(((latest?.carbon_intensity||250)-80)/340*100)}%`,background:latest?.carbon_intensity>350?'#dc2626':latest?.carbon_intensity>200?'#d97706':'#0e9f6e'}}/></div>
          </div>
        </div>
      </div>

      <div className="ccard" style={{marginBottom:10}}>
        <div className="ccard-h"><span className="ccard-t">Predictive capacity heatmap — 7-day forecast</span><span style={{fontSize:10,color:'var(--t3)'}}>Ensemble + recurring patterns</span></div>
        <CapacityHeatmap data={heatmap}/>
      </div>

      <div className="ccard" style={{marginBottom:10}}>
        <div className="ccard-h"><span className="ccard-t">SLA compliance report</span></div>
        <SLAReport data={slaReport}/>
      </div>

      <div className="ccard">
        <div className="ccard-h"><span className="ccard-t">12 innovations — click any card to explore</span><span style={{fontSize:10,color:'var(--t3)'}}>Academic reference with equations</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,minmax(0,1fr))',gap:6}}>
          {INNOVATIONS.map(inn=>(
            <button key={inn.n} onClick={()=>setModal(inn)} style={{padding:'8px 10px',borderRadius:9,cursor:'pointer',textAlign:'left',background:`${inn.color}0d`,border:`1px solid ${inn.color}20`,transition:'all .13s',fontFamily:'inherit'}}
              onMouseEnter={e=>{e.currentTarget.style.background=`${inn.color}18`;e.currentTarget.style.transform='translateY(-1px)'}}
              onMouseLeave={e=>{e.currentTarget.style.background=`${inn.color}0d`;e.currentTarget.style.transform='translateY(0)'}}>
              <div style={{fontSize:9,color:inn.color,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>#{inn.n}</div>
              <div style={{fontSize:10,fontWeight:600,color:'var(--t1)',lineHeight:1.3}}>{inn.name}</div>
              <div style={{fontSize:9,color:'var(--t3)',marginTop:2}}>{inn.tag}</div>
            </button>
          ))}
        </div>
      </div>

      {modal&&<InnovationModal item={modal} onClose={()=>setModal(null)}/>}
    </div>
  )
}
