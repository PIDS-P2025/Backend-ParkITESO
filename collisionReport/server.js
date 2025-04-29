require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const app = express();
const PORT = 4002;

app.use(express.json());

// Configurar conexión a base de datos
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Conectar a base de datos
db.connect((err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos MySQL');
  }
});

// Configurar cliente de AWS SES
const sesClient = new SESClient({ region: "us-east-1" });

async function sendEmail(toEmail, subject, bodyHtml) {
  const params = {
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: bodyHtml,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: process.env.EMAIL_SOURCE, // correo verificado en SES
  };

  const command = new SendEmailCommand(params);
  await sesClient.send(command);
}

// 📍 POST /collisions — Reportar un incidente y notificar al afectado
app.post('/collisions', async (req, res) => {
  const { reporterUserId, affectedPlate, location, description, photoUrl } = req.body;

  try {
    // 1. Buscar el propietario del carro afectado
    const [plateRows] = await db.promise().query(
      'SELECT propietario_id FROM CAR WHERE placa = ?',
      [affectedPlate]
    );

    if (plateRows.length === 0) {
      return res.status(404).json({ error: 'No se encontró ningún vehículo con esa placa' });
    }

    const affectedUserId = plateRows[0].propietario_id;

    // 2. Buscar el email del propietario
    const [userRows] = await db.promise().query(
      'SELECT email FROM USERS WHERE id = ?',
      [affectedUserId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'No se encontró el usuario afectado' });
    }

    const affectedEmail = userRows[0].email;

    // 3. Guardar el reporte en la base de datos
    await db.promise().query(
      `INSERT INTO COLLISION_REPORTS 
       (reporter_user_id, affected_plate, affected_user_id, location, description, photo_url) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [reporterUserId, affectedPlate, affectedUserId, location, description, photoUrl]
    );

    // 4. Enviar correo al afectado
    await sendEmail(
      affectedEmail,
      "Notification: Your Vehicle Was Involved in an Incident",
      `<p>Dear user,</p><p>Your vehicle with plate <strong>${affectedPlate}</strong> has been reported in an incident at <strong>${location}</strong>.</p><p>Please review the details in your account.</p>`
    );

    res.status(201).json({ message: 'Reporte de colisión guardado y notificación enviada' });

  } catch (error) {
    console.error('❌ Error al guardar o enviar notificación:', error.message);
    res.status(500).json({ error: 'Error al procesar el reporte de colisión' });
  }
});

// 📍 GET /collisions — Obtener todos los reportes
app.get('/collisions', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT * FROM COLLISION_REPORTS ORDER BY timestamp DESC');
    res.json(rows);
  } catch (error) {
    console.error('❌ Error obteniendo los reportes:', error.message);
    res.status(500).json({ error: 'Error al obtener los reportes de colisión' });
  }
});

// 📍 GET /collisions/:id — Obtener un reporte específico
app.get('/collisions/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.promise().query('SELECT * FROM COLLISION_REPORTS WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reporte de colisión no encontrado' });
    }

    const report = rows[0];

    if (report.timestamp) {
      const dateObj = new Date(report.timestamp);
      report.timestamp = dateObj.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    }

    res.json(report);
  } catch (error) {
    console.error('❌ Error obteniendo el reporte:', error.message);
    res.status(500).json({ error: 'Error al obtener el reporte de colisión' });
  }
});

// 📍 PATCH /collisions/:id — Actualizar el estado de un reporte
app.patch('/collisions/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['reported', 'resolved', 'dismissed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido. Usa reported, resolved o dismissed.' });
  }

  try {
    const [result] = await db.promise().query(
      'UPDATE COLLISION_REPORTS SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    res.status(200).json({ message: 'Estado del reporte actualizado exitosamente' });
  } catch (error) {
    console.error('❌ Error actualizando el estado:', error.message);
    res.status(500).json({ error: 'Error al actualizar el estado del reporte' });
  }
});

// 📍 DELETE /collisions/:id — Eliminar un reporte
app.delete('/collisions/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.promise().query(
      'DELETE FROM COLLISION_REPORTS WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reporte de colisión no encontrado' });
    }

    res.status(200).json({ message: 'Reporte de colisión eliminado exitosamente' });
  } catch (error) {
    console.error('❌ Error eliminando el reporte:', error.message);
    res.status(500).json({ error: 'Error al eliminar el reporte de colisión' });
  }
});

// 📍 GET /collisions/mine/:reporterUserId — Obtener reportes enviados por un usuario
app.get('/collisions/mine/:reporterUserId', async (req, res) => {
  const { reporterUserId } = req.params;

  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM COLLISION_REPORTS WHERE reporter_user_id = ? ORDER BY timestamp DESC',
      [reporterUserId]
    );

    res.json(rows);
  } catch (error) {
    console.error('❌ Error obteniendo reportes del usuario:', error.message);
    res.status(500).json({ error: 'Error al obtener los reportes del usuario' });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚗 Servicio de Collision Reports escuchando en http://localhost:${PORT}`);
});
