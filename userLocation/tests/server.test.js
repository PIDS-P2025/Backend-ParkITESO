const request = require("supertest");
const app = require("../server");
const axios = require("axios");

// Mockear axios
jest.mock("axios");

describe("POST /location", () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Limpia los mocks antes de cada prueba
    });

    it("should return 400 if latitude or longitude is missing", async () => {
        const res = await request(app).post("/location").send({});
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "No coordinates" });
    });

    it("should return 200 and forward data when EC2 request is successful", async () => {
        axios.post.mockResolvedValue({ data: { success: true } });

        const res = await request(app).post("/location").send({
            latitude: 20.67,
            longitude: -103.35,
        });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            message: "Coordinates sent",
            ec2_response: { success: true },
        });

        expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("http"), {
            latitude: 20.67,
            longitude: -103.35,
        });
    });

    it("should return 500 if EC2 request fails", async () => {
        axios.post.mockRejectedValue(new Error("EC2 Unreachable"));

        const res = await request(app).post("/location").send({
            latitude: 20.67,
            longitude: -103.35,
        });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: "Error with server" });

        expect(axios.post).toHaveBeenCalled();
    });
});
