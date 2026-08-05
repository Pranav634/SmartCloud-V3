"""
SmartCloud v2 — Innovation #4: XAI Anomaly Detector with Root-Cause Tagging
============================================================================
Detects anomalies AND explains WHY in plain English.
Uses: Autoencoder + Z-score + IQR + rate-of-change detector.
Root causes: cpu_spike | memory_leak | request_surge | sensor_fault | cascade
"""
import numpy as np
import logging
from typing import List, Tuple, Dict, Optional
from collections import deque

logger = logging.getLogger(__name__)

try:
    import tensorflow as tf
    from tensorflow.keras.models import Model
    from tensorflow.keras.layers import Input, Dense
    from tensorflow.keras.optimizers import Adam
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

WINDOW    = 30
Z_THRESH  = 3.0
ROC_THRESH = 15.0   # % change per tick = rate-of-change anomaly


def _rolling_stats(history: List[float], window: int = WINDOW):
    arr = np.array(history[-window:])
    return arr.mean(), arr.std() + 1e-6


def z_score(val: float, mu: float, sigma: float) -> float:
    return abs(val - mu) / sigma


def iqr_fence(history: List[float]) -> float:
    arr = np.array(history[-WINDOW:])
    q1, q3 = np.percentile(arr, 25), np.percentile(arr, 75)
    return q3 + 1.5 * (q3 - q1)


class AnomalyAutoencoder:
    def __init__(self):
        self.model     = None
        self.threshold = 0.1
        self.trained   = False

    def build(self):
        if not TF_AVAILABLE:
            return
        inp = Input(shape=(4,))
        x   = Dense(12, activation="relu")(inp)
        x   = Dense(6,  activation="relu")(x)
        x   = Dense(12, activation="relu")(x)
        out = Dense(4,  activation="sigmoid")(x)
        self.model = Model(inp, out)
        self.model.compile(optimizer=Adam(0.001), loss="mse")

    def train(self, data: np.ndarray):
        if not TF_AVAILABLE or self.model is None or len(data) < 20:
            self.trained = True
            return
        self.model.fit(data, data, epochs=30, batch_size=16, verbose=0)
        recon = self.model.predict(data, verbose=0)
        errs  = np.mean(np.abs(data - recon), axis=1)
        self.threshold = float(np.percentile(errs, 95))
        self.trained   = True

    def error(self, point: np.ndarray) -> float:
        if not TF_AVAILABLE or self.model is None or not self.trained:
            return 0.0
        r = self.model.predict(point[np.newaxis], verbose=0)
        return float(np.mean(np.abs(point - r)))


class RootCauseEngine:
    """
    Given which signals triggered, determine root cause and compose
    a human-readable explanation sentence.
    """
    @staticmethod
    def diagnose(
        cpu: float, mem: float, rps: float, rt: float,
        z_cpu: float, z_mem: float, z_rps: float, z_rt: float,
        roc_cpu: float, ae_err: float, ae_thresh: float,
    ) -> Tuple[str, str, str]:
        """Returns (root_cause, severity, explanation)."""

        triggers = []
        if z_cpu  > Z_THRESH: triggers.append(("cpu",  z_cpu))
        if z_mem  > Z_THRESH: triggers.append(("mem",  z_mem))
        if z_rps  > Z_THRESH: triggers.append(("rps",  z_rps))
        if z_rt   > Z_THRESH: triggers.append(("rt",   z_rt))
        if ae_err > ae_thresh: triggers.append(("ae",  ae_err))

        if not triggers:
            return "none", "none", "All metrics within normal bounds."

        # Determine severity
        max_z = max(t[1] for t in triggers)
        if len(triggers) >= 3 or max_z > 5.0:
            severity = "high"
        elif len(triggers) >= 2 or max_z > 4.0:
            severity = "medium"
        else:
            severity = "low"

        # Determine root cause
        names = [t[0] for t in triggers]

        if "rps" in names and "cpu" in names and "rt" in names:
            cause = "request_surge"
            expl  = (f"Request rate {z_rps:.1f}\u03c3 above normal "
                     f"driving CPU {z_cpu:.1f}\u03c3 spike and "
                     f"latency increase \u2014 likely external traffic event.")
        elif "cpu" in names and roc_cpu > ROC_THRESH:
            cause = "cpu_spike"
            expl  = (f"CPU jumped {roc_cpu:.1f}% in one tick "
                     f"({z_cpu:.1f}\u03c3 from mean) \u2014 "
                     f"sudden compute-intensive job or runaway process.")
        elif "mem" in names and "cpu" not in names:
            cause = "memory_leak"
            expl  = (f"Memory {z_mem:.1f}\u03c3 above normal while CPU stable "
                     f"\u2014 possible memory leak or uncollected heap.")
        elif "ae" in names and len(names) == 1:
            cause = "sensor_fault"
            expl  = (f"Autoencoder reconstruction error {ae_err:.3f} > "
                     f"threshold {ae_thresh:.3f}. Pattern unfamiliar \u2014 "
                     f"possible sensor glitch. Scaling hold applied.")
        elif "rt" in names and "cpu" not in names:
            cause = "downstream_latency"
            expl  = (f"Response time {z_rt:.1f}\u03c3 above normal but CPU healthy "
                     f"\u2014 likely downstream dependency slowdown.")
        else:
            cause = "cascade"
            expl  = (f"Multiple metrics anomalous simultaneously "
                     f"({', '.join(names)}) \u2014 cascade event detected. "
                     f"Scaling hold for 3 ticks.")

        return cause, severity, expl


class XAIAnomalyDetector:
    def __init__(self):
        self.ae        = AnomalyAutoencoder()
        self.ae.build()
        self.rce       = RootCauseEngine()

        self._cpu_h: List[float] = []
        self._mem_h: List[float] = []
        self._rps_h: List[float] = []
        self._rt_h:  List[float] = []
        self._total  = 0

    def train(self, cpu, mem, rps, rt):
        if len(cpu) < 20:
            return
        data = np.column_stack([
            np.array(cpu) / 100,
            np.array(mem) / 100,
            np.array(rps) / max(max(rps), 1),
            np.array(rt)  / max(max(rt),  1),
        ]).astype(np.float32)
        self.ae.train(data)

    def detect(self, cpu: float, mem: float, rps: float, rt: float) -> Optional[Dict]:
        self._cpu_h.append(cpu); self._mem_h.append(mem)
        self._rps_h.append(rps); self._rt_h.append(rt)

        if len(self._cpu_h) < 12:
            return None

        mu_c, s_c = _rolling_stats(self._cpu_h)
        mu_m, s_m = _rolling_stats(self._mem_h)
        mu_r, s_r = _rolling_stats(self._rps_h)
        mu_t, s_t = _rolling_stats(self._rt_h)

        z_c = z_score(cpu, mu_c, s_c)
        z_m = z_score(mem, mu_m, s_m)
        z_r = z_score(rps, mu_r, s_r)
        z_t = z_score(rt,  mu_t, s_t)

        roc_cpu = abs(cpu - self._cpu_h[-2]) if len(self._cpu_h) >= 2 else 0.0

        max_rps = max(max(self._rps_h), 1)
        point   = np.array([cpu/100, mem/100, rps/max_rps, rt/max(max(self._rt_h),1)],
                           dtype=np.float32)
        ae_err  = self.ae.error(point)

        cause, severity, expl = self.rce.diagnose(
            cpu, mem, rps, rt, z_c, z_m, z_r, z_t,
            roc_cpu, ae_err, self.ae.threshold,
        )

        if severity == "none":
            return None

        self._total += 1
        return {
            "root_cause":  cause,
            "severity":    severity,
            "explanation": expl,
            "z_score":     round(max(z_c, z_m, z_r, z_t), 2),
            "metrics":     {"cpu": round(cpu,1), "mem": round(mem,1),
                            "rps": round(rps,1), "rt": round(rt,1)},
            "total_detected": self._total,
        }


xai_detector = XAIAnomalyDetector()
