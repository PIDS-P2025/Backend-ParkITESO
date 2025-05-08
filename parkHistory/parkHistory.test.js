const request = require('supertest');
const app = require('./server'); // Import the app

describe('GET /history/:userId', () => {
  it('should retrieve the parking history for a valid user', async () => {
    const userId = 17; // Replace with a valid user ID for testing
    const response = await request(app).get(`/history/${userId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', '📋 Check-in history retrieved successfully');
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);

    if (response.body.data.length > 0) {
      const historyItem = response.body.data[0];
      expect(historyItem).toHaveProperty('zone');
      expect(historyItem).toHaveProperty('checkin');
      expect(historyItem).toHaveProperty('checkout');
      expect(historyItem).toHaveProperty('duration');
    }
  });

  it('should return 404 if no history is found for the user', async () => {
    const userId = 14; // Replace with a non-existent user ID for testing
    const response = await request(app).get(`/history/${userId}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message', 'No check-ins registered yet');
  });
});