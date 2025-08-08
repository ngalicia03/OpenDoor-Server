# Guía de Instalación para Windows - OpenDoor Server

## 🚨 Problema: Error de Compilación de Canvas

El error que estás viendo es porque el paquete `canvas` requiere compilación nativa en Windows. Aquí tienes varias soluciones:

## 🔧 Solución 1: Instalar Visual Studio Build Tools

### 1. Descargar Visual Studio Build Tools
```bash
# Descargar desde:
# https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
```

### 2. Instalar con las siguientes opciones:
- **Workloads**: Desktop development with C++
- **Individual Components**: 
  - MSVC v143 - VS 2022 C++ x64/x86 build tools
  - Windows 10/11 SDK

### 3. Reinstalar dependencias
```bash
npm cache clean --force
npm install
```

## 🔧 Solución 2: Usar Node.js LTS (Recomendado)

### 1. Instalar Node.js LTS
```bash
# Descargar Node.js LTS desde:
# https://nodejs.org/en/download/
# Versión recomendada: 18.x o 20.x
```

### 2. Verificar versión
```bash
node --version
# Debería mostrar v18.x.x o v20.x.x
```

### 3. Reinstalar dependencias
```bash
npm cache clean --force
npm install
```

## 🔧 Solución 3: Usar Dependencias Alternativas

### 1. Modificar package.json
Reemplaza el `package.json` actual con esta versión optimizada para Windows:

```json
{
  "name": "opendoor-server",
  "version": "1.0.0",
  "description": "Servidor para procesamiento de imágenes RTSP y reconocimiento facial",
  "main": "Server.js",
  "scripts": {
    "start": "node start.js",
    "dev": "nodemon Server.js",
    "download-models": "node downloadModels.js",
    "test": "node test-images.js",
    "test-mqtt": "node test-mqtt.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "multer": "^2.0.0-rc.3",
    "face-api.js": "^0.22.2",
    "sharp": "^0.33.0",
    "node-rtsp-stream": "^0.0.9",
    "ws": "^8.14.2",
    "mqtt": "^5.3.4",
    "@supabase/supabase-js": "^2.38.4",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.1",
    "node-cron": "^3.0.3",
    "form-data": "^4.0.0",
    "node-fetch": "^2.7.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "keywords": ["rtsp", "face-recognition", "mqtt", "supabase"],
  "author": "OpenDoor Team",
  "license": "MIT"
}
```

### 2. Modificar Server.js para usar Sharp en lugar de Canvas
```javascript
// Reemplazar las importaciones de canvas con sharp
const sharp = require('sharp');
const faceapi = require('face-api.js');

// Configurar face-api.js para usar sharp
const { Canvas, Image, ImageData } = require('canvas');
faceapi.env.monkeyPatch({
    Canvas: Canvas,
    Image: Image,
    ImageData: ImageData
});
```

## 🔧 Solución 4: Usar Docker (Más Fácil)

### 1. Crear Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    ffmpeg

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código
COPY . .

# Exponer puerto
EXPOSE 3001

# Comando de inicio
CMD ["npm", "start"]
```

### 2. Construir y ejecutar
```bash
docker build -t opendoor-server .
docker run -p 3001:3001 --env-file .env opendoor-server
```

## 🔧 Solución 5: Usar WSL2 (Recomendado para Desarrollo)

### 1. Instalar WSL2
```powershell
# En PowerShell como administrador
wsl --install
```

### 2. Instalar Ubuntu en WSL2
```bash
# En WSL2
sudo apt update
sudo apt install nodejs npm
```

### 3. Clonar proyecto en WSL2
```bash
# En WSL2
git clone <tu-repositorio>
cd OpenDoor-server
npm install
```

## 📋 Checklist de Verificación

### Después de instalar Visual Studio Build Tools:
- [ ] Visual Studio Build Tools instalado
- [ ] Desktop development with C++ workload instalado
- [ ] Windows SDK instalado
- [ ] npm cache limpiado
- [ ] Dependencias instaladas sin errores

### Después de cambiar a Node.js LTS:
- [ ] Node.js versión 18.x o 20.x instalada
- [ ] npm cache limpiado
- [ ] Dependencias instaladas sin errores

### Después de usar Docker:
- [ ] Docker instalado
- [ ] Imagen construida exitosamente
- [ ] Contenedor ejecutándose
- [ ] Puerto 3001 accesible

## 🐛 Troubleshooting Adicional

### Error: "Python not found"
```bash
# Instalar Python
# Descargar desde: https://www.python.org/downloads/
```

### Error: "Visual Studio not found"
```bash
# Instalar Visual Studio Community (gratis)
# https://visualstudio.microsoft.com/vs/community/
```

### Error: "node-gyp failed"
```bash
# Limpiar cache y reinstalar
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 🎯 Recomendación Final

**Para desarrollo en Windows, recomiendo:**

1. **Usar Node.js LTS (versión 18.x o 20.x)**
2. **Instalar Visual Studio Build Tools**
3. **O usar Docker para evitar problemas de compilación**

¿Cuál de estas soluciones prefieres intentar primero?
