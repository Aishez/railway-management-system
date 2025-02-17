const express = require("express");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");  // Add this line

const router = express.Router();

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "@!$hez123",
    database: "railway_db",
});

// Middleware to verify user authentication
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

// Book a seat
router.post(
    "/book",
    [
        authenticate, 
        check("train_id", "Train ID is required").isInt()
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { train_id } = req.body;
        const user_id = req.user.id;

        const checkSeatsQuery = "SELECT total_seats, available_seats FROM trains WHERE train_id = ? FOR UPDATE"; // Lock the row for update

        console.log("Requested Train ID:", train_id);

        db.beginTransaction((err) => { // Start a transaction
            if (err) return res.status(500).json({ message: "Transaction start error" });

            db.query(checkSeatsQuery, [train_id], (err, results) => {
                if (err || results.length === 0) {
                    return db.rollback(() => { // Rollback transaction if there's an error
                        res.status(500).json({ message: "Train not found" });
                    });
                }

                const totalSeats = results[0].total_seats;
                const availableSeats = results[0].available_seats;

                console.log("Total Seats:", totalSeats);
                console.log("Available Seats:", availableSeats);

                if (isNaN(totalSeats) || isNaN(availableSeats)) {
                    return db.rollback(() => { // Rollback transaction if invalid seat data
                        res.status(500).json({ message: "Invalid seat data" });
                    });
                }

                if (availableSeats <= 0) {
                    return db.rollback(() => { // Rollback if no seats are available
                        res.status(400).json({ message: "No seats available" });
                    });
                }

                let seatNumber = totalSeats - availableSeats + 1;

                // Log calculated seat number
                console.log("Calculated Seat Number:", seatNumber);

                const bookSeatQuery = "INSERT INTO bookings (user_id, train_id, seat_number) VALUES (?, ?, ?)";
                db.query(bookSeatQuery, [user_id, train_id, seatNumber], (err, result) => {
                    if (err) {
                        return db.rollback(() => { // Rollback if booking fails
                            res.status(500).json({ message: "Error booking seat" });
                        });
                    }

                    const updateSeatsQuery = "UPDATE trains SET available_seats = available_seats - 1 WHERE train_id = ?";
                    db.query(updateSeatsQuery, [train_id], (err, result) => {
                        if (err) {
                            return db.rollback(() => { // Rollback if seat update fails
                                res.status(500).json({ message: "Error updating seat availability" });
                            });
                        }

                        db.commit((err) => { // Commit transaction if everything is successful
                            if (err) {
                                return db.rollback(() => { 
                                    res.status(500).json({ message: "Transaction commit error" });
                                });
                            }

                            res.json({ message: "Seat booked successfully", seatNumber });
                        });
                    });
                });
            });
        });
    }
);


// Get booking details for the logged-in user
router.get("/my-bookings", authenticate, (req, res) => {
    const user_id = req.user.id;

    console.log("User ID:", user_id);

    const sql = `
    SELECT b.id, t.name AS train_name, t.source, t.destination, b.seat_number
    FROM bookings b
    JOIN trains t ON b.train_id = t.train_id
    WHERE b.user_id = ?;
`;

db.query(sql, [user_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching bookings" });
    res.json(results);
});
    
});




// Get specific booking details for the logged-in user
router.get("/my-booking/:booking_id", authenticate, (req, res) => {
    const user_id = req.user.id;
    const booking_id = req.params.booking_id;

    const sql = `
        SELECT b.id, t.name AS train_name, t.source, t.destination, b.seat_number
        FROM bookings b
        JOIN trains t ON b.train_id = t.train_id
        WHERE b.id = ? AND b.user_id = ?
    `;

    db.query(sql, [booking_id, user_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Error fetching booking details" });
        
        if (results.length === 0) {
            return res.status(404).json({ message: "Booking not found" });
        }

        res.json(results[0]);
    });
});






module.exports = router;





