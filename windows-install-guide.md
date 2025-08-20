# Guía de Instalación para Windows - OpenDoor Server Python

Esta guía te ayudará a instalar y configurar el servidor OpenDoor Python en Windows.

## 📋 Prerrequisitos

- Windows 10/11
- Permisos de administrador
- Conexión a internet

## 🐍 Paso 1: Instalar Python

### 1. Descargar Python
```bash
# Descargar Python 3.10+ desde:
# https://www.python.org/downloads/
# Versión recomendada: 3.10.x o 3.11.x
```

### 2. Opciones de instalación importantes:
- ✅ **Marcar**: "Add Python to PATH"
- ✅ **Marcar**: "Install for all users"
- ✅ **Elegir**: "Customize installation"
- ✅ **Marcar**: "pip" y "py launcher"

### 3. Verificar instalación
```powershell
python --version
# Debería mostrar: Python 3.10.x o 3.11.x

pip --version
# Debería mostrar la versión de pip
```

## 📦 Paso 2: Instalar Dependencias Python

### 1. Clonar el repositorio
```powershell
git clone <tu-repositorio>
cd OpenDoor-server
```

### 2. Instalar dependencias
```powershell
pip install -r requirements.txt
```

### 3. Verificar instalación de DeepFace
```powershell
python -c "from deepface import DeepFace; print('✅ DeepFace instalado correctamente')"
```

## 🦟 Paso 3: Instalar Mosquitto MQTT Broker

### 1. Descargar Mosquitto
```bash
# Descargar desde:
# https://mosquitto.org/download/
# Elegir: "Windows" -> "64-bit installer"
```

### 2. Instalar Mosquitto
- Ejecutar el instalador como administrador
- ✅ **Marcar**: "Service" (instalar como servicio)
- ✅ **Marcar**: "Add to PATH"

### 3. Configurar autenticación
```powershell
# Abrir PowerShell como administrador
cd "C:\Program Files\mosquitto"

# Crear archivo de contraseñas
echo mqttclient:arkus@123 > mosquitto_passwd

# Crear archivo de configuración
@"
port 1883
allow_anonymous false
password_file mosquitto_passwd
log_type all
log_timestamp true
"@ | Out-File -FilePath mosquitto.conf -Encoding utf8
```

### 4. Reiniciar servicio
```powershell
# Como administrador
net stop mosquitto
net start mosquitto
```

### 5. Verificar servicio
```powershell
sc query mosquitto
# Estado debería ser: RUNNING

netstat -an | findstr 1883
# Debería mostrar: TCP 0.0.0.0:1883 LISTENING
```

## ⚙️ Paso 4: Configurar Variables de Entorno

### 1. Copiar archivo de ejemplo
```powershell
copy env.example .env
```

### 2. Editar archivo .env
```env
# Supabase Configuration
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role

# RTSP Camera Configuration
RTSP_URL=rtsp://usuario:contraseña@ip_camara/ruta

# MQTT Configuration
MQTT_BROKER_URL=localhost
MQTT_PORT=1883
MQTT_USERNAME=mqttclient
MQTT_PASSWORD=arkus@123
MQTT_TOPIC=arkus/n1/switch/door_relay

# Zone Configuration
ZONE_ID=tu-zone-id

# Test Mode
TEST_MODE=true
```

## 🧪 Paso 5: Probar Instalación

### 1. Probar conexión MQTT
```powershell
python test_mqtt.py
```

**Salida esperada:**
```
✅ [MQTT] Conectado al broker MQTT exitosamente
✅ [MQTT] Publicación de prueba exitosa
✅ [MQTT] Cliente desconectado
```

### 2. Probar servidor principal
```powershell
python opendoor_server.py
```

**Salida esperada:**
```
✅ [SUPABASE] Cliente inicializado correctamente
✅ [MQTT] Conexión MQTT establecida
✅ [EMBEDDING] Embedding de 128 dimensiones confirmado
✅ [DOOR] Puerta abierta exitosamente
```

## 📁 Paso 6: Estructura de Archivos

Después de la instalación, deberías tener:

```
OpenDoor-server/
├── opendoor_server.py      # Servidor principal
├── test_mqtt.py           # Script de prueba MQTT
├── requirements.txt        # Dependencias Python
├── .env                   # Variables de entorno (TU CONFIGURACIÓN)
├── env.example            # Ejemplo de configuración
├── temp/                  # Imágenes de prueba
│   ├── Prueba0.png
│   └── Prueba1.png
└── models/                # Modelos de DeepFace (se descargan automáticamente)
```

## 🐛 Solución de Problemas

### Error: "Python not found"
```powershell
# Agregar Python al PATH manualmente
# Panel de Control > Sistema > Configuración avanzada del sistema
# Variables de entorno > PATH > Agregar:
# C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python310\
# C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python310\Scripts\
```

### Error: "pip not found"
```powershell
# Reinstalar pip
python -m ensurepip --upgrade
python -m pip install --upgrade pip
```

### Error: "Microsoft Visual C++ required"
```powershell
# Instalar Microsoft Visual C++ Redistributable
# Descargar desde:
# https://aka.ms/vs/17/release/vc_redist.x64.exe
```

### Error: "TensorFlow installation failed"
```powershell
# Instalar versión específica
pip uninstall tensorflow
pip install tensorflow==2.13.0
```

### Error: "No module named 'cv2'"
```powershell
# Reinstalar OpenCV
pip uninstall opencv-python
pip install opencv-python==4.8.1.78
```

### Error: "Mosquitto connection failed"
```powershell
# Verificar servicio
sc query mosquitto

# Si no está corriendo, iniciarlo
net start mosquitto

# Verificar puerto
netstat -an | findstr 1883

# Probar conexión manual
mosquitto_sub -h localhost -p 1883 -u mqttclient -P arkus@123 -t "test/topic"
```

### Error: "Supabase connection failed"
- Verificar `SUPABASE_SERVICE_ROLE_KEY` en `.env`
- Verificar conexión a internet
- Verificar URL de Supabase

## 📋 Checklist Final

### Instalación completa:
- [ ] Python 3.10+ instalado y en PATH
- [ ] pip funcionando correctamente
- [ ] Dependencias Python instaladas (requirements.txt)
- [ ] Mosquitto instalado y corriendo como servicio
- [ ] Archivo .env configurado con tus credenciales
- [ ] test_mqtt.py ejecuta exitosamente
- [ ] opendoor_server.py ejecuta exitosamente

### Para uso en producción:
- [ ] Cambiar `TEST_MODE=false` en .env
- [ ] Configurar URL de cámara RTSP
- [ ] Configurar zona específica (ZONE_ID)
- [ ] Verificar credenciales de Supabase

## 🚀 Comandos de Inicio Rápido

```powershell
# Modo de prueba (con imagen local)
python opendoor_server.py

# Probar MQTT
python test_mqtt.py

# Ver logs del servidor
python opendoor_server.py > server.log 2>&1
```

## 🎯 Recomendaciones Finales

**Para mejor rendimiento en Windows:**

1. **Usar Python 3.10.x** (más estable con TensorFlow)
2. **Instalar en SSD** para mejor rendimiento
3. **Configurar antivirus** para excluir la carpeta del proyecto
4. **Ejecutar como administrador** si hay problemas de permisos

¡Tu servidor OpenDoor Python debería estar funcionando perfectamente! 🎉
