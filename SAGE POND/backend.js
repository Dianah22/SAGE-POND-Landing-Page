const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
    origin: [
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:3000",
        "https://localhost:3000"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const PORT = 3000;

app.get("/", (req, res) => {
    res.send("SAGE POND backend connection is working!");
});

app.post("/send-verification-email", (req, res) => {

    const { email } = req.body;

    console.log("Verification email requested for:", email);

    res.json({
        success: true,
        message: "Verification email request received."
    });

});

app.listen(PORT, () => {
    console.log(`SAGE POND backend is running on port ${PORT}`);
});