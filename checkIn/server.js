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

app.post('/check-in', (req, res) => {
  const { latitude, longitude, user_id } = req.body;

  // Step 1: Check if the latitude and longitude are within a polygon in PARKING_ZONES
  const checkZoneQuery = `
    SELECT id, name, use_slots 
    FROM PARKING_ZONES 
    WHERE ST_CONTAINS(ST_GeomFromText(polygon), ST_GeomFromText(?))
  `;
  const point = `POINT(${latitude} ${longitude})`; // Format the point as WKT (Well-Known Text)

  db.query(checkZoneQuery, [point], (zoneErr, zoneResults) => {
    if (zoneErr) {
      res.status(500).json({ error: zoneErr.message });
      return;
    }

    if (zoneResults.length === 0) {
      res.status(404).json({ message: 'No parking zone found for the given coordinates' });
      return;
    }

    const zone = zoneResults[0];
    const zoneId = zone.id;
    const zoneName = zone.name;
    const updatedSlots = zone.use_slots - 1;

    // Validation: Check if the zone is full
    if (updatedSlots < 0) {
      res.status(400).json({ message: 'Zone is full' });
      return;
    }

    // Step 2: Subtract 1 from the use_slots column for the matching zone
    const updateSlotsQuery = `
      UPDATE PARKING_ZONES 
      SET use_slots = ? 
      WHERE id = ?
    `;
    db.query(updateSlotsQuery, [updatedSlots, zoneId], (updateErr) => {
      if (updateErr) {
        res.status(500).json({ error: updateErr.message });
        return;
      }

      // Step 3: Update the HISTORY table for the given user_id
      const updateHistoryQuery = `
        UPDATE HISTORY 
        SET past_parking_spots = CONCAT(past_parking_spots, ', ', ?) 
        WHERE user_id = ?
      `;
      db.query(updateHistoryQuery, [zoneName, user_id], (historyErr) => {
        if (historyErr) {
          res.status(500).json({ error: historyErr.message });
          return;
        }

        // Respond with success
        res.json({ message: 'Check-in successful', zone: zoneName });
      });
    });
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`La aplicación está escuchando en ${port}`);
});

// Al final del archivo
module.exports = app;
