# OpenDoor Server - Sistema de Reconocimiento Facial

## 🚀 Despliegue Rápido en Trailway

### **Opción 1: Despliegue Directo (Recomendado)**
1. Sube este código a tu repositorio de GitHub
2. En Trailway, conecta tu repositorio
3. Usa el Dockerfile incluido
4. Configura las variables de entorno (ver `env.trailway.example`)

### **Opción 2: Docker Hub**
```bash
# Construir y subir imagen
docker build -t tu-usuario/opendoor-server .
docker push tu-usuario/opendoor-server
```

### **Variables de Entorno Requeridas**
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_clave_anonima_real
RTSP_URL=rtsp://mindaccess:camara%40123@172.30.1.15/Preview_01_sub
MQTT_BROKER_URL=mqtt://172.30.1.21:1883
MQTT_USERNAME=mqttclient
MQTT_PASSWORD=arkus@123
MQTT_TOPIC=arkus/n1/switch/door_relay
PORT=3001
NODE_ENV=production
ZONE_ID=dc1a2f93-ed94-41ec-9e2d-a676659e340d
```

---

## 📋 Características

- **Reconocimiento Facial**: Procesamiento de imágenes con `face-api.js`
- **Conexión RTSP**: Captura de frames desde cámara de seguridad
- **Validación Supabase**: Verificación de usuarios con Edge Functions
- **Control MQTT**: Apertura de puerta mediante protocolo MQTT
- **Logs Automáticos**: Registro de eventos en Supabase
- **Optimizado para Nube**: Health checks y monitoreo incluidos

## 🔧 Instalación Local

### **Requisitos**
- Node.js 18+ 
- npm 8+
- FFmpeg (para procesamiento RTSP)

### **Instalación**
```bash
# Clonar repositorio
git clone <tu-repositorio>
cd OpenDoor-server

# Instalar dependencias
npm install

# Descargar modelos de face-api.js
npm run download-models

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar servidor
npm start
```

## 📡 API Endpoints

### **Health Check**
```bash
GET /health
```

### **Estado del Servidor**
```bash
GET /status
```

### **Procesar Imagen Facial**
```bash
POST /process-face
Content-Type: multipart/form-data
Body: image (file)
```

### **Procesar Frame Completo**
```bash
POST /process-frame
Content-Type: multipart/form-data
Body: image (file)
```

## 🧪 Testing

### **Probar con Imágenes**
```bash
npm run test
```

### **Probar Conexión MQTT**
```bash
npm run test-mqtt
```

## 📊 Monitoreo

### **Health Check**
```bash
curl https://tu-app.trailway.app/health
```

### **Estado del Servidor**
```bash
curl https://tu-app.trailway.app/status
```

## 🔐 Variables de Entorno

### **Requeridas**
- `SUPABASE_URL`: URL de tu proyecto Supabase
- `SUPABASE_ANON_KEY`: Clave anónima de Supabase
- `RTSP_URL`: URL de la cámara RTSP
- `MQTT_BROKER_URL`: URL del broker MQTT
- `MQTT_USERNAME`: Usuario MQTT
- `MQTT_PASSWORD`: Contraseña MQTT
- `MQTT_TOPIC`: Tópico MQTT para control de puerta
- `ZONE_ID`: ID de la zona de acceso

### **Opcionales**
- `PORT`: Puerto del servidor (default: 3001)
- `NODE_ENV`: Entorno (default: production)
- `PROCESSING_INTERVAL`: Intervalo de procesamiento (default: 1000ms)
- `FACE_DETECTION_CONFIDENCE`: Confianza mínima (default: 0.6)
- `FACE_SIMILARITY_THRESHOLD`: Umbral de similitud (default: 0.6)

## 🐳 Docker

### **Construir Imagen**
```bash
docker build -t opendoor-server .
```

### **Ejecutar Contenedor**
```bash
docker run -p 3001:3001 --env-file .env opendoor-server
```

## 📝 Logs

Los logs incluyen:
- `[MODELS]`: Carga de modelos de IA
- `[FACE_PROCESS]`: Procesamiento facial
- `[VALIDATION]`: Validación con Supabase
- `[LOG]`: Guardado de logs
- `[DOOR]`: Control de puerta MQTT
- `[RTSP]`: Procesamiento de stream RTSP
- `[MQTT]`: Conexión MQTT
- `[API]`: Endpoints de la API

## 🐛 Troubleshooting

### **Error: "Modelos no cargados"**
```bash
npm run download-models
```

### **Error: "Conexión MQTT fallida"**
- Verificar credenciales en variables de entorno
- Verificar que el broker esté accesible

### **Error: "Supabase no configurado"**
- Verificar SUPABASE_URL y SUPABASE_ANON_KEY
- Verificar que la Edge Function esté desplegada

## 📚 Documentación Adicional

- [Guía de Despliegue en Trailway](trailway-deployment.md)
- [Configuración de Variables](env.trailway.example)
- [Scripts de Instalación](install-windows.bat)

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.
