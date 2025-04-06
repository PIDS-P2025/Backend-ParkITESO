require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const { swaggerUi, swaggerSpec } = require("./swagger");

const app = express();
app.use(express.json());

// Swagger docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 4000;

// Conexión a la base de datos
const db = mysql.createConnection({
  host: process.env.RDS_ENDPOINT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("❌ Error al conectar a RDS:", err.message);
  } else {
    console.log("✅ Conectado a MariaDB en RDS");
  }
});

/**
 * @swagger
 * /checkout:
 *   post:
 *     summary: Registrar un checkout (manual o automático)
 *     description: Registra la salida del usuario desde el ITESO (checkout automático o manual).
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
 *               type:
 *                 type: string
 *                 enum: [manual, automatic]
 *     responses:
 *       200:
 *         description: Checkout exitoso
 *       403:
 *         description: El usuario tiene desactivado el checkout automático
 *       404:
 *         description: Usuario o historial no encontrado
 *       500:
 *         description: Error interno
 */
app.post("/checkout", (req, res) => {
  const { userId, type = "automatic" } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const checkoutTime = new Date().toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
  });

  // Paso 1: Verificar auto_checkout_enabled si es automático
  const getUserSettings = `SELECT auto_checkout_enabled FROM USERS WHERE id = ?`;

  db.query(getUserSettings, [userId], (userErr, userResults) => {
    if (userErr) {
      console.error("❌ Error al consultar usuario:", userErr.message);
      return res.status(500).json({ error: "Error al consultar usuario" });
    }

    if (userResults.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const { auto_checkout_enabled } = userResults[0];

    if (type === "automatic" && auto_checkout_enabled !== 1) {
      return res.status(403).json({ message: "El usuario tiene desactivado el checkout automático" });
    }

    // Paso 2: Buscar historial más reciente
    const getHistoryQuery = `
      SELECT id, past_parking_spots 
      FROM HISTORY 
      WHERE user_id = ? 
      ORDER BY id DESC 
      LIMIT 1
    `;

    db.query(getHistoryQuery, [userId], (histErr, results) => {
      if (histErr) {
        console.error("❌ Error al consultar historial:", histErr.message);
        return res.status(500).json({ error: "Error al consultar historial" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "No hay historial de check-in para este usuario" });
      }

      const history = results[0];
      let parkingData;

      try {
        parkingData = JSON.parse(history.past_parking_spots);
      } catch (parseErr) {
        return res.status(500).json({ error: "Error al interpretar historial" });
      }

      const lastEntry = parkingData[parkingData.length - 1];

      if (lastEntry.checkout) {
        return res.status(400).json({ message: "El usuario ya hizo checkout previamente" });
      }

      lastEntry.checkout = checkoutTime;
      lastEntry.checkoutType = type;

      const updatedHistory = JSON.stringify(parkingData);

      const updateQuery = `
        UPDATE HISTORY 
        SET past_parking_spots = ?
        WHERE id = ?
      `;

      db.query(updateQuery, [updatedHistory, history.id], (updateErr) => {
        if (updateErr) {
          console.error("❌ Error al actualizar checkout:", updateErr.message);
          return res.status(500).json({ error: "Error al actualizar checkout" });
        }

        console.log(`✅ Checkout (${type}) registrado para usuario ${userId} a las ${checkoutTime}`);

        res.json({
          message: `Checkout ${type} registrado con éxito`,
          data: {
            userId,
            checkoutTime,
            type,
          },
        });
      });
    });
  });
});

/**
 * @swagger
 * /historial/{userId}:
 *   get:
 *     summary: Obtener historial de checkouts
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Historial obtenido
 *       500:
 *         description: Error interno
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

    const historial = results.flatMap((row) => {
      let spots = [];
      try {
        spots = JSON.parse(row.past_parking_spots);
      } catch (_) {
        spots = [];
      }

      return spots.map((entry, i) => ({
        recordId: row.id,
        userId: row.user_id,
        entryNumber: i + 1,
        zone: entry.zone,
        checkin: entry.checkin,
        checkout: entry.checkout || "N/A",
        checkoutType: entry.checkoutType || "N/A",
      }));
    });

    res.json({
      message: "📋 Historial obtenido con éxito",
      data: historial,
    });
  });
});

app.listen(PORT, () => {
  console.log(`✅ Servicio de checkout corriendo en http://localhost:${PORT}`);
});

module.exports = app;
