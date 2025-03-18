const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const querystring = require('querystring');
const mysql = require('mysql2');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Configuración de la base de datos
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

db.connect(err => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
  } else {
    console.log('Conectado a MariaDB');
  }
});

// Rutas de autenticación con Outlook
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const TENANT_ID = process.env.TENANT_ID;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/outlook/callback';
const AUTH_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`;
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

// Endpoint para iniciar la autenticación con Outlook
app.get('/auth/outlook', (req, res) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    response_mode: 'query',
    scope: 'https://graph.microsoft.com/User.Read',
    state: '12345',
  });
  res.redirect(`${AUTH_URL}?${params.toString()}`);
});

// Callback de autenticación
app.get('/auth/outlook/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Código de autorización no recibido' });
  }

  try {
    const tokenResponse = await axios.post(
      TOKEN_URL,
      querystring.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token } = tokenResponse.data;

    // Obtener información del usuario autenticado
    const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const userData = userResponse.data;
    console.log('userData', userData);
    console.log(userData.displayName, userData.mail, userData.mail);

    if (!userData.displayName || !userData.mail) {
      return res.status(400).json({ error: 'Nombre y email son obligatorios' });
    }

    const insertQuery = `
      INSERT INTO USERS (nombre, email)
      SELECT ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM USERS WHERE email = ?);`;

    db.query(insertQuery, [userData.displayName, userData.mail, userData.mail], (err, result) => {
      if (err) {
        console.error('Error al insertar usuario:', err);
        return res.status(500).json({ error: 'Error al guardar usuario' });
      }

      if (result.affectedRows === 0) {
        console.log('El usuario ya existe');
      } else {
        console.log('Usuario guardado correctamente', { userId: result.insertId });
      }

      // Redirigir a una página dummy después del login exitoso
      res.redirect('https://example.com/dashboard');
    });
  } catch (error) {
    console.error('Error al obtener el token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error en la autenticación' });
  }
});

app.listen(port, () => {
  console.log(`La aplicación está escuchando en ${port}`);
});

module.exports = app;