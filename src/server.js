const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');


const app = express();
app.use(express.json()); 

const port = process.env.PORT || 3000;
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data'); 
const dbFile = path.join(dbPath, 'driveshare.db');

const carsRouter = require('../routes/cars');


app.use(session({
    store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, '..', 'data') }),
    secret: process.env.SESSION_SECRET || 'defaultSecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
  }));
  

  app.use('/cars', carsRouter);

// Predefined security questions
const securityQuestions = [
    "What city were you born in?",
    "What is the name of your favorite pet?",
    "What high school did you attend?"
];


if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
}

let db = new sqlite3.Database(dbFile, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT,
            role TEXT,
            answer1 TEXT,
            answer2 TEXT,
            answer3 TEXT
        )`);
    }
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Registration endpoint
app.post('/register', async (req, res) => {
    const { email, password, role, answer1, answer2, answer3 } = req.body;

    db.run(`INSERT INTO users (email, password, role, answer1, answer2, answer3) VALUES (?, ?, ?, ?, ?, ?)`,
        [email, password, role, answer1, answer2, answer3], function(err) {
            if (err) {
                return res.status(400).json({ "error": err.message });
            }
            const userId = this.lastID;
            req.session.userId = userId; // Save userId to session immediately after registration
            req.session.role = role; // Also save user role to session
            res.json({ "message": "Registration successful", "userId": userId, "role": role });
        });
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        if (user && password === user.password) {
            req.session.userId = user.id; // Save userId to session
            req.session.role = user.role; // Save user role to session
            res.json({ "message": "Login successful", "role": user.role, "userId": user.id });
        } else {
            res.status(401).send("Password incorrect or user does not exist.");
        }
    });
});

// Define the Handler interface
class Handler {
    setNext(handler) {
        this.nextHandler = handler;
        return handler;
    }

    handle(request) {
        if (this.nextHandler) {
            return this.nextHandler.handle(request);
        }
        return null;
    }
}

//  handlers that directly verify answers and determine the next question or action.
class SecurityQuestionHandler extends Handler {
    constructor(questionIndex) {
        super();
        this.questionIndex = questionIndex;
    }

    handle(request) {
        // Check if the submitted answer matches the expected answer for this question.
        if (request.answer === request.user[`answer${this.questionIndex}`]) {
            if (this.questionIndex < 3) { //  3 questions 
                // Correct answer and not the last question, provide the next question.
                return { nextQuestionKey: `securityQuestion${this.questionIndex + 1}` };
            } else {
                // Correct answer and last question, allow reset.
                return { allowReset: true };
            }
        } else {
            // Incorrect answer.
            return { error: "Incorrect answer." };
        }
    }
}

// Instantiate handlers for each question.
const securityQuestion1Handler = new SecurityQuestionHandler(1);
const securityQuestion2Handler = new SecurityQuestionHandler(2);
const securityQuestion3Handler = new SecurityQuestionHandler(3);

// Chain them together
securityQuestion1Handler.setNext(securityQuestion2Handler).setNext(securityQuestion3Handler);

// Recovery process
app.post('/start-recovery', (req, res) => {
    const { email } = req.body;

    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        if (!user) {
            return res.status(404).json({ "message": "User not found" });
        }

        // Sending the first security question
        res.json({
            "questionKey": "securityQuestion1",
            "questionText": securityQuestions[0] // Serve the first question
        });
    });
});

// Endpoint to verify answers to security questions
app.post('/verify-answer', (req, res) => {
    const { email, answer, questionKey } = req.body;

    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err || !user) {
            res.status(404).json({ "message": "User not found or error fetching user." });
            return;
        }

        // Directly map questionKey to answer index
        const questionNumber = parseInt(questionKey.replace('securityQuestion', ''));
        const isAnswerCorrect = answer === user[`answer${questionNumber}`];

        if (isAnswerCorrect && questionNumber < securityQuestions.length) {
            // Correct answer and not the last question, provide the next question
            res.json({
                "message": "Answer correct. Proceed to next question.",
                "nextQuestionKey": `securityQuestion${questionNumber + 1}`,
                "nextQuestionText": securityQuestions[questionNumber] // Fetch the next question's text
            });
        } else if (isAnswerCorrect && questionNumber === securityQuestions.length) {
            // Correct answer and last question, allow reset
            res.json({
                "message": "All answers correct. User can reset password.",
                "allowReset": true
            });
        } else {
            // Incorrect answer
            res.status(401).json({ "message": "Incorrect answer." });
        }
    });
});


// Endpoint to reset password after successful security question answers
app.post('/reset-password', (req, res) => {
    const { email, newPassword } = req.body;

    if (!newPassword || newPassword.trim() === '') {
        return res.status(400).json({ "message": "New password is required" });
    }

    db.run(`UPDATE users SET password = ? WHERE email = ?`, [newPassword, email], function(err) {
        if (err) {
            return res.status(500).json({ "error": err.message });
        } else if (this.changes === 1) {
            // Password successfully updated
            res.json({ "message": "Password reset successful" });
        } else {
            // User not found or other error
            res.status(404).json({ "message": "User not found" });
        }
    });
});

// Logout endpoint
app.get('/logout', function(req, res) {
    req.session.destroy(function(err) {
        if (err) {
            console.error('Logout Error:', err);
            return res.status(500).send("Error logging out");
        }
        res.redirect('/'); // Redirect to home page
    });
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});