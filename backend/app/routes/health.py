from fastapi import APIRouter
from app.store import store
from datetime import datetime, timezone
router = APIRouter()

@router.get("/")
async def health():
    return {"status": store.system_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "current_instances": store.current_instances,
            "current_scenario": store.current_scenario,
            "carbon_mode": store.carbon_mode,
            "metrics_buffered": len(store.metrics),
            "stats": store.get_stats()}
