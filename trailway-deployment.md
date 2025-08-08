# Guía de Despliegue en Trailway - OpenDoor Server

## 🚀 Configuración para Nube

Este servidor está optimizado para ejecutarse en **Trailway** y otros servicios de nube.

## 📋 Requisitos de Trailway

### **Variables de Entorno Requeridas**

Configura estas variables en el panel de Trailway:

```env
# Supabase Configuration
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_clave_anonima_real

# RTSP Camera Configuration
RTSP_URL=rtsp://mindaccess:camara%40123@172.30.1.15/Preview_01_sub

# MQTT Configuration
MQTT_BROKER_URL=mqtt://172.30.1.21:1883
MQTT_USERNAME=mqttclient
MQTT_PASSWORD=arkus@123
MQTT_TOPIC=arkus/n1/switch/door_relay

# Server Configuration
PORT=3001
NODE_ENV=production
PROCESSING_INTERVAL=1000
FACE_DETECTION_CONFIDENCE=0.6
FACE_SIMILARITY_THRESHOLD=0.6

# Zone Configuration
ZONE_ID=dc1a2f93-ed94-41ec-9e2d-a676659e340d
```

### **Configuración de Puerto**
- **Puerto**: 3001 (configurado automáticamente)
- **Protocolo**: HTTP/HTTPS
- **Bind**: 0.0.0.0 (para aceptar conexiones externas)

## 🔧 Optimizaciones para Nube

### **1. Health Checks**
El servidor incluye endpoints de monitoreo:
- `GET /health` - Health check para Trailway
- `GET /status` - Estado detallado del servidor

### **2. Gestión de Memoria**
- Optimizado para contenedores
- Limpieza automática de recursos
- Monitoreo de uso de memoria

### **3. Reconexión Automática**
- MQTT: Reconexión automática cada 5 segundos
- Supabase: Reintentos automáticos
- RTSP: Reinicio automático en caso de desconexión

## 🐳 Despliegue con Docker

### **Opción 1: Docker Hub**
```bash
# Construir imagen
docker build -t opendoor-server .

# Subir a Docker Hub
docker tag opendoor-server tu-usuario/opendoor-server
docker push tu-usuario/opendoor-server

# En Trailway, usar: tu-usuario/opendoor-server:latest
```

### **Opción 2: GitHub Container Registry**
```bash
# Construir y subir a GitHub
docker build -t ghcr.io/tu-usuario/opendoor-server .
docker push ghcr.io/tu-usuario/opendoor-server
```

### **Opción 3: Despliegue Directo**
Subir el código directamente a Trailway y usar el Dockerfile incluido.

## 📊 Monitoreo y Logs

### **Endpoints de Monitoreo**
```bash
# Health check
curl https://tu-app.trailway.app/health

# Estado del servidor
curl https://tu-app.trailway.app/status
```

### **Logs en Trailway**
- Los logs aparecen en el panel de Trailway
- Formato: `[TIMESTAMP] [LEVEL] [MODULE] Mensaje`
- Niveles: INFO, WARN, ERROR

### **Métricas Disponibles**
- Uptime del servidor
- Uso de memoria
- Estado de conexiones (MQTT, Supabase)
- Modelos cargados

## 🔐 Seguridad

### **Variables de Entorno**
- **Nunca** committear `.env` al repositorio
- Usar variables de entorno de Trailway
- Rotar claves regularmente

### **Redes**
- El servidor escucha en `0.0.0.0:3001`
- Firewall configurado por Trailway
- Conexiones externas controladas

### **Usuario del Contenedor**
- Ejecuta como usuario no-root (nodejs)
- Permisos mínimos necesarios
- Aislamiento de procesos

## 🚀 Comandos de Despliegue

### **Inicio Automático**
```bash
# El servidor inicia automáticamente con:
npm start
```

### **Descarga de Modelos**
```bash
# Los modelos se descargan automáticamente en:
npm run postinstall
```

### **Verificación de Estado**
```bash
# Verificar que todo funciona:
curl https://tu-app.trailway.app/health
```

## 🔄 CI/CD Pipeline

### **GitHub Actions (Opcional)**
```yaml
name: Deploy to Trailway
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Trailway
        run: |
          # Comandos de despliegue específicos de Trailway
```

## 📈 Escalabilidad

### **Recursos Recomendados**
- **CPU**: 1-2 cores
- **RAM**: 2-4 GB
- **Almacenamiento**: 1-2 GB
- **Red**: 100 Mbps

### **Optimizaciones**
- Modelos precargados en memoria
- Procesamiento asíncrono
- Cola de procesamiento de frames
- Limpieza automática de archivos temporales

## 🐛 Troubleshooting

### **Error: "Modelos no cargados"**
```bash
# Verificar que los modelos se descargaron
ls -la models/
```

### **Error: "Conexión MQTT fallida"**
- Verificar credenciales en variables de entorno
- Verificar que el broker esté accesible desde Trailway
- Revisar logs de conexión

### **Error: "Supabase no configurado"**
- Verificar SUPABASE_URL y SUPABASE_ANON_KEY
- Verificar que la Edge Function esté desplegada
- Revisar logs de validación

### **Error: "RTSP no conecta"**
- Verificar que la cámara esté accesible desde Trailway
- Verificar credenciales de la cámara
- Considerar usar VPN si es necesario

## 📞 Soporte

### **Logs de Debug**
```bash
# Habilitar logs detallados
NODE_ENV=development npm start
```

### **Contacto**
- Revisar logs en el panel de Trailway
- Verificar endpoints de health check
- Monitorear métricas de rendimiento

## ✅ Checklist de Despliegue

- [ ] Variables de entorno configuradas en Trailway
- [ ] Dockerfile optimizado para producción
- [ ] Health checks funcionando
- [ ] Modelos descargados automáticamente
- [ ] Conexión MQTT establecida
- [ ] Conexión Supabase funcionando
- [ ] RTSP configurado (si aplica)
- [ ] Logs apareciendo en Trailway
- [ ] Endpoints respondiendo correctamente
- [ ] Monitoreo configurado

## 🎯 Configuración Final

Una vez desplegado en Trailway:

1. **Configurar variables de entorno** en el panel de Trailway
2. **Verificar health checks** en `/health`
3. **Probar endpoints** con imágenes de prueba
4. **Monitorear logs** para detectar problemas
5. **Configurar alertas** si es necesario

¡El servidor está listo para funcionar en producción en Trailway!
