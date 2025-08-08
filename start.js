const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function checkModels() {
    const modelsDir = path.join(__dirname, 'models');
    const requiredFiles = [
        'ssdMobilenetv1_model-shard1',
        'ssdMobilenetv1_model-weights_manifest.json',
        'face_landmark_68_model-shard1',
        'face_landmark_68_model-weights_manifest.json',
        'face_recognition_model-shard1',
        'face_recognition_model-shard2',
        'face_recognition_model-weights_manifest.json'
    ];

    // Verificar si existe el directorio models
    if (!fs.existsSync(modelsDir)) {
        console.log('📁 [STARTUP] Directorio models no encontrado');
        return false;
    }

    // Verificar si existen todos los archivos requeridos
    for (const file of requiredFiles) {
        const filePath = path.join(modelsDir, file);
        if (!fs.existsSync(filePath)) {
            console.log(`❌ [STARTUP] Archivo faltante: ${file}`);
            return false;
        }
    }

    console.log('✅ [STARTUP] Todos los modelos están presentes');
    return true;
}

async function downloadModelsIfNeeded() {
    try {
        const modelsExist = await checkModels();
        
        if (!modelsExist) {
            console.log('🔄 [STARTUP] Descargando modelos de face-api.js...');
            
            // Ejecutar script de descarga
            const downloadProcess = spawn('node', ['downloadModels.js'], {
                stdio: 'inherit'
            });

            return new Promise((resolve, reject) => {
                downloadProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ [STARTUP] Modelos descargados exitosamente');
                        resolve();
                    } else {
                        console.error('❌ [STARTUP] Error descargando modelos');
                        reject(new Error('Error descargando modelos'));
                    }
                });
            });
        } else {
            console.log('✅ [STARTUP] Modelos ya están descargados');
        }
    } catch (error) {
        console.error('❌ [STARTUP] Error verificando/descargando modelos:', error);
        throw error;
    }
}

async function startServer() {
    try {
        console.log('🚀 [STARTUP] Iniciando servidor OpenDoor...');
        
        // Ejecutar servidor
        const serverProcess = spawn('node', ['Server.js'], {
            stdio: 'inherit'
        });

        serverProcess.on('close', (code) => {
            console.log(`🛑 [STARTUP] Servidor terminado con código ${code}`);
        });

        serverProcess.on('error', (error) => {
            console.error('❌ [STARTUP] Error iniciando servidor:', error);
        });

    } catch (error) {
        console.error('❌ [STARTUP] Error iniciando servidor:', error);
        process.exit(1);
    }
}

async function main() {
    try {
        console.log('🎯 [STARTUP] Iniciando OpenDoor Server...');
        
        // Verificar y descargar modelos si es necesario
        await downloadModelsIfNeeded();
        
        // Iniciar servidor
        await startServer();
        
    } catch (error) {
        console.error('❌ [STARTUP] Error en el proceso de inicio:', error);
        process.exit(1);
    }
}

// Manejar señales de terminación
process.on('SIGINT', () => {
    console.log('\n🛑 [STARTUP] Recibida señal SIGINT, terminando...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 [STARTUP] Recibida señal SIGTERM, terminando...');
    process.exit(0);
});

// Ejecutar función principal
main();
