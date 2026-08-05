"""
SmartCloud v3 — Advanced Real-World Engine
==========================================
Implements:
1. Multi-Tenant SLA Tiers (Gold/Silver/Bronze)
2. Geographic load distribution (US/EU/Asia)
3. Self-healing incident response playbooks
4. SLA breach probability forecasting
5. Predictive cost forecasting
"""
import math
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# 1. MULTI-TENANT SLA TIERS
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class SLATier:
    name:              str     # "gold" | "silver" | "bronze"
    max_latency_ms:    int     # SLA target
    max_cpu_pct:       float   # max CPU before violation
    priority:          int     # 1=highest, 3=lowest
    color:             str
    monthly_revenue:   float   # $ per month this tier contributes
    active_users:      int

TIERS = {
    "gold":   SLATier("gold",   200, 60, 1, "#fbbf24", 12400, 450),
    "silver": SLATier("silver", 500, 75, 2, "#94a3b8", 6200,  1800),
    "bronze": SLATier("bronze", 1200, 88, 3, "#fb923c", 890,  8900),
}

class TenantManager:
    def __init__(self):
        self._tick = 0

    def get_tier_metrics(self, base_cpu: float, base_rt: float) -> Dict:
        """Each tier experiences different latency based on their priority."""
        gold_rt   = base_rt * 0.6                    # gold gets best resources
        silver_rt = base_rt * 1.0                    # silver is baseline
        bronze_rt = base_rt * 1.6 + random.gauss(0,8)  # bronze gets remainder

        gold_breach   = gold_rt   > TIERS["gold"].max_latency_ms
        silver_breach = silver_rt > TIERS["silver"].max_latency_ms
        bronze_breach = bronze_rt > TIERS["bronze"].max_latency_ms

        return {
            "gold":   {"rt": round(gold_rt,1),   "breach": gold_breach,   "users": TIERS["gold"].active_users,   "revenue": TIERS["gold"].monthly_revenue},
            "silver": {"rt": round(silver_rt,1), "breach": silver_breach, "users": TIERS["silver"].active_users, "revenue": TIERS["silver"].monthly_revenue},
            "bronze": {"rt": round(bronze_rt,1), "breach": bronze_breach, "users": TIERS["bronze"].active_users, "revenue": TIERS["bronze"].monthly_revenue},
        }

    def revenue_at_risk(self, tier_metrics: Dict) -> float:
        """Calculate monthly revenue at risk from current breaches."""
        risk = 0.0
        for name, m in tier_metrics.items():
            if m["breach"]:
                # SLA breach penalty: 10% of monthly revenue per breach event
                risk += TIERS[name].monthly_revenue * 0.10
        return round(risk, 2)


# ─────────────────────────────────────────────────────────────────────────────
# 2. GEOGRAPHIC LOAD DISTRIBUTION
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Region:
    name:        str
    code:        str
    timezone_offset: int   # hours from UTC
    peak_hour:   int       # local hour of peak traffic
    base_load:   float     # % of total traffic this region handles
    color:       str

REGIONS = [
    Region("North America", "us-east-1",  -5,  14, 0.45, "#4f8ef7"),
    Region("Europe",        "eu-west-1",   1,  10, 0.30, "#34d399"),
    Region("Asia Pacific",  "ap-south-1",  5.5, 20, 0.25, "#a78bfa"),
]

class GeoLoadSimulator:
    def get_regional_loads(self, tick: int) -> List[Dict]:
        """Returns current load per region based on their local time."""
        utc_hour = (datetime.now(timezone.utc).hour + tick / 1800) % 24
        result = []
        for r in REGIONS:
            local_hour = (utc_hour + r.timezone_offset) % 24
            # Gaussian around peak_hour
            distance   = min(abs(local_hour - r.peak_hour), 24 - abs(local_hour - r.peak_hour))
            load_factor = math.exp(-(distance**2) / (2 * 4**2))  # σ=4 hours
            night_factor = 0.15 + 0.85 * load_factor
            cpu_contrib  = round(r.base_load * night_factor * 100 + random.gauss(0,2), 1)
            rps_contrib  = round(r.base_load * night_factor * 200 + random.gauss(0,5), 0)
            result.append({
                "name":        r.name,
                "code":        r.code,
                "color":       r.color,
                "load_pct":    round(night_factor * 100, 1),
                "cpu_contrib": max(0, cpu_contrib),
                "rps_contrib": max(0, rps_contrib),
                "local_hour":  round(local_hour, 1),
                "is_peak":     distance < 2,
            })
        return result


# ─────────────────────────────────────────────────────────────────────────────
# 3. SELF-HEALING INCIDENT RESPONSE
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Incident:
    id:          str
    timestamp:   str
    title:       str
    severity:    str     # P1 / P2 / P3
    root_cause:  str
    status:      str     # "detecting" | "mitigating" | "resolved"
    playbook:    List[str]
    steps_done:  List[str] = field(default_factory=list)
    resolved_at: Optional[str] = None
    mttr_seconds: Optional[int] = None   # mean time to resolve

PLAYBOOKS = {
    "request_surge": [
        "Detected: request rate anomaly (Z > 3σ)",
        "Scaling out +4 instances immediately",
        "Enabling rate limiting on Bronze tier",
        "Notifying on-call engineer via PagerDuty",
        "Monitoring: waiting for CPU to stabilise",
        "Incident resolved — CPU back in range",
    ],
    "cpu_spike": [
        "Detected: CPU spike anomaly",
        "Checking for runaway processes",
        "Scaling out +2 instances as precaution",
        "Isolating affected containers",
        "CPU normalising — monitoring for 3 min",
        "Incident resolved — stable",
    ],
    "memory_leak": [
        "Detected: memory climbing without CPU increase",
        "Flagging affected instance for replacement",
        "Provisioning clean replacement instance",
        "Draining traffic from affected instance",
        "Terminating and restarting affected pod",
        "Memory normalised — incident resolved",
    ],
    "cascade": [
        "Detected: multi-signal cascade failure",
        "Activating emergency scaling (max capacity)",
        "Enabling circuit breaker on downstream deps",
        "Shedding Bronze tier load temporarily",
        "Escalating to P1 — notifying incident commander",
        "Cascade resolved — restoring normal routing",
    ],
}

class IncidentEngine:
    def __init__(self):
        self._incidents: List[Incident] = []
        self._counter = 0

    def open_incident(self, root_cause: str, severity: str) -> Incident:
        self._counter += 1
        playbook = PLAYBOOKS.get(root_cause, PLAYBOOKS["cpu_spike"])
        inc = Incident(
            id         = f"INC-{self._counter:04d}",
            timestamp  = datetime.now(timezone.utc).isoformat(),
            title      = f"{root_cause.replace('_',' ').title()} — Auto-remediation triggered",
            severity   = "P1" if severity == "high" else "P2" if severity == "medium" else "P3",
            root_cause = root_cause,
            status     = "detecting",
            playbook   = playbook,
        )
        self._incidents.append(inc)
        logger.info("Incident opened: %s (%s)", inc.id, inc.title)
        return inc

    def progress_incidents(self):
        """Advance active incidents through their playbook steps."""
        for inc in self._incidents:
            if inc.status == "resolved":
                continue
            total   = len(inc.playbook)
            done    = len(inc.steps_done)
            if done < total:
                inc.steps_done.append(inc.playbook[done])
                inc.status = "mitigating" if done > 0 else "detecting"
            if len(inc.steps_done) == total:
                inc.status     = "resolved"
                inc.resolved_at = datetime.now(timezone.utc).isoformat()
                start  = datetime.fromisoformat(inc.timestamp)
                end    = datetime.now(timezone.utc)
                inc.mttr_seconds = int((end - start).total_seconds())

    def get_incidents(self, limit: int = 20) -> List[Dict]:
        result = []
        for inc in reversed(self._incidents[-limit:]):
            result.append({
                "id":           inc.id,
                "timestamp":    inc.timestamp,
                "title":        inc.title,
                "severity":     inc.severity,
                "root_cause":   inc.root_cause,
                "status":       inc.status,
                "playbook":     inc.playbook,
                "steps_done":   inc.steps_done,
                "resolved_at":  inc.resolved_at,
                "mttr_seconds": inc.mttr_seconds,
                "progress_pct": round(len(inc.steps_done) / len(inc.playbook) * 100),
            })
        return result

    def get_stats(self) -> Dict:
        resolved = [i for i in self._incidents if i.status == "resolved"]
        mttrs    = [i.mttr_seconds for i in resolved if i.mttr_seconds]
        return {
            "total":            len(self._incidents),
            "open":             len([i for i in self._incidents if i.status != "resolved"]),
            "resolved":         len(resolved),
            "avg_mttr_seconds": round(sum(mttrs)/len(mttrs)) if mttrs else 0,
            "p1_count":         len([i for i in self._incidents if i.severity == "P1"]),
        }


# ─────────────────────────────────────────────────────────────────────────────
# 4. SLA BREACH PROBABILITY FORECASTER
# ─────────────────────────────────────────────────────────────────────────────

class SLABreachForecaster:
    """
    Estimates probability of SLA breach in next 5 minutes.
    Uses: current CPU trend + predicted CPU + response time trend.
    Returns a 0–1 probability and a human-readable risk level.
    """

    def forecast(
        self,
        cpu_history: List[float],
        rt_history:  List[float],
        predicted_cpu: float,
        current_instances: int,
    ) -> Dict:
        if len(cpu_history) < 5:
            return {"probability": 0.05, "level": "low", "reason": "Insufficient data"}

        # CPU trend over last 10 points
        recent_cpu = cpu_history[-10:]
        cpu_trend  = (recent_cpu[-1] - recent_cpu[0]) / len(recent_cpu)

        # Extrapolate 5 minutes ahead (150 ticks at 2s each)
        projected_cpu = min(predicted_cpu + cpu_trend * 30, 100)

        # Logistic probability model
        # P(breach) approaches 1 as projected CPU approaches 90%
        p_cpu = 1.0 / (1.0 + math.exp(-(projected_cpu - 85) / 5))

        # Response time contribution
        if len(rt_history) >= 5:
            recent_rt = rt_history[-5:]
            rt_trend  = (recent_rt[-1] - recent_rt[0]) / len(recent_rt)
            projected_rt = recent_rt[-1] + rt_trend * 30
            p_rt = 1.0 / (1.0 + math.exp(-(projected_rt - 800) / 100))
        else:
            p_rt = 0.05

        # Combined probability
        p = min(0.5 * p_cpu + 0.5 * p_rt, 0.99)

        if p > 0.70:
            level  = "critical"
            reason = f"Projected CPU {projected_cpu:.0f}% in 5min — immediate scale-out recommended"
        elif p > 0.45:
            level  = "high"
            reason = f"CPU trend +{cpu_trend:.1f}%/tick — monitoring closely"
        elif p > 0.20:
            level  = "medium"
            reason = "Elevated load — within tolerance but rising"
        else:
            level  = "low"
            reason = "All systems nominal — no breach risk detected"

        return {
            "probability":    round(p, 3),
            "probability_pct": round(p * 100, 1),
            "level":          level,
            "reason":         reason,
            "projected_cpu":  round(projected_cpu, 1),
        }


# ─────────────────────────────────────────────────────────────────────────────
# 5. COST FORECASTER
# ─────────────────────────────────────────────────────────────────────────────

COST_PER_INSTANCE_HOUR = 0.096   # $/hour (t3.medium equivalent)

class CostForecaster:
    def __init__(self):
        self._hourly_log: List[Dict] = []
        self._session_start = datetime.now(timezone.utc)
        self._total_instance_seconds = 0
        self._reactive_instance_seconds = 0   # what we WOULD have used reactively

    def record_tick(self, instances: int, reactive_would_have_used: int):
        self._total_instance_seconds    += instances * 2           # 2s per tick
        self._reactive_instance_seconds += reactive_would_have_used * 2

    def get_report(self) -> Dict:
        elapsed_hours = (datetime.now(timezone.utc) - self._session_start).total_seconds() / 3600
        actual_cost   = self._total_instance_seconds    / 3600 * COST_PER_INSTANCE_HOUR
        reactive_cost = self._reactive_instance_seconds / 3600 * COST_PER_INSTANCE_HOUR
        saved         = max(0, reactive_cost - actual_cost)

        # Project to monthly
        if elapsed_hours > 0:
            monthly_actual   = actual_cost   / elapsed_hours * 24 * 30
            monthly_reactive = reactive_cost / elapsed_hours * 24 * 30
            monthly_saved    = max(0, monthly_reactive - monthly_actual)
        else:
            monthly_actual = monthly_reactive = monthly_saved = 0

        return {
            "session_cost":      round(actual_cost,    4),
            "reactive_cost":     round(reactive_cost,  4),
            "session_saved":     round(saved,           4),
            "monthly_projected": round(monthly_actual,  2),
            "monthly_reactive":  round(monthly_reactive,2),
            "monthly_saved":     round(monthly_saved,   2),
            "efficiency_pct":    round((1 - actual_cost / max(reactive_cost, 0.0001)) * 100, 1),
            "cost_per_hour":     round(actual_cost / max(elapsed_hours, 0.001), 4),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Module-level singletons
# ─────────────────────────────────────────────────────────────────────────────
tenant_manager     = TenantManager()
geo_simulator      = GeoLoadSimulator()
incident_engine    = IncidentEngine()
sla_forecaster     = SLABreachForecaster()
cost_forecaster    = CostForecaster()
