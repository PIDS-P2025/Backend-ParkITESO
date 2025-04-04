const request = require("supertest");
const express = require("express");
const app = express();
app.use(express.json());

app.post("/checkout", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });
  res.status(200).json({ message: "Mock OK", userId });
});

describe("POST /checkout", () => {
  it("debe rechazar si falta userId", async () => {
    const res = await request(app).post("/checkout").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("userId is required");
  });

  it("debe aceptar si userId está presente", async () => {
    const res = await request(app).post("/checkout").send({ userId: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.userId).toBe(1);
  });
});
