from fastapi import APIRouter
from app.store import store
router = APIRouter()

@router.get("/")
async def get(limit: int = 20):
    es = store.get_anomalies(limit)
    return {"system_status": store.system_status, "count": len(es), "data": [
        {"timestamp": e.timestamp, "root_cause": e.root_cause,
         "explanation": e.explanation, "severity": e.severity,
         "z_score": e.z_score, "metrics": e.metrics, "resolved": e.resolved}
        for e in es]}

@router.post("/resolve")
async def resolve():
    store.resolve_anomalies()
    return {"status": "ok"}
