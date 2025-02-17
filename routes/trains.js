const express = require("express");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");

const router = express.Router();

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "@!$hez123",
    database: "railway_db",
});


// Middleware to check API Key
const API_KEY = "aishez_is_admin";  // Store this securely

const verifyAdminAPIKey = (req, res, next) => {
    const adminAPIKey = req.header("x-admin-api-key");  // API Key should be sent in the header with this key

    if (adminAPIKey !== API_KEY) {
        return res.status(403).json({ message: "Forbidden: Invalid API Key" });
    }
    next();  // If valid, proceed to the next middleware or route handler
};


// Middleware to verify authentication
const authenticate = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: "Access Denied" });

    try {
        const verified = jwt.verify(token.split(" ")[1], "secret_key");
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: "Invalid Token" });
    }
};

// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    next();
};

// Add a new train (Admin only)
router.post("/add", authenticate, isAdmin, verifyAdminAPIKey, (req, res) => {
    const { name, source, destination, total_seats } = req.body;
    const sql = "INSERT INTO trains (name, source, destination, total_seats, available_seats) VALUES (?, ?, ?, ?, ?)";
    
    db.query(sql, [name, source, destination, total_seats, total_seats], (err, result) => {
        if (err) return res.status(500).json({ message: "Error adding train" });
        res.json({ message: "Train added successfully" });
    });
});


module.exports = router;






// Get Seat Availability
router.get("/availability", (req, res) => {
    const { source, destination } = req.query;

    if (!source || !destination) {
        return res.status(400).json({ message: "Source and destination are required" });
    }

    const sql = `
        SELECT * FROM trains 
        WHERE source = ? AND destination = ?
    `;

    db.query(sql, [source, destination], (err, results) => {
        if (err) return res.status(500).json({ message: "Error fetching trains" });

        if (results.length === 0) {
            return res.status(404).json({ message: "No trains found for the given route" });
        }

        // Return the list of trains with available seats
        const trains = results.map(train => ({
            train_id: train.train_id,
            name: train.name,
            source: train.source,
            destination: train.destination,
            available_seats: train.available_seats
        }));

        res.json(trains);
    });
});
