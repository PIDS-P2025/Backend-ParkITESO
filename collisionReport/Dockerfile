# Usa una imagen base de Node.js
FROM node:14-alpine

# Establece el directorio de trabajo
WORKDIR /app

# Copia package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia todo el resto de la aplicación
COPY . .

# Expone el puerto
EXPOSE 4002

# Comando para correr la app
CMD ["node", "server.js"]
