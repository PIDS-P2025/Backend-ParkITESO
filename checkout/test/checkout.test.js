const request = require("supertest");
const app = require("../server"); 

describe("🧪 Test de Checkout API", () => {

  const manualUser = 1;         // Tiene historial válido y auto_checkout_enabled activado o no importa
  const autoUser = 2;           // Tiene historial válido y auto_checkout_enabled = 1
  const disabledAutoUser = 3;   // Tiene historial válido pero auto_checkout_enabled = 0
  const noHistoryUser = 9999;   // Usuario sin historial

  test("🚫 Rechaza si falta userId", async () => {
    const res = await request(app).post("/checkout").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/userId/i);
  });

  test("🚫 Rechaza checkout automático si auto_checkout_enabled está desactivado", async () => {
    const res = await request(app).post("/checkout").send({
      userId: disabledAutoUser,
      type: "automatic",
    });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/desactivado/i);
  });

  test("📋 Rechaza checkout si el usuario no tiene historial", async () => {
    const res = await request(app).post("/checkout").send({
      userId: noHistoryUser,
      type: "manual",
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/historial/i);
  });

  test("✅ Realiza checkout manual exitosamente", async () => {
    const res = await request(app).post("/checkout").send({
      userId: manualUser,
      type: "manual",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty("checkoutTime");
    expect(res.body.message).toMatch(/éxito/i);
  });

  test("✅ Realiza checkout automático exitosamente", async () => {
    const res = await request(app).post("/checkout").send({
      userId: autoUser,
      type: "automatic",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty("checkoutTime");
    expect(res.body.data.type).toBe("automatic");
  });
});
