import React, { useState, useRef, useEffect } from 'react'
import { api, C, BG } from '../utils/shared'

const SUGGESTED = [
  "Why did we scale out at the last event?",
  "Are we over-provisioned right now?",
  "Which model is most accurate today?",
  "What caused the last anomaly?",
  "How much have we saved vs reactive scaling?",
  "What's our SLA breach risk right now?",
  "Which tenant tier is most at risk?",
  "When is the next scheduled event?",
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f8ef7,#a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end',
        }}>⚡</div>
      )}
      <div style={{
        maxWidth: '75%', padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'rgba(79,142,247,.2)' : BG.inner,
        border: `1px solid ${isUser ? 'rgba(79,142,247,.3)' : '#2d3148'}`,
        fontSize: 13, color: '#f1f5f9', lineHeight: 1.6,
      }}>
        {msg.content}
        {msg.loading && <span style={{ display: 'inline-block', marginLeft: 6, animation: 'blink 1s infinite' }}>▋</span>}
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your SmartCloud AI Ops assistant. I have full visibility into your system — metrics, predictions, anomalies, incidents, costs, and events. Ask me anything about what's happening right now.",
    }
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const buildContext = async () => {
    try {
      const [h, m, p, s, a, cost, sla, inc] = await Promise.all([
        api.get('/api/health/'),
        api.get('/api/metrics/?limit=10'),
        api.get('/api/predictions/?limit=5'),
        api.get('/api/scaling/events?limit=5'),
        api.get('/api/anomalies/?limit=5'),
        api.get('/api/realworld/cost'),
        api.get('/api/realworld/sla-forecast'),
        api.get('/api/realworld/incidents'),
      ])
      const latest = m.data?.[m.data.length - 1]
      const latestPred = p.data?.[p.data.length - 1]
      return `
SMARTCLOUD LIVE SYSTEM CONTEXT (as of ${new Date().toLocaleTimeString()}):

System status: ${h.status} | Scenario: ${h.current_scenario} | Active instances: ${h.current_instances}

Latest metrics:
- CPU: ${latest?.cpu_utilization?.toFixed(1)}% | Memory: ${latest?.memory_utilization?.toFixed(1)}% | Req/s: ${latest?.request_rate?.toFixed(0)} | Response: ${latest?.response_time_ms?.toFixed(0)}ms | Carbon: ${latest?.carbon_intensity} gCO2/kWh

Latest ensemble prediction:
- Predicted CPU: ${latestPred?.ensemble_cpu?.toFixed(1)}% | Recommended instances: ${latestPred?.recommended_instances} | Confidence: ${Math.round((latestPred?.confidence||0)*100)}%
- LSTM weight: ${Math.round((latestPred?.lstm_weight||0)*100)}% | ARIMA weight: ${Math.round((latestPred?.arima_weight||0)*100)}% | HW weight: ${Math.round((latestPred?.holtwinters_weight||0)*100)}%
- RMSE: LSTM ${latestPred?.model_rmse?.lstm?.toFixed(1)} | ARIMA ${latestPred?.model_rmse?.arima?.toFixed(1)}

Recent scaling events (last 5):
${(s.data||[]).slice(-5).map(e => `- ${e.action}: ${e.from_instances}→${e.to_instances} via ${e.triggered_by} (${e.reason})`).join('\n')}

Recent anomalies (last 5):
${(a.data||[]).slice(-5).map(e => `- ${e.root_cause} [${e.severity}]: ${e.explanation}`).join('\n') || 'None'}

SLA breach forecast: ${sla.forecast?.probability_pct?.toFixed(1)}% risk (${sla.forecast?.level}) — ${sla.forecast?.reason}

Cost report:
- Session cost: $${cost.report?.session_cost?.toFixed(4)} | Reactive would cost: $${cost.report?.reactive_cost?.toFixed(4)}
- Monthly projected: $${cost.report?.monthly_projected?.toFixed(2)} | Monthly savings vs reactive: $${cost.report?.monthly_saved?.toFixed(2)}
- Efficiency: ${cost.report?.efficiency_pct?.toFixed(1)}%

Session stats: ${h.stats?.total_scaling_actions} scale actions | ${h.stats?.predictions_made} predictions | ${h.stats?.sla_violations} SLA violations | ${h.stats?.estimated_co2_saved_g?.toFixed(0)}g CO2 saved

Open incidents: ${inc.stats?.open || 0} | Total: ${inc.stats?.total || 0} | Avg MTTR: ${inc.stats?.avg_mttr_seconds}s
`
    } catch {
      return 'System context unavailable — backend may be starting up.'
    }
  }

  const send = async (text) => {
    const userText = text || input.trim()
    if (!userText || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userText }])
    setLoading(true)

    const loadingId = Date.now()
    setMessages(prev => [...prev, { role: 'assistant', content: '', loading: true, id: loadingId }])

    try {
      const ctx = await buildContext()
      const history = messages.filter(m => !m.loading).map(m => ({
        role: m.role, content: m.content
      }))

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are SmartCloud AI Ops Assistant — an expert cloud operations engineer with deep knowledge of the SmartCloud v3 predictive auto-scaling system.

You have access to live system data provided in each message. Answer questions about the system concisely, accurately, and helpfully. Use specific numbers from the context. Be direct — this is an ops console, not a chatbot.

Key system capabilities:
- Adaptive ensemble forecasting (LSTM + ARIMA + Holt-Winters with live weight adjustment)
- SLA-Cost-Carbon multi-objective MPC decision engine  
- FFT workload fingerprinting and pattern memory
- XAI anomaly detection with root-cause explanation
- Carbon-aware scaling with real-time grid intensity
- Event-driven proactive scaling (Netflix/food delivery scenarios)
- Multi-tenant SLA tiers (Gold/Silver/Bronze)
- Geographic load distribution (US/EU/Asia)
- Self-healing incident response playbooks
- SLA breach probability forecasting
- Predictive cost forecasting vs reactive baseline

When asked about the system, always reference actual live numbers from the context provided. Keep answers under 150 words unless a detailed explanation is needed.`,
          messages: [
            ...history,
            { role: 'user', content: `LIVE SYSTEM CONTEXT:\n${ctx}\n\nUSER QUESTION: ${userText}` },
          ],
        }),
      })

      const data = await response.json()
      const reply = data.content?.[0]?.text || 'Unable to get response. Check that the backend is running.'

      setMessages(prev => prev.map(m =>
        m.id === loadingId ? { role: 'assistant', content: reply } : m
      ))
    } catch (e) {
      setMessages(prev => prev.map(m =>
        m.id === loadingId ? { role: 'assistant', content: `Error connecting to AI assistant: ${e.message}. The assistant requires an active internet connection.` } : m
      ))
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '14px 18px' }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>AI Ops Assistant</h1>
        <p style={{ fontSize: 11, color: '#94a3b8' }}>
          Ask anything about your live system in plain English. Powered by Claude with full real-time context.
        </p>
      </div>

      {/* Suggested questions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {SUGGESTED.map((q, i) => (
          <button key={i} onClick={() => send(q)} disabled={loading}
            style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 12, cursor: 'pointer',
              background: 'rgba(79,142,247,.1)', color: C.blue,
              border: '1px solid rgba(79,142,247,.25)', transition: 'all .12s',
            }}>
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', background: BG.card,
        border: '1px solid #2d3148', borderRadius: 10, padding: '14px',
        marginBottom: 12, minHeight: 0,
      }}>
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about your system... (e.g. 'why did we scale out?')"
          disabled={loading}
          style={{
            flex: 1, background: BG.inner, border: '1px solid #2d3148',
            borderRadius: 8, padding: '10px 14px', color: '#f1f5f9',
            fontSize: 13, outline: 'none',
          }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          style={{
            padding: '10px 18px', background: loading ? '#252840' : 'rgba(79,142,247,.2)',
            color: loading ? '#475569' : C.blue, border: `1px solid ${loading ? '#2d3148' : C.blue}`,
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
          }}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
      <div style={{ fontSize: 9, color: '#475569', marginTop: 5, textAlign: 'center' }}>
        AI assistant reads live system metrics, predictions, anomalies, and costs on every query.
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  )
}
