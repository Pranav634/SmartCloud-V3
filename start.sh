#!/bin/bash
set -e
echo ""
echo " ============================================="
echo "   SmartCloud v2 - Adaptive Predictive Scaling"
echo " ============================================="
echo ""
if ! docker info > /dev/null 2>&1; then
  echo "[ERROR] Docker not running. Start Docker Desktop first."
  exit 1
fi
echo "[OK] Docker running. Building all services..."
docker-compose up --build -d
echo ""
echo " All services started!"
echo "  Dashboard  ->  http://localhost:3000"
echo "  API Docs   ->  http://localhost:8000/docs"
echo "  Prometheus ->  http://localhost:9090"
echo ""
echo "  Wait 30-60s then open the dashboard."
