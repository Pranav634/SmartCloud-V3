"""SmartCloud v3 — Events & Patterns API Routes"""
from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

from models.event_engine import event_engine, ScheduledEvent, RecurringPattern

router = APIRouter()


class CreateEventRequest(BaseModel):
    name:              str
    category:          str
    description:       str
    start_time_iso:    str          # ISO 8601
    duration_minutes:  int
    expected_cpu_pct:  float
    prewarm_minutes:   int  = 30
    prewarm_instances: int  = 5
    peak_instances:    int  = 10
    cooldown_minutes:  int  = 20


class CreatePatternRequest(BaseModel):
    name:              str
    category:          str
    days:              List[str]
    start_hour:        int
    start_minute:      int
    end_hour:          int
    end_minute:        int
    expected_load_pct: float
    min_instances:     int
    max_instances:     int


@router.get("/events")
async def get_events():
    return {"events": event_engine.get_all_events()}


@router.get("/events/upcoming")
async def get_upcoming(window_minutes: int = 120):
    return {"upcoming": event_engine.get_upcoming_events(window_minutes)}


@router.post("/events")
async def create_event(req: CreateEventRequest):
    try:
        start = datetime.fromisoformat(req.start_time_iso.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(400, "Invalid start_time_iso format. Use ISO 8601.")
    ev = ScheduledEvent(
        id               = f"evt_{uuid.uuid4().hex[:8]}",
        name             = req.name,
        category         = req.category,
        description      = req.description,
        start_time       = start,
        duration_minutes = req.duration_minutes,
        expected_cpu_pct = req.expected_cpu_pct,
        prewarm_minutes  = req.prewarm_minutes,
        prewarm_instances= req.prewarm_instances,
        peak_instances   = req.peak_instances,
        cooldown_minutes = req.cooldown_minutes,
    )
    event_engine.add_event(ev)
    return {"status": "ok", "event_id": ev.id}


@router.delete("/events/{event_id}")
async def delete_event(event_id: str):
    ok = event_engine.delete_event(event_id)
    if not ok:
        raise HTTPException(404, "Event not found")
    return {"status": "ok"}


@router.patch("/events/{event_id}/toggle")
async def toggle_event(event_id: str):
    for ev in event_engine.events:
        if ev.id == event_id:
            ev.active = not ev.active
            return {"status": "ok", "active": ev.active}
    raise HTTPException(404, "Event not found")


@router.get("/patterns")
async def get_patterns():
    return {"patterns": event_engine.get_all_patterns()}


@router.post("/patterns")
async def create_pattern(req: CreatePatternRequest):
    p = RecurringPattern(
        id               = f"pat_{uuid.uuid4().hex[:8]}",
        name             = req.name,
        category         = req.category,
        days             = req.days,
        start_hour       = req.start_hour,
        start_minute     = req.start_minute,
        end_hour         = req.end_hour,
        end_minute       = req.end_minute,
        expected_load_pct= req.expected_load_pct,
        min_instances    = req.min_instances,
        max_instances    = req.max_instances,
    )
    event_engine.add_pattern(p)
    return {"status": "ok", "pattern_id": p.id}


@router.patch("/patterns/{pattern_id}/toggle")
async def toggle_pattern(pattern_id: str):
    for p in event_engine.patterns:
        if p.id == pattern_id:
            p.active = not p.active
            return {"status": "ok", "active": p.active}
    raise HTTPException(404, "Pattern not found")


@router.get("/recommendation")
async def current_recommendation():
    """Show what the event engine is currently recommending."""
    from app.store import store
    from models.ensemble import ensemble_forecaster
    metrics = store.get_metrics(50)
    if not metrics:
        return {"recommendation": None}
    cpu = [m.cpu_utilization for m in metrics]
    rps = [m.request_rate for m in metrics]
    forecast = ensemble_forecaster.predict(cpu, rps)
    ml_inst  = store.current_instances
    rec = event_engine.get_recommendation(ml_inst, store.current_instances)
    return {"recommendation": rec, "ensemble_cpu": forecast["ensemble_cpu"]}
