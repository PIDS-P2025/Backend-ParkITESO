require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const SERVER_IP = process.env.SERVER_IP;

app.post("/location", async (req, res) => {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
        return res.status(400).json({ error: "No coordinates" });
    }

    try {
        const response = await axios.post(`${SERVER_IP}/process-location`, {
            latitude,
            longitude,
        });

        res.json({
            message: "Coordinates sent",
            ec2_response: response.data,
        });
    } catch (error) {
        console.error("Error sending", error);
        res.status(500).json({ error: "Error with server" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


module.exports = app;