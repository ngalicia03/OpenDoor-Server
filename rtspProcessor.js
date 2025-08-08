const Stream = require('node-rtsp-stream');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class RTSPProcessor {
    constructor(rtspUrl, processFrameCallback) {
        this.rtspUrl = rtspUrl;
        this.processFrameCallback = processFrameCallback;
        this.stream = null;
        this.isProcessing = false;
        this.frameBuffer = null;
        this.lastProcessTime = 0;
        this.processingInterval = 5000; // 5 segundos entre procesamientos
    }

    async start() {
        try {
            console.log('🔄 [RTSP] Iniciando procesador RTSP...');
            console.log(`📹 [RTSP] URL: ${this.rtspUrl}`);

            // Crear directorio temporal si no existe
            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Iniciar stream RTSP usando ffmpeg
            this.startFFmpegStream();

        } catch (error) {
            console.error('❌ [RTSP] Error iniciando procesador:', error);
        }
    }

    startFFmpegStream() {
        try {
            console.log('🔄 [RTSP] Iniciando stream con FFmpeg...');

            // Comando FFmpeg para capturar frames del stream RTSP
            const ffmpegArgs = [
                '-i', this.rtspUrl,
                '-f', 'image2',
                '-vf', 'fps=1/5', // 1 frame cada 5 segundos
                '-update', '1',
                path.join(__dirname, 'temp', 'frame.jpg')
            ];

            this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            this.ffmpegProcess.stdout.on('data', (data) => {
                console.log('📹 [RTSP] FFmpeg stdout:', data.toString());
            });

            this.ffmpegProcess.stderr.on('data', (data) => {
                console.log('📹 [RTSP] FFmpeg stderr:', data.toString());
            });

            this.ffmpegProcess.on('close', (code) => {
                console.log(`📹 [RTSP] FFmpeg process exited with code ${code}`);
            });

            // Iniciar procesamiento de frames
            this.startFrameProcessing();

        } catch (error) {
            console.error('❌ [RTSP] Error iniciando FFmpeg:', error);
        }
    }

    startFrameProcessing() {
        console.log('🔄 [RTSP] Iniciando procesamiento de frames...');

        // Procesar frames cada 5 segundos
        setInterval(() => {
            this.processLatestFrame();
        }, this.processingInterval);
    }

    async processLatestFrame() {
        try {
            const framePath = path.join(__dirname, 'temp', 'frame.jpg');
            
            // Verificar si existe el archivo de frame
            if (!fs.existsSync(framePath)) {
                console.log('⏳ [RTSP] Frame no disponible aún...');
                return;
            }

            // Verificar cooldown
            const now = Date.now();
            if (now - this.lastProcessTime < this.processingInterval) {
                return;
            }
            this.lastProcessTime = now;

            console.log('📷 [RTSP] Procesando frame del stream RTSP...');

            // Leer frame
            const frameBuffer = fs.readFileSync(framePath);
            
            if (frameBuffer.length === 0) {
                console.log('⚠️ [RTSP] Frame vacío, saltando...');
                return;
            }

            // Llamar callback para procesar frame
            if (this.processFrameCallback) {
                await this.processFrameCallback(frameBuffer);
            }

        } catch (error) {
            console.error('❌ [RTSP] Error procesando frame:', error);
        }
    }

    stop() {
        try {
            console.log('🛑 [RTSP] Deteniendo procesador RTSP...');

            if (this.ffmpegProcess) {
                this.ffmpegProcess.kill('SIGTERM');
            }

            // Limpiar archivos temporales
            const tempDir = path.join(__dirname, 'temp');
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }

            console.log('✅ [RTSP] Procesador RTSP detenido');

        } catch (error) {
            console.error('❌ [RTSP] Error deteniendo procesador:', error);
        }
    }
}

module.exports = RTSPProcessor;
