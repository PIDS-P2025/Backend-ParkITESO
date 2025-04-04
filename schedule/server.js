const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const PORT = 3000;

// Conexión a la base de datos
const db = mysql.createPool({
  host: process.env.RDS_ENDPOINT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(express.json());

// Crear un nuevo horario
app.post('/schedules', async (req, res) => {
  const { user_id, day, start_time, end_time } = req.body;

  try {
    const [result] = await db.execute(
      'INSERT INTO SCHEDULES (user_id, day, start_time, end_time) VALUES (?, ?, ?, ?)',
      [user_id, day, start_time, end_time]
    );
    res.status(201).json({ message: 'Horario agregado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener todos los horarios de un usuario
app.get('/schedules/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    const [rows] = await db.execute(
      'SELECT * FROM SCHEDULES WHERE user_id = ?',
      [user_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar un horario por ID
app.put('/schedules/:schedule_id', async (req, res) => {
  const { schedule_id } = req.params;
  const { day, start_time, end_time } = req.body;

  try {
    await db.execute(
      'UPDATE SCHEDULES SET day = ?, start_time = ?, end_time = ? WHERE id = ?',
      [day, start_time, end_time, schedule_id]
    );
    res.json({ message: 'Horario actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar un horario por ID
app.delete('/schedules/:schedule_id', async (req, res) => {
  const { schedule_id } = req.params;

  try {
    await db.execute(
      'DELETE FROM SCHEDULES WHERE id = ?',
      [schedule_id]
    );
    res.json({ message: 'Horario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
