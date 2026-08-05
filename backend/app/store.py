"""
SmartCloud v2 — Shared In-Memory Data Store
Thread-safe store for all real-time and historical data.
"""
import threading
from collections import deque
from dataclasses import dataclass, field
from typing import List, Optional, Dict
from datetime import datetime, timezone

MAX_METRICS     = 600
MAX_PREDICTIONS = 300
MAX_EVENTS      = 100
MAX_ANOMALIES   = 100


@dataclass
class MetricPoint:
    timestamp:            str
    cpu_utilization:      float
    memory_utilization:   float
    request_rate:         float
    active_instances:     int
    response_time_ms:     float
    carbon_intensity:     float   # gCO2/kWh simulated grid intensity
    scenario:             str     # "normal"|"flash_crowd"|"idle"|"ramp_up"


@dataclass
class PredictionPoint:
    timestamp:              str
    lstm_cpu:               float
    arima_cpu:              float
    holtwinters_cpu:        float
    ensemble_cpu:           float   # weighted blend
    lstm_weight:            float
    arima_weight:           float
    holtwinters_weight:     float
    predicted_rps:          float
    recommended_instances:  int
    confidence:             float
    model_rmse:             Dict    # {"lstm": 2.1, "arima": 3.4, "hw": 2.8}


@dataclass
class ScalingEvent:
    timestamp:       str
    action:          str   # "scale_out"|"scale_in"|"no_action"|"carbon_hold"
    from_instances:  int
    to_instances:    int
    reason:          str
    triggered_by:    str   # "ensemble"|"pattern"|"manual"|"carbon"
    sla_risk:        float  # 0–1 probability of SLA violation
    cost_score:      float  # relative cost index
    carbon_score:    float  # gCO2 saved


@dataclass
class AnomalyEvent:
    timestamp:    str
    root_cause:   str    # "cpu_spike"|"memory_leak"|"request_surge"|"sensor_fault"
    explanation:  str    # human-readable
    severity:     str    # "low"|"medium"|"high"
    z_score:      float
    metrics:      Dict   # raw values at detection time
    resolved:     bool = False


@dataclass
class PatternFingerprint:
    name:             str
    fft_signature:    List[float]
    avg_cpu:          float
    avg_rps:          float
    recommended_base: int
    seen_count:       int = 0


@dataclass
class SystemStats:
    total_scaling_actions:  int = 0
    false_positives_avoided: int = 0
    estimated_cost_saved:   float = 0.0
    estimated_co2_saved_g:  float = 0.0
    uptime_pct:             float = 99.99
    sla_violations:         int = 0
    predictions_made:       int = 0


class DataStore:
    def __init__(self):
        self._lock               = threading.Lock()
        self.metrics             = deque(maxlen=MAX_METRICS)
        self.predictions         = deque(maxlen=MAX_PREDICTIONS)
        self.scaling_events      = deque(maxlen=MAX_EVENTS)
        self.anomaly_events      = deque(maxlen=MAX_ANOMALIES)
        self.pattern_library:    List[PatternFingerprint] = []
        self.current_instances:  int   = 2
        self.system_status:      str   = "healthy"
        self.carbon_mode:        bool  = True
        self.sla_weight:         float = 0.5
        self.cost_weight:        float = 0.3
        self.carbon_weight:      float = 0.2
        self.stats               = SystemStats()
        self.current_scenario:   str   = "normal"

    def add_metric(self, p: MetricPoint):
        with self._lock:
            self.metrics.append(p)

    def get_metrics(self, limit=60) -> List[MetricPoint]:
        with self._lock:
            return list(self.metrics)[-limit:]

    def get_latest_metric(self) -> Optional[MetricPoint]:
        with self._lock:
            return self.metrics[-1] if self.metrics else None

    def add_prediction(self, p: PredictionPoint):
        with self._lock:
            self.predictions.append(p)
            self.stats.predictions_made += 1

    def get_predictions(self, limit=30) -> List[PredictionPoint]:
        with self._lock:
            return list(self.predictions)[-limit:]

    def add_scaling_event(self, e: ScalingEvent):
        with self._lock:
            self.scaling_events.append(e)
            self.current_instances = e.to_instances
            self.stats.total_scaling_actions += 1
            self.stats.estimated_co2_saved_g += e.carbon_score
            if e.action == "carbon_hold":
                self.stats.estimated_cost_saved += 0.12 * abs(e.to_instances - e.from_instances)

    def get_scaling_events(self, limit=20) -> List[ScalingEvent]:
        with self._lock:
            return list(self.scaling_events)[-limit:]

    def add_anomaly(self, e: AnomalyEvent):
        with self._lock:
            self.anomaly_events.append(e)
            if e.severity == "high":
                self.system_status = "warning"
                self.stats.sla_violations += 1
            else:
                self.stats.false_positives_avoided += 1

    def get_anomalies(self, limit=20) -> List[AnomalyEvent]:
        with self._lock:
            return list(self.anomaly_events)[-limit:]

    def resolve_anomalies(self):
        with self._lock:
            for a in self.anomaly_events:
                a.resolved = True
            self.system_status = "healthy"

    def update_weights(self, sla: float, cost: float, carbon: float):
        total = sla + cost + carbon
        if total > 0:
            with self._lock:
                self.sla_weight    = sla    / total
                self.cost_weight   = cost   / total
                self.carbon_weight = carbon / total

    def get_stats(self) -> dict:
        with self._lock:
            s = self.stats
            return {
                "total_scaling_actions":   s.total_scaling_actions,
                "false_positives_avoided": s.false_positives_avoided,
                "estimated_cost_saved":    round(s.estimated_cost_saved, 2),
                "estimated_co2_saved_g":   round(s.estimated_co2_saved_g, 1),
                "uptime_pct":              s.uptime_pct,
                "sla_violations":          s.sla_violations,
                "predictions_made":        s.predictions_made,
            }


store = DataStore()
