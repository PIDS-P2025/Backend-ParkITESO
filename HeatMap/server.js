require('dotenv').config();
const express = require('express');
const axios = require("axios");

const app = express();
const port = 3000;

app.use(express.json());

app.post("/location", async (req, res) => {
  try {
    const { latitud, longitud } = req.body;

    if (!latitud || !longitud) {
      return res.status(400).json({ error: "Faltan coordenadas" });
    }

    console.log(`Recibido: ${latitud}, ${longitud}`);

    // Llamada a la API de Geocoding de Google para obtener dirección a partir de coordenadas
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          latlng: `${latitud},${longitud}`,
          key: process.env.GOOGLE_API_KEY,
        },
      }
    );

    const data = response.data;

    if (data.status !== "OK" || !data.results.length) {
      return res.status(404).json({ error: "No se pudo obtener dirección" });
    }

    // Puedes enviar dirección completa y coordenadas
    const resultado = {
      direccion: data.results[0].formatted_address,
      coordenadas: {
        lat: latitud,
        lng: longitud
      }
    };

    res.json(resultado);
  } catch (error) {
    console.error("Error interno:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.listen(port, () => {
  console.log(`La aplicación está escuchando en http://localhost:${port}`);
});

module.exports = app;
