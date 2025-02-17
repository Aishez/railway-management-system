const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2");

const router = express.Router();
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "@!$hez123",
    database: "railway_db",
});

const { check, validationResult } = require("express-validator");

// Register a User
router.post(
    "/register",
    [
        check("name", "Name is required").not().isEmpty(),
        check("email", "Valid email is required").isEmail(),
        check("password", "Password should be at least 6 characters").isLength({ min: 6 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";
        db.query(sql, [name, email, hashedPassword, role || "user"], (err, result) => {
            if (err) return res.status(500).json({ message: "Error registering user" });
            res.json({ message: "User registered successfully" });
        });
    }
);

// Login User
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], async (err, result) => {
        if (err || result.length === 0) return res.status(401).json({ message: "Invalid credentials" });

        const user = result[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, role: user.role }, "secret_key", { expiresIn: "1h" });
        res.json({ token, role: user.role });
    });
});

module.exports = router;
