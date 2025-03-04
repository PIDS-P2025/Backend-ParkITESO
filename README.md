# Backend-ParkITESO

Este repositorio contiene las instrucciones para clonar el código en una instancia EC2, construir una imagen de Docker y ejecutarla correctamente.

## 📥 Clonar el Repositorio en EC2

GitHub eliminó la autenticación con contraseña en 2021, por lo que se recomienda usar **SSH** o un **Token de Acceso Personal (PAT)**.

### 🔹 Opción 1: Clonar con SSH (Recomendado)

1. **Generar una clave SSH** en la instancia EC2 (si no la tienes):

   ```sh
   ssh-keygen -t rsa -b 4096 -C "tu-email@example.com"
   ```

   Presiona `Enter` en todas las opciones.

2. **Obtener la clave pública**:

   ```sh
   cat ~/.ssh/id_rsa.pub
   ```

   Copia el contenido y agrégalo en **GitHub > Configuración > SSH and GPG keys**.

3. **Probar la conexión**:

   ```sh
   ssh -T git@github.com
   ```

   Si todo está bien, verás un mensaje de bienvenida.

4. **Clonar el repositorio**:
   ```sh
   git clone git@github.com:PIDS-P2025/Backend-ParkITESO.git
   ```

### 🔹 Opción 2: Clonar con Token de Acceso Personal (PAT)

1. Genera un token en [GitHub Tokens](https://github.com/settings/tokens) con permisos `repo`.
2. Usa este comando para clonar:
   ```sh
   git clone https://<TOKEN>@github.com/PIDS-P2025/Backend-ParkITESO.git
   ```
   Sustituye `<TOKEN>` con el generado.

---

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
