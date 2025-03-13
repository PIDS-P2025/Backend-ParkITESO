const request = require('supertest');
const app = require('./server');
const axios = require('axios')

jest.mock('axios');

describe('Outlook Authentication Endpoints', () => {
  test('should redirect to Outlook authentication URL', async () => {
    const response = await request(app).get('/auth/outlook');
    
    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(/https:\/\/login\.microsoftonline\.com\/.*\/oauth2\/v2\.0\/authorize\?/);
  });

  test('should return error if authorization code is missing', async () => {
    const response = await request(app).get('/auth/outlook/callback');
    
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Código de autorización no recibido' });
  });

  test('should return an error if token request fails', async () => {
    axios.post.mockRejectedValueOnce(new Error('Error en la autenticación'));
    
    const response = await request(app).get('/auth/outlook/callback?code=fakecode');
    
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Error en la autenticación' });
  });

  test('should redirect to dashboard on successful authentication', async () => {
    axios.post.mockResolvedValueOnce({ data: { access_token: 'fake_access_token' } });
    
    const response = await request(app).get('/auth/outlook/callback?code=fakecode');
    
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://example.com/dashboard');
  });
});
