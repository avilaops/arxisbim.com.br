@echo off
echo ====================================
echo ArxisVR - Iniciando todos os servicos
echo ====================================
echo.

echo [1/3] Iniciando Backend...
start "ArxisVR Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/3] Iniciando Frontend...
start "ArxisVR Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Iniciando Signaling Server...
start "ArxisVR Signaling" cmd /k "cd signaling-server && npm run dev"

echo.
echo ====================================
echo Todos os servicos iniciados!
echo ====================================
echo.
echo Servicos disponiveis em:
echo   - Backend:     http://localhost:3001
echo   - Frontend:    http://localhost:5173
echo   - Signaling:   ws://localhost:3002
echo.
echo Pressione qualquer tecla para fechar esta janela
echo (Os servicos continuaram rodando nas outras janelas)
echo.
pause
