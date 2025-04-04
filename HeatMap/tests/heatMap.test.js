const request = require('supertest');
const app = require('./server'); // Asegúrate de exportar `app` en tu código principal

// Mock axios
jest.mock("axios");

describe("POST /location", () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks before each test
    });

    it("should return 400 if latitude or longitude is missing", async () => {
        const res = await request(app).post("/location").send({});
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Faltan coordenadas" });
    });

    it("should return 404 if Google API does not return valid results", async () => {
        axios.get.mockResolvedValue({
            data: { status: "ZERO_RESULTS", results: [] },
        });

        const res = await request(app).post("/location").send({
            latitud: 20.67,
            longitud: -103.35,
        });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "No se pudo obtener dirección" });
        expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining("https://maps.googleapis.com/maps/api/geocode/json"),
            expect.objectContaining({
                params: {
                    latlng: "20.67,-103.35",
                    key: process.env.GOOGLE_API_KEY,
                },
            })
        );
    });

    it("should return 200 and address when Google API returns valid results", async () => {
        axios.get.mockResolvedValue({
            data: {
                status: "OK",
                results: [
                    { formatted_address: "Some Address" },
                ],
            },
        });

        const res = await request(app).post("/location").send({
            latitud: 20.67,
            longitud: -103.35,
        });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            direccion: "Some Address",
            coordenadas: {
                lat: 20.67,
                lng: -103.35,
            },
        });
        expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining("https://maps.googleapis.com/maps/api/geocode/json"),
            expect.objectContaining({
                params: {
                    latlng: "20.67,-103.35",
                    key: process.env.GOOGLE_API_KEY,
                },
            })
        );
    });

    it("should return 500 if there is an internal server error", async () => {
        axios.get.mockRejectedValue(new Error("Internal Server Error"));

        const res = await request(app).post("/location").send({
            latitud: 20.67,
            longitud: -103.35,
        });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: "Error interno del servidor" });
        expect(axios.get).toHaveBeenCalled();
    });
});