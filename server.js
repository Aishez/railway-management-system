require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "@!$hez123",
    database: "railway_db",
});

db.connect((err) => {
    if (err) throw err;
    console.log("MySQL Connected...");
});

app.get("/", (req, res) => {
    res.send("Railway Management System API");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

const trainRoutes = require("./routes/trains");
app.use("/trains", trainRoutes);

const bookingRoutes = require("./routes/bookings");
app.use("/bookings", bookingRoutes);




