// Pages: ModelAnalytics, Reports, Config
import React, { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { api, C, BG, KPI, Card, TT, GRID, axTick, fmt, ago, fmtDT } from '../utils/shared'

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 3 — MODEL ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
export function ModelAnalytics() {
  const [predictions, setPredictions] = useState([])
  const [metrics,     setMetrics]     = useState([])
  const [patterns,    setPatterns]    = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const [p,m,pt] = await Promise.all([
          api.get('/api/predictions/?limit=100'),
          api.get('/api/metrics/?limit=100'),
          api.get('/api/patterns/'),
        ])
        setPredictions(p.data||[])
        setMetrics(m.data||[])
        setPatterns(pt.patterns||[])
      } catch {}
    }
    load(); const t=setInterval(load,3000); return ()=>clearInterval(t)
  }, [])

  const latest = predictions[predictions.length-1]

  // Accuracy: compare ensemble_cpu vs actual cpu at same timestamp
  const accuracy = predictions.slice(-30).map((p,i) => {
    const actual = metrics[metrics.length - 30 + i]?.cpu_utilization
    const err    = actual != null ? Math.abs(p.ensemble_cpu - actual) : null
    return {
      time:     fmt(p.timestamp),
      ensemble: p.ensemble_cpu,
      actual:   actual,
      error:    err != null ? +err.toFixed(2) : null,
      lstm_w:   +(p.lstm_weight*100).toFixed(1),
      arima_w:  +(p.arima_weight*100).toFixed(1),
      hw_w:     +(p.holtwinters_weight*100).toFixed(1),
    }
  })

  const avgErr = accuracy.filter(a=>a.error!=null).reduce((s,a,_,arr)=>s+a.error/arr.length,0)
  const avgConf= predictions.slice(-20).reduce((s,p,_,arr)=>s+p.confidence/arr.length,0)

  return (
    <div style={{padding:'14px 18px',overflowY:'auto',flex:1}}>
      <h1 style={{fontSize:18,fontWeight:600,color:'#f1f5f9',marginBottom:4}}>Model Analytics</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:14}}>Live performance of LSTM · ARIMA · Holt-Winters ensemble</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,marginBottom:14}}>
        <KPI label="Avg prediction error"  value={avgErr.toFixed(2)}  unit="% CPU" color={C.blue}   sub="lower is better"/>
        <KPI label="Avg confidence"        value={Math.round(avgConf*100)} unit="%" color={C.green}  sub="last 20 predictions"/>
        <KPI label="LSTM weight"           value={Math.round((latest?.lstm_weight||0)*100)} unit="%" color={C.purple} sub={`RMSE ${latest?.model_rmse?.lstm?.toFixed(1)||'—'}`}/>
        <KPI label="ARIMA weight"          value={Math.round((latest?.arima_weight||0)*100)} unit="%" color={C.blue}  sub={`RMSE ${latest?.model_rmse?.arima?.toFixed(1)||'—'}`}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
        <Card title="Predicted vs actual CPU — ensemble accuracy">
          <div style={{position:'relative',height:200}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracy} margin={{top:4,right:4,left:-22,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                <XAxis dataKey="time" tick={axTick} tickLine={false} interval="preserveStartEnd"/>
                <YAxis domain={[0,100]} tick={axTick} tickLine={false}/>
                <Tooltip content={<TT/>}/>
                <Line dataKey="ensemble" name="Predicted" stroke={C.purple} strokeWidth={2} dot={false} isAnimationActive={false}/>
                <Line dataKey="actual"   name="Actual"    stroke={C.blue}   strokeWidth={2} dot={false} isAnimationActive={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Live model weights — self-calibrating">
          <div style={{position:'relative',height:200}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accuracy.slice(-20)} margin={{top:4,right:4,left:-22,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                <XAxis dataKey="time" tick={axTick} tickLine={false} interval="preserveStartEnd"/>
                <YAxis domain={[0,100]} tick={axTick} tickLine={false}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="lstm_w"  name="LSTM %"  stackId="a" fill={C.purple} isAnimationActive={false}/>
                <Bar dataKey="arima_w" name="ARIMA %"  stackId="a" fill={C.blue}   isAnimationActive={false}/>
                <Bar dataKey="hw_w"    name="H-W %"   stackId="a" fill={C.teal}   isAnimationActive={false}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Prediction error over time (MAE per tick)">
        <div style={{position:'relative',height:120}}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={accuracy} margin={{top:4,right:4,left:-22,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
              <XAxis dataKey="time" tick={axTick} tickLine={false} interval="preserveStartEnd"/>
              <YAxis domain={[0,'auto']} tick={axTick} tickLine={false}/>
              <Tooltip content={<TT/>}/>
              <Line dataKey="error" name="Error %" stroke={C.orange} strokeWidth={1.8} dot={false} isAnimationActive={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div style={{marginTop:10}}>
        <Card title="FFT pattern library — cosine similarity matching">
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8}}>
            {patterns.map((p,i)=>(
              <div key={i} style={{background:BG.inner,borderRadius:7,padding:'8px 10px',border:'1px solid #2d3148'}}>
                <div style={{fontSize:11,fontWeight:500,color:'#f1f5f9',marginBottom:2}}>{p.name.replace(/_/g,' ')}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginBottom:4}}>{p.description}</div>
                <div style={{fontSize:10,color:C.teal}}>seen {p.seen_count}× in session</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 4 — REPORTS & HISTORY
// ─────────────────────────────────────────────────────────────────────────────
export function Reports({ health }) {
  const [scaling,  setScaling]  = useState([])
  const [anomalies,setAnomalies]= useState([])
  const [events,   setEvents]   = useState([])
  const [tab,      setTab]      = useState('scaling')

  useEffect(() => {
    const load = async () => {
      try {
        const [s,a,e] = await Promise.all([
          api.get('/api/scaling/events?limit=50'),
          api.get('/api/anomalies/?limit=50'),
          api.get('/api/events/events'),
        ])
        setScaling(s.data||[])
        setAnomalies(a.data||[])
        setEvents(e.events||[])
      } catch {}
    }
    load(); const t=setInterval(load,5000); return ()=>clearInterval(t)
  }, [])

  const stats = health?.stats || {}
  const scaleOut  = scaling.filter(e=>e.action==='scale_out').length
  const scaleIn   = scaling.filter(e=>e.action==='scale_in').length
  const carbonH   = scaling.filter(e=>e.action==='carbon_hold').length
  const eventP    = scaling.filter(e=>e.triggered_by==='event').length

  return (
    <div style={{padding:'14px 18px',overflowY:'auto',flex:1}}>
      <h1 style={{fontSize:18,fontWeight:600,color:'#f1f5f9',marginBottom:4}}>Reports & Session History</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:14}}>Full audit log of all scaling decisions, anomalies, and event executions.</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:8,marginBottom:14}}>
        <KPI label="Scale outs"       value={scaleOut}                           color={C.green}  small/>
        <KPI label="Scale ins"        value={scaleIn}                            color={C.blue}   small/>
        <KPI label="Carbon holds"     value={carbonH}                            color={C.orange} small/>
        <KPI label="Event-triggered"  value={eventP}                             color={C.purple} small/>
        <KPI label="CO₂ saved"        value={`${(stats.estimated_co2_saved_g||0).toFixed(0)}g`} color={C.teal} small/>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:12}}>
        {[['scaling','Scaling Log'],['anomalies','Anomaly Log'],['events','Event Log']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:500,
              background:tab===k?'rgba(79,142,247,.2)':'transparent',
              color:tab===k?C.blue:'#94a3b8',border:`1px solid ${tab===k?C.blue:'#2d3148'}`}}>
            {l}
          </button>
        ))}
      </div>

      {tab==='scaling'&&(
        <div style={{background:BG.card,border:'1px solid #2d3148',borderRadius:10,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#252840'}}>
                {['Time','Action','From','To','Triggered by','SLA risk','Reason'].map(h=>(
                  <th key={h} style={{padding:'8px 10px',textAlign:'left',fontSize:10,color:'#94a3b8',fontWeight:500,borderBottom:'1px solid #2d3148'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...scaling].reverse().map((e,i)=>{
                const cols={scale_out:C.green,scale_in:C.blue,carbon_hold:C.orange,event_prewarm:C.purple}
                const c=cols[e.action]||C.gray
                return (
                  <tr key={i} style={{borderBottom:'1px solid rgba(45,49,72,.5)'}}>
                    <td style={{padding:'6px 10px',fontSize:10,color:'#475569'}}>{ago(e.timestamp)}</td>
                    <td style={{padding:'6px 10px'}}><span style={{fontSize:10,color:c,fontWeight:600}}>{e.action}</span></td>
                    <td style={{padding:'6px 10px',fontSize:10,color:'#94a3b8'}}>{e.from_instances}</td>
                    <td style={{padding:'6px 10px',fontSize:10,color:'#f1f5f9',fontWeight:500}}>{e.to_instances}</td>
                    <td style={{padding:'6px 10px',fontSize:10,color:'#94a3b8'}}>{e.triggered_by}</td>
                    <td style={{padding:'6px 10px',fontSize:10,color:C.red}}>{Math.round((e.sla_risk||0)*100)}%</td>
                    <td style={{padding:'6px 10px',fontSize:10,color:'#475569',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.reason}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab==='anomalies'&&(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {anomalies.length===0&&<div style={{color:'#475569',textAlign:'center',padding:'30px',fontSize:12}}>No anomalies recorded</div>}
          {[...anomalies].reverse().map((a,i)=>{
            const c=a.severity==='high'?C.red:a.severity==='medium'?C.yellow:C.blue
            return (
              <div key={i} style={{background:BG.inner,border:`1px solid ${c}30`,borderRadius:8,padding:'10px 12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <span style={{color:c,fontWeight:600,fontSize:12}}>{a.root_cause?.replace(/_/g,' ')}</span>
                    <span style={{fontSize:10,padding:'1px 6px',borderRadius:4,background:`${c}20`,color:c}}>{a.severity}</span>
                    {a.resolved&&<span style={{fontSize:10,color:C.green}}>✓ resolved</span>}
                  </div>
                  <span style={{fontSize:10,color:'#475569'}}>{ago(a.timestamp)}</span>
                </div>
                <div style={{fontSize:11,color:'#94a3b8'}}>{a.explanation}</div>
                <div style={{fontSize:10,color:'#475569',marginTop:3}}>
                  CPU {a.metrics?.cpu}% · Mem {a.metrics?.mem}% · Rps {a.metrics?.rps} · RT {a.metrics?.rt}ms · Z={a.z_score}σ
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab==='events'&&(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {events.length===0&&<div style={{color:'#475569',textAlign:'center',padding:'30px',fontSize:12}}>No events scheduled</div>}
          {events.map((e,i)=>{
            const sc={scheduled:C.blue,prewarming:C.orange,active:C.green,cooldown:C.yellow,completed:'#475569'}[e.status]||C.blue
            return (
              <div key={i} style={{background:BG.inner,border:'1px solid #2d3148',borderRadius:8,padding:'10px 12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <div style={{fontSize:12,fontWeight:500,color:'#f1f5f9'}}>{e.name}</div>
                  <span style={{fontSize:10,padding:'1px 6px',borderRadius:4,background:`${sc}20`,color:sc}}>{e.status}</span>
                </div>
                <div style={{display:'flex',gap:16,fontSize:10,color:'#94a3b8'}}>
                  <span>Start: {fmtDT(e.start_time)}</span>
                  <span>Duration: {e.duration_minutes}m</span>
                  <span>Peak: {e.peak_instances} inst.</span>
                  <span>Category: {e.category}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 5 — CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
export function Config({ health, onRefresh }) {
  const [weights,   setWeights]   = useState({sla:.5,cost:.3,carbon:.2})
  const [sla,       setSla]       = useState(50)
  const [cost,      setCost]      = useState(30)
  const [carbon,    setCarbon]    = useState(20)
  const [manTarget, setManTarget] = useState(2)
  const [feedback,  setFeedback]  = useState('')
  const [scenario,  setScenario]  = useState('normal')

  useEffect(() => {
    api.get('/api/config/weights').then(w=>{
      setWeights(w)
      setSla(Math.round(w.sla*100))
      setCost(Math.round(w.cost*100))
      setCarbon(Math.round(w.carbon*100))
    }).catch(()=>{})
    setManTarget(health?.current_instances||2)
    setScenario(health?.current_scenario||'normal')
  }, [health])

  const applyWeights = async () => {
    const t=sla+cost+carbon
    await api.post('/api/config/weights',{sla:sla/t,cost:cost/t,carbon:carbon/t})
    setFeedback('Weights updated!'); setTimeout(()=>setFeedback(''),3000)
    if(onRefresh) onRefresh()
  }

  const applyScale = async () => {
    await api.post('/api/scaling/manual',{target_instances:manTarget})
    setFeedback(`Scaled to ${manTarget}`); setTimeout(()=>setFeedback(''),3000)
    if(onRefresh) onRefresh()
  }

  const SCENARIOS=['normal','flash_crowd','idle','ramp_up','memory_stress']

  const slider = (label,val,setVal,color,desc) => (
    <div style={{marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:12,color,fontWeight:500}}>{label}</span>
        <span style={{fontSize:12,color:'#94a3b8'}}>{val}%</span>
      </div>
      <input type="range" min={5} max={90} step={5} value={val} onChange={e=>setVal(+e.target.value)}
        style={{width:'100%',accentColor:color,marginBottom:4}}/>
      <div style={{fontSize:10,color:'#475569'}}>{desc}</div>
    </div>
  )

  return (
    <div style={{padding:'14px 18px',overflowY:'auto',flex:1}}>
      <h1 style={{fontSize:18,fontWeight:600,color:'#f1f5f9',marginBottom:4}}>Configuration</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:14}}>Adjust scaling priorities, override instances, and control simulation scenarios.</p>

      {feedback&&<div style={{background:'rgba(52,211,153,.12)',border:`1px solid ${C.green}`,borderRadius:7,padding:'8px 12px',marginBottom:12,fontSize:12,color:C.green}}>✓ {feedback}</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>

        {/* Tradeoff sliders */}
        <Card title="SLA-Cost-Carbon tradeoff weights">
          {slider('SLA protection', sla, setSla, C.red,
            'Higher = scale out aggressively to protect response time. Lower = tolerate CPU spikes.')}
          {slider('Cost optimisation', cost, setCost, C.yellow,
            'Higher = scale in quickly when CPU is low. Lower = keep buffer capacity.')}
          {slider('Carbon awareness', carbon, setCarbon, C.green,
            'Higher = defer scale-outs when grid is dirty. Lower = ignore carbon signal.')}
          <div style={{padding:10,background:'rgba(79,142,247,.06)',borderRadius:7,border:'1px solid rgba(79,142,247,.15)',marginBottom:10}}>
            <div style={{fontSize:10,color:'#94a3b8'}}>
              Normalised weights: SLA {Math.round(sla/(sla+cost+carbon)*100)}% · Cost {Math.round(cost/(sla+cost+carbon)*100)}% · Carbon {Math.round(carbon/(sla+cost+carbon)*100)}%
            </div>
          </div>
          <button onClick={applyWeights}
            style={{width:'100%',padding:'8px',background:'rgba(79,142,247,.15)',color:C.blue,border:`1px solid ${C.blue}`,borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer'}}>
            Apply weights
          </button>
        </Card>

        <div style={{display:'flex',flexDirection:'column',gap:12}}>

          {/* Manual scaling */}
          <Card title="Manual instance override">
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <button onClick={()=>setManTarget(t=>Math.max(1,t-1))}
                style={{width:32,height:32,borderRadius:6,background:'#252840',color:'#f1f5f9',border:'1px solid #2d3148',cursor:'pointer',fontSize:18}}>−</button>
              <div style={{flex:1,textAlign:'center'}}>
                <span style={{fontSize:32,fontWeight:700,color:C.blue}}>{manTarget}</span>
                <span style={{fontSize:12,color:'#94a3b8',marginLeft:6}}>instances</span>
              </div>
              <button onClick={()=>setManTarget(t=>Math.min(20,t+1))}
                style={{width:32,height:32,borderRadius:6,background:'#252840',color:'#f1f5f9',border:'1px solid #2d3148',cursor:'pointer',fontSize:18}}>+</button>
            </div>
            <input type="range" min={1} max={20} step={1} value={manTarget}
              onChange={e=>setManTarget(+e.target.value)}
              style={{width:'100%',accentColor:C.blue,marginBottom:8}}/>
            <button onClick={applyScale}
              style={{width:'100%',padding:'7px',background:'rgba(79,142,247,.15)',color:C.blue,border:`1px solid ${C.blue}`,borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer'}}>
              {manTarget>=(health?.current_instances||2)?`↑ Scale to ${manTarget}`:`↓ Scale to ${manTarget}`}
            </button>
            <div style={{fontSize:10,color:'#475569',marginTop:6}}>Auto-scaling resumes after manual override on next prediction cycle.</div>
          </Card>

          {/* Scenario control */}
          <Card title="Workload scenario simulator">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              {SCENARIOS.map(s=>(
                <button key={s} onClick={()=>{api.post(`/api/scaling/scenario/${s}`,{});setScenario(s)}}
                  style={{padding:'7px',borderRadius:6,cursor:'pointer',fontSize:11,
                    background:scenario===s?'rgba(79,142,247,.2)':BG.inner,
                    color:scenario===s?C.blue:'#94a3b8',
                    border:`1px solid ${scenario===s?C.blue:'#2d3148'}`}}>
                  {s.replace(/_/g,' ')}
                </button>
              ))}
            </div>
            <div style={{fontSize:10,color:'#475569',marginTop:8}}>
              Active: <span style={{color:C.blue}}>{scenario}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
