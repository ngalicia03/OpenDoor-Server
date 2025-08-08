const mqtt = require('mqtt');
require('dotenv').config();

console.log('🧪 [MQTT_TEST] Iniciando prueba de conectividad MQTT...');

// Configuración MQTT desde variables de entorno
const mqttConfig = {
    hostname: process.env.MQTT_BROKER_URL?.replace('mqtt://', '').split(':')[0] || '172.30.1.21',
    port: parseInt(process.env.MQTT_BROKER_URL?.split(':')[2]) || 1883,
    username: process.env.MQTT_USERNAME || 'mqttclient',
    password: process.env.MQTT_PASSWORD || 'arkus@123',
    topic: process.env.MQTT_TOPIC || 'arkus/n1/switch/door_relay'
};

console.log('📊 [MQTT_TEST] Configuración:');
console.log(`   - Broker: ${mqttConfig.hostname}:${mqttConfig.port}`);
console.log(`   - Usuario: ${mqttConfig.username}`);
console.log(`   - Tópico: ${mqttConfig.topic}`);

// Conectar al broker MQTT
const client = mqtt.connect(`mqtt://${mqttConfig.hostname}:${mqttConfig.port}`, {
    username: mqttConfig.username,
    password: mqttConfig.password,
    reconnectPeriod: 1000,
    connectTimeout: 10000
});

let testCompleted = false;

client.on('connect', () => {
    console.log('✅ [MQTT_TEST] Conectado exitosamente al broker MQTT');
    
    // Suscribirse al tópico para escuchar mensajes
    client.subscribe(mqttConfig.topic, (error) => {
        if (error) {
            console.error('❌ [MQTT_TEST] Error suscribiéndose al tópico:', error);
        } else {
            console.log(`📡 [MQTT_TEST] Suscrito al tópico: ${mqttConfig.topic}`);
        }
    });
    
    // Enviar mensaje de prueba
    setTimeout(() => {
        sendTestMessage();
    }, 1000);
});

client.on('message', (topic, message) => {
    console.log(`📨 [MQTT_TEST] Mensaje recibido en ${topic}:`);
    console.log(`   Contenido: ${message.toString()}`);
    
    if (!testCompleted) {
        testCompleted = true;
        console.log('✅ [MQTT_TEST] Prueba completada exitosamente');
        client.end();
    }
});

client.on('error', (error) => {
    console.error('❌ [MQTT_TEST] Error de conexión MQTT:', error);
    process.exit(1);
});

client.on('close', () => {
    console.log('🔌 [MQTT_TEST] Conexión MQTT cerrada');
    if (!testCompleted) {
        console.log('❌ [MQTT_TEST] Prueba fallida - conexión cerrada inesperadamente');
        process.exit(1);
    }
});

function sendTestMessage() {
    const testMessage = JSON.stringify({
        action: 'test',
        user: 'Test User',
        timestamp: new Date().toISOString(),
        source: 'opendoor-test'
    });
    
    console.log('📤 [MQTT_TEST] Enviando mensaje de prueba...');
    console.log(`   Mensaje: ${testMessage}`);
    
    client.publish(mqttConfig.topic, testMessage, (error) => {
        if (error) {
            console.error('❌ [MQTT_TEST] Error enviando mensaje:', error);
            process.exit(1);
        } else {
            console.log('✅ [MQTT_TEST] Mensaje enviado exitosamente');
            console.log('⏳ [MQTT_TEST] Esperando respuesta...');
            
            // Timeout después de 10 segundos
            setTimeout(() => {
                if (!testCompleted) {
                    console.log('⏰ [MQTT_TEST] Timeout - no se recibió respuesta');
                    console.log('💡 [MQTT_TEST] Esto puede ser normal si no hay otros clientes suscritos');
                    testCompleted = true;
                    client.end();
                }
            }, 10000);
        }
    });
}

// Manejar señales de terminación
process.on('SIGINT', () => {
    console.log('\n🛑 [MQTT_TEST] Recibida señal SIGINT, terminando...');
    client.end();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 [MQTT_TEST] Recibida señal SIGTERM, terminando...');
    client.end();
    process.exit(0);
});

// Timeout general de 30 segundos
setTimeout(() => {
    if (!testCompleted) {
        console.log('⏰ [MQTT_TEST] Timeout general - terminando prueba');
        client.end();
        process.exit(0);
    }
}, 30000);
