const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const AWS = require('aws-sdk');
const path = require('path');

require('dotenv').config();

const app = express();
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
}).promise();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

app.post('/report-bad-parking', upload.single('photo'), async (req, res) => {
  try {
    const { userID, placa, modelo, location } = req.body;
    const { latitude, longitude } = JSON.parse(location);

    if (!req.file) {
      return res.status(400).json({ error: 'Foto es requerida' });
    }

    if (!userID || !placa || !modelo || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const point = `POINT(${latitude} ${longitude})`;

    const [zoneResults] = await db.execute(
      `SELECT id, name, use_slots 
       FROM PARKING_ZONES 
       WHERE ST_CONTAINS(ST_GeomFromText(polygon), ST_GeomFromText(?))`,
      [point]
    );

    if (zoneResults.length === 0) {
      return res.status(404).json({ message: 'No se encontró zona para las coordenadas proporcionadas' });
    }

    const zonaNombre = zoneResults[0].name;

    const fileContent = req.file.buffer;
    const ext = path.extname(req.file.originalname);
    const s3Key = `reports/${Date.now()}${ext}`;

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: req.file.mimetype,
      ACL: 'public-read'
    };

    const s3Result = await s3.upload(uploadParams).promise();
    const photoURL = s3Result.Location;

    const [result] = await db.execute(
      `INSERT INTO BAD_PARK_REPORTS (user_id, placa, modelo, url_foto, status, zona_nombre)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [userID, placa, modelo, zonaNombre, photoURL]
    );

    res.json({ success: true, reportID: result.insertId, photoURL, zona: zonaNombre });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al procesar el reporte' });
  }
});

const port = process.env.PORT || 3006;
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
