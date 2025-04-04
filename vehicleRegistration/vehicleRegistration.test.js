const request = require('supertest');
const app = require('./server'); // Import the app

describe('Vehicle Registration API', () => {
  // Test for GET /vehicles
  it('should fetch all vehicles', async () => {
    const response = await request(app).get('/vehicles');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Test for GET /vehicles-get-by-owner/:id
  it('should fetch vehicles by owner ID', async () => {
    const ownerId = 8; // Replace with a valid owner ID for testing
    const response = await request(app).get(`/vehicles-get-by-owner/${ownerId}`);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    } else {
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('propietario no encontrado');
    }
  });

  // Test for POST /vehicles
  it('should create a new vehicle', async () => {
    const newVehicle = {
      placa: 'ABC1dwadaadawad',
      marca: 'Toyota',
      modelo: 'Corolla',
      color: 'Red',
      tipo: 'Sedan',
      propietario_id: 8, // Replace with a valid owner ID
      status: 'active',
    };
    const response = await request(app).post('/vehicles').send(newVehicle);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.placa).toBe(newVehicle.placa);
  });

  // Test for PUT /vehicles/:id
  it('should update a vehicle by ID', async () => {
    const updatedVehicle = {
      id: 26,
      plate: 'XYZ789',
      brand: 'Honda',
      model: 'Civic',
      color: 'Blue',
      type: 'Coupe',
      propietario_id: 8, // Replace with a valid owner ID
      status: 'active'
    };
    const response = await request(app).put(`/vehicles/`).send(updatedVehicle);
    if (response.status === 200) {
      expect(response.body.id).toBe(vehicleId);
      expect(response.body.plate).toBe(updatedVehicle.plate);
    } else {
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Vehiculo no encontrado');
    }
  });

  // Test for DELETE /vehicle/:id
  it('should delete a vehicle by ID', async () => {
    const vehicleId = 26; // Replace with a valid vehicle ID for testing
    const response = await request(app).delete(`/vehicles/${vehicleId}`);
    if (response.status === 200) {
      expect(response.body.message).toBe('Vehiculo eliminado correctamente');
    } else {
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Vehiculo no encontrado');
    }
  });
});