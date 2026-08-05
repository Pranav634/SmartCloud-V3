import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard, { ThemeProvider } from './pages/Dashboard'
import EventPlanner from './pages/EventPlanner'
import RealWorld from './pages/RealWorld'
import AIAssistant from './pages/AIAssistant'
import { ModelAnalytics, Reports, Config } from './pages/OtherPages'
import { api } from './utils/shared'

export default function App() {
  const [health, setHealth] = useState(null)
  const fetchHealth = useCallback(async () => {
    try { setHealth(await api.get('/api/health/')) } catch {}
  }, [])
  useEffect(() => {
    fetchHealth()
    const t = setInterval(fetchHealth, 3000)
    return () => clearInterval(t)
  }, [fetchHealth])

  return (
    <ThemeProvider>
      <BrowserRouter>
        <div style={{display:'flex',height:'100vh',width:'100%',overflow:'hidden',background:'var(--bg)'}}>
          <Sidebar health={health}/>
          <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <Routes>
              <Route path="/"          element={<Dashboard health={health} onRefresh={fetchHealth}/>}/>
              <Route path="/events"    element={<EventPlanner/>}/>
              <Route path="/realworld" element={<RealWorld/>}/>
              <Route path="/models"    element={<ModelAnalytics/>}/>
              <Route path="/assistant" element={<AIAssistant/>}/>
              <Route path="/reports"   element={<Reports health={health}/>}/>
              <Route path="/config"    element={<Config health={health} onRefresh={fetchHealth}/>}/>
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  )
}
