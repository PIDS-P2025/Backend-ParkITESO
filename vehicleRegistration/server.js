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

// Obtener todos los vehículos registrados (principalmente para pruebas)
app.get('/vehicles', (req, res) => {
  db.query('SELECT * FROM CAR', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// get cars by owner id
app.get('/vehicles-get-by-owner/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM CARS WHERE propietario_id = ?', [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'propietario no encontrado' });
      return;
    }
    res.json(results);
  });
});

// Crear un nuevo vehículo
app.post('/vehicles', (req, res) => {
  const { placa, marca, modelo, color, tipo, propietario_id, status } = req.body;
  
  const query =
    'INSERT INTO CAR (placa, marca, modelo, color, tipo, propietario_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.query(query, [placa, marca, modelo, color, tipo, propietario_id, status], (err, result) => { //add enums for brand, model, color, type
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: result.insertId, placa, marca, modelo, color, tipo, propietario_id, status });
  });
});

// Actualizar un vehículo por ID
app.put('/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const { plate, brand, model, color, type, propietario_id } = req.body;

  // Step 1: Check if propietario_id matches the one in the database
  const checkQuery = 'SELECT propietario_id FROM CAR WHERE id = ?';
  db.query(checkQuery, [id], (checkErr, checkResults) => {
    if (checkErr) {
      res.status(500).json({ error: checkErr.message });
      return;
    }
    if (checkResults.length === 0) {
      res.status(404).json({ message: 'Vehiculo no encontrado' });
      return;
    }

    const existingPropietarioId = checkResults[0].propietario_id;
    if (existingPropietarioId !== propietario_id) {
      res.status(403).json({ message: 'No tienes permiso para actualizar este vehículo' });
      return;
    }

    // Step 2: Proceed with the update if propietario_id matches
    const updateQuery =
      'UPDATE CAR SET plate=?, brand=?, color=?, type=? WHERE id=?';
    db.query(
      updateQuery,
      [plate, brand, model, color, type, id],
      (updateErr, updateResult) => {
        if (updateErr) {
          res.status(500).json({ error: updateErr.message });
          return;
        }
        if (updateResult.affectedRows === 0) {
          res.status(404).json({ message: 'Vehiculo no encontrado' });
          return;
        }
        res.json({ id, plate, brand, model, color, type, propietario_id });
      }
    );
  });
});

// Eliminar un vehículo por ID
app.delete('/vehicle/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM CAR WHERE id = ?', [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Vehiculo no encontrada' });
      return;
    }
    res.json({ message: 'Vehiculo eliminado correctamente' });
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`La aplicación está escuchando en ${port}`);
});

// Al final del archivo
module.exports = app;
