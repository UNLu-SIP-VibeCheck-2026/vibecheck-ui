# Usa una imagen base oficial de Node.js
FROM node:22-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de definición de dependencias
COPY package*.json ./

# Instala Angular CLI globalmente y las dependencias del proyecto
RUN npm install -g @angular/cli@19.0.0
RUN npm install

# Copia el resto del código de la aplicación
COPY . .

# Expone el puerto por defecto de Angular
EXPOSE 4200

# El comando por defecto para iniciar la aplicación permitiendo conexiones externas al contenedor
CMD ["npm", "run", "start:docker", "--", "--host", "0.0.0.0"]
