# Backend-ParkITESO

Este repositorio contiene las instrucciones para clonar el código en una instancia EC2, construir una imagen de Docker y ejecutarla correctamente.

## 🛠 Construir la Imagen de Docker

Una vez que el código está en la instancia, navega al directorio del repositorio:

```sh
cd Backend-ParkITESO
```

Ejecuta el siguiente comando para construir la imagen de Docker:

```sh
docker build -t backend-parkiteso .
```

---

## 🚀 Ejecutar el Contenedor

Para correr la aplicación en un contenedor de Docker, usa:

```sh
docker run -d -p 8080:8080 --name backend-parkiteso backend-parkiteso
```

- `-d`: Ejecuta el contenedor en segundo plano.
- `-p 8080:8080`: Mapea el puerto 8080 del contenedor al 8080 de la máquina host.
- `--name backend-parkiteso`: Asigna un nombre al contenedor.

---

## 📌 Comandos Útiles de Docker

- **Ver contenedores en ejecución:**
  ```sh
  docker ps
  ```
- **Ver todas las imágenes:**
  ```sh
  docker images
  ```
- **Detener un contenedor:**
  ```sh
  docker stop backend-parkiteso
  ```
- **Eliminar un contenedor:**
  ```sh
  docker rm -f backend-parkiteso
  ```
- **Eliminar una imagen:**d
  ```sh
  docker rmi backend-parkiteso
  ```

---

### ✅ ¡Listo! Ahora el backend debería estar corriendo en la instancia EC2. 🎉
