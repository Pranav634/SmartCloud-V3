"""
SmartCloud v2 — Innovation #2 & #5: SLA-Cost-Carbon Tradeoff Decision Engine
=============================================================================
Solves a multi-objective optimization at each decision tick:

  minimize: w_sla * SLA_risk + w_cost * over_cost + w_carbon * carbon_penalty

Innovation #2: User adjustable weights exposed on dashboard — decisions change live.
Innovation #5: Carbon intensity signal integrated into scaling decisions.
               Low carbon → scale out freely. High carbon → conservative.
"""
import numpy as np
import math
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

TARGET_CPU    = 65.0
SCALE_OUT_CPU = 72.0
SCALE_IN_CPU  = 32.0
MIN_INST      = 1
MAX_INST      = 20
HYSTERESIS    = 2   # ticks


class CarbonSignal:
    """
    Simulated grid carbon intensity (gCO2/kWh).
    Uses a sine wave: low at midday (renewables), high at night (fossil).
    Range: 80 (clean) – 420 (dirty).
    """
    BASE    = 250.0
    AMP     = 170.0
    PERIOD  = 300   # ticks ≈ one "day"

    def intensity(self, tick: int) -> float:
        phase = tick * 2 * math.pi / self.PERIOD
        return round(self.BASE + self.AMP * math.sin(phase), 1)

    def is_clean(self, intensity: float) -> bool:
        return intensity < 180.0

    def is_dirty(self, intensity: float) -> bool:
        return intensity > 350.0


class SLACostCarbonEngine:
    """
    At each tick:
    1. Compute SLA risk (probability CPU > 90% with current instances)
    2. Compute over-provision cost (idle instance-hours)
    3. Compute carbon penalty (dirty grid → penalise scale-out)
    4. Minimise weighted sum → choose instance count
    5. Apply hysteresis to prevent thrashing
    """

    def __init__(self):
        self._carbon     = CarbonSignal()
        self._tick       = 0
        self._since_last = 0

    def tick(self):
        self._tick += 1
        self._since_last += 1

    def carbon_intensity(self) -> float:
        return self._carbon.intensity(self._tick)

    def decide(
        self,
        predicted_cpu: float,
        current_instances: int,
        anomaly_hold: bool,
        sla_w: float,
        cost_w: float,
        carbon_w: float,
    ) -> Tuple[int, str, float, float, float]:
        """
        Returns: (recommended_instances, reason, sla_risk, cost_score, carbon_score)
        """
        ci = self.carbon_intensity()

        if anomaly_hold:
            return (current_instances,
                    "anomaly_hold — scaling suspended for stability",
                    0.0, 0.0, 0.0)

        if self._since_last < HYSTERESIS:
            return (current_instances,
                    f"hysteresis — {HYSTERESIS - self._since_last} tick(s) remaining",
                    0.0, 0.0, 0.0)

        # ── SLA risk: logistic model ──────────────────────────────────────
        # P(SLA violation) rises steeply above 80% CPU
        sla_risk = 1.0 / (1.0 + math.exp(-(predicted_cpu - 80) / 5.0))

        # ── Over-provision cost ───────────────────────────────────────────
        # How many idle instance-equivalents are we paying for?
        effective_util = predicted_cpu / TARGET_CPU
        ideal_inst     = max(1.0, current_instances * effective_util)
        over_instances = max(0.0, current_instances - ideal_inst)
        cost_score     = over_instances / MAX_INST   # normalised 0–1

        # ── Carbon penalty ────────────────────────────────────────────────
        # Scale-out on a dirty grid = high carbon score (bad)
        # Scale-in on a dirty grid = low carbon score (good)
        carbon_pct = (ci - 80) / (420 - 80)   # 0 = clean, 1 = dirty
        carbon_score = carbon_pct              # penalty for scale-out

        # ── Objective ─────────────────────────────────────────────────────
        # Try instance counts in ±5 range and pick minimising total cost
        best_inst = current_instances
        best_obj  = float("inf")

        for candidate in range(max(MIN_INST, current_instances - 4),
                               min(MAX_INST, current_instances + 5) + 1):
            # Projected CPU if we use this many instances
            proj_cpu = predicted_cpu * current_instances / max(candidate, 1)
            proj_sla = 1.0 / (1.0 + math.exp(-(proj_cpu - 80) / 5.0))
            # Scale-out increases carbon penalty
            delta        = candidate - current_instances
            proj_carbon  = carbon_score * max(delta, 0) / MAX_INST
            proj_cost    = max(0.0, (candidate - ideal_inst)) / MAX_INST
            obj = sla_w * proj_sla + cost_w * proj_cost + carbon_w * proj_carbon
            if obj < best_obj:
                best_obj  = obj
                best_inst = candidate

        # Carbon hold: on dirty grid skip scale-out
        action_blocked = False
        if self._carbon.is_dirty(ci) and best_inst > current_instances:
            best_inst      = current_instances
            action_blocked = True

        reason = self._reason(best_inst, current_instances, predicted_cpu, ci, action_blocked)

        if best_inst != current_instances:
            self._since_last = 0

        return (best_inst, reason,
                round(sla_risk, 3), round(cost_score, 3), round(carbon_pct, 3))

    @staticmethod
    def _reason(ni, ci, cpu, carbon_i, blocked):
        if blocked:
            return (f"carbon_hold — grid at {carbon_i:.0f} gCO2/kWh (dirty); "
                    f"scale-out deferred to reduce emissions")
        if ni > ci:
            return (f"scale_out — predicted CPU {cpu:.1f}% → "
                    f"{ni} instances (SLA protection)")
        if ni < ci:
            return (f"scale_in — predicted CPU {cpu:.1f}% → "
                    f"{ni} instances (cost optimisation)")
        return f"no_action — predicted CPU {cpu:.1f}% within target range"


decision_engine = SLACostCarbonEngine()
