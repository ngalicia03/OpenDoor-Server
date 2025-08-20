import cv2
import numpy as np
import json
import time
import os
import subprocess
from deepface import DeepFace
from supabase import create_client, Client
import paho.mqtt.client as mqtt
from dotenv import load_dotenv
import uuid
from datetime import datetime, timedelta, timezone
import requests

# Cargar variables de entorno
load_dotenv()

# Configuración
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
MQTT_BROKER_URL = os.getenv('MQTT_BROKER_URL', 'localhost')  # Local para pruebas
MQTT_PORT = int(os.getenv('MQTT_PORT', '1883'))
MQTT_USERNAME = os.getenv('MQTT_USERNAME', 'mqttclient')
MQTT_PASSWORD = os.getenv('MQTT_PASSWORD', 'arkus@123')
MQTT_TOPIC = os.getenv('MQTT_TOPIC', 'arkus/n1/switch/door_relay')
RTSP_URL = os.getenv('RTSP_URL', 'rtsp://mindaccess:camara%40123@172.30.1.15/Preview_01_sub')

# Limpiar la URL del broker MQTT si incluye protocolo
if MQTT_BROKER_URL.startswith('mqtt://'):
    MQTT_BROKER_URL = MQTT_BROKER_URL.replace('mqtt://', '')
elif MQTT_BROKER_URL.startswith('tcp://'):
    MQTT_BROKER_URL = MQTT_BROKER_URL.replace('tcp://', '')

# Modo de operación
TEST_MODE = os.getenv('TEST_MODE', 'true').lower() == 'true'  # Por defecto modo de prueba

# Constantes de la Edge Function
USER_MATCH_THRESHOLD_DISTANCE = 0.15
OBSERVED_USER_MATCH_THRESHOLD_DISTANCE = 0.08
ACCESS_DENIED_CONSECUTIVE_THRESHOLD = 3
NEW_OBSERVED_USER_STATUS_ID = "c70bbe40-afe3-4357-8454-16b457705db5"
ACCESS_DENIED_STATUS_ID = "some-access-denied-status-id"  # Reemplazar con ID real

# Zone ID debe ser un UUID válido
ZONE_ID = "dc1a2f93-ed94-41ec-9e2d-a676659e340d"  # UUID real para main-entrance

print("🔧 [CONFIG] Configuración cargada:")
print(f"   📡 [MQTT] Broker: {MQTT_BROKER_URL}")
print(f"   📡 [MQTT] Tópico: {MQTT_TOPIC}")
print(f"   📹 [RTSP] URL: {RTSP_URL}")
print(f"   🔗 [SUPABASE] URL: {SUPABASE_URL}")
print(f"   🎯 [ZONE] Zone ID: {ZONE_ID}")
print(f"   🧪 [MODE] Modo de prueba: {'Activado' if TEST_MODE else 'Desactivado'}")

# Inicializar Supabase
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    print("✅ [SUPABASE] Cliente inicializado correctamente")
except Exception as e:
    print(f"❌ [SUPABASE] Error inicializando cliente: {e}")
    supabase = None

# Inicializar MQTT
mqtt_client = mqtt.Client()

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ [MQTT] Conectado al broker MQTT exitosamente")
    else:
        print(f"❌ [MQTT] Error de conexión MQTT: {rc}")

def on_publish(client, userdata, mid):
    print(f"✅ [MQTT] Mensaje publicado exitosamente (ID: {mid})")

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"⚠️ [MQTT] Desconexión inesperada (código: {rc})")
    else:
        print("✅ [MQTT] Desconexión normal")

mqtt_client.on_connect = on_connect
mqtt_client.on_publish = on_publish
mqtt_client.on_disconnect = on_disconnect

# Conectar a MQTT
try:
    print(f"🔄 [MQTT] Conectando a {MQTT_BROKER_URL}:{MQTT_PORT}...")
    
    # Configurar autenticación antes de conectar
    if MQTT_USERNAME and MQTT_PASSWORD:
        mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
        print(f"🔐 [MQTT] Autenticación configurada: {MQTT_USERNAME}")
    
    # Intentar conexión
    mqtt_client.connect(MQTT_BROKER_URL, MQTT_PORT, 60)
    print("✅ [MQTT] Conexión MQTT establecida")
    
    # Iniciar loop de MQTT para mantener la conexión
    mqtt_client.loop_start()
    
except Exception as e:
    print(f"❌ [MQTT] Error conectando: {e}")
    print(f"   📍 [MQTT] Broker: {MQTT_BROKER_URL}")
    print(f"   📍 [MQTT] Puerto: {MQTT_PORT}")
    print(f"   🔐 [MQTT] Usuario: {MQTT_USERNAME}")
    mqtt_client = None


# Función para controlar la puerta directamente
def control_door(should_open=True):
    try:
        # Verificar que el cliente MQTT esté conectado
        if mqtt_client is None:
            print("❌ [MQTT] Cliente MQTT no disponible")
            return False
            
        if not mqtt_client.is_connected():
            print("❌ [MQTT] Cliente MQTT no está conectado")
            return False
        
        message = "ON" if should_open else "OFF"
        print(f"🔄 [MQTT] Enviando comando: {message} al tópico: {MQTT_TOPIC}")
        
        result = mqtt_client.publish(MQTT_TOPIC, message, qos=1)
        
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            print(f"✅ [MQTT] Comando enviado exitosamente: {message}")
            return True
        else:
            print(f"❌ [MQTT] Error enviando comando: {result.rc}")
            return False
            
    except Exception as e:
        print(f"❌ [MQTT] Error controlando puerta: {e}")
        return False

# Función para capturar imagen de la cámara RTSP
def capture_image_from_rtsp():
    print("📹 [RTSP] Conectando a cámara RTSP...")
    print(f"   📡 [RTSP] URL: {RTSP_URL}")
    
    try:
        # Crear capturador de video RTSP
        cap = cv2.VideoCapture(RTSP_URL)
        
        if not cap.isOpened():
            print("❌ [RTSP] No se pudo abrir la conexión RTSP")
            return None
        
        print("✅ [RTSP] Conexión RTSP establecida")
        
        # Leer frame
        ret, frame = cap.read()
        
        if not ret:
            print("❌ [RTSP] No se pudo capturar frame")
            cap.release()
            return None
        
        print(f"✅ [RTSP] Frame capturado exitosamente: {frame.shape}")
        
        # Liberar recursos
        cap.release()
        
        return frame
        
    except Exception as e:
        print(f"❌ [RTSP] Error capturando imagen: {e}")
        return None

# Función para cargar imagen local de prueba
def load_test_image():
    print("📸 [TEST] Cargando imagen de prueba...")
    print("   📁 [TEST] Archivo: temp/Prueba0.png")
    
    try:
        # Verificar que el archivo existe
        image_path = "temp/Prueba0.png"
        if not os.path.exists(image_path):
            print(f"❌ [TEST] Archivo no encontrado: {image_path}")
            return None
        
        # Cargar imagen con OpenCV
        image = cv2.imread(image_path)
        
        if image is None:
            print("❌ [TEST] No se pudo cargar la imagen")
            return None
        
        print(f"✅ [TEST] Imagen cargada exitosamente: {image.shape}")
        print(f"   📊 [TEST] Dimensiones: {image.shape[1]}x{image.shape[0]} píxeles")
        
        return image
        
    except Exception as e:
        print(f"❌ [TEST] Error cargando imagen: {e}")
        return None

# Función para extraer embedding con DeepFace usando Facenet (128 dimensiones)
def extract_embedding(image):
    print("🧠 [DETECTION] Detectando rostro con DeepFace...")
    try:
        # Guardar imagen temporalmente
        temp_path = "temp_face.jpg"
        cv2.imwrite(temp_path, image)
        print(f"📁 [DETECTION] Imagen temporal guardada: {temp_path}")
        
        # Extraer embedding con DeepFace usando Facenet (128 dimensiones)
        embedding = DeepFace.represent(
            img_path=temp_path,
            model_name="Facenet",  # Modelo de 128 dimensiones
            enforce_detection=False
        )
        
        # Limpiar archivo temporal
        os.remove(temp_path)
        print("🧹 [DETECTION] Archivo temporal eliminado")
        
        if embedding is not None and len(embedding) > 0:
            # Obtener el primer embedding (si hay múltiples rostros)
            face_embedding = embedding[0] if isinstance(embedding, list) else embedding
            
            # Si es un diccionario, extraer solo el valor numérico del embedding
            if isinstance(face_embedding, dict) and 'embedding' in face_embedding:
                face_embedding = face_embedding['embedding']
                print("✅ [DETECTION] Embedding extraído del diccionario")
            
            # Convertir a lista si no lo es ya
            if not isinstance(face_embedding, list):
                face_embedding = list(face_embedding)
            
            # Verificar dimensiones
            dimensions = len(face_embedding)
            print(f"✅ [EMBEDDING] Embedding extraído exitosamente")
            print(f"   📊 [EMBEDDING] Longitud: {dimensions}")
            print(f"   📊 [EMBEDDING] Primeros 5 valores: {face_embedding[:5]}")
            
            if dimensions == 128:
                print("✅ [EMBEDDING] Embedding de 128 dimensiones confirmado")
                return face_embedding
            else:
                print(f"⚠️ [EMBEDDING] Embedding de {dimensions} dimensiones (esperado: 128)")
                # Normalizar a 128 dimensiones si es necesario
                if dimensions > 128:
                    normalized = face_embedding[:128]
                    print("✅ [EMBEDDING] Embedding normalizado a 128 dimensiones")
                    return normalized
                else:
                    # Rellenar con ceros si es menor a 128
                    padded = face_embedding + [0.0] * (128 - dimensions)
                    print("✅ [EMBEDDING] Embedding rellenado a 128 dimensiones")
                    return padded
        else:
            print("❌ [DETECTION] No se pudo extraer embedding")
            return None
            
    except Exception as e:
        print(f"❌ [DETECTION] Error en detección facial: {e}")
        # Limpiar archivo temporal en caso de error
        if os.path.exists("temp_face.jpg"):
            os.remove("temp_face.jpg")
        return None
   

# Función para validar en Supabase (replica exacta de Edge Function)
def validate_face_in_supabase(embedding, zone_id="main-entrance"):
    print("🔍 [SUPABASE] Iniciando validación facial...")
    print(f"   🎯 [SUPABASE] Zona solicitada: {zone_id}")
    
    # Objeto para registrar la entrada de log (replica de Edge Function)
    log_entry = {
        'user_id': None,
        'camera_id': None,
        'result': False,
        'observed_user_id': None,
        'user_type': 'unknown',
        'vector_attempted': embedding,
        'match_status': 'no_match_found',
        'decision': 'access_denied',
        'reason': 'No match found.',
        'confidence_score': None,
        'requested_zone_id': zone_id,
    }
    
    try:
        # 1. Buscar coincidencia en usuarios registrados
        print("🔍 [SUPABASE_RPC] Buscando en usuarios registrados...")
        result = supabase.rpc('match_user_face_embedding', {
            'match_count': 1,
            'match_threshold': USER_MATCH_THRESHOLD_DISTANCE,
            'query_embedding': embedding
        }).execute()
        
        if result.data and len(result.data) > 0:
            matched_user = result.data[0]
            actual_distance = matched_user.get('distance', 0)
            match_similarity = 1 - actual_distance / 2
            
            print(f"👤 [SUPABASE_MATCH] Usuario registrado encontrado: {matched_user['user_id']}")
            print(f"   📊 [SUPABASE_MATCH] Distancia: {actual_distance:.4f}")
            print(f"   📊 [SUPABASE_MATCH] Similitud: {match_similarity:.4f}")
            
            if actual_distance <= USER_MATCH_THRESHOLD_DISTANCE:
                log_entry['user_id'] = matched_user['user_id']
                log_entry['user_type'] = 'registered'
                log_entry['confidence_score'] = match_similarity
                
                # Obtener detalles completos del usuario
                print("🔍 [SUPABASE_USER] Obteniendo detalles del usuario...")
                user_details = supabase.from_('user_full_details_view').select('*').eq('id', matched_user['user_id']).execute()
                
                if user_details.data:
                    user_data = user_details.data[0]
                    print(f"✅ [SUPABASE_USER] Usuario: {user_data.get('full_name', 'Sin nombre')}")
                    
                    # Verificar acceso a la zona específica
                    has_zone_access = any(zone['id'] == zone_id for zone in user_data.get('zones', []))
                    is_access_denied = user_data.get('statuses', {}).get('id') == ACCESS_DENIED_STATUS_ID
                    
                    print(f"   🎯 [SUPABASE_USER] Acceso a zona {zone_id}: {has_zone_access}")
                    print(f"   🚫 [SUPABASE_USER] Acceso denegado: {is_access_denied}")
                    
                    if has_zone_access and not is_access_denied:
                        user_match_details = {
                            'user': {
                                'id': user_data['id'],
                                'full_name': user_data['full_name'],
                                'user_type': 'registered',
                                'hasAccess': True,
                                'similarity': match_similarity,
                                'role_details': user_data.get('roles'),
                                'status_details': user_data.get('statuses'),
                                'zones_accessed_details': user_data.get('zones', []),
                                'profilePictureUrl': user_data.get('profile_picture_url'),
                            },
                            'type': 'registered_user_matched',
                            'message': 'Registered user matched and has access.'
                        }
                        
                        log_entry['result'] = True
                        log_entry['decision'] = 'access_granted'
                        log_entry['reason'] = 'Registered user matched and has access.'
                        log_entry['match_status'] = 'registered_user_matched'
                        
                        print("🚪 [DOOR] Usuario autorizado - Abriendo puerta...")
                        
                        # Controlar puerta directamente
                        if control_door(True):
                            print("✅ [DOOR] Puerta abierta exitosamente")
                        else:
                            print("❌ [DOOR] Error abriendo puerta")
                        
                        # Resetear consecutive_denied_accesses si es necesario
                        if user_data.get('consecutive_denied_accesses', 0) > 0:
                            print("🔄 [SUPABASE_USER] Reseteando accesos denegados consecutivos...")
                            supabase.from_('users').update({
                                'consecutive_denied_accesses': 0
                            }).eq('id', user_data['id']).execute()
                        
                        # Guardar log
                        save_log_to_supabase(log_entry)
                        return user_match_details
                    else:
                        user_match_details = {
                            'user': {
                                'id': user_data['id'],
                                'full_name': user_data['full_name'],
                                'user_type': 'registered',
                                'hasAccess': False,
                                'similarity': match_similarity,
                                'role_details': user_data.get('roles'),
                                'status_details': user_data.get('statuses'),
                                'zones_accessed_details': user_data.get('zones', []),
                                'profilePictureUrl': user_data.get('profile_picture_url'),
                            },
                            'type': 'registered_user_access_denied',
                            'message': 'Registered user matched but access denied.'
                        }
                        
                        log_entry['result'] = False
                        log_entry['decision'] = 'access_denied'
                        log_entry['reason'] = 'Registered user does not have access to requested zone.'
                        log_entry['match_status'] = 'registered_user_access_denied_zone'
                        
                        print("❌ [DOOR] Usuario registrado pero sin acceso a esta zona")
                        
                        # Incrementar consecutive_denied_accesses
                        print("🔄 [SUPABASE_USER] Incrementando accesos denegados consecutivos...")
                        supabase.from_('users').update({
                            'consecutive_denied_accesses': user_data.get('consecutive_denied_accesses', 0) + 1
                        }).eq('id', user_data['id']).execute()
                        
                        # Guardar log
                        save_log_to_supabase(log_entry)
                        return user_match_details
        
        # 2. Si no hay match en usuarios registrados, buscar en observados
        print("🔍 [SUPABASE_RPC] Buscando en usuarios observados...")
        observed_result = supabase.rpc('match_observed_face_embedding', {
            'match_count': 1,
            'match_threshold': OBSERVED_USER_MATCH_THRESHOLD_DISTANCE,
            'query_embedding': embedding
        }).execute()
        
        if observed_result.data and len(observed_result.data) > 0:
            matched_observed_user = observed_result.data[0]
            actual_distance = matched_observed_user.get('distance', 0)
            match_similarity = 1 - actual_distance / 2
            
            print(f"👤 [SUPABASE_MATCH] Usuario observado encontrado: {matched_observed_user['id']}")
            print(f"   📊 [SUPABASE_MATCH] Distancia: {actual_distance:.4f}")
            print(f"   📊 [SUPABASE_MATCH] Similitud: {match_similarity:.4f}")
            
            if actual_distance <= OBSERVED_USER_MATCH_THRESHOLD_DISTANCE:
                log_entry['observed_user_id'] = matched_observed_user['id']
                log_entry['user_type'] = 'observed'
                log_entry['confidence_score'] = match_similarity
                
                new_access_count = matched_observed_user.get('access_count', 0) + 1
                existing_zones = set(matched_observed_user.get('last_accessed_zones', []) or [])
                existing_zones.add(zone_id)
                new_last_accessed_zones = list(existing_zones)
                
                has_expired = matched_observed_user.get('expires_at') and \
                              datetime.fromisoformat(matched_observed_user['expires_at'].replace('Z', '+00:00')) < datetime.now(timezone.utc)
                
                print(f"   📅 [SUPABASE_OBSERVED] Acceso expirado: {has_expired}")
                print(f"   📊 [SUPABASE_OBSERVED] Conteo de accesos: {new_access_count}")
                
                if has_expired or matched_observed_user.get('status_id') != NEW_OBSERVED_USER_STATUS_ID:
                    # Acceso denegado
                    user_match_details = {
                        'user': {
                            'id': matched_observed_user['id'],
                            'full_name': f"Observado {matched_observed_user['id'][:8]}",
                            'user_type': 'observed',
                            'hasAccess': False,
                            'similarity': match_similarity,
                            'role_details': None,
                            'status_details': {'id': matched_observed_user.get('status_id'), 'name': 'Estado Desconocido'},
                            'zones_accessed_details': [],
                            'observed_details': {
                                'firstSeenAt': matched_observed_user.get('first_seen_at'),
                                'lastSeenAt': matched_observed_user.get('last_seen_at'),
                                'accessCount': matched_observed_user.get('access_count', 0),
                                'alertTriggered': matched_observed_user.get('alert_triggered', False),
                                'expiresAt': matched_observed_user.get('expires_at', ''),
                                'potentialMatchUserId': matched_observed_user.get('potential_match_user_id'),
                                'similarity': match_similarity,
                                'distance': actual_distance,
                                'faceImageUrl': matched_observed_user.get('face_image_url'),
                                'aiAction': None,
                                'consecutiveDeniedAccesses': matched_observed_user.get('consecutive_denied_accesses', 0),
                            },
                        },
                        'type': 'observed_user_access_denied_expired',
                        'message': 'Observed user access expired.'
                    }
                    
                    log_entry['result'] = False
                    log_entry['decision'] = 'access_denied'
                    log_entry['reason'] = 'Observed user access expired.'
                    log_entry['match_status'] = 'observed_user_access_denied_expired'
                    
                    print("❌ [DOOR] Usuario observado con acceso expirado")
                    
                    # Incrementar consecutive_denied_accesses
                    print("🔄 [SUPABASE_OBSERVED] Incrementando accesos denegados consecutivos...")
                    supabase.from_('observed_users').update({
                        'consecutive_denied_accesses': (matched_observed_user.get('consecutive_denied_accesses', 0) + 1),
                        'last_seen_at': datetime.now(timezone.utc).isoformat(),
                        'last_accessed_zones': new_last_accessed_zones,
                    }).eq('id', matched_observed_user['id']).execute()
                    
                else:
                    # Acceso concedido
                    user_match_details = {
                        'user': {
                            'id': matched_observed_user['id'],
                            'full_name': f"Observado {matched_observed_user['id'][:8]}",
                            'user_type': 'observed',
                            'hasAccess': True,
                            'similarity': match_similarity,
                            'role_details': None,
                            'status_details': {'id': matched_observed_user.get('status_id'), 'name': 'Estado Desconocido'},
                            'zones_accessed_details': [],
                            'observed_details': {
                                'firstSeenAt': matched_observed_user.get('first_seen_at'),
                                'lastSeenAt': matched_observed_user.get('last_seen_at'),
                                'accessCount': new_access_count,
                                'alertTriggered': matched_observed_user.get('alert_triggered', False),
                                'expiresAt': matched_observed_user.get('expires_at', ''),
                                'potentialMatchUserId': matched_observed_user.get('potential_match_user_id'),
                                'similarity': match_similarity,
                                'distance': actual_distance,
                                'faceImageUrl': matched_observed_user.get('face_image_url'),
                                'aiAction': None,
                                'consecutiveDeniedAccesses': 0,
                            },
                        },
                        'type': 'observed_user_updated',
                        'message': 'Observed user matched and has active temporary access.'
                    }
                    
                    log_entry['result'] = True
                    log_entry['decision'] = 'access_granted'
                    log_entry['reason'] = 'Observed user matched and has active temporary access.'
                    log_entry['match_status'] = 'observed_user_updated'
                    
                    print("🚪 [DOOR] Usuario observado autorizado - Abriendo puerta...")
                    
                    # Controlar puerta directamente
                    if control_door(True):
                        print("✅ [DOOR] Puerta abierta exitosamente para usuario observado")
                    else:
                        print("❌ [DOOR] Error abriendo puerta")
                    
                    # Actualizar usuario observado
                    print("🔄 [SUPABASE_OBSERVED] Actualizando usuario observado...")
                    supabase.from_('observed_users').update({
                        'access_count': new_access_count,
                        'last_seen_at': datetime.now(timezone.utc).isoformat(),
                        'last_accessed_zones': new_last_accessed_zones,
                        'consecutive_denied_accesses': 0,
                    }).eq('id', matched_observed_user['id']).execute()
                
                # Guardar log
                save_log_to_supabase(log_entry)
                return user_match_details
        
        # 3. Si no hay match, registrar nuevo usuario observado
        print("🆕 [SUPABASE_NEW] No se encontró coincidencia, registrando nuevo usuario observado...")
        
        new_observed_user = supabase.from_('observed_users').insert({
            'embedding': embedding,
            'status_id': NEW_OBSERVED_USER_STATUS_ID,
            'last_accessed_zones': [zone_id],
            'expires_at': (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            'consecutive_denied_accesses': 0,
        }).execute()
        
        if new_observed_user.data:
            user_match_details = {
                'user': {
                    'id': new_observed_user.data[0]['id'],
                    'full_name': f"Nuevo Observado {new_observed_user.data[0]['id'][:8]}",
                    'user_type': 'observed',
                    'hasAccess': True,
                    'similarity': 0,
                    'role_details': None,
                    'status_details': {'id': NEW_OBSERVED_USER_STATUS_ID, 'name': 'Estado Desconocido'},
                    'zones_accessed_details': [],
                    'observed_details': {
                        'firstSeenAt': new_observed_user.data[0].get('first_seen_at'),
                        'lastSeenAt': new_observed_user.data[0].get('last_seen_at'),
                        'accessCount': 1,
                        'alertTriggered': False,
                        'expiresAt': new_observed_user.data[0].get('expires_at', ''),
                        'potentialMatchUserId': None,
                        'similarity': 0,
                        'distance': 0,
                        'faceImageUrl': None,
                        'aiAction': None,
                        'consecutiveDeniedAccesses': 0,
                    },
                },
                'type': 'new_observed_user_registered',
                'message': 'New observed user registered and access granted.'
            }
            
            log_entry['result'] = True
            log_entry['decision'] = 'access_granted'
            log_entry['reason'] = 'New observed user registered and access granted.'
            log_entry['match_status'] = 'new_observed_user_registered'
            
            print("🚪 [DOOR] Nuevo usuario observado - Abriendo puerta...")
            
            # Controlar puerta directamente
            if control_door(True):
                print("✅ [DOOR] Puerta abierta exitosamente para nuevo usuario observado")
            else:
                print("❌ [DOOR] Error abriendo puerta")
            
            # Guardar log
            save_log_to_supabase(log_entry)
            return user_match_details
        
        # Si no se pudo registrar, guardar log de no match
        log_entry['result'] = False
        log_entry['decision'] = 'access_denied'
        log_entry['reason'] = 'No match found and could not register new observed user.'
        log_entry['match_status'] = 'no_match_found'
        
        print("❌ [DOOR] No se encontró coincidencia y no se pudo registrar nuevo usuario")
        
        save_log_to_supabase(log_entry)
        return None
        
    except Exception as e:
        print(f"❌ [SUPABASE_VALIDATION] Error en validación: {e}")
        log_entry['result'] = False
        log_entry['decision'] = 'error'
        log_entry['reason'] = f'Error during validation: {str(e)}'
        log_entry['match_status'] = 'validation_error'
        save_log_to_supabase(log_entry)
        return None

# Función para guardar log en Supabase (replica exacta de Edge Function)
def save_log_to_supabase(log_entry):
    print("📝 [LOG] Guardando log en Supabase...")
    try:
        supabase.from_('logs').insert([log_entry]).execute()
        print("✅ [LOG] Log guardado exitosamente")
    except Exception as e:
        print(f"❌ [LOG] Error guardando log: {e}")

# Función principal de procesamiento (versión de prueba con imagen local)
def process_test_image():
    print("\n🧪 [TEST_PROCESS] Iniciando procesamiento de imagen de prueba...")
    print("=" * 60)
    
    # 1. Cargar imagen de prueba
    print("📸 [STEP_1] Cargando imagen de prueba...")
    image = load_test_image()
    if image is None:
        print("❌ [STEP_1] Falló carga de imagen de prueba")
        return
    
    print("✅ [STEP_1] Imagen de prueba cargada exitosamente")
    
    # 2. Extraer embedding
    print("\n🧠 [STEP_2] Extrayendo embedding facial...")
    embedding = extract_embedding(image) # Usar la nueva función
    if embedding is None:
        print("❌ [STEP_2] Falló extracción de embedding")
        return
    
    print("✅ [STEP_2] Embedding extraído exitosamente")
    
    # 3. Validar en Supabase con zona específica
    print("\n🔍 [STEP_3] Validando en base de datos...")
    validation_result = validate_face_in_supabase(embedding, ZONE_ID)
    
    if validation_result:
        print(f"✅ [STEP_3] Validación completada exitosamente: {validation_result['type']}")
        print(f"   🎯 [STEP_3] Tipo de usuario: {validation_result['user']['user_type']}")
        print(f"   🚪 [STEP_3] Acceso: {'Concedido' if validation_result['user']['hasAccess'] else 'Denegado'}")
    else:
        print("❌ [STEP_3] Validación falló")
    
    print("=" * 60)

# Función principal de procesamiento (versión RTSP)
def process_frame():
    print("\n🔄 [PROCESS_FRAME] Iniciando procesamiento de frame RTSP...")
    print("=" * 60)
    
    # 1. Capturar imagen desde RTSP
    print("📹 [STEP_1] Capturando imagen desde RTSP...")
    image = capture_image_from_rtsp()
    if image is None:
        print("❌ [STEP_1] Falló captura de imagen RTSP")
        return
    
    print("✅ [STEP_1] Imagen RTSP capturada exitosamente")
    
    # 2. Extraer embedding
    print("\n🧠 [STEP_2] Extrayendo embedding facial...")
    embedding = extract_embedding(image) # Usar la nueva función
    if embedding is None:
        print("❌ [STEP_2] Falló extracción de embedding")
        return
    
    print("✅ [STEP_2] Embedding extraído exitosamente")
    
    # 3. Validar en Supabase con zona específica
    print("\n🔍 [STEP_3] Validando en base de datos...")
    validation_result = validate_face_in_supabase(embedding, ZONE_ID)
    
    if validation_result:
        print(f"✅ [STEP_3] Validación completada exitosamente: {validation_result['type']}")
        print(f"   🎯 [STEP_3] Tipo de usuario: {validation_result['user']['user_type']}")
        print(f"   🚪 [STEP_3] Acceso: {'Concedido' if validation_result['user']['hasAccess'] else 'Denegado'}")
    else:
        print("❌ [STEP_3] Validación falló")
    
    print("=" * 60)

# Loop principal
def main():
    print("🚀 Servidor OpenDoor Python iniciando...")
    print("=" * 60)
    print(f"📡 [MQTT] Broker: {MQTT_BROKER_URL}")
    print(f"📡 [MQTT] Tópico: {MQTT_TOPIC}")
    print(f"📹 [RTSP] URL: {RTSP_URL}")
    print(f"🔗 [SUPABASE] URL: {SUPABASE_URL}")
    print("=" * 60)
    
    # Verificar conexión MQTT
    if mqtt_client is None:
        print("❌ [MQTT] No se pudo conectar al broker MQTT")
        print("   💡 [MQTT] Verifica que Mosquitto esté corriendo en localhost:1883")
        print("   💡 [MQTT] O actualiza MQTT_BROKER_URL en tu archivo .env")
        return
    
    try:
        while True:
            if TEST_MODE:
                process_test_image() # Cambiado para usar la imagen de prueba
            else:
                process_frame() # Usar la cámara RTSP
            print(f"\n⏰ [LOOP] Esperando 5 segundos para siguiente procesamiento...")
            time.sleep(5)  # Procesar cada 5 segundos
    except KeyboardInterrupt:
        print("\n🛑 Deteniendo servidor...")
        if mqtt_client:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()
        print("✅ Servidor detenido")

if __name__ == "__main__":
    main()
