"""
SmartCloud v3 — Master Orchestration Scheduler
Integrates all 6 innovations including Event-Driven Proactive Scaling.
"""
import asyncio
import logging
from datetime import datetime, timezone

from app.store import store, PredictionPoint, ScalingEvent, AnomalyEvent
from models.ensemble    import ensemble_forecaster
from models.anomaly     import xai_detector
from models.decision    import decision_engine
from models.fingerprint import pattern_library
from models.event_engine import event_engine

logger = logging.getLogger(__name__)

PREDICT_EVERY = 4
RETRAIN_EVERY = 60


class MasterScheduler:
    def __init__(self):
        self._running = False
        self._tick    = 0
        self._trained = False

    def stop(self): self._running = False

    async def run(self):
        self._running = True
        logger.info("MasterScheduler v3 started.")
        while self._running:
            try:
                await asyncio.sleep(2)
                self._tick += 1
                if self._tick % RETRAIN_EVERY == 0:
                    self._retrain()
                if self._tick % PREDICT_EVERY == 0:
                    self._prediction_cycle()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Scheduler error: %s", e)

    def _retrain(self):
        ms = store.get_metrics(200)
        if len(ms) < 30: return
        cpu = [m.cpu_utilization    for m in ms]
        rps = [m.request_rate       for m in ms]
        mem = [m.memory_utilization for m in ms]
        rt  = [m.response_time_ms   for m in ms]
        ensemble_forecaster.train(cpu, rps)
        xai_detector.train(cpu, mem, rps, rt)
        self._trained = True

    def _prediction_cycle(self):
        ms = store.get_metrics(100)
        if len(ms) < 8: return
        latest = ms[-1]
        cpu = [m.cpu_utilization    for m in ms]
        rps = [m.request_rate       for m in ms]
        mem = [m.memory_utilization for m in ms]
        rt  = [m.response_time_ms   for m in ms]

        # Pattern fingerprinting
        pattern_match = pattern_library.match(cpu[-32:])
        if pattern_match:
            pattern_library.learn(cpu[-32:])

        # Ensemble forecast
        forecast = ensemble_forecaster.predict(cpu, rps)
        pred_cpu = forecast["ensemble_cpu"]

        # Anomaly detection
        anom = xai_detector.detect(latest.cpu_utilization, latest.memory_utilization,
                                   latest.request_rate, latest.response_time_ms)
        anomaly_hold = False
        if anom:
            anomaly_hold = anom["severity"] == "high"
            store.add_anomaly(AnomalyEvent(
                timestamp   = datetime.now(timezone.utc).isoformat(),
                root_cause  = anom["root_cause"],
                explanation = anom["explanation"],
                severity    = anom["severity"],
                z_score     = anom["z_score"],
                metrics     = anom["metrics"],
            ))

        # SLA-Cost-Carbon MPC decision
        ml_rec, reason, sla_risk, cost_score, carbon_score = decision_engine.decide(
            predicted_cpu     = pred_cpu,
            current_instances = store.current_instances,
            anomaly_hold      = anomaly_hold,
            sla_w             = store.sla_weight,
            cost_w            = store.cost_weight,
            carbon_w          = store.carbon_weight,
        )

        # Pattern override
        if pattern_match and pattern_match.similarity > 0.90 and not anomaly_hold:
            ml_rec = max(1, min(20, round(0.8 * ml_rec + 0.2 * pattern_match.recommended_base)))

        # === EVENT ENGINE OVERRIDE (highest priority) ===
        event_rec = event_engine.get_recommendation(ml_rec, store.current_instances)
        final_rec = event_rec["instances"]
        if event_rec["source"] in ("event", "pattern"):
            reason       = event_rec["reason"]
            triggered_by = event_rec["source"]
        else:
            triggered_by = "pattern" if (pattern_match and pattern_match.similarity > 0.90) else "ensemble"

        # Store prediction
        conf = 0.92 if self._trained else 0.62
        if anom: conf *= 0.85
        store.add_prediction(PredictionPoint(
            timestamp             = datetime.now(timezone.utc).isoformat(),
            lstm_cpu              = forecast["lstm_cpu"],
            arima_cpu             = forecast["arima_cpu"],
            holtwinters_cpu       = forecast["holtwinters_cpu"],
            ensemble_cpu          = forecast["ensemble_cpu"],
            lstm_weight           = forecast["lstm_weight"],
            arima_weight          = forecast["arima_weight"],
            holtwinters_weight    = forecast["holtwinters_weight"],
            predicted_rps         = 0.0,
            recommended_instances = final_rec,
            confidence            = round(conf, 2),
            model_rmse            = forecast["model_rmse"],
        ))

        # Execute scaling
        if final_rec != store.current_instances:
            action = "scale_out" if final_rec > store.current_instances else "scale_in"
            if "carbon_hold" in reason: action = "carbon_hold"
            if event_rec["source"] == "event": action = "event_prewarm"
            store.add_scaling_event(ScalingEvent(
                timestamp      = datetime.now(timezone.utc).isoformat(),
                action         = action,
                from_instances = store.current_instances,
                to_instances   = final_rec,
                reason         = reason,
                triggered_by   = triggered_by,
                sla_risk       = sla_risk,
                cost_score     = cost_score,
                carbon_score   = carbon_score,
            ))

        # === REAL-WORLD ENGINE HOOKS ===
        from models.realworld import (incident_engine, cost_forecaster,
                                      geo_simulator, sla_forecaster)
        # Progress any open incidents
        incident_engine.progress_incidents()

        # Open new incident if high anomaly detected
        if anom and anom["severity"] == "high":
            incident_engine.open_incident(anom["root_cause"], anom["severity"])

        # Record cost tick
        reactive_would_use = max(store.current_instances + 2, 1)
        cost_forecaster.record_tick(store.current_instances, reactive_would_use)

        # === WEBSOCKET BROADCAST + NOTIFICATIONS ===
        from app.routes.realtime import ws_manager, notif_center
        if ws_manager.count > 0:
            import asyncio
            latest = store.get_latest_metric()
            if latest:
                asyncio.create_task(ws_manager.broadcast({
                    "type": "tick",
                    "cpu": round(latest.cpu_utilization, 1),
                    "mem": round(latest.memory_utilization, 1),
                    "rps": round(latest.request_rate),
                    "rt":  round(latest.response_time_ms),
                    "instances": store.current_instances,
                    "scenario": store.current_scenario,
                    "carbon": latest.carbon_intensity,
                }))

        if event_rec["source"] in ("event","pattern") and final_rec != store.current_instances:
            notif_center.push("event","info",
                f"Event scaling: {store.current_instances}→{final_rec}",
                event_rec.get("reason","Pre-warm or pattern triggered"))

        if anom and anom["severity"] == "high":
            notif_center.push("anomaly","critical",
                f"P1 anomaly: {anom['root_cause'].replace('_',' ')}",
                anom["explanation"])
        elif anom and anom["severity"] == "medium":
            notif_center.push("anomaly","warning",
                f"Anomaly: {anom['root_cause'].replace('_',' ')}",
                anom["explanation"])

        if "carbon_hold" in reason:
            notif_center.push("carbon","info","Carbon hold applied",
                "Scale-out deferred — grid intensity too high")
