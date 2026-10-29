@echo off
setlocal
cd /d "%~dp0"
title Soundscape AI - Suite de Audio y Video

echo.
echo =======================================================
echo          SOUNDSCAPE AI - AUDIO AND VIDEO SUITE
echo =======================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor instala Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [1/3] Instalando dependencias necesarias...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Ocurrio un error al ejecutar npm install.
        pause
        exit /b 1
    )
) else (
    echo [1/3] Dependencias verificadas correctamente.
)

echo [2/3] Abriendo navegador en http://localhost:3000 ...
start http://localhost:3000

echo [3/3] Iniciando servidor de Soundscape AI...
echo.
echo -------------------------------------------------------
echo  Servidor activo en http://localhost:3000
echo  Para detener la aplicacion presiona Ctrl + C
echo -------------------------------------------------------
echo.

call npm run dev

pause
