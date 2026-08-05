from fastapi import APIRouter, Body
from app.store import store, ScalingEvent
from datetime import datetime, timezone
router = APIRouter()

@router.get("/events")
async def events(limit: int = 20):
    es = store.get_scaling_events(limit)
    return {"current_instances": store.current_instances, "count": len(es), "data": [
        {"timestamp": e.timestamp, "action": e.action, "from_instances": e.from_instances,
         "to_instances": e.to_instances, "reason": e.reason, "triggered_by": e.triggered_by,
         "sla_risk": e.sla_risk, "cost_score": e.cost_score, "carbon_score": e.carbon_score}
        for e in es]}

@router.post("/manual")
async def manual(target_instances: int = Body(..., embed=True)):
    t = max(1, min(20, target_instances))
    store.add_scaling_event(ScalingEvent(
        timestamp=datetime.now(timezone.utc).isoformat(),
        action="scale_out" if t > store.current_instances else "scale_in",
        from_instances=store.current_instances, to_instances=t,
        reason="Manual override by operator", triggered_by="manual",
        sla_risk=0.0, cost_score=0.0, carbon_score=0.0))
    return {"status": "ok", "new_instances": t}

@router.post("/scenario/{name}")
async def set_scenario(name: str):
    valid = {"normal","flash_crowd","idle","ramp_up","memory_stress"}
    if name not in valid:
        return {"error": f"Unknown. Choose: {valid}"}
    store.current_scenario = name
    return {"status": "ok", "scenario": name}
