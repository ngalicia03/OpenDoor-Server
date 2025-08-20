# OpenDoor Server - Python

Servidor de control de acceso facial usando Python, DeepFace, MQTT y Supabase.

## 🚀 Características

- **Detección Facial**: DeepFace con modelo Facenet (128 dimensiones)
- **Control MQTT**: Comunicación con broker Mosquitto para control de puerta
- **Base de Datos**: Supabase para validación de usuarios y logs
- **Modo de Prueba**: Procesamiento de imágenes locales para desarrollo
- **RTSP**: Soporte para cámaras IP en producción

## 📋 Requisitos

- Python 3.10+
- Mosquitto MQTT Broker
- Cuenta de Supabase

## 🛠️ Instalación

### 1. Clonar el repositorio
```bash
git clone <tu-repositorio>
cd OpenDoor-server
```

### 2. Instalar dependencias Python
```bash
pip install -r requirements.txt
```

### 3. Configurar variables de entorno
```bash
# Copiar archivo de ejemplo
copy env.example .env

# Editar .env con tus credenciales
```

### 4. Configurar Mosquitto
```bash
# Instalar Mosquitto desde: https://mosquitto.org/download/
# Crear usuario y contraseña
mosquitto_passwd -c mosquitto_passwd mqttclient
# Contraseña: arkus@123
```

## ⚙️ Configuración

### Variables de Entorno (.env)
```env
# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role

# MQTT
MQTT_BROKER_URL=localhost
MQTT_PORT=1883
MQTT_USERNAME=mqttclient
MQTT_PASSWORD=arkus@123
MQTT_TOPIC=arkus/n1/switch/door_relay

# Zona
ZONE_ID=tu-zone-id

# Modo de prueba
TEST_MODE=true
```

## 🚀 Uso

### Modo de Prueba (con imagen local)
```bash
python opendoor_server.py
```

### Modo Producción (con cámara RTSP)
```bash
# Cambiar TEST_MODE=false en .env
python opendoor_server.py
```

### Probar conexión MQTT
```bash
python test_mqtt.py
```

## 📁 Estructura del Proyecto

```
OpenDoor-server/
├── opendoor_server.py      # Servidor principal
├── test_mqtt.py           # Script de prueba MQTT
├── requirements.txt        # Dependencias Python
├── .env                   # Variables de entorno
├── temp/                  # Imágenes de prueba
│   ├── Prueba0.png
│   └── Prueba1.png
├── models/                # Modelos de DeepFace
└── README-Python.md       # Este archivo
```

## 🔧 Funcionalidades

### 1. Detección Facial
- Extracción de embeddings de 128 dimensiones
- Modelo Facenet optimizado
- Soporte para múltiples rostros

### 2. Validación de Usuarios
- Búsqueda en usuarios registrados
- Búsqueda en usuarios observados
- Registro automático de nuevos usuarios
- Umbrales de similitud configurables

### 3. Control de Puerta
- Comandos MQTT: ON/OFF
- QoS 1 para entrega garantizada
- Logs de todas las operaciones

### 4. Logging
- Registro en Supabase
- Información detallada de accesos
- Estadísticas de similitud

## 📊 Umbrales de Similitud

- **Usuarios Registrados**: ≤ 0.15 (85% similitud)
- **Usuarios Observados**: ≤ 0.08 (92% similitud)

## 🐛 Solución de Problemas

### Error de conexión MQTT
```bash
# Verificar servicio Mosquitto
sc query mosquitto

# Verificar puerto
netstat -an | findstr 1883

# Probar conexión
python test_mqtt.py
```

### Error de DeepFace
```bash
# Verificar instalación
pip list | findstr deepface

# Reinstalar si es necesario
pip uninstall deepface
pip install deepface==0.0.79
```

### Error de Supabase
- Verificar `SUPABASE_SERVICE_ROLE_KEY` en `.env`
- Verificar conexión a internet
- Verificar permisos de la base de datos

## 🔒 Seguridad

- Autenticación MQTT obligatoria
- Claves de servicio de Supabase
- Logs de todas las operaciones
- Validación de embeddings

## 📈 Monitoreo

- Logs en tiempo real
- Métricas de similitud
- Conteo de accesos
- Estado de conexiones

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 📞 Soporte

Para soporte técnico, contacta al equipo de desarrollo.
