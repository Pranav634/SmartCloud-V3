from fastapi import APIRouter, Query
from app.store import store
router = APIRouter()

@router.get("/")
async def get_metrics(limit: int = Query(60, ge=1, le=600)):
    ms = store.get_metrics(limit)
    return {"count": len(ms), "data": [
        {"timestamp": m.timestamp, "cpu_utilization": m.cpu_utilization,
         "memory_utilization": m.memory_utilization, "request_rate": m.request_rate,
         "active_instances": m.active_instances, "response_time_ms": m.response_time_ms,
         "carbon_intensity": m.carbon_intensity, "scenario": m.scenario}
        for m in ms]}

@router.get("/latest")
async def latest():
    m = store.get_latest_metric()
    if not m: return {"data": None}
    return {"data": {"timestamp": m.timestamp, "cpu_utilization": m.cpu_utilization,
         "memory_utilization": m.memory_utilization, "request_rate": m.request_rate,
         "active_instances": m.active_instances, "response_time_ms": m.response_time_ms,
         "carbon_intensity": m.carbon_intensity, "scenario": m.scenario}}
