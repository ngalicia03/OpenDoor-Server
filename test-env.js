#!/usr/bin/env node

console.log('🔍 [TEST] Verificando variables de entorno...');
console.log('=====================================');

// Variables que necesitamos
const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'RTSP_URL',
    'MQTT_BROKER_URL',
    'MQTT_USERNAME',
    'MQTT_PASSWORD',
    'MQTT_TOPIC',
    'ZONE_ID'
];

console.log('📋 Variables requeridas:');
requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
    } else {
        console.log(`❌ ${varName}: NO CONFIGURADA`);
    }
});

console.log('\n🔍 Todas las variables de entorno disponibles:');
Object.keys(process.env).sort().forEach(key => {
    const value = process.env[key];
    if (key.includes('SUPABASE') || key.includes('MQTT') || key.includes('RTSP') || key.includes('ZONE')) {
        const maskedValue = key.includes('KEY') || key.includes('PASSWORD') ? 
            `${value.substring(0, 5)}...` : value;
        console.log(`   ${key}: ${maskedValue}`);
    }
});

console.log('\n📊 Resumen:');
const configured = requiredVars.filter(varName => process.env[varName]).length;
console.log(`✅ Configuradas: ${configured}/${requiredVars.length}`);
console.log(`❌ Faltantes: ${requiredVars.length - configured}`);

if (configured === requiredVars.length) {
    console.log('🎉 ¡Todas las variables están configuradas!');
    process.exit(0);
} else {
    console.log('⚠️ Faltan variables de entorno');
    process.exit(1);
}
