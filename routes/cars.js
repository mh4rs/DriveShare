//car.js
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { admin, db } = require('../firebaseAdmin');

const dbPath = path.join(__dirname, '..', 'data');
const dbFile = path.join(dbPath, 'driveshare.db');

// Open a database connection
let dbSQLite = new sqlite3.Database(dbFile, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error opening database ' + err.message);
    } else {
        console.log('Connected to the SQLite database at ' + dbFile);
    }
});

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
};

router.use(isAuthenticated);


// Observer pattern setup
class NotificationService {
    constructor() {
        this.observers = [];
    }

    subscribe(observer) {
        this.observers.push(observer);
    }

    unsubscribe(observer) {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    notify(data) {
        this.observers.forEach(observer => observer.update(data));
    }
}

class UserNotification {
    constructor(userId) {
        this.userId = userId;
    }

    update(data) {
        db.collection('messages').add({
            fromUserId: 'DriveShare',
            toUserId: this.userId,
            message: data.message,
            type: data.type,
            status: 'sent',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}

const notificationService = new NotificationService();


//Builder pattern for creating car objects
class CarBuilder {
    constructor() {
        this.car = {};
    }

    setModel(model) {
        this.car.model = model;
        return this;
    }

    setYear(year) {
        this.car.year = year;
        return this;
    }

    setMileage(mileage) {
        this.car.mileage = mileage;
        return this;
    }

    setAvailability(availability) {
        this.car.availability = availability;
        return this;
    }

    setLocation(location) {
        this.car.location = location;
        return this;
    }

    setPrice(price) {
        this.car.price = price;
        return this;
    }

    setOwnerId(ownerId) {
        this.car.ownerId = ownerId;
        return this;
    }

    setAvailableFrom(availableFrom) {
        this.car.availableFrom = availableFrom;
        return this;
    }

    setAvailableUntil(availableUntil) {
        this.car.availableUntil = availableUntil;
        return this;
    }

    build() {
        return this.car;
    }
}

// Endpoint to add a new car
router.post('/', (req, res) => {
    const { model, year, mileage, availability, location, price, availableFrom, availableUntil } = req.body;
    const ownerId = req.session.userId;
    const car = new CarBuilder()
        .setModel(model)
        .setYear(year)
        .setMileage(mileage)
        .setAvailability(availability)
        .setLocation(location)
        .setPrice(price)
        .setOwnerId(ownerId)
        .setAvailableFrom(availableFrom)
        .setAvailableUntil(availableUntil)
        .build();

    const sql = `INSERT INTO cars (model, year, mileage, availability, location, price, ownerId, availableFrom, availableUntil) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [car.model, car.year, car.mileage, car.availability, car.location, car.price, car.ownerId, car.availableFrom, car.availableUntil];

    dbSQLite.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, ...car });
    });
});

// Endpoint to update a car listing
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { model, year, mileage, availability, location, price, availableFrom, availableUntil } = req.body;
    const ownerId = req.session.userId;
    const car = new CarBuilder()
        .setModel(model)
        .setYear(year)
        .setMileage(mileage)
        .setAvailability(availability)
        .setLocation(location)
        .setPrice(price)
        .setAvailableFrom(availableFrom)
        .setAvailableUntil(availableUntil)
        .build();

    const updateSql = `UPDATE cars SET model = ?, year = ?, mileage = ?, availability = ?, location = ?, price = ?, availableFrom = ?, availableUntil = ? WHERE id = ? AND ownerId = ?`;
    const params = [car.model, car.year, car.mileage, car.availability, car.location, car.price, car.availableFrom, car.availableUntil, id, ownerId];

    dbSQLite.run(updateSql, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Car not found or unauthorized' });
        }
        res.json({ message: "Car updated successfully.", id });
    });
});


// Endpoint to book a car
router.post('/book/:id', (req, res) => {
    const { id } = req.params;
    const { startDate, endDate } = req.body;
    const userId = req.session.userId;

    const carPriceSql = `SELECT price FROM cars WHERE id = ?`;
    dbSQLite.get(carPriceSql, [id], (carError, car) => {
        if (carError) {
            console.error('Car Price Retrieval Error:', carError);
            return res.status(500).json({ error: 'Database error during car price retrieval' });
        }
        if (!car) {
            return res.status(404).json({ message: "Car not found." });
        }

        const carPricePerDay = car.price;
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const diffTime = Math.abs(endDateObj - startDateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const totalPrice = diffDays * carPricePerDay;

        const conflictSql = `SELECT id FROM bookings WHERE carId = ? AND (startDate BETWEEN ? AND ? OR endDate BETWEEN ? AND ?)`;
        dbSQLite.get(conflictSql, [id, startDate, endDate, startDate, endDate], (err, booking) => {
            if (err) {
                console.error('Conflict Check Error:', err);
                return res.status (500).json({ error: 'Database error' });
            }
            if (booking) {
                return res.status(400).json({ message: "Car is already booked for these dates." });
            }

            const insertSql = `INSERT INTO bookings (carId, userId, startDate, endDate, status) VALUES (?, ?, ?, ?, ?)`;
            dbSQLite.run(insertSql, [id, userId, startDate, endDate, 'confirmed'], function(err) {
                if (err) {
                    console.error('Booking Insert Error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.status(201).json({ message: "Booking successful.", bookingId: this.lastID, status: 'confirmed', totalPrice: totalPrice });

                // Send a confirmation message to Firestore
                db.collection('messages').add({
                    fromUserId: 'DriveShare',
                    toUserId: userId,
                    carId: id,
                    message: `Booking confirmed for car ${id}. Total price: $${totalPrice}.`,
                    type: 'booking-confirmation',
                    status: 'sent',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            });
        });
    });
});


// Define the Payment Processor
class PaymentProcessor {
    async processPayment(bookingId, userId) {
        // Simulate a direct payment process with an external payment gateway
        console.log(`Processing payment for bookingId: ${bookingId} and userId: ${userId}`);
        return { success: true, message: "Payment processed successfully." };
    }
}

// Define the Payment Proxy
class PaymentProxy {
    constructor() {
        this.paymentProcessor = new PaymentProcessor();
        this.cache = {};
    }

    async processPayment(bookingId, userId) {
        if (this.cache[bookingId]) {
            console.log("Returning cached result for:", bookingId);
            return this.cache[bookingId];
        }
        const result = await this.paymentProcessor.processPayment(bookingId, userId);
        this.cache[bookingId] = result;
        return result;
    }
}

const paymentProxy = new PaymentProxy();


// Endpoint to process payment
router.post('/pay/:bookingId', (req, res) => {
    const { bookingId } = req.params;
    const userId = req.session.userId;

    const updateSql = `UPDATE bookings SET status = 'paid' WHERE id = ? AND userId = ?`;
    dbSQLite.run(updateSql, [bookingId, userId], function(err) {
        if (err) {
            console.error(`Database error: ${err}`);
            return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: "Booking not found or unauthorized." });
        }
        res.json({ message: "Payment processed and booking confirmed." });

        // Send a payment confirmation message to Firestore
        db.collection('messages').add({
            fromUserId: 'DriveShare',
            toUserId: userId,
            carId: bookingId,
            message: `Payment confirmed for booking ${bookingId}.`,
            type: 'payment-confirmation',
            status: 'sent',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    });
});

// Endpoint to retrieve all cars
router.get('/', (req, res) => {
    const ownerId = req.session.userId;
    const sql = `SELECT * FROM cars WHERE ownerId = ?`;
    const params = [ownerId];

    dbSQLite.all(sql, params, (err, cars) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(cars);
    });
});

// Endpoint to search for cars
router.get('/search', (req, res) => {
    const { location, startDate, endDate } = req.query;
    const sql = `
        SELECT id, model, year, mileage, availability, location, price, ownerId, availableFrom, availableUntil
        FROM cars
        WHERE location = ? AND id NOT IN (
            SELECT carId FROM bookings
            WHERE (startDate BETWEEN ? AND ?) OR (endDate BETWEEN ? AND ?)
        )
    `;
    const params = [location, startDate, endDate, startDate, endDate];

    dbSQLite.all(sql, params, (err, cars) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        res.json(cars);
    });
});

module.exports = router;
