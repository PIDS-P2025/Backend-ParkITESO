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

app.post('/clear-history/:userId', (req, res) => { //for testing purposes only
  const { userId } = req.params;

  // Query to clear the past_parking_spots for the given user
  const clearHistoryQuery = `
    UPDATE HISTORY 
    SET past_parking_spots = '' 
    WHERE user_id = ?
  `;

  db.query(clearHistoryQuery, [userId], (err, results) => {
    if (err) {
      console.error('❌ Error al limpiar historial:', err.message);
      return res.status(500).json({ error: 'Error al limpiar historial' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'No history found for the user' });
    }

    res.json({
      message: '✅ Historial de estacionamiento limpiado con éxito',
      userId,
    });
  });
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

app.get('/history/:userId', (req, res) => {
  const { userId } = req.params;

  // Query to retrieve the user's parking history
  const getHistoryQuery = `
    SELECT past_parking_spots 
    FROM HISTORY 
    WHERE user_id = ? 
    ORDER BY id DESC
  `;

  db.query(getHistoryQuery, [userId], (err, results) => {
    if (err) {
      console.error('❌ Error al obtener historial:', err.message);
      return res.status(500).json({ error: 'Error al obtener historial' });
    }

    if (results.length === 0 || results.every(row => !row.past_parking_spots)) {
      return res.status(404).json({ message: 'No check-ins registered yet' });
    }

    // Parse and format the history
    const history = results
      .filter(row => row.past_parking_spots) // Skip rows with null or empty past_parking_spots
      .map((row) => {
        try {
          return JSON.parse(row.past_parking_spots);
        } catch (parseError) {
          console.error('❌ Error parsing past_parking_spots:', parseError.message);
          return [];
        }
      })
      .flat() // Flatten the array if there are multiple rows
      .map((entry) => ({
        zone: entry.zone || null,
        checkin: entry.checkin || null,
        checkout: entry.checkout === 'Empty' ? null : entry.checkout,
        duration: entry.checkout && entry.checkin
          ? calculateDuration(entry.checkin, entry.checkout)
          : null,
      }));

    res.json({
      message: '📋 Check-in history retrieved successfully',
      data: history,
    });
  });
});

// Helper function to calculate duration
function calculateDuration(checkin, checkout) {
  // Convert localized date strings to ISO format
  const checkinDate = new Date(checkin.replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$2-$1'));
  const checkoutDate = new Date(checkout.replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$2-$1'));

  if (isNaN(checkinDate) || isNaN(checkoutDate)) {
    return 'Invalid duration';
  }

  const durationMs = checkoutDate - checkinDate;

  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}

// Iniciar el servidor
app.listen(port, () => {
  console.log(`La aplicación está escuchando en ${port}`);
});

// Al final del archivo
module.exports = app;
