#!/usr/bin/env python3
"""
Script de prueba para verificar la conexión MQTT
"""

import paho.mqtt.client as mqtt
import time
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración MQTT
MQTT_BROKER_URL = os.getenv('MQTT_BROKER_URL', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_PORT', '1883'))
MQTT_USERNAME = os.getenv('MQTT_USERNAME', 'mqttclient')
MQTT_PASSWORD = os.getenv('MQTT_PASSWORD', 'arkus@123')
MQTT_TOPIC = os.getenv('MQTT_TOPIC', 'arkus/n1/switch/door_relay')

# Limpiar la URL del broker si incluye protocolo
if MQTT_BROKER_URL.startswith('mqtt://'):
    MQTT_BROKER_URL = MQTT_BROKER_URL.replace('mqtt://', '')
elif MQTT_BROKER_URL.startswith('tcp://'):
    MQTT_BROKER_URL = MQTT_BROKER_URL.replace('tcp://', '')

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ [MQTT] Conectado al broker MQTT exitosamente")
        print(f"   📍 [MQTT] Broker: {MQTT_BROKER_URL}:{MQTT_PORT}")
        print(f"   🔐 [MQTT] Usuario: {MQTT_USERNAME}")
        print(f"   📡 [MQTT] Tópico: {MQTT_TOPIC}")
    else:
        print(f"❌ [MQTT] Error de conexión MQTT: {rc}")
        print("   💡 [MQTT] Códigos de error:")
        print("      - 1: Protocolo incorrecto")
        print("      - 2: Identificador de cliente inválido")
        print("      - 3: Servidor no disponible")
        print("      - 4: Usuario o contraseña incorrectos")
        print("      - 5: No autorizado")

def on_publish(client, userdata, mid):
    print(f"✅ [MQTT] Mensaje publicado exitosamente (ID: {mid})")

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"⚠️ [MQTT] Desconexión inesperada (código: {rc})")
    else:
        print("✅ [MQTT] Desconexión normal")

def test_mqtt_connection():
    print("🧪 [TEST] Iniciando prueba de conexión MQTT...")
    print("=" * 60)
    
    # Crear cliente MQTT
    client = mqtt.Client()
    
    # Configurar callbacks
    client.on_connect = on_connect
    client.on_publish = on_publish
    client.on_disconnect = on_disconnect
    
    try:
        # Configurar autenticación
        if MQTT_USERNAME and MQTT_PASSWORD:
            client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
            print(f"🔐 [MQTT] Autenticación configurada: {MQTT_USERNAME}")
        
        # Conectar
        print(f"🔄 [MQTT] Conectando a {MQTT_BROKER_URL}:{MQTT_PORT}...")
        client.connect(MQTT_BROKER_URL, MQTT_PORT, 60)
        
        # Iniciar loop
        client.loop_start()
        
        # Esperar conexión
        time.sleep(2)
        
        if client.is_connected():
            print("✅ [MQTT] Cliente conectado y funcionando")
            
            # Probar publicación
            print(f"📤 [MQTT] Probando publicación en tópico: {MQTT_TOPIC}")
            result = client.publish(MQTT_TOPIC, "TEST_MESSAGE", qos=1)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                print("✅ [MQTT] Publicación de prueba exitosa")
            else:
                print(f"❌ [MQTT] Error en publicación de prueba: {result.rc}")
            
            # Esperar un poco más
            time.sleep(2)
            
            # Desconectar
            client.loop_stop()
            client.disconnect()
            print("✅ [MQTT] Cliente desconectado")
            
        else:
            print("❌ [MQTT] No se pudo establecer conexión")
            
    except Exception as e:
        print(f"❌ [MQTT] Error durante la prueba: {e}")
        print(f"   📍 [MQTT] Broker: {MQTT_BROKER_URL}")
        print(f"   📍 [MQTT] Puerto: {MQTT_PORT}")
        
        # Sugerencias de solución
        print("\n💡 [SOLUCIONES] Posibles soluciones:")
        print("   1. Verifica que Mosquitto esté corriendo:")
        print("      - Windows: sc query mosquitto")
        print("      - Linux: systemctl status mosquitto")
        print("   2. Verifica el puerto:")
        print("      - netstat -an | findstr 1883")
        print("   3. Verifica la configuración del broker:")
        print("      - Archivo mosquitto.conf")
        print("      - Usuarios y contraseñas")
        print("   4. Prueba con mosquitto_sub:")
        print("      - mosquitto_sub -h localhost -p 1883 -t 'test/topic'")

if __name__ == "__main__":
    test_mqtt_connection()
