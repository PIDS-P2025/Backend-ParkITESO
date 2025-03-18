const request = require('supertest');
const app = require('./server'); // Asegúrate de importar el archivo correcto
const dotenv = require('dotenv');

dotenv.config();

describe('Pruebas de autenticación con Outlook', () => {
  test('Debe redirigir a la página de autenticación de Outlook', async () => {
    const response = await request(app).get('/auth/outlook');
    
    expect(response.status).toBe(302); // Código de estado para redirección
    expect(response.header.location).toContain('https://login.microsoftonline.com/');
  });

  test('Debe devolver error 400 si no se proporciona código de autorización', async () => {
    const response = await request(app).get('/auth/outlook/callback');
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Código de autorización no recibido');
  });

  test('Debe manejar correctamente la autenticación con código inválido', async () => {
    const response = await request(app)
      .get('/auth/outlook/callback')
      .query({ code: 'codigo_invalido' });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Error en la autenticación');
  });
});
