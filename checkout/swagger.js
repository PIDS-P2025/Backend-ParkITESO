const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ParkITESO - Checkout API",
      version: "1.0.0",
      description: "Microservicio para registrar checkouts automáticos y manuales en ParkITESO.",
    },
    servers: [
      {
        url: "http://localhost:4000",
        description: "Servidor local de desarrollo",
      },
    ],
  },
  apis: ["./server.js"], // Ruta al archivo que contiene los comentarios Swagger
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};
