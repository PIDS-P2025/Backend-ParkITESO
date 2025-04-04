require('dotenv').config();
const express = require('express');
const axios = require("axios");

const app = express();
const port = 3000;

app.use(express.json());

app.post("/location", (req, res) => {
  // Extract latitude and longitude from the request body
  try {
    const { latitud, longitud } = req.body;
  
    // Validate that both latitude and longitude are provided
    if (!latitud || !longitud) {
        // If either is missing, respond with a 400 Bad Request and an error message
        return res.status(400).json({ error: "Faltan coordenadas" });
    }

    // Log the received coordinates to the console for debugging or monitoring
    console.log(`Recieved Location: ${latitud}, ${longitud}`);

    // Respond with a success message indicating the location was received
    res.json({ mensaje: "Recieved Location" });
  } catch (error) {
    console.error("Error interno del servidor:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/api/googlePLace", async (req, res) => {
  const { query } = req.query;  // Tomamos el parámetro "query" de la URL

  if (!query) {
      return res.status(400).json({ error: "Falta el parámetro de búsqueda" });
  }

  try {
      // Llamada a la API de Google Places con axios
      const response = await axios.get(
          `https://maps.googleapis.com/maps/api/place/textsearch/json`,
          {
              params: {
                  query,  // El nombre o descripción del lugar a buscar
                  key: process.env.GOOGLE_API_KEY // La API Key de Google
              }
          }
      );
      
      res.json(response.data); // Enviamos la respuesta de Google al frontend
  } catch (error) {
      res.status(500).json({ error: "Error al obtener datos de Google Places" });
  }
});

app.listen(port, () => {
  console.log(`La aplicación está escuchando en ${port}`);
});

// Al final del archivo
module.exports = app;