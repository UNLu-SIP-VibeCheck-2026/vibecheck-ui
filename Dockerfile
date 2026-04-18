# ETAPA 1: Build con Node
FROM node:22-alpine AS build
WORKDIR /app

# Usar npm ci como pide la guía (requiere que exista package-lock.json)
COPY package*.json ./
RUN npm ci

# Copiamos el código y construimos la aplicación
COPY . .
# Usamos el ARG para recibir la variable en tiempo de build (si se usa Docker)
ARG API_URL
ENV API_URL=$API_URL

# Construimos el proyecto para producción
RUN npm run build --configuration=production

# ETAPA 2: Servir con Nginx (como pide la guía)
FROM nginx:alpine

# Copiamos el build generado en la etapa 1 al directorio de Nginx
# NOTA: Cambia "nombre-de-tu-proyecto" por el nombre real de tu app en Angular 
# (puedes verlo en la propiedad "outputPath" de tu angular.json)
COPY --from=build /app/dist/nombre-de-tu-proyecto/browser /usr/share/nginx/html

# Copiamos la configuración personalizada de Nginx para el fallback de rutas
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]