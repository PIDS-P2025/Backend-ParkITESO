const request = require("supertest");
const app = require("../server");
const axios = require("axios");
jest.mock("axios");

describe("GET /api/googlePLace", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return 400 if query parameter is missing", async () => {
        const res = await request(app).get("/api/googlePLace");
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Falta el parámetro de búsqueda" });
    });

    it("should return data from Google Places API when query parameter is provided", async () => {
        const mockResponse = {
        results: [
            { name: "Place 1", address: "Address 1" },
            { name: "Place 2", address: "Address 2" },
        ],
        };

    axios.get.mockResolvedValue({ data: mockResponse });

    const res = await request(app).get("/api/googlePLace").query({ query: "restaurant" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockResponse);
    expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("https://maps.googleapis.com/maps/api/place/textsearch/json"),
        {
            params: {
            query: "restaurant",
            key: process.env.GOOGLE_API_KEY,
            },
        }
        );
    });

    it("should return 500 if Google Places API request fails", async () => {
        axios.get.mockRejectedValue(new Error("Google API Error"));

        const res = await request(app).get("/api/googlePLace").query({ query: "restaurant" });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: "Error al obtener datos de Google Places" });
        expect(axios.get).toHaveBeenCalled();
    });
});

describe('POST /location', () => {
    it('should return 400 if latitude or longitude is missing', async () => {
    const response = await request(app)
        .post('/location')
        .send({ latitud: 20.6597 }); // Missing longitud

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Faltan coordenadas" });
    });

    it('should return 200 and a success message if latitude and longitude are provided', async () => {
    const response = await request(app)
        .post('/location')
        .send({ latitud: 20.6597, longitud: -103.3496 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ mensaje: "Recieved Location" });
    });

    it('should return 500 if there is a server error', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error in test output

        const response = await request(app)
            .post('/location')
            .send(null); // Simulate a server error

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: "Error interno del servidor" });

      console.error.mockRestore(); // Restore console.error
    });
});