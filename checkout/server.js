require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const { swaggerUi, swaggerSpec } = require("./swagger");

const app = express();
app.use(express.json());

// Swagger docs endpoint
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = 4000;

// Conexión a RDS
const db = mysql.createConnection({
    host: process.env.RDS_ENDPOINT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306,
});

// Conexión y prueba de tablas
db.connect((err) => {
  if (err) {
    console.error("❌ Error al conectar a RDS:", err.message);
  } else {
    console.log("✅ Conectado a MariaDB en RDS");

    db.query("SHOW TABLES", (err, results) => {
      if (err) throw err;
      console.log("🗂 Tablas disponibles:", results);
    });
  }
});

/**
 * @swagger
 * /checkout:
 *   post:
 *     summary: Registrar un checkout automático
 *     description: Registra la salida de un usuario del estacionamiento ITESO.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Checkout exitoso
 *       400:
 *         description: userId faltante
 */
app.post("/checkout", (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const checkoutTime = new Date().toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
  });

  // Step 1: Retrieve the current past_parking_spots for the user
  const getHistoryQuery = `
    SELECT past_parking_spots 
    FROM HISTORY 
    WHERE user_id = ? 
    ORDER BY id DESC 
    LIMIT 1
  `;

  db.query(getHistoryQuery, [userId], (getErr, results) => {
    if (getErr) {
      console.error("❌ Error al obtener historial:", getErr.message);
      return res.status(500).json({ error: "Error al obtener historial" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "No history found for the user" });
    }

    // Step 2: Parse the past_parking_spots and update the last item's checkout time
    let pastParkingSpots = JSON.parse(results[0].past_parking_spots);
    if (pastParkingSpots.length === 0) {
      return res.status(400).json({ error: "No parking spots to update" });
    }

    // Update the last item's checkout time
    pastParkingSpots[pastParkingSpots.length - 1].checkout = checkoutTime;

    // Step 3: Save the updated past_parking_spots back to the database
    const updateHistoryQuery = `
      UPDATE HISTORY 
      SET past_parking_spots = ? 
      WHERE user_id = ? 
      ORDER BY id DESC 
      LIMIT 1
    `;

    db.query(updateHistoryQuery, [JSON.stringify(pastParkingSpots), userId], (updateErr) => {
      if (updateErr) {
        console.error("❌ Error al actualizar historial:", updateErr.message);
        return res.status(500).json({ error: "Error al actualizar historial" });
      }

      // Respond with success
      res.json({
        message: "✅ Checkout registrado con éxito",
        data: {
          userId,
          checkoutTime,
        },
      });
    });
  });
});

/**
 * @swagger
 * /historial/{userId}:
 *   get:
 *     summary: Obtener historial de checkouts por usuario
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de checkouts
 *       500:
 *         description: Error en servidor
 */
app.get("/historial/:userId", (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT id, user_id, past_parking_spots
    FROM HISTORY
    WHERE user_id = ?
    ORDER BY id DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ Error al obtener historial:", err.message);
      return res.status(500).json({ error: "Error al obtener historial" });
    }

    const historial = results.map((row) => ({
      id: row.id,
      userId: row.user_id,
      checkouts: JSON.parse(row.past_parking_spots)
    }));

    res.json({
      message: "📋 Historial obtenido con éxito",
      data: historial
    });
  });
});

app.listen(PORT, () => {
  console.log(`✅ Servicio de checkout corriendo en http://localhost:${PORT}`);
});
