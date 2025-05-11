require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const db = mysql.createPool({
  host: process.env.RDS_HOSTNAME,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  port: process.env.RDS_PORT,
  database: process.env.RDS_DB_NAME,
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

async function uploadToS3(fileBuffer, originalname) {
  const key = `incident_reports/${crypto.randomUUID()}-${originalname}`;
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: 'image/jpeg',
  });
  await s3.send(command);
  return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

app.post('/incidents/self-report', upload.single('photo'), async (req, res) => {
  const { userId, timestamp, location, description, suspectedPlate } = req.body;
  const file = req.file;
  let photoUrl = null;

  try {
    if (file) {
      photoUrl = await uploadToS3(file.buffer, file.originalname);
    }

    let suspectedUserId = null;
    if (suspectedPlate) {
      const [carRows] = await db.query('SELECT propietario_id FROM CAR WHERE placa = ?', [suspectedPlate]);
      if (carRows.length > 0) {
        suspectedUserId = carRows[0].propietario_id;
        await db.query(
          'INSERT INTO PLATE_SUSPECT_LOG (reporter_user_id, suspected_plate, suspected_user_id) VALUES (?, ?, ?)',
          [userId, suspectedPlate, suspectedUserId]
        );
    }
}

await db.query(
  `INSERT INTO INCIDENT_SELF_REPORTS 
    (user_id, timestamp, location, description, photo_url, suspected_plate, origin, status)
    VALUES (?, ?, ?, ?, ?, ?, 'victim', 'under_review')`,
  [userId, timestamp, location, description, photoUrl, suspectedPlate]
);

res.status(201).json({ message: 'Tu reporte ha sido recibido. Guardaremos el incidente.' });
} catch (error) {
console.error('Error en el reporte:', error.message);
res.status(500).json({ error: 'Error al guardar el reporte' });
}
});

app.get('/incidents/mine/:userId', async (req, res) => {
const { userId } = req.params;
try {
const [rows] = await db.query(
  'SELECT * FROM INCIDENT_SELF_REPORTS WHERE user_id = ? ORDER BY timestamp DESC',
  [userId]
);
res.json(rows);
} catch (error) {
console.error('Error obteniendo reportes:', error.message);
res.status(500).json({ error: 'Error al obtener los reportes' });
}
});

app.listen(PORT, () => {
console.log(`Servicio de incidentes sin responsable activo en http://localhost:${PORT}`);
});