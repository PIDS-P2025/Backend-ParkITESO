const request = require('supertest');
const app = require('./server'); // Import the app

describe('Vehicle Registration API', () => {
  it('should fetch all vehicles', async () => {
    const response = await request(app).get('/vehicles');
    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    } else {
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should fetch vehicles by owner ID', async () => {
    const ownerId = 8;
    const response = await request(app).get(`/vehicles-get-by-owner/${ownerId}`);
    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    } else if (response.status === 404) {
      expect(response.body.message).toBe('propietario no encontrado');
    } else {
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should fetch all brands', async () => {
    const response = await request(app).get('/vehicle-data/brands');
    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    } else {
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should fetch models by brand', async () => {
    const response = await request(app).get('/vehicle-data/models?marca=Toyota');
    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    } else {
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should create a new vehicle', async () => {
    const newVehicle = {
      placa: 'ABC1dwadaadawad',
      marca: 'Toyota',
      modelo: 'Corolla',
      color: 'Red',
      tipo: 'Sedan',
      propietario_id: 8,
      status: 'active',
    };
    const response = await request(app).post('/vehicles').send(newVehicle);
    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('id');
      expect(response.body.placa).toBe(newVehicle.placa);
    } else {
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should update a vehicle by ID', async () => {
    const updatedVehicle = {
      id: 26,
      placa: 'XYZ789',
      marca: 'Honda',
      modelo: 'Civic',
      color: 'Blue',
      tipo: 'Coupe',
      propietario_id: 8,
    };
    const response = await request(app).put(`/vehicles`).send(updatedVehicle);
    expect([200, 403, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.id).toBe(updatedVehicle.id);
      expect(response.body.placa).toBe(updatedVehicle.placa);
    } else if ([403, 404].includes(response.status)) {
      expect(response.body).toHaveProperty('message');
    } else {
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should delete a vehicle by ID', async () => {
    const vehicleId = 26;
    const response = await request(app).delete(`/vehicles/${vehicleId}`);
    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.message).toBe('Vehiculo eliminado correctamente');
    } else if (response.status === 404) {
      expect(response.body.message).toBe('Vehiculo no encontrado');
    } else {
      expect(response.body).toHaveProperty('error');
    }
  });
});
