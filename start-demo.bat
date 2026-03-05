@echo off
chcp 65001 >nul
echo ========================================
echo   Device Predictive Maintenance Demo
echo ========================================
echo.

REM Check demo data
echo [1/4] Checking demo data...
if not exist "demo\device_predictive_maintenance\data\devices.json" (
    echo   Generating demo data...
    cd demo\device_predictive_maintenance\data
    python generator.py
    if errorlevel 1 (
        echo   ERROR: Data generation failed!
        cd ..\..\..
        pause
        exit /b 1
    )
    cd ..\..\..
    echo   OK: Data generated
) else (
    echo   OK: Data exists
)

echo.

REM Check backend API route registration
echo [2/4] Checking backend integration...
findstr /C:"device_demo_router" backend\api\registry.py >nul 2>&1
if errorlevel 1 (
    echo   WARNING: Backend API route not registered!
    echo   Please add to backend/api/registry.py:
    echo     from demo.device_predictive_maintenance.backend.api.router import router as device_demo_router
    echo     app.include_router(device_demo_router, tags=["设备维护演示"])
    echo.
    echo   Continuing anyway (you can register it later)...
) else (
    echo   OK: Backend route registered
)

echo.

REM Check frontend files
echo [3/4] Checking frontend files...
set NEED_COPY=0

REM Check if components exist
if not exist "frontend\components\device-demo\RealtimeDataStream.tsx" (
    set NEED_COPY=1
)

REM Check if demo page exists (optional)
if not exist "frontend\app\device-demo\page.tsx" (
    set NEED_COPY=1
)

if %NEED_COPY%==1 (
    echo   Copying frontend files...
    
    REM Copy components (required for device page)
    set SOURCE_COMPONENTS=%CD%\demo\device_predictive_maintenance\frontend\components\device-demo
    set TARGET_COMPONENTS=%CD%\frontend\components\device-demo
    
    if exist "%SOURCE_COMPONENTS%" (
        if not exist "%CD%\frontend\components" mkdir "%CD%\frontend\components"
        if exist "%TARGET_COMPONENTS%" (
            rmdir /S /Q "%TARGET_COMPONENTS%"
        )
        xcopy /E /I /Y "%SOURCE_COMPONENTS%" "%TARGET_COMPONENTS%"
        if errorlevel 1 (
            echo   ERROR: Failed to copy components!
        ) else (
            echo   OK: Components copied
        )
    ) else (
        echo   WARNING: Source components not found at %SOURCE_COMPONENTS%
        echo   Device page may not work properly without these components
    )
    
    REM Copy demo page (optional)
    set SOURCE_PAGE=%CD%\demo\device_predictive_maintenance\frontend\app\device-demo
    set TARGET_PAGE=%CD%\frontend\app\device-demo
    
    if exist "%SOURCE_PAGE%" (
        if not exist "%CD%\frontend\app" mkdir "%CD%\frontend\app"
        if exist "%TARGET_PAGE%" (
            rmdir /S /Q "%TARGET_PAGE%"
        )
        xcopy /E /I /Y "%SOURCE_PAGE%" "%TARGET_PAGE%"
        if errorlevel 1 (
            echo   WARNING: Failed to copy demo page
        ) else (
            echo   OK: Demo page copied
        )
    )
) else (
    echo   OK: Frontend files exist
)

echo.

REM Start services
echo [4/4] Starting services...
echo.

REM Get current directory
set CURRENT_DIR=%CD%

REM Generate health data if not exists
echo   Checking health data...
if not exist "demo\device_predictive_maintenance\data\device_health_data.json" (
    echo   Generating health data...
    python demo\device_predictive_maintenance\data\generate_health_data.py
    if errorlevel 1 (
        echo   WARNING: Health data generation failed, will use fallback
    )
)

REM Start backend
echo   Starting backend service (port 8000)...
start "Backend Server" cmd /k "cd /d %CURRENT_DIR% && set PYTHONPATH=%CURRENT_DIR% && python -m uvicorn backend.main:app --reload --port 8000"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo   Starting frontend service (port 3000)...
cd /d %CURRENT_DIR%\frontend
if not exist node_modules (
    echo   Installing frontend dependencies...
    call pnpm install
)
cd /d %CURRENT_DIR%
start "Frontend Server" cmd /k "cd /d %CURRENT_DIR%\frontend && pnpm dev"

echo.
echo ========================================
echo   Demo system started!
echo ========================================
echo.
echo Access URLs:
echo   Frontend: http://localhost:3000/device
echo   API Docs:  http://localhost:8000/docs
echo.
echo Tips:
echo   - Wait a few seconds for services to fully start
echo   - Check the new command windows for service status
echo.
pause
