import React, { useState, useEffect, useCallback } from 'react'
import { api, C, BG, Card, Badge, fmtDT, CATEGORY_COLORS, CATEGORY_ICONS } from '../utils/shared'

const STATUS_COLOR = {scheduled:C.blue,prewarming:C.orange,active:C.green,cooldown:C.yellow,completed:'#475569'}
const CATEGORIES   = ['streaming','food_delivery','ecommerce','sports','saas','custom']

function EventTimeline({ event }) {
  const phases = [
    { label:'Pre-warm', dur:`${event.prewarm_minutes}m before`, inst:event.prewarm_instances, color:C.orange },
    { label:'Peak',     dur:`${event.duration_minutes}m`,       inst:event.peak_instances,    color:C.green  },
    { label:'Cool-down',dur:`${event.cooldown_minutes}m after`, inst:Math.round(event.peak_instances*0.4), color:C.blue },
    { label:'Normal',   dur:'ML resumes',                       inst:'auto',                  color:C.gray   },
  ]
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:0,marginTop:8,height:60}}>
      {phases.map((p,i)=>{
        const heights={0:0.55,1:1.0,2:0.35,3:0.2}
        const h=Math.round(60*heights[i])
        return (
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{fontSize:9,color:'#94a3b8',textAlign:'center',lineHeight:1.2,minHeight:24,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
              <div style={{fontWeight:500,color:p.color}}>{typeof p.inst==='number'?p.inst+' inst':p.inst}</div>
              <div style={{color:'#475569'}}>{p.dur}</div>
            </div>
            <div style={{width:'90%',height:h,background:p.color,opacity:0.7,borderRadius:'3px 3px 0 0'}}/>
            <div style={{fontSize:9,color:'#94a3b8'}}>{p.label}</div>
          </div>
        )
      })}
    </div>
  )
}

function AddEventForm({ onAdd, onCancel }) {
  const now = new Date()
  const defaultStart = new Date(now.getTime() + 30*60000).toISOString().slice(0,16)
  const [form, setForm] = useState({
    name:'', category:'streaming', description:'',
    start_time_iso: defaultStart, duration_minutes:120,
    expected_cpu_pct:85, prewarm_minutes:30,
    prewarm_instances:6, peak_instances:12, cooldown_minutes:20,
  })
  const [loading, setLoading] = useState(false)

  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const submit = async () => {
    if(!form.name||!form.start_time_iso) return
    setLoading(true)
    try {
      const iso = new Date(form.start_time_iso).toISOString()
      await api.post('/api/events/events', {...form, start_time_iso:iso,
        duration_minutes:+form.duration_minutes, expected_cpu_pct:+form.expected_cpu_pct,
        prewarm_minutes:+form.prewarm_minutes, prewarm_instances:+form.prewarm_instances,
        peak_instances:+form.peak_instances, cooldown_minutes:+form.cooldown_minutes})
      onAdd()
    } catch(e) { alert('Failed to create event: '+e.message) }
    setLoading(false)
  }

  const inp = (label,key,type='text',opts={}) => (
    <div style={{marginBottom:10}}>
      <label style={{display:'block',fontSize:10,color:'#94a3b8',marginBottom:3}}>{label}</label>
      {type==='select'?(
        <select value={form[key]} onChange={e=>set(key,e.target.value)}
          style={{width:'100%',background:'#252840',border:'1px solid #2d3148',borderRadius:6,padding:'6px 8px',color:'#f1f5f9',fontSize:12}}>
          {opts.options?.map(o=><option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
        </select>
      ):(
        <input type={type} value={form[key]} onChange={e=>set(key,type==='number'?+e.target.value:e.target.value)}
          min={opts.min} max={opts.max}
          style={{width:'100%',background:'#252840',border:'1px solid #2d3148',borderRadius:6,padding:'6px 8px',color:'#f1f5f9',fontSize:12}}/>
      )}
    </div>
  )

  return (
    <div style={{background:BG.inner,border:'1px solid #2d3148',borderRadius:10,padding:16,marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:600,color:'#f1f5f9',marginBottom:14}}>Schedule new event</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div>
          {inp('Event name','name')}
          {inp('Category','category','select',{options:CATEGORIES})}
          {inp('Description','description')}
          {inp('Start time','start_time_iso','datetime-local')}
          {inp('Duration (minutes)','duration_minutes','number',{min:10,max:1440})}
          {inp('Expected peak CPU %','expected_cpu_pct','number',{min:1,max:100})}
        </div>
        <div>
          {inp('Pre-warm minutes before','prewarm_minutes','number',{min:5,max:120})}
          {inp('Pre-warm instances','prewarm_instances','number',{min:1,max:20})}
          {inp('Peak instances','peak_instances','number',{min:1,max:20})}
          {inp('Cool-down minutes after','cooldown_minutes','number',{min:5,max:120})}
          <div style={{marginTop:6,padding:10,background:'rgba(79,142,247,.08)',borderRadius:7,border:'1px solid rgba(79,142,247,.2)'}}>
            <div style={{fontSize:10,color:C.blue,fontWeight:500,marginBottom:4}}>Resource plan</div>
            <div style={{fontSize:10,color:'#94a3b8'}}>
              T-{form.prewarm_minutes}m: ramp to <b style={{color:C.orange}}>{form.prewarm_instances} inst</b><br/>
              T+0: hold <b style={{color:C.green}}>{form.peak_instances} inst</b> for {form.duration_minutes}m<br/>
              T+{form.duration_minutes}m: cool-down over {form.cooldown_minutes}m<br/>
              Waste prevention: ML can scale down if load underperforms.
            </div>
          </div>
        </div>
      </div>
      <div style={{display:'flex',gap:8,marginTop:10}}>
        <button onClick={submit} disabled={loading}
          style={{flex:1,padding:'8px',background:'rgba(52,211,153,.15)',color:C.green,border:`1px solid ${C.green}`,borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer'}}>
          {loading?'Scheduling...':'Schedule Event'}
        </button>
        <button onClick={onCancel}
          style={{padding:'8px 16px',background:'rgba(71,85,105,.2)',color:'#94a3b8',border:'1px solid #2d3148',borderRadius:7,fontSize:12,cursor:'pointer'}}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function PatternCard({ p }) {
  const cc = CATEGORY_COLORS[p.category]||C.blue
  const icon = CATEGORY_ICONS[p.category]||'📅'
  return (
    <div style={{background:BG.inner,border:`1px solid ${cc}30`,borderRadius:8,padding:'10px 12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
        <span style={{fontSize:16}}>{icon}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:500,color:'#f1f5f9'}}>{p.name}</div>
          <div style={{fontSize:9,color:cc}}>{p.category.replace(/_/g,' ')}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:10,color:C.green,fontWeight:500}}>{p.min_instances}–{p.max_instances} inst</div>
          <div style={{fontSize:9,color:'#475569'}}>{Math.round(p.expected_load_pct*100)}% load</div>
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#94a3b8'}}>
        <span>⏰ {p.time_range}</span>
        <span>📅 {p.days_label}</span>
      </div>
    </div>
  )
}

export default function EventPlanner() {
  const [events,   setEvents]   = useState([])
  const [patterns, setPatterns] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [filter,   setFilter]   = useState('all')

  const load = useCallback(async () => {
    try {
      const [ev,pt] = await Promise.all([api.get('/api/events/events'), api.get('/api/events/patterns')])
      setEvents(ev.events||[])
      setPatterns(pt.patterns||[])
    } catch {}
  }, [])

  useEffect(() => { load(); const t=setInterval(load,3000); return ()=>clearInterval(t) }, [load])

  const filtered = events.filter(e => filter==='all' || e.status===filter)

  return (
    <div style={{padding:'14px 18px',overflowY:'auto',flex:1}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div>
          <h1 style={{fontSize:18,fontWeight:600,color:'#f1f5f9',marginBottom:2}}>Event-Driven Proactive Scaling</h1>
          <p style={{fontSize:11,color:'#94a3b8'}}>
            Schedule capacity for Netflix premieres, lunch rushes, flash sales — system pre-warms before the event hits.
          </p>
        </div>
        <button onClick={()=>setShowForm(f=>!f)}
          style={{padding:'8px 16px',background:'rgba(79,142,247,.15)',color:C.blue,border:`1px solid ${C.blue}`,borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>
          + Schedule Event
        </button>
      </div>

      {showForm && <AddEventForm onAdd={()=>{setShowForm(false);load()}} onCancel={()=>setShowForm(false)}/>}

      {/* How it works */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,marginBottom:16}}>
        {[
          {icon:'📺',title:'Netflix scenario',desc:'Show premieres at 8PM. Pre-warm at 7:30PM to 12 instances. Hold during peak. Gradual cool-down after.'},
          {icon:'🍔',title:'Food delivery',desc:'Lunch rush 12–2PM daily. Dinner rush 7–9:30PM. Auto-scale per recurring pattern.'},
          {icon:'🛒',title:'Flash sale',desc:'Midnight sale starts. Pre-warm 30 min before. Scale to 14 instances at T=0. Scale in after.'},
          {icon:'🌱',title:'Waste prevention',desc:'Never over-provision. If actual load is lower than expected, ML trims instances during the event.'},
        ].map((c,i)=>(
          <div key={i} style={{background:BG.inner,border:'1px solid #2d3148',borderRadius:9,padding:'10px 12px'}}>
            <div style={{fontSize:20,marginBottom:6}}>{c.icon}</div>
            <div style={{fontSize:11,fontWeight:500,color:'#f1f5f9',marginBottom:4}}>{c.title}</div>
            <div style={{fontSize:10,color:'#94a3b8',lineHeight:1.5}}>{c.desc}</div>
          </div>
        ))}
      </div>

      {/* Events section */}
      <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:14}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <h2 style={{fontSize:14,fontWeight:500,color:'#f1f5f9'}}>Scheduled events</h2>
            <div style={{display:'flex',gap:5}}>
              {['all','scheduled','prewarming','active','cooldown','completed'].map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  style={{fontSize:9,padding:'2px 7px',borderRadius:4,cursor:'pointer',
                    background:filter===f?'rgba(79,142,247,.2)':'transparent',
                    color:filter===f?C.blue:'#475569',border:`1px solid ${filter===f?C.blue:'#2d3148'}`}}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filtered.length===0&&(
            <div style={{textAlign:'center',padding:'30px',color:'#475569',fontSize:12,border:'1px dashed #2d3148',borderRadius:10}}>
              No events — click "+ Schedule Event" to add one
            </div>
          )}

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {filtered.map(ev=>{
              const cc  = CATEGORY_COLORS[ev.category]||C.blue
              const icon= CATEGORY_ICONS[ev.category]||'📅'
              const sc  = STATUS_COLOR[ev.status]||C.blue
              return (
                <div key={ev.id} style={{background:BG.inner,border:`1px solid ${cc}30`,borderRadius:10,padding:'12px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:20}}>{icon}</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:'#f1f5f9'}}>{ev.name}</div>
                        <div style={{fontSize:10,color:'#475569',marginTop:1}}>{ev.description}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <Badge text={ev.status} color={sc}/>
                      <Badge text={ev.category.replace(/_/g,' ')} color={cc}/>
                      <button onClick={()=>api.del(`/api/events/events/${ev.id}`).then(load)}
                        style={{padding:'2px 8px',borderRadius:4,cursor:'pointer',background:'rgba(248,113,113,.1)',color:C.red,border:`1px solid ${C.red}40`,fontSize:10}}>
                        ✕
                      </button>
                    </div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:8}}>
                    {[
                      {l:'Starts',v:fmtDT(ev.start_time)},
                      {l:'Duration',v:`${ev.duration_minutes} min`},
                      {l:'Pre-warm',v:`${ev.prewarm_minutes}m → ${ev.prewarm_instances} inst`},
                      {l:'Peak',v:`${ev.peak_instances} instances`},
                    ].map((s,i)=>(
                      <div key={i} style={{background:'rgba(255,255,255,.03)',borderRadius:6,padding:'5px 7px'}}>
                        <div style={{fontSize:9,color:'#475569'}}>{s.l}</div>
                        <div style={{fontSize:10,color:'#f1f5f9',fontWeight:500}}>{s.v}</div>
                      </div>
                    ))}
                  </div>

                  <EventTimeline event={ev}/>

                  {ev.mins_until_start > 0 && ev.mins_until_start < 120 && (
                    <div style={{marginTop:8,fontSize:10,color:C.orange}}>
                      ⏰ Pre-warming begins in {Math.round(ev.mins_until_start - ev.prewarm_minutes)} min
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Recurring patterns */}
        <div>
          <h2 style={{fontSize:14,fontWeight:500,color:'#f1f5f9',marginBottom:10}}>Recurring patterns</h2>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {patterns.map((p,i)=><PatternCard key={i} p={p}/>)}
          </div>
          <div style={{marginTop:10,padding:10,background:'rgba(52,211,153,.06)',border:'1px solid rgba(52,211,153,.2)',borderRadius:8}}>
            <div style={{fontSize:10,color:C.green,fontWeight:500,marginBottom:4}}>How patterns work</div>
            <div style={{fontSize:10,color:'#94a3b8',lineHeight:1.6}}>
              Patterns trigger automatically every day at the configured time. The system pre-scales to the minimum instance count before the window opens and maintains it throughout. When the window closes, ML takes over and scales down gradually.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
