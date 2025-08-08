# Guía de Pruebas - OpenDoor Server

## 🚀 Configuración Inicial

### 1. Instalar dependencias
```bash
npm install
```

### 2. Descargar modelos de face-api.js
```bash
npm run download-models
```

### 3. Configurar variables de entorno
```bash
cp env.example .env
```

Editar `.env` con tus credenciales reales:
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
PROCESSING_INTERVAL=1000
FACE_DETECTION_CONFIDENCE=0.6
FACE_SIMILARITY_THRESHOLD=0.6

# Zone Configuration
ZONE_ID=dc1a2f93-ed94-41ec-9e2d-a676659e340d
```

## 🧪 Métodos de Prueba

### **Método 1: Prueba con Imagen Local**

1. **Iniciar servidor:**
```bash
npm start
```

2. **Probar endpoint de detección facial:**
```bash
curl -X POST http://localhost:3001/process-face \
  -F "image=@ruta/a/tu/imagen.jpg"
```

3. **Probar endpoint completo:**
```bash
curl -X POST http://localhost:3001/process-frame \
  -F "image=@ruta/a/tu/imagen.jpg"
```

4. **Verificar estado del servidor:**
```bash
curl http://localhost:3001/status
```

### **Método 2: Prueba con RTSP Simulado**

1. **Crear stream RTSP de prueba:**
```bash
# Instalar FFmpeg si no está instalado
# Ubuntu/Debian: sudo apt install ffmpeg
# Windows: Descargar desde https://ffmpeg.org/download.html

# Crear stream RTSP de prueba
ffmpeg -re -f lavfi -i testsrc=duration=60:size=640x480:rate=1 \
  -f lavfi -i sine=frequency=1000:duration=60 \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -c:a aac -f rtsp rtsp://localhost:8554/test
```

2. **Configurar URL RTSP de prueba en .env:**
```env
RTSP_URL=rtsp://localhost:8554/test
```

3. **Iniciar servidor y ver logs:**
```bash
npm start
```

### **Método 3: Prueba con Imágenes de Prueba**

1. **Crear directorio de pruebas:**
```bash
mkdir test-images
```

2. **Descargar imágenes de prueba:**
```bash
# Usar imágenes con rostros claros
# Puedes usar fotos tuyas o de familiares para probar
```

3. **Script de prueba automatizada:**
```bash
# Crear script test-images.js
node test-images.js
```

### **Método 4: Prueba de Integración Completa**

1. **Verificar conexión MQTT:**
```bash
# Instalar cliente MQTT
npm install -g mqtt-cli

# Suscribirse al tópico para ver mensajes
mqtt sub -h 172.30.1.21 -p 1883 -u mqttclient -P arkus@123 \
  -t "arkus/n1/switch/door_relay"
```

2. **Verificar logs en Supabase:**
- Ir a tu dashboard de Supabase
- Navegar a la tabla `logs`
- Verificar que se están insertando registros

## 🔧 Scripts de Prueba

### **test-images.js**
```javascript
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testWithImages() {
    const testDir = path.join(__dirname, 'test-images');
    const images = fs.readdirSync(testDir).filter(f => f.endsWith('.jpg'));
    
    for (const image of images) {
        console.log(`🧪 Probando con imagen: ${image}`);
        
        const form = new FormData();
        form.append('image', fs.createReadStream(path.join(testDir, image)));
        
        try {
            const response = await fetch('http://localhost:3001/process-frame', {
                method: 'POST',
                body: form
            });
            
            const result = await response.json();
            console.log(`✅ Resultado:`, result);
        } catch (error) {
            console.error(`❌ Error:`, error.message);
        }
        
        // Esperar entre pruebas
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

testWithImages();
```

### **test-mqtt.js**
```javascript
const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://172.30.1.21:1883', {
    username: 'mqttclient',
    password: 'arkus@123'
});

client.on('connect', () => {
    console.log('✅ Conectado a MQTT');
    
    // Publicar mensaje de prueba
    const message = JSON.stringify({
        action: 'test',
        timestamp: new Date().toISOString()
    });
    
    client.publish('arkus/n1/switch/door_relay', message, (error) => {
        if (error) {
            console.error('❌ Error enviando mensaje:', error);
        } else {
            console.log('✅ Mensaje de prueba enviado');
        }
        client.end();
    });
});

client.on('error', (error) => {
    console.error('❌ Error MQTT:', error);
});
```

## 📊 Verificación de Resultados

### **1. Logs del Servidor**
```bash
# Ver logs en tiempo real
npm start
```

### **2. Verificar Supabase**
- Dashboard → Table Editor → logs
- Verificar que se insertan registros

### **3. Verificar MQTT**
```bash
# Suscribirse para ver mensajes
mqtt sub -h 172.30.1.21 -p 1883 -u mqttclient -P arkus@123 \
  -t "arkus/n1/switch/door_relay"
```

### **4. Verificar Estado del Servidor**
```bash
curl http://localhost:3001/status
```

Respuesta esperada:
```json
{
  "status": "running",
  "modelsLoaded": true,
  "mqttConnected": true,
  "supabaseConfigured": true,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🐛 Troubleshooting

### **Error: "Modelos no cargados"**
```bash
npm run download-models
```

### **Error: "FFmpeg no encontrado"**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows
# Descargar desde https://ffmpeg.org/download.html
```

### **Error: "Conexión MQTT fallida"**
- Verificar IP del broker
- Verificar credenciales
- Verificar firewall

### **Error: "Supabase no configurado"**
- Verificar SUPABASE_URL y SUPABASE_ANON_KEY
- Verificar que la tabla `logs` existe

## 📝 Checklist de Pruebas

- [ ] Servidor inicia sin errores
- [ ] Modelos de face-api.js se cargan
- [ ] Conexión MQTT exitosa
- [ ] Conexión Supabase exitosa
- [ ] Endpoint `/status` responde
- [ ] Endpoint `/process-face` funciona
- [ ] Endpoint `/process-frame` funciona
- [ ] Logs se guardan en Supabase
- [ ] Mensajes MQTT se envían
- [ ] RTSP se conecta (si está disponible)
