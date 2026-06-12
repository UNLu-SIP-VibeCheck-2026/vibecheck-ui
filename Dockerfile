# ETAPA 1: Entorno de Desarrollo Base
FROM node:22-alpine AS dev
WORKDIR /app

# Copiamos los archivos de empaquetado y el .npmrc de la raíz
COPY package*.json .npmrc ./

# FIX DEFINITIVO: Reemplazamos npm ci por npm install para evitar bloqueos de sincronización
RUN npm install --legacy-peer-deps

# Copiamos el código
COPY . .

# ETAPA 2: Build para Producción
FROM dev AS build
# Usamos el ARG para recibir la variable en tiempo de build (si se usa Docker)
ARG API_URL
ENV API_URL=$API_URL

# Construimos el proyecto para producción
RUN npm run build --configuration=production

# ETAPA 3: Servir con Nginx (como pide la guía)
FROM nginx:alpine AS prod

# Copiamos el build generado en la etapa anterior al directorio de Nginx
COPY --from=build /app/dist/vibecheck-ui/browser /usr/share/nginx/html

# Copiamos la configuración personalizada de Nginx para el fallback de rutas
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]