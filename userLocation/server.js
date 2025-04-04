require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const geolib = require("geolib");

const app = express();
app.use(cors());
app.use(express.json());

const SERVER_IP = process.env.SERVER_IP || "http://localhost:4000"; // Asegúrate de tener esto en .env también

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚗 Servicio de ubicación corriendo en http://localhost:${PORT}`);
});

// Coordenadas del polígono (ficticias del ITESO)
const parkingZone = [
  { latitude: 20.6081, longitude: -103.4112 },
  { latitude: 20.6075, longitude: -103.4100 },
  { latitude: 20.6060, longitude: -103.4105 },
  { latitude: 20.6066, longitude: -103.4120 }
];

// Guardamos estado por usuario
const userStates = {};

// Función para verificar si está fuera del polígono
const isOutsideZone = (latitude, longitude) => {
  return !geolib.isPointInPolygon({ latitude, longitude }, parkingZone);
};

// 📍 Endpoint principal
app.post("/location", async (req, res) => {
  const { latitude, longitude, userId } = req.body;

  if (!latitude || !longitude || !userId) {
    return res.status(400).json({ error: "Missing data" });
  }

  const outside = isOutsideZone(latitude, longitude);
  const userState = userStates[userId] || {};

  // Si el usuario regresó al polígono, cancelamos el timeout
  if (!outside && userState.timeout) {
    clearTimeout(userState.timeout);
    userStates[userId] = { inside: true };
    console.log(`🟢 Usuario ${userId} regresó al área antes del checkout.`);
    return res.json({ message: "User returned to area, timeout cleared." });
  }

  // Si salió del polígono y no tiene timeout, iniciamos uno
  if (outside && !userState.timeout) {
    console.log(`🔴 Usuario ${userId} salió del área, esperando 3 minutos...`);

    const timeout = setTimeout(async () => {
      try {
        await axios.post(`${SERVER_IP}/checkout`, { userId });
        console.log(`✅ Checkout automático para usuario ${userId}`);
      } catch (error) {
        console.error(`❌ Error en checkout automático de ${userId}:`, error.message);
      }
    }, 5000); // ← Cambia a 5000 para pruebas (5 segundos)

    userStates[userId] = { inside: false, timeout };
  }

  res.json({ message: "Ubicación procesada correctamente" });
});


module.exports = app;