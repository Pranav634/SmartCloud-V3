"""SmartCloud v3 — Real-World Features API Routes"""
from fastapi import APIRouter
from app.store import store
from models.realworld import (
    tenant_manager, geo_simulator, incident_engine,
    sla_forecaster, cost_forecaster, TIERS
)
import asyncio

router = APIRouter()


@router.get("/tenants")
async def get_tenants():
    latest = store.get_latest_metric()
    if not latest:
        return {"tiers": {}, "revenue_at_risk": 0}
    tier_metrics = tenant_manager.get_tier_metrics(
        latest.cpu_utilization, latest.response_time_ms
    )
    return {
        "tiers": tier_metrics,
        "revenue_at_risk": tenant_manager.revenue_at_risk(tier_metrics),
        "tier_config": {
            name: {"max_latency_ms": t.max_latency_ms, "color": t.color,
                   "monthly_revenue": t.monthly_revenue}
            for name, t in TIERS.items()
        },
    }


@router.get("/geo")
async def get_geo():
    from app.store import store as s
    tick = len(s.metrics)
    return {"regions": geo_simulator.get_regional_loads(tick)}


@router.get("/incidents")
async def get_incidents(limit: int = 20):
    incident_engine.progress_incidents()
    return {
        "incidents": incident_engine.get_incidents(limit),
        "stats":     incident_engine.get_stats(),
    }


@router.get("/sla-forecast")
async def get_sla_forecast():
    metrics = store.get_metrics(50)
    preds   = store.get_predictions(5)
    if not metrics:
        return {"forecast": None}
    cpu_h = [m.cpu_utilization    for m in metrics]
    rt_h  = [m.response_time_ms   for m in metrics]
    pred_cpu = preds[-1].ensemble_cpu if preds else cpu_h[-1]
    forecast = sla_forecaster.forecast(cpu_h, rt_h, pred_cpu, store.current_instances)
    return {"forecast": forecast}


@router.get("/cost")
async def get_cost():
    return {"report": cost_forecaster.get_report()}
