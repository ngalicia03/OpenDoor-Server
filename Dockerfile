FROM node:18-alpine

# Establecer variables de entorno para producción
ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app

# Instalar dependencias del sistema necesarias para canvas y ffmpeg
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    ffmpeg \
    git \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    && rm -rf /var/cache/apk/*

# Copiar package.json y package-lock.json
COPY package*.json ./

# Copiar el código fuente ANTES de instalar dependencias
COPY . .

# Instalar dependencias de Node.js (ahora downloadModels.js estará disponible)
RUN npm ci --only=production

# Crear directorio para modelos si no existe
RUN mkdir -p models

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Cambiar permisos
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exponer el puerto
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicio
CMD ["npm", "start"]
