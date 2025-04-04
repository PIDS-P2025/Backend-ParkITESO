const axios = require("axios");

const data = {
  latitude: 20.6050,          // 🌍 fuera del polígono ITESO
  longitude: -103.4150,
  userId: 1                   
};

axios.post("http://localhost:3000/location", data)
  .then((res) => {
    console.log("✅ Ubicación enviada:", res.data.message);
  })
  .catch((err) => {
    console.error("❌ Error al enviar ubicación:", err.message);
  });
