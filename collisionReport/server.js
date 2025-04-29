require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 4002;

const db = mysql.createConnection({
  host: process.env.RDS_ENDPOINT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306
});

db.connect((err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
    return;
  }
  console.log('✅ Conectado a MySQL');
});

app.use(express.json());

// Configurar multer para fotos (opcional)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Aquí luego pondremos los endpoints como POST /collisions, GET /collisions/mine, etc.

app.listen(port, () => {
  console.log(`🚗 Servicio de Collision Reports escuchando en http://localhost:${port}`);
});

module.exports = app;
