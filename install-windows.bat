@echo off
echo ========================================
echo OpenDoor Server - Instalacion para Windows
echo ========================================
echo.

echo [1/5] Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js no encontrado
    echo 💡 Descarga Node.js LTS desde: https://nodejs.org/
    pause
    exit /b 1
)

echo [2/5] Verificando npm...
npm --version
if %errorlevel% neq 0 (
    echo ❌ npm no encontrado
    pause
    exit /b 1
)

echo [3/5] Limpiando cache de npm...
npm cache clean --force

echo [4/5] Instalando dependencias...
echo ⚠️  Si ves errores de canvas, considera usar Docker o WSL2
npm install

if %errorlevel% neq 0 (
    echo.
    echo ❌ Error durante la instalacion
    echo.
    echo 💡 Soluciones recomendadas:
    echo 1. Instalar Visual Studio Build Tools
    echo 2. Usar Node.js LTS (version 18.x o 20.x)
    echo 3. Usar Docker: docker build -t opendoor-server .
    echo 4. Usar WSL2 para desarrollo
    echo.
    pause
    exit /b 1
)

echo [5/5] Descargando modelos de face-api.js...
npm run download-models

if %errorlevel% neq 0 (
    echo ❌ Error descargando modelos
    pause
    exit /b 1
)

echo.
echo ✅ Instalacion completada exitosamente!
echo.
echo 📋 Pasos siguientes:
echo 1. Copiar env.example a .env
echo 2. Configurar variables de entorno en .env
echo 3. Ejecutar: npm start
echo.
pause
