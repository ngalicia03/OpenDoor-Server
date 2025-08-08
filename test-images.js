const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testWithImages() {
    console.log('🧪 [TEST] Iniciando pruebas con imágenes...');
    
    const testDir = path.join(__dirname, 'test-images');
    
    // Verificar si existe el directorio de pruebas
    if (!fs.existsSync(testDir)) {
        console.log('📁 [TEST] Creando directorio test-images...');
        fs.mkdirSync(testDir, { recursive: true });
        console.log('⚠️ [TEST] Por favor, coloca algunas imágenes .jpg en el directorio test-images/');
        console.log('💡 [TEST] Puedes usar fotos tuyas o de familiares para probar el reconocimiento facial');
        return;
    }
    
    const images = fs.readdirSync(testDir).filter(f => 
        f.toLowerCase().endsWith('.jpg') || 
        f.toLowerCase().endsWith('.jpeg') || 
        f.toLowerCase().endsWith('.png')
    );
    
    if (images.length === 0) {
        console.log('⚠️ [TEST] No se encontraron imágenes en test-images/');
        console.log('💡 [TEST] Coloca algunas imágenes .jpg, .jpeg o .png en el directorio test-images/');
        return;
    }
    
    console.log(`📸 [TEST] Encontradas ${images.length} imágenes para probar`);
    
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        console.log(`\n🧪 [TEST] Probando imagen ${i + 1}/${images.length}: ${image}`);
        
        const form = new FormData();
        form.append('image', fs.createReadStream(path.join(testDir, image)));
        
        try {
            console.log('🔄 [TEST] Enviando imagen al servidor...');
            
            const response = await fetch('http://localhost:3001/process-frame', {
                method: 'POST',
                body: form
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ [TEST] Procesamiento exitoso');
                console.log(`📊 [TEST] Mensaje: ${result.message}`);
            } else {
                console.log('⚠️ [TEST] Procesamiento completado con advertencias');
                console.log(`📊 [TEST] Error: ${result.error || 'No especificado'}`);
            }
            
        } catch (error) {
            console.error(`❌ [TEST] Error procesando ${image}:`, error.message);
        }
        
        // Esperar entre pruebas para no sobrecargar el servidor
        if (i < images.length - 1) {
            console.log('⏳ [TEST] Esperando 3 segundos antes de la siguiente prueba...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log('\n🎯 [TEST] Pruebas completadas');
    console.log('📊 [TEST] Revisa los logs del servidor para más detalles');
    console.log('🔍 [TEST] Verifica la tabla logs en Supabase para ver los resultados');
}

// Verificar que el servidor esté corriendo
async function checkServerStatus() {
    try {
        const response = await fetch('http://localhost:3001/status');
        const status = await response.json();
        
        console.log('🔍 [TEST] Estado del servidor:');
        console.log(`   - Status: ${status.status}`);
        console.log(`   - Modelos cargados: ${status.modelsLoaded}`);
        console.log(`   - MQTT conectado: ${status.mqttConnected}`);
        console.log(`   - Supabase configurado: ${status.supabaseConfigured}`);
        
        if (!status.modelsLoaded) {
            console.log('⚠️ [TEST] Los modelos no están cargados. Ejecuta: npm run download-models');
            return false;
        }
        
        if (!status.mqttConnected) {
            console.log('⚠️ [TEST] MQTT no está conectado. Verifica la configuración.');
        }
        
        if (!status.supabaseConfigured) {
            console.log('⚠️ [TEST] Supabase no está configurado. Verifica las variables de entorno.');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ [TEST] No se puede conectar al servidor en http://localhost:3001');
        console.log('💡 [TEST] Asegúrate de que el servidor esté corriendo: npm start');
        return false;
    }
}

async function main() {
    console.log('🚀 [TEST] Iniciando pruebas del sistema OpenDoor...\n');
    
    // Verificar estado del servidor
    const serverReady = await checkServerStatus();
    
    if (!serverReady) {
        console.log('\n❌ [TEST] El servidor no está listo para las pruebas');
        process.exit(1);
    }
    
    console.log('\n✅ [TEST] Servidor listo para pruebas\n');
    
    // Ejecutar pruebas con imágenes
    await testWithImages();
}

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
    console.error('❌ [TEST] Error no manejado:', error);
    process.exit(1);
});

// Ejecutar pruebas
main();
