"""
SmartCloud v2 — Innovation #1: Dual-Brain Adaptive Ensemble Forecaster
=======================================================================
Runs LSTM + ARIMA + Holt-Winters in parallel.
Continuously measures each model's recent RMSE.
Self-adjusts model weights so the most accurate model gets highest vote.
This adaptive blending is the core novel contribution.
"""
import numpy as np
import logging
from typing import List, Tuple, Dict
from collections import deque

logger = logging.getLogger(__name__)

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional
    from tensorflow.keras.optimizers import Adam
    TF_AVAILABLE = True
    logger.info("TensorFlow available — using real LSTM.")
except ImportError:
    TF_AVAILABLE = False
    logger.warning("TensorFlow not found — using NumPy LSTM simulation.")

try:
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    STATS_AVAILABLE = True
except (ImportError, TypeError):
    STATS_AVAILABLE = False
    logger.warning("statsmodels not available — using NumPy fallback for ARIMA/HW.")

SEQ_LEN      = 24
RMSE_WINDOW  = 20   # last N predictions to measure RMSE over
MIN_WEIGHT   = 0.05 # no model gets less than 5% weight


def _norm(arr: np.ndarray) -> Tuple[np.ndarray, float, float]:
    lo, hi = arr.min(), arr.max()
    if hi - lo < 1e-6:
        return np.zeros_like(arr), lo, hi
    return (arr - lo) / (hi - lo), lo, hi


def _denorm(val: float, lo: float, hi: float) -> float:
    return float(val * (hi - lo) + lo)


def _rmse(actual: List[float], predicted: List[float]) -> float:
    if len(actual) < 2:
        return 999.0
    n = min(len(actual), len(predicted))
    return float(np.sqrt(np.mean((np.array(actual[-n:]) - np.array(predicted[-n:])) ** 2)))


class LSTMModel:
    """Bidirectional LSTM for improved temporal context capture."""
    def __init__(self):
        self.model      = None
        self.trained    = False
        self._lo = self._hi = 0.0

    def build(self):
        if not TF_AVAILABLE:
            return
        m = Sequential([
            Bidirectional(LSTM(64, return_sequences=True), input_shape=(SEQ_LEN, 2)),
            Dropout(0.2),
            LSTM(32),
            Dropout(0.15),
            Dense(16, activation="relu"),
            Dense(1),
        ])
        m.compile(optimizer=Adam(0.001), loss="huber")
        self.model = m

    def train(self, cpu: List[float], rps: List[float]):
        if len(cpu) < SEQ_LEN + 5:
            return
        cpu_arr = np.array(cpu, dtype=np.float32)
        rps_arr = np.array(rps, dtype=np.float32)
        cpu_n, self._lo, self._hi = _norm(cpu_arr)
        rps_n, _, _ = _norm(rps_arr)
        combined = np.stack([cpu_n, rps_n], axis=1)
        X, y = [], []
        for i in range(len(combined) - SEQ_LEN):
            X.append(combined[i:i+SEQ_LEN])
            y.append(cpu_n[i+SEQ_LEN])
        X, y = np.array(X), np.array(y)
        if TF_AVAILABLE and self.model:
            self.model.fit(X, y, epochs=15, batch_size=16, verbose=0, validation_split=0.1)
        self.trained = True

    def predict(self, cpu: List[float], rps: List[float]) -> float:
        if not self.trained or len(cpu) < SEQ_LEN:
            return self._fallback(cpu)
        cpu_arr = np.array(cpu, dtype=np.float32)
        rps_arr = np.array(rps, dtype=np.float32)
        cpu_n, lo, hi = _norm(cpu_arr)
        rps_n, _, _   = _norm(rps_arr)
        seq = np.stack([cpu_n[-SEQ_LEN:], rps_n[-SEQ_LEN:]], axis=1)[np.newaxis]
        if TF_AVAILABLE and self.model:
            out = float(self.model.predict(seq, verbose=0)[0, 0])
        else:
            out = float(self._numpy_predict(cpu_n[-SEQ_LEN:]))
        return float(np.clip(_denorm(out, lo, hi) + np.random.normal(0, 0.8), 0, 100))

    def _numpy_predict(self, seq_n: np.ndarray) -> float:
        w = np.exp(np.linspace(-1.5, 0, len(seq_n)))
        w /= w.sum()
        base = float(np.dot(w, seq_n))
        trend = float(seq_n[-1] - seq_n[-5]) * 0.25 if len(seq_n) >= 5 else 0.0
        return np.clip(base + trend, 0, 1)

    def _fallback(self, cpu: List[float]) -> float:
        if not cpu:
            return 50.0
        return float(np.mean(cpu[-5:])) + np.random.normal(0, 1.5)


class ARIMAModel:
    def predict(self, cpu: List[float]) -> float:
        if not STATS_AVAILABLE or len(cpu) < 30:
            return float(np.mean(cpu[-8:])) if cpu else 50.0
        try:
            fit = ARIMA(cpu[-60:], order=(2, 1, 2)).fit()
            return float(np.clip(fit.forecast(1)[0], 0, 100))
        except Exception:
            return float(np.mean(cpu[-8:]))


class HoltWintersModel:
    def predict(self, cpu: List[float]) -> float:
        if not STATS_AVAILABLE or len(cpu) < 24:
            return float(np.mean(cpu[-8:])) if cpu else 50.0
        try:
            fit = ExponentialSmoothing(
                cpu[-96:], trend="add",
                seasonal="add" if len(cpu) >= 48 else None,
                seasonal_periods=12,
            ).fit()
            return float(np.clip(fit.forecast(1)[0], 0, 100))
        except Exception:
            return float(np.mean(cpu[-8:]))


class AdaptiveEnsemble:
    """
    Core innovation: dynamically reweights three models based on their
    rolling RMSE over the last RMSE_WINDOW predictions.
    Lower RMSE → higher weight. Weights sum to 1.0.
    """
    def __init__(self):
        self.lstm = LSTMModel()
        self.arima = ARIMAModel()
        self.hw = HoltWintersModel()
        self.lstm.build()

        self._lstm_preds:  deque = deque(maxlen=RMSE_WINDOW)
        self._arima_preds: deque = deque(maxlen=RMSE_WINDOW)
        self._hw_preds:    deque = deque(maxlen=RMSE_WINDOW)
        self._actuals:     deque = deque(maxlen=RMSE_WINDOW)

        self.w_lstm:  float = 0.50
        self.w_arima: float = 0.30
        self.w_hw:    float = 0.20

        self.rmse_lstm:  float = 0.0
        self.rmse_arima: float = 0.0
        self.rmse_hw:    float = 0.0

    def train(self, cpu: List[float], rps: List[float]):
        self.lstm.train(cpu, rps)

    def predict(self, cpu: List[float], rps: List[float]) -> Dict:
        p_lstm  = self.lstm.predict(cpu, rps)
        p_arima = self.arima.predict(cpu)
        p_hw    = self.hw.predict(cpu)

        ensemble = (self.w_lstm * p_lstm +
                    self.w_arima * p_arima +
                    self.w_hw * p_hw)

        self._lstm_preds.append(p_lstm)
        self._arima_preds.append(p_arima)
        self._hw_preds.append(p_hw)

        if len(cpu) > 0:
            self._actuals.append(cpu[-1])

        self._update_weights()

        return {
            "lstm_cpu":           round(p_lstm, 2),
            "arima_cpu":          round(p_arima, 2),
            "holtwinters_cpu":    round(p_hw, 2),
            "ensemble_cpu":       round(float(np.clip(ensemble, 0, 100)), 2),
            "lstm_weight":        round(self.w_lstm, 3),
            "arima_weight":       round(self.w_arima, 3),
            "holtwinters_weight": round(self.w_hw, 3),
            "model_rmse": {
                "lstm":         round(self.rmse_lstm, 2),
                "arima":        round(self.rmse_arima, 2),
                "holtwinters":  round(self.rmse_hw, 2),
            },
        }

    def _update_weights(self):
        actuals = list(self._actuals)
        if len(actuals) < 5:
            return

        self.rmse_lstm  = _rmse(actuals, list(self._lstm_preds))
        self.rmse_arima = _rmse(actuals, list(self._arima_preds))
        self.rmse_hw    = _rmse(actuals, list(self._hw_preds))

        # Invert RMSE → accuracy score; add epsilon to avoid div/0
        eps = 1e-6
        s_lstm  = 1.0 / (self.rmse_lstm  + eps)
        s_arima = 1.0 / (self.rmse_arima + eps)
        s_hw    = 1.0 / (self.rmse_hw    + eps)
        total   = s_lstm + s_arima + s_hw

        raw_lstm  = s_lstm  / total
        raw_arima = s_arima / total
        raw_hw    = s_hw    / total

        # Enforce minimum weight so no model is fully silenced
        def clamp_min(w): return max(w, MIN_WEIGHT)
        w = [clamp_min(raw_lstm), clamp_min(raw_arima), clamp_min(raw_hw)]
        t = sum(w)
        self.w_lstm, self.w_arima, self.w_hw = [x/t for x in w]


ensemble_forecaster = AdaptiveEnsemble()
