from fastapi import APIRouter, Query
from app.store import store
router = APIRouter()

@router.get("/")
async def get_predictions(limit: int = Query(30, ge=1, le=300)):
    ps = store.get_predictions(limit)
    return {"count": len(ps), "data": [
        {"timestamp": p.timestamp, "lstm_cpu": p.lstm_cpu, "arima_cpu": p.arima_cpu,
         "holtwinters_cpu": p.holtwinters_cpu, "ensemble_cpu": p.ensemble_cpu,
         "lstm_weight": p.lstm_weight, "arima_weight": p.arima_weight,
         "holtwinters_weight": p.holtwinters_weight,
         "recommended_instances": p.recommended_instances,
         "confidence": p.confidence, "model_rmse": p.model_rmse}
        for p in ps]}
