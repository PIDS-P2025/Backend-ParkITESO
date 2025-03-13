const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(bodyParser.json());

// Configuración de la conexión a la base de datos
const db = mysql.createConnection({
  host: process.env.RDS_ENDPOINT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
});

// Conectar a la base de datos
db.connect((err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});

// Obtener todas las zonas de estacionamiento
app.get('/parking_zones', (req, res) => {
  db.query('SELECT * FROM PARKING_ZONES', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Obtener una zona por ID
app.get('/parking_zones/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM PARKING_ZONES WHERE id = ?', [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'Zona no encontrada' });
      return;
    }
    res.json(results[0]);
  });
});

// Crear una nueva zona de estacionamiento
app.post('/parking_zones', (req, res) => {
  const { name, num_slots, use_slots, status, polygon } = req.body;
  const query =
    'INSERT INTO PARKING_ZONES (name, num_slots, use_slots, status, polygon) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [name, num_slots, use_slots, status, JSON.stringify(polygon)], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: result.insertId, name, num_slots, use_slots, status, polygon });
  });
});

// Actualizar una zona por ID
app.put('/parking_zones/:id', (req, res) => {
  const { id } = req.params;
  const { name, num_slots, use_slots, status, polygon } = req.body;
  const query =
    'UPDATE PARKING_ZONES SET name=?, num_slots=?, use_slots=?, status=?, polygon=? WHERE id=?';
  db.query(
    query,
    [name, num_slots, use_slots, status, JSON.stringify(polygon), id],
    (err, result) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (result.affectedRows === 0) {
        res.status(404).json({ message: 'Zona no encontrada' });
        return;
      }
      res.json({ id, name, num_slots, use_slots, status, polygon });
    }
  );
});

// Eliminar una zona por ID
app.delete('/parking_zones/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM PARKING_ZONES WHERE id = ?', [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Zona no encontrada' });
      return;
    }
    res.json({ message: 'Zona eliminada correctamente' });
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`La aplicación está escuchando en ${port}`);
});

// Al final del archivo
module.exports = app;
