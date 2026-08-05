"""
SmartCloud v2 — Enhanced Workload Simulator
Generates realistic cloud workload metrics with carbon signal.
"""
import asyncio
import math
import random
import logging
from datetime import datetime, timezone
from app.store import store, MetricPoint
from models.decision import decision_engine

logger = logging.getLogger(__name__)
TICK_INTERVAL = 2.0


class WorkloadSimulator:
    SCENARIOS = ["normal", "flash_crowd", "idle", "ramp_up", "memory_stress"]

    def __init__(self):
        self._running = False
        self._tick    = 0
        self._sticks  = 0

    def stop(self): self._running = False

    async def run(self):
        self._running = True
        logger.info("WorkloadSimulator v2 started.")
        while self._running:
            try:
                store.add_metric(self._tick_point())
                decision_engine.tick()
                await asyncio.sleep(TICK_INTERVAL)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Simulator error: %s", e)
                await asyncio.sleep(TICK_INTERVAL)

    def _tick_point(self) -> MetricPoint:
        self._tick   += 1
        self._sticks += 1
        self._maybe_switch()

        sc = store.current_scenario
        period = 180
        phase  = self._tick * 2 * math.pi / period
        base_cpu = 38 + 22 * math.sin(phase)
        base_rps = 145 + 90 * math.sin(phase)

        if sc == "flash_crowd":
            t = self._sticks
            spike = 48 * math.exp(-0.055 * t)
            cpu   = base_cpu + spike
            rps   = base_rps + spike * 9
            mem   = cpu * 0.55 + 14
            rt    = 95 + spike * 2.2
            if t > 60: self._switch("normal")

        elif sc == "idle":
            cpu = base_cpu * 0.15 + 3
            rps = 12
            mem = 12
            rt  = 22
            if self._sticks > 40: self._switch("normal")

        elif sc == "ramp_up":
            t   = self._sticks
            f   = min(t / 28.0, 2.8)
            cpu = base_cpu * f
            rps = base_rps * f
            mem = cpu * 0.5 + 18
            rt  = 58 + cpu * 0.6
            if t > 55: self._switch("normal")

        elif sc == "memory_stress":
            t   = self._sticks
            cpu = base_cpu * 0.8
            rps = base_rps
            mem = min(35 + t * 1.2, 92)   # slow memory climb
            rt  = 55 + mem * 0.4
            if t > 50: self._switch("normal")

        else:  # normal
            cpu = base_cpu
            rps = base_rps
            mem = cpu * 0.52 + 13
            rt  = 46 + cpu * 0.38

        carbon = decision_engine.carbon_intensity()
        return MetricPoint(
            timestamp           = datetime.now(timezone.utc).isoformat(),
            cpu_utilization     = round(min(max(cpu + random.gauss(0,1.8), 1), 99), 2),
            memory_utilization  = round(min(max(mem + random.gauss(0,1.2), 5), 95), 2),
            request_rate        = round(min(max(rps + random.gauss(0,4), 1), 1999), 2),
            active_instances    = store.current_instances,
            response_time_ms    = round(min(max(rt  + random.gauss(0,5), 8), 4999), 2),
            carbon_intensity    = carbon,
            scenario            = sc,
        )

    def _switch(self, sc: str):
        store.current_scenario = sc
        self._sticks = 0

    def _maybe_switch(self):
        if store.current_scenario != "normal":
            return
        r = random.random()
        if   r < 0.004: self._switch("flash_crowd")
        elif r < 0.007: self._switch("idle")
        elif r < 0.009: self._switch("ramp_up")
        elif r < 0.011: self._switch("memory_stress")
