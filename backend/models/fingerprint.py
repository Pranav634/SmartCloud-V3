"""
SmartCloud v2 — Innovation #3: Workload Fingerprinting + Pattern Memory
=======================================================================
Extracts FFT-based frequency fingerprints from CPU time series.
Maintains a library of named patterns.
When a new window arrives, matches to nearest known fingerprint
and pre-loads the scaling policy for that pattern — before the
LSTM even finishes predicting.
"""
import numpy as np
import logging
from typing import List, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

FINGERPRINT_LEN = 16   # top-N FFT frequency components stored


@dataclass
class PatternMatch:
    name:             str
    similarity:       float   # 0–1, higher = better match
    recommended_base: int
    description:      str


def extract_fingerprint(cpu_window: List[float]) -> np.ndarray:
    """
    FFT-based fingerprint: take the top FINGERPRINT_LEN magnitude
    components from the DFT of the CPU window.
    Normalised so fingerprints are comparable across different load levels.
    """
    if len(cpu_window) < 8:
        return np.zeros(FINGERPRINT_LEN)
    arr   = np.array(cpu_window, dtype=np.float64)
    arr   = (arr - arr.mean()) / (arr.std() + 1e-6)   # z-normalise
    fft   = np.abs(np.fft.rfft(arr))
    fft   = fft / (fft.sum() + 1e-6)                  # normalise to sum=1
    padded = np.zeros(FINGERPRINT_LEN)
    n      = min(len(fft), FINGERPRINT_LEN)
    padded[:n] = fft[:n]
    return padded


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-9
    return float(np.dot(a, b) / denom)


class PatternLibrary:
    """
    Stores fingerprints of seen workload patterns.
    Automatically learns new patterns when no close match exists.
    """
    SIMILARITY_THRESHOLD = 0.80   # cosine sim above this = "known pattern"
    MAX_PATTERNS         = 20

    def __init__(self):
        self._patterns: List[dict] = []
        self._seed_built_ins()

    def _seed_built_ins(self):
        """Seed library with known pattern archetypes."""
        # Flash crowd: high-frequency spike signature
        flash = np.zeros(FINGERPRINT_LEN)
        flash[0] = 0.4; flash[1] = 0.3; flash[3] = 0.2; flash[7] = 0.1
        flash /= flash.sum()

        # Business hours ramp: low-frequency rise
        ramp = np.zeros(FINGERPRINT_LEN)
        ramp[0] = 0.6; ramp[1] = 0.25; ramp[2] = 0.1; ramp[4] = 0.05
        ramp /= ramp.sum()

        # Idle/overnight: near-DC signal
        idle = np.zeros(FINGERPRINT_LEN)
        idle[0] = 0.9; idle[1] = 0.07; idle[2] = 0.03
        idle /= idle.sum()

        # Normal diurnal: sinusoidal daily pattern
        normal = np.zeros(FINGERPRINT_LEN)
        normal[0] = 0.45; normal[1] = 0.35; normal[2] = 0.15; normal[3] = 0.05
        normal /= normal.sum()

        self._patterns = [
            {"name": "flash_crowd",     "fp": flash,  "recommended_base": 8,  "seen": 0,
             "description": "Sudden traffic spike — pre-warming to 8 instances"},
            {"name": "ramp_up",         "fp": ramp,   "recommended_base": 5,  "seen": 0,
             "description": "Gradual load increase — scaling ahead of curve"},
            {"name": "idle",            "fp": idle,   "recommended_base": 1,  "seen": 0,
             "description": "Low activity period — aggressive scale-in safe"},
            {"name": "normal_diurnal",  "fp": normal, "recommended_base": 3,  "seen": 0,
             "description": "Regular daily pattern — standard auto-scaling"},
        ]

    def match(self, cpu_window: List[float]) -> Optional[PatternMatch]:
        if len(cpu_window) < 8:
            return None
        fp   = extract_fingerprint(cpu_window)
        best = None
        best_sim = -1.0
        for p in self._patterns:
            sim = cosine_sim(fp, p["fp"])
            if sim > best_sim:
                best_sim = sim
                best = p
        if best is None or best_sim < 0.50:
            return None
        return PatternMatch(
            name             = best["name"],
            similarity       = round(best_sim, 3),
            recommended_base = best["recommended_base"],
            description      = best["description"],
        )

    def learn(self, cpu_window: List[float], label: str = "auto"):
        """If window doesn't match known pattern, store as new."""
        if len(cpu_window) < 8:
            return
        fp = extract_fingerprint(cpu_window)
        for p in self._patterns:
            if cosine_sim(fp, p["fp"]) >= self.SIMILARITY_THRESHOLD:
                p["seen"] += 1
                return   # already known
        if len(self._patterns) >= self.MAX_PATTERNS:
            return
        self._patterns.append({
            "name":             label,
            "fp":               fp,
            "recommended_base": 3,
            "seen":             1,
            "description":      f"Auto-learned pattern: {label}",
        })
        logger.info("PatternLibrary: learned new pattern '%s'.", label)

    def get_all(self) -> List[dict]:
        return [
            {"name": p["name"], "seen_count": p["seen"], "description": p["description"]}
            for p in self._patterns
        ]


pattern_library = PatternLibrary()
