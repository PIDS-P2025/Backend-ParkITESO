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

app.get('/history', (req, res) => {
  // Query to retrieve all records from the HISTORY table
  const getAllHistoryQuery = `
    SELECT * 
    FROM HISTORY
    ORDER BY id DESC
  `;

  db.query(getAllHistoryQuery, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener historial completo:', err.message);
      return res.status(500).json(err.message);
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No history records found' });
    }

    res.json({
      message: '📋 All history records retrieved successfully',
      data: results,
    });
  });
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
      const checkInDate = new Date().toLocaleString("es-MX", {
        timeZone: "America/Mexico_City",
      });
      const newEntry = JSON.stringify([{ zone: zoneName, checkout: "Empty", checkin: checkInDate }]);

            const updateHistoryQuery = `
        UPDATE HISTORY 
        SET past_parking_spots = 
          CASE 
            WHEN past_parking_spots IS NULL OR past_parking_spots = '' THEN ?
            ELSE CONCAT(SUBSTRING(past_parking_spots, 1, LENGTH(past_parking_spots) - 1), ',', ?) 
          END
        WHERE user_id = ?
      `;
      
      db.query(updateHistoryQuery, [newEntry, newEntry.slice(1), user_id], (historyErr, historyResults) => {
        if (historyErr) {
          res.status(500).json({ error: historyErr.message });
          return;
        }
      
        if (historyResults.affectedRows === 0) {
          // If no rows were updated, insert a new record
          const insertHistoryQuery = `
            INSERT INTO HISTORY (user_id, past_parking_spots) 
            VALUES (?, ?)
          `;
          db.query(insertHistoryQuery, [user_id, newEntry], (insertErr) => {
            if (insertErr) {
              res.status(500).json({ error: insertErr.message });
              return;
            }
      
            // Respond with success after inserting
            res.json({ message: 'Check-in successful (new record created)', zone: zoneName });
          });
        } else {
          // Respond with success if the update was successful
          res.json({ message: 'Check-in successful', zone: zoneName });
        }
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
