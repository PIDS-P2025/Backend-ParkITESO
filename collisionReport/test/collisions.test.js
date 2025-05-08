// test/collisions.test.js

const request = require('supertest');
const { app } = require('../server');

// 💥 MOCK de AWS SES para que no mande correos
jest.mock('../server', () => {
  const originalModule = jest.requireActual('../server');
  return {
    ...originalModule,
    sendEmail: jest.fn().mockResolvedValue(true), // cada vez que llames sendEmail no hace nada
  };
});

describe('Collision Reports API', () => {
  it('debería crear un nuevo reporte de colisión', async () => {
    const response = await request(app)
      .post('/collisions')
      .send({
        reporterUserId: 8,
        affectedPlate: 'ABC123',
        location: 'Cajón A5',
        description: 'Toque leve en la defensa',
        photoUrl: 'https://example.com/photo.jpg',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('message');
  });

  it('debería devolver todos los reportes', async () => {
    const response = await request(app).get('/collisions');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('debería devolver un reporte específico', async () => {
    const response = await request(app).get('/collisions/1'); 
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('id');
  });

  it('debería devolver error 404 para reporte inexistente', async () => {
    const response = await request(app).get('/collisions/99999');
    expect(response.statusCode).toBe(404);
  });
});
