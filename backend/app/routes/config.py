from fastapi import APIRouter, Body
from app.store import store
router = APIRouter()

@router.get("/weights")
async def get_weights():
    return {"sla": store.sla_weight, "cost": store.cost_weight, "carbon": store.carbon_weight}

@router.post("/weights")
async def set_weights(sla: float = Body(...), cost: float = Body(...), carbon: float = Body(...)):
    store.update_weights(sla, cost, carbon)
    return {"status": "ok", "sla": store.sla_weight, "cost": store.cost_weight, "carbon": store.carbon_weight}

@router.post("/carbon_mode")
async def carbon_mode(enabled: bool = Body(..., embed=True)):
    store.carbon_mode = enabled
    return {"status": "ok", "carbon_mode": enabled}
