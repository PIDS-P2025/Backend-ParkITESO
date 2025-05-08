const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Config variables (use dotenv or secure env vars in production)
const ALLOWED_DOMAIN = '@iteso.mx';
const JWT_SECRET = process.env.JWT_SECRET || 'secret_dev_key';

// Configuración de la base de datos
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

db.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
  } else {
    console.log('Conectado a MariaDB');
  }
});

app.use(bodyParser.json());

// Ruta de autenticación
app.post('/auth/microsoft', async (req, res) => {
  console.log('LOGIN');
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ error: 'Missing access token' });
  }

  try {
    const graphResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { mail, displayName, jobTitle } = graphResponse.data;

    if (!mail || !mail.endsWith(ALLOWED_DOMAIN)) {
      return res.status(403).json({ error: 'Access denied: only @iteso.mx accounts allowed' });
    }

    const insertQuery = `
      INSERT INTO USERS (nombre, email)
      SELECT ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM USERS WHERE email = ?);
    `;

    db.query(insertQuery, [displayName, mail, mail], (err) => {
      if (err) {
        console.error('Error al insertar usuario:', err);
        return res.status(500).json({ error: 'Error al guardar usuario' });
      }

      const getUserQuery = `SELECT id FROM USERS WHERE email = ? LIMIT 1`;

      db.query(getUserQuery, [mail], (err, rows) => {
        if (err || !rows.length) {
          return res.status(500).json({ error: 'Error al obtener ID del usuario' });
        }

        const userId = rows[0].id;
        const token = jwt.sign({ mail, displayName, jobTitle, userId }, JWT_SECRET, {
          expiresIn: '1h',
        });

        res.json({
          token,
          user: { mail, displayName, jobTitle, userId },
        });
      });
    });
  } catch (error) {
    console.error('Auth error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
