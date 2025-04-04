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
  host: process.env.DB_HOST || "tu-host",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASS || "admin123",
  database: process.env.DB_NAME || "parkiteso"
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

  const parkingData = JSON.stringify([
    { zone: "ITESO", checkout: checkoutTime }
  ]);

  const sql = `
    INSERT INTO HISTORY (user_id, reports, notifications, past_parking_spots)
    VALUES (?, '', '', ?)
  `;

  db.query(sql, [userId, parkingData], (err, result) => {
    if (err) {
      console.error("❌ Error al guardar el checkout:", err.message);
      return res.status(500).json({ error: "Error al guardar en la base de datos" });
    }

    res.json({
      message: "✅ Checkout registrado con éxito en HISTORY",
      data: {
        userId,
        checkoutTime
      }
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
