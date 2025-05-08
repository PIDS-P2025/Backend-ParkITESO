require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

// DB
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
});

db.connect((err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos MySQL');
  }
});

// AWS S3
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

async function uploadToS3(fileBuffer, originalname) {
  const key = `collision_reports/${crypto.randomUUID()}-${originalname}`;
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: 'image/jpeg',
  });
  await s3.send(command);
  return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

// 📍 POST /collisions
app.post('/collisions', upload.single('photo'), async (req, res) => {
  const { reporterUserId, affectedPlate, location, description } = req.body;
  const file = req.file;

  try {
    if (!file) return res.status(400).json({ error: 'Falta la foto del daño.' });

    const photoUrl = await uploadToS3(file.buffer, file.originalname);

    const [plateRows] = await db.promise().query(
      'SELECT propietario_id FROM CAR WHERE placa = ?',
      [affectedPlate]
    );

    if (plateRows.length === 0) {
      return res.status(404).json({ error: 'No se encontró ningún vehículo con esa placa' });
    }

    const affectedUserId = plateRows[0].propietario_id;

    await db.promise().query(
      `INSERT INTO COLLISION_REPORTS 
        (reporter_user_id, affected_plate, affected_user_id, location, description, photo_url) 
        VALUES (?, ?, ?, ?, ?, ?)`,
      [reporterUserId, affectedPlate, affectedUserId, location, description, photoUrl]
    );

    res.status(201).json({ message: 'Reporte guardado correctamente (sin correo)' });

  } catch (error) {
    console.error('❌ Error en /collisions:', error.message);
    res.status(500).json({ error: 'Error al guardar el reporte de colisión' });
  }
});

// 📍 GET /collisions
app.get('/collisions', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT * FROM COLLISION_REPORTS ORDER BY timestamp DESC');
    res.json(rows);
  } catch (error) {
    console.error('❌ Error obteniendo los reportes:', error.message);
    res.status(500).json({ error: 'Error al obtener los reportes de colisión' });
  }
});

// 📍 GET /collisions/:id
app.get('/collisions/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.promise().query('SELECT * FROM COLLISION_REPORTS WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reporte de colisión no encontrado' });
    }

    const report = rows[0];
    if (report.timestamp) {
      report.timestamp = new Date(report.timestamp).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    }

    res.json(report);
  } catch (error) {
    console.error('❌ Error obteniendo el reporte:', error.message);
    res.status(500).json({ error: 'Error al obtener el reporte de colisión' });
  }
});

// 📍 PATCH /collisions/:id
app.patch('/collisions/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['reported', 'resolved', 'dismissed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido. Usa reported, resolved o dismissed.' });
  }

  try {
    const [result] = await db.promise().query(
      'UPDATE COLLISION_REPORTS SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    res.status(200).json({ message: 'Estado del reporte actualizado exitosamente' });
  } catch (error) {
    console.error('❌ Error actualizando el estado:', error.message);
    res.status(500).json({ error: 'Error al actualizar el estado del reporte' });
  }
});

// 📍 DELETE /collisions/:id
app.delete('/collisions/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.promise().query(
      'DELETE FROM COLLISION_REPORTS WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reporte de colisión no encontrado' });
    }

    res.status(200).json({ message: 'Reporte de colisión eliminado exitosamente' });
  } catch (error) {
    console.error('❌ Error eliminando el reporte:', error.message);
    res.status(500).json({ error: 'Error al eliminar el reporte de colisión' });
  }
});

// 📍 GET /collisions/mine/:reporterUserId
app.get('/collisions/mine/:reporterUserId', async (req, res) => {
  const { reporterUserId } = req.params;

  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM COLLISION_REPORTS WHERE reporter_user_id = ? ORDER BY timestamp DESC',
      [reporterUserId]
    );

    res.json(rows);
  } catch (error) {
    console.error('❌ Error obteniendo reportes del usuario:', error.message);
    res.status(500).json({ error: 'Error al obtener los reportes del usuario' });
  }
});

// Iniciar servidor
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚗 Servicio de Collision Reports activo en http://localhost:${PORT}`);
  });
}

module.exports = { app };

