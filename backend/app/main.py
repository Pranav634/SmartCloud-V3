"""SmartCloud v3 — FastAPI Application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio, logging
from contextlib import asynccontextmanager

from app.routes import (metrics, predictions, scaling, anomalies,
                        health, patterns, config, events, realworld, realtime)
from app.services.simulator import WorkloadSimulator
from app.services.scheduler import MasterScheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_sim = WorkloadSimulator()
_sch = MasterScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SmartCloud v3 starting...")
    asyncio.create_task(_sim.run())
    asyncio.create_task(_sch.run())
    yield
    _sim.stop(); _sch.stop()

app = FastAPI(title="SmartCloud v3 API", version="3.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(metrics.router,     prefix="/api/metrics",     tags=["Metrics"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(scaling.router,     prefix="/api/scaling",     tags=["Scaling"])
app.include_router(anomalies.router,   prefix="/api/anomalies",   tags=["Anomalies"])
app.include_router(health.router,      prefix="/api/health",      tags=["Health"])
app.include_router(patterns.router,    prefix="/api/patterns",    tags=["Patterns"])
app.include_router(config.router,      prefix="/api/config",      tags=["Config"])
app.include_router(events.router,      prefix="/api/events",      tags=["Events"])
app.include_router(realworld.router,   prefix="/api/realworld",   tags=["RealWorld"])
app.include_router(realtime.router,    prefix="/api/realtime",    tags=["RealTime"])

@app.get("/")
async def root():
    return {"name": "SmartCloud v3", "version": "3.0.0", "innovations": 14}
