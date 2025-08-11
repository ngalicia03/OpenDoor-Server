const express = require('express');
const multer = require('multer');
const faceapi = require('face-api.js');
const { createCanvas, loadImage } = require('canvas');
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const RTSPProcessor = require('./rtspProcessor');

// Solo cargar .env en desarrollo, no en producción
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
    console.log('🔧 [DEV] Cargando variables desde archivo .env');
} else {
    console.log('🚀 [PROD] Usando variables de entorno del sistema');
}

// Configuración
const app = express();
const PORT = process.env.PORT || 3001;
const PROCESSING_INTERVAL = parseInt(process.env.PROCESSING_INTERVAL) || 1000;
const FACE_DETECTION_CONFIDENCE = parseFloat(process.env.FACE_DETECTION_CONFIDENCE) || 0.6;
const FACE_SIMILARITY_THRESHOLD = parseFloat(process.env.FACE_SIMILARITY_THRESHOLD) || 0.6;

// Configurar canvas para face-api.js (optimizado para nube)
const canvas = require('canvas');
faceapi.env.monkeyPatch({
    Canvas: canvas.Canvas,
    Image: canvas.Image,
    ImageData: canvas.ImageData,
    createCanvas: canvas.createCanvas,
    createImageData: canvas.createImageData
});

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;

// Inicializar Supabase solo si las variables están disponibles
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ [SUPABASE] Cliente inicializado correctamente');
} else {
    console.warn('⚠️ [SUPABASE] Variables de entorno no configuradas - Supabase no disponible');
}

// Configurar MQTT
let mqttClient = null;

// Inicializar MQTT solo si las variables están disponibles
if (process.env.MQTT_BROKER_URL && process.env.MQTT_USERNAME && process.env.MQTT_PASSWORD) {
    mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL, {
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
        keepalive: 60
    });
    console.log('✅ [MQTT] Cliente inicializado correctamente');
} else {
    console.warn('⚠️ [MQTT] Variables de entorno no configuradas - MQTT no disponible');
}

// Variables globales
let faceDetectionNet;
let faceRecognitionNet;
let faceLandmarkNet;
let isModelsLoaded = false;
let lastProcessedTime = 0;
const PROCESSING_COOLDOWN = 5000; // 5 segundos entre procesamientos
let rtspProcessor = null;

// Configurar multer para subida de archivos
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint simple y robusto
app.get('/health', (req, res) => {
    try {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            modelsLoaded: isModelsLoaded || false,
            mqttConnected: mqttClient?.connected || false,
            server: 'running'
        });
    } catch (error) {
        console.error('❌ [HEALTH] Error en health check:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Health check endpoint simple (sin dependencias)
app.get('/ping', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Función para cargar modelos de face-api.js
async function loadFaceApiModels() {
    try {
        console.log('🔄 [MODELS] Cargando modelos de face-api.js...');
        
        // Cargar modelos desde el directorio models
        await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
        await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
        await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');
        
        faceDetectionNet = faceapi.nets.ssdMobilenetv1;
        faceLandmarkNet = faceapi.nets.faceLandmark68Net;
        faceRecognitionNet = faceapi.nets.faceRecognitionNet;
        
        isModelsLoaded = true;
        console.log('✅ [MODELS] Modelos cargados exitosamente');
    } catch (error) {
        console.error('❌ [MODELS] Error cargando modelos:', error);
        isModelsLoaded = false;
    }
}

// Función para procesar imagen y extraer embedding
async function processFaceImage(imageBuffer) {
    try {
        if (!isModelsLoaded) {
            throw new Error('Modelos de face-api.js no están cargados');
        }

        console.log('🔄 [FACE_PROCESS] Procesando imagen para detección facial...');

        // Cargar imagen
        const image = await loadImage(imageBuffer);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);

        // Detectar rostros
        const detections = await faceapi.detectAllFaces(canvas)
            .withFaceLandmarks()
            .withFaceDescriptors();

        if (detections.length === 0) {
            console.log('❌ [FACE_PROCESS] No se detectaron rostros en la imagen');
            return null;
        }

        // Obtener el rostro con mayor confianza
        const bestDetection = detections.reduce((best, current) => {
            return current.detection.score > best.detection.score ? current : best;
        });

        if (bestDetection.detection.score < FACE_DETECTION_CONFIDENCE) {
            console.log(`❌ [FACE_PROCESS] Confianza muy baja: ${bestDetection.detection.score}`);
            return null;
        }

        console.log(`✅ [FACE_PROCESS] Rostro detectado con confianza: ${bestDetection.detection.score}`);
        
        // Extraer descriptor (embedding)
        const descriptor = bestDetection.descriptor;
        
        return {
            embedding: Array.from(descriptor),
            confidence: bestDetection.detection.score
        };

    } catch (error) {
        console.error('❌ [FACE_PROCESS] Error procesando imagen:', error);
        return null;
    }
}

// Función para validar rostro con Supabase
async function validateFaceWithSupabase(embedding, imageBuffer) {
    try {
        // Verificar si Supabase está disponible
        if (!supabase) {
            console.warn('⚠️ [VALIDATION] Supabase no disponible - saltando validación');
            return {
                hasAccess: false,
                user: null,
                type: 'no_supabase',
                message: 'Supabase no configurado',
                similarity: 0
            };
        }

        console.log('🔍 [VALIDATION] Validando rostro con Supabase...');

        // Convertir imagen a base64
        const imageBase64 = imageBuffer.toString('base64');

        // Preparar payload para la Edge Function
        const payload = {
            faceEmbedding: embedding,
            zoneId: process.env.ZONE_ID,
            imageData: imageBase64
        };

        // Llamar a la Edge Function
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/validate-user-face`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
        };

        const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            console.log(`✅ [VALIDATION] Respuesta de Edge Function: ${result.type || 'unknown'}`);

            // Extraer información del resultado
            const userData = result.user || {};
            const hasAccess = userData.hasAccess || false;
            const userName = userData.full_name || 'Desconocido';
            const userType = userData.user_type || 'unknown';

            return {
                hasAccess: hasAccess,
                user: {
                    id: userData.id || 'N/A',
                    full_name: userName,
                    user_type: userType
                },
                type: result.type || 'unknown',
                message: result.message || '',
                similarity: userData.similarity || 0
            };
        } else {
            console.error(`❌ [VALIDATION] Error de Edge Function: ${response.status}`);
            const errorText = await response.text();
            console.error(`❌ [VALIDATION] Respuesta: ${errorText}`);
            
            return {
                hasAccess: false,
                user: null,
                type: 'error',
                message: `Edge Function error: ${response.status}`,
                similarity: 0
            };
        }

    } catch (error) {
        console.error('❌ [VALIDATION] Error validando con Supabase:', error);
        return {
            hasAccess: false,
            user: null,
            type: 'error',
            message: `Validation error: ${error.message}`,
            similarity: 0
        };
    }
}

// Función para guardar log en Supabase
async function saveLogToSupabase(validationResult, confidence = null) {
    try {
        // Verificar si Supabase está disponible
        if (!supabase) {
            console.warn('⚠️ [LOG] Supabase no disponible - saltando guardado de log');
            return false;
        }

        console.log('📝 [LOG] Guardando log en Supabase...');

        const logEntry = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            has_access: validationResult.hasAccess,
            user_id: validationResult.user?.id || null,
            user_name: validationResult.user?.full_name || null,
            user_type: validationResult.type,
            zone_id: process.env.ZONE_ID,
            source: 'trailway_server',
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('logs')
            .insert(logEntry);

        if (error) {
            console.error('❌ [LOG] Error guardando log:', error);
            return false;
        }

        console.log('✅ [LOG] Log guardado exitosamente');
        return true;

    } catch (error) {
        console.error('❌ [LOG] Error guardando log:', error);
        return false;
    }
}

// Función para controlar puerta via MQTT
async function controlDoorViaMQTT(validationResult) {
    try {
        // Verificar si MQTT está disponible
        if (!mqttClient) {
            console.warn('⚠️ [DOOR] MQTT no disponible - saltando control de puerta');
            return false;
        }

        if (validationResult.hasAccess && validationResult.user) {
            console.log(`🔓 [DOOR] Abriendo puerta para: ${validationResult.user.full_name}`);

            // Publicar mensaje MQTT para abrir puerta
            const message = JSON.stringify({
                action: 'open',
                user: validationResult.user.full_name,
                timestamp: new Date().toISOString(),
                source: 'trailway_server'
            });

            mqttClient.publish(process.env.MQTT_TOPIC, message, (error) => {
                if (error) {
                    console.error('❌ [DOOR] Error enviando comando MQTT:', error);
                } else {
                    console.log('✅ [DOOR] Comando MQTT enviado exitosamente');
                }
            });

            return true;
        } else {
            console.log('⚠️ [DOOR] No se abre la puerta (sin acceso)');
            return false;
        }

    } catch (error) {
        console.error('❌ [DOOR] Error controlando puerta:', error);
        return false;
    }
}

// Función para procesar frame completo
async function processFrame(imageBuffer) {
    try {
        console.log('🔄 [PROCESS_FRAME] Iniciando procesamiento de frame...');

        // Verificar cooldown
        const now = Date.now();
        if (now - lastProcessedTime < PROCESSING_COOLDOWN) {
            console.log('⏳ [PROCESS_FRAME] Esperando cooldown...');
            return;
        }
        lastProcessedTime = now;

        // 1. Procesar imagen con face-api.js
        const faceResult = await processFaceImage(imageBuffer);
        if (!faceResult) {
            console.log('❌ [PROCESS_FRAME] No se pudo procesar rostro');
            return;
        }

        // 2. Validar con Supabase
        const validationResult = await validateFaceWithSupabase(faceResult.embedding, imageBuffer);

        // 3. Guardar log
        await saveLogToSupabase(validationResult, faceResult.confidence);

        // 4. Controlar puerta si hay acceso
        if (validationResult.hasAccess) {
            await controlDoorViaMQTT(validationResult);
        }

        console.log('✅ [PROCESS_FRAME] Procesamiento completado');

    } catch (error) {
        console.error('❌ [PROCESS_FRAME] Error procesando frame:', error);
    }
}

// Endpoint para procesar imagen subida
app.post('/process-face', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó imagen'
            });
        }

        console.log('📷 [API] Procesando imagen subida...');

        const faceResult = await processFaceImage(req.file.buffer);
        
        if (!faceResult) {
            return res.json({
                success: false,
                error: 'No se detectó rostro en la imagen'
            });
        }

        res.json({
            success: true,
            embedding: faceResult.embedding,
            confidence: faceResult.confidence
        });

    } catch (error) {
        console.error('❌ [API] Error procesando imagen:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para procesar frame completo (incluyendo validación)
app.post('/process-frame', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó imagen'
            });
        }

        console.log('📷 [API] Procesando frame completo...');

        // Procesar frame completo
        await processFrame(req.file.buffer);

        res.json({
            success: true,
            message: 'Frame procesado exitosamente'
        });

    } catch (error) {
        console.error('❌ [API] Error procesando frame:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint de estado del servidor
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        modelsLoaded: isModelsLoaded,
        mqttConnected: mqttClient?.connected || false,
        supabaseConfigured: !!(supabaseUrl && supabaseKey && supabase),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production'
    });
});

// Endpoint de debug para variables de entorno
app.get('/debug/env', (req, res) => {
    res.json({
        SUPABASE_URL: process.env.SUPABASE_URL ? 
            `✅ Configurada (${process.env.SUPABASE_URL.substring(0, 20)}...)` : 
            '❌ No configurada',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 
            `✅ Configurada (${process.env.SUPABASE_ANON_KEY.substring(0, 10)}...)` : 
            '❌ No configurada',
        RTSP_URL: process.env.RTSP_URL ? 
            `✅ Configurada (${process.env.RTSP_URL.substring(0, 30)}...)` : 
            '❌ No configurada',
        MQTT_BROKER_URL: process.env.MQTT_BROKER_URL ? 
            `✅ Configurada (${process.env.MQTT_BROKER_URL})` : 
            '❌ No configurada',
        MQTT_USERNAME: process.env.MQTT_USERNAME ? 
            `✅ Configurada (${process.env.MQTT_USERNAME})` : 
            '❌ No configurada',
        MQTT_PASSWORD: process.env.MQTT_PASSWORD ? 
            `✅ Configurada (${process.env.MQTT_PASSWORD.substring(0, 3)}...)` : 
            '❌ No configurada',
        MQTT_TOPIC: process.env.MQTT_TOPIC ? 
            `✅ Configurada (${process.env.MQTT_TOPIC})` : 
            '❌ No configurada',
        ZONE_ID: process.env.ZONE_ID ? 
            `✅ Configurada (${process.env.ZONE_ID.substring(0, 8)}...)` : 
            '❌ No configurada',
        PORT: process.env.PORT || '3001 (default)',
        NODE_ENV: process.env.NODE_ENV || 'production',
        // Debug adicional
        allEnvVars: Object.keys(process.env).filter(key => 
            key.includes('SUPABASE') || 
            key.includes('MQTT') || 
            key.includes('RTSP') || 
            key.includes('ZONE')
        )
    });
});

// Configurar MQTT (solo si está disponible)
if (mqttClient) {
    mqttClient.on('connect', () => {
        console.log('✅ [MQTT] Conectado al broker MQTT');
    });

    mqttClient.on('error', (error) => {
        console.error('❌ [MQTT] Error de conexión:', error);
    });

    mqttClient.on('close', () => {
        console.log('🔌 [MQTT] Conexión MQTT cerrada');
    });
}

// Función principal de inicialización
async function initializeServer() {
    try {
        console.log('🚀 [INIT] Iniciando servidor OpenDoor en Trailway...');
        console.log(`🌐 [ENV] Puerto: ${PORT}`);
        console.log(`🌐 [ENV] NODE_ENV: ${process.env.NODE_ENV || 'production'}`);
        
        // Debug: Mostrar todas las variables de entorno relevantes
        console.log('🔍 [DEBUG] Variables de entorno:');
        console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Configurada' : '❌ No configurada'}`);
        console.log(`   SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ No configurada'}`);
        console.log(`   RTSP_URL: ${process.env.RTSP_URL ? '✅ Configurada' : '❌ No configurada'}`);
        console.log(`   MQTT_BROKER_URL: ${process.env.MQTT_BROKER_URL ? '✅ Configurada' : '❌ No configurada'}`);
        console.log(`   MQTT_USERNAME: ${process.env.MQTT_USERNAME ? '✅ Configurada' : '❌ No configurada'}`);
        console.log(`   MQTT_PASSWORD: ${process.env.MQTT_PASSWORD ? '✅ Configurada' : '❌ No configurada'}`);
        console.log(`   MQTT_TOPIC: ${process.env.MQTT_TOPIC ? '✅ Configurada' : '❌ No configurada'}`);
        console.log(`   ZONE_ID: ${process.env.ZONE_ID ? '✅ Configurada' : '❌ No configurada'}`);
        
        // Debug adicional: mostrar todas las variables de entorno
        console.log('🔍 [DEBUG] Todas las variables de entorno disponibles:');
        const relevantVars = Object.keys(process.env).filter(key => 
            key.includes('SUPABASE') || 
            key.includes('MQTT') || 
            key.includes('RTSP') || 
            key.includes('ZONE') ||
            key.includes('PORT') ||
            key.includes('NODE_ENV')
        );
        relevantVars.forEach(key => {
            const value = process.env[key];
            const maskedValue = key.includes('KEY') || key.includes('PASSWORD') ? 
                `${value.substring(0, 5)}...` : value;
            console.log(`   ${key}: ${maskedValue}`);
        });

        // Iniciar servidor Express PRIMERO (para que health check funcione)
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ [SERVER] Servidor iniciado en puerto ${PORT}`);
            console.log(`📊 [SERVER] Endpoints disponibles:`);
            console.log(`   - GET /ping - Health check simple`);
            console.log(`   - GET /health - Health check detallado`);
            console.log(`   - GET /status - Estado del servidor`);
            console.log(`   - POST /process-face - Procesar imagen facial`);
            console.log(`   - POST /process-frame - Procesar frame completo`);
        });

        // Verificar variables de entorno (pero no fallar si no están)
        if (!supabaseUrl || !supabaseKey) {
            console.warn('⚠️ [INIT] Faltan variables de entorno de Supabase - algunos features no funcionarán');
        }

        // Cargar modelos de face-api.js (en background)
        loadFaceApiModels().then(() => {
            console.log('✅ [INIT] Modelos cargados en background');
        }).catch((error) => {
            console.error('❌ [INIT] Error cargando modelos:', error);
            console.log('⚠️ [INIT] Servidor funcionará sin modelos de IA');
        });

        // Iniciar procesador RTSP solo si está configurado
        if (process.env.RTSP_URL) {
            console.log('🔄 [RTSP] Iniciando procesador RTSP...');
            try {
                rtspProcessor = new RTSPProcessor(process.env.RTSP_URL, processFrame);
                await rtspProcessor.start();
            } catch (error) {
                console.error('❌ [RTSP] Error iniciando RTSP:', error);
                console.log('⚠️ [RTSP] Servidor funcionará sin RTSP');
            }
        } else {
            console.log('⚠️ [RTSP] No se configuró URL RTSP, procesador no iniciado');
        }

    } catch (error) {
        console.error('❌ [INIT] Error crítico iniciando servidor:', error);
        // No hacer process.exit(1) para que el health check pueda funcionar
        console.log('🔄 [INIT] Intentando continuar con funcionalidad limitada...');
    }
}

// Manejar señales de terminación
process.on('SIGINT', () => {
    console.log('\n🛑 [SHUTDOWN] Deteniendo servidor...');
    if (rtspProcessor) {
        rtspProcessor.stop();
    }
    if (mqttClient) {
        mqttClient.end();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 [SHUTDOWN] Deteniendo servidor...');
    if (rtspProcessor) {
        rtspProcessor.stop();
    }
    if (mqttClient) {
        mqttClient.end();
    }
    process.exit(0);
});

// Iniciar servidor
initializeServer();

