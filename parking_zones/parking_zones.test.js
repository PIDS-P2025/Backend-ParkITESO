const request = require('supertest');
const app = require('./server'); // Asegúrate de exportar `app` en tu código principal

describe('Parking Zones API', () => {
  test('GET /parking_zones - should return all parking zones', async () => {
    const response = await request(app).get('/parking_zones');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('POST /parking_zones - should create a new parking zone', async () => {
    const newZone = {
      name: 'Test Zone',
      num_slots: 10,
      use_slots: 5,
      status: '1',
      polygon: [{ lat: 19.4326, lng: -99.1332 }],
    };
    const response = await request(app).post('/parking_zones').send(newZone);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
  });

  test('GET /parking_zones/:id - should return a single parking zone', async () => {
    const response = await request(app).get('/parking_zones/1');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
  });

  test('PUT /parking_zones/:id - should update a parking zone', async () => {
    const updatedZone = {
      name: 'Updated Zone',
      num_slots: 15,
      use_slots: 10,
      status: '2',
      polygon: [{ lat: 19.4327, lng: -99.1333 }],
    };
    const response = await request(app).put('/parking_zones/1').send(updatedZone);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated Zone');
  });

  test('DELETE /parking_zones/:id - should delete a parking zone', async () => {
    const response = await request(app).delete('/parking_zones/1');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Zona eliminada correctamente');
  });
});
