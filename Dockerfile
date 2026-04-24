# ETAPA 1: Entorno de Desarrollo Base
FROM node:22-alpine AS dev
WORKDIR /app

# Usar npm ci como pide la guía (requiere que exista package-lock.json)
COPY package*.json ./
RUN npm ci

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

# Copiamos el build generado en la etapa 1 al directorio de Nginx
COPY --from=build /app/dist/vibecheck-ui /usr/share/nginx/html

# Copiamos la configuración personalizada de Nginx para el fallback de rutas
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]