@echo off
title SmartCloud v2
echo.
echo  =============================================
echo    SmartCloud v2 - Adaptive Predictive Scaling
echo  =============================================
echo.
docker info >nul 2>&1
IF ERRORLEVEL 1 (echo [ERROR] Docker Desktop not running. Start it first. & pause & exit /b 1)
echo [OK] Docker running. Building all services (first run: 5-10 min)...
echo.
docker-compose up --build -d
IF ERRORLEVEL 1 (echo [ERROR] Build failed. Run: docker-compose logs & pause & exit /b 1)
echo.
echo  All services started!
echo  Dashboard  -> http://localhost:3000
echo  API Docs   -> http://localhost:8000/docs
echo  Prometheus -> http://localhost:9090
echo.
echo  Wait 30-60 seconds then open the dashboard.
pause
