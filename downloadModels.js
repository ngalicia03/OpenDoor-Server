const fs = require('fs');
const path = require('path');
const https = require('https');

// URLs de los modelos de face-api.js
const models = [
    {
        name: 'ssdMobilenetv1_model-shard1',
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1'
    },
    {
        name: 'ssdMobilenetv1_model-weights_manifest.json',
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json'
    },
    {
        name: 'face_landmark_68_model-shard1',
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1'
    },
    {
        name: 'face_landmark_68_model-weights_manifest.json',
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json'
    },
    {
        name: 'face_recognition_model-shard1',
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1'
    },
    {
        name: 'face_recognition_model-shard2',
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2'
    },
    {
        name: 'face_recognition_model-weights_manifest.json',
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json'
    }
];

// Función para descargar archivo
function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {}); // Eliminar archivo si hay error
            reject(err);
        });
    });
}

// Función principal
async function downloadModels() {
    try {
        console.log('🔄 [MODELS] Iniciando descarga de modelos...');
        
        // Crear directorio models si no existe
        const modelsDir = path.join(__dirname, 'models');
        if (!fs.existsSync(modelsDir)) {
            fs.mkdirSync(modelsDir, { recursive: true });
        }
        
        // Descargar cada modelo
        for (const model of models) {
            const filepath = path.join(modelsDir, model.name);
            
            // Verificar si ya existe
            if (fs.existsSync(filepath)) {
                console.log(`✅ [MODELS] ${model.name} ya existe, saltando...`);
                continue;
            }
            
            console.log(`📥 [MODELS] Descargando ${model.name}...`);
            await downloadFile(model.url, filepath);
            console.log(`✅ [MODELS] ${model.name} descargado exitosamente`);
        }
        
        console.log('✅ [MODELS] Todos los modelos descargados exitosamente');
        
    } catch (error) {
        console.error('❌ [MODELS] Error descargando modelos:', error);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    downloadModels();
}

module.exports = downloadModels;
