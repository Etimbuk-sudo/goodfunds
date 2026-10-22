
require("dotenv").config();

const express = require("express");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("Set JWT_SECRET to a random secret of at least 32 characters.");
}

const app = express();
const db = new Database("goodfunds.db");
const PORT = process.env.PORT || 3000;
const path = require("path");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK(type IN ('credit','debit')),
    amount_kobo INTEGER NOT NULL CHECK(amount_kobo > 0),
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS savings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    target_kobo INTEGER NOT NULL CHECK(target_kobo > 0),
    saved_kobo INTEGER NOT NULL DEFAULT 0 CHECK(saved_kobo >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS investments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    amount_kobo INTEGER NOT NULL CHECK(amount_kobo > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount_kobo INTEGER NOT NULL CHECK(amount_kobo > 0),
    duration_months INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(helmet());

const allowedOrigins = (
    process.env.CORS_ORIGIN || "http://localhost:5500"
)
    .split(",")
    .map(origin => origin.trim());

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "20kb" }));

app.use("/api/auth", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false
}));

const moneyToKobo = value => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || n > 100000000) {
        throw new Error("Enter a valid positive amount.");
    }
    return Math.round(n * 100);
};

const naira = kobo => Number((kobo / 100).toFixed(2));

function makeToken(user) {
    return jwt.sign(
        { sub: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "2h", issuer: "goodfunds-api", audience: "goodfunds-web" }
    );
}

function auth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: "goodfunds-api",
            audience: "goodfunds-web"
        });

        const user = db.prepare(
            "SELECT id, name, email FROM users WHERE id = ?"
        ).get(payload.sub);

        if (!user) return res.status(401).json({ error: "Account not found." });

        req.user = user;
        next();
    } catch {
        return res.status(401).json({ error: "Please log in again." });
    }
}

function balanceKobo(userId) {
    return db.prepare(`
    SELECT COALESCE(SUM(
      CASE WHEN type = 'credit' THEN amount_kobo
           ELSE -amount_kobo END
    ), 0) AS balance
    FROM transactions WHERE user_id = ?
  `).get(userId).balance;
}

function handleError(res, error) {
    if (error.message === "Enter a valid positive amount.") {
        return res.status(400).json({ error: error.message });
    }
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(409).json({ error: "That email is already registered." });
    }
    console.error(error);
    return res.status(500).json({ error: "Something went wrong." });
}

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "GoodFunds API" });
});


app.get("/api/users", (req, res) => {
    try {
        const users = db.prepare(`
            SELECT id, name, email, created_at
            FROM users
            ORDER BY created_at DESC
        `).all();

        res.json({
            success: true,
            count: users.length,
            users: users
        });
    } catch (error) {
        console.error("Could not retrieve users:", error);
        res.status(500).json({ error: "Could not retrieve users." });
    }
});


// Register
app.post("/api/auth/register", async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (name.length < 2 || name.length > 80) {
            return res.status(400).json({ error: "Enter your full name." });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
            return res.status(400).json({ error: "Enter a valid email." });
        }
        if (password.length < 10 || password.length > 72) {
            return res.status(400).json({
                error: "Password must contain 10–72 characters."
            });
        }

        const id = crypto.randomUUID();
        const hash = await bcrypt.hash(password, 12);

        db.prepare(
            "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)"
        ).run(id, name, email, hash);

        const user = { id, name, email };
        res.status(201).json({
            user,
            token: makeToken(user),
            message: "GoodFunds account created."
        });
    } catch (error) {
        handleError(res, error);
    }
});


app.get("/api/auth/register", (req, res) => {
    res.json({
        message: "GoodFunds registration endpoint is working.",
        method: "POST",
        instructions: "Send name, email, and password using a POST request to register a user."
    });
});


// Login
app.post("/api/auth/login", async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        const record = db.prepare(
            "SELECT * FROM users WHERE email = ?"
        ).get(email);

        if (!record || !(await bcrypt.compare(password, record.password_hash))) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const user = {
            id: record.id,
            name: record.name,
            email: record.email
        };

        res.json({ user, token: makeToken(user) });
    } catch (error) {
        handleError(res, error);
    }
});

// All routes below require a valid login
app.use("/api", (req, res, next) => {
    if (req.path === "/health" || req.path.startsWith("/auth/")) {
        return next();
    }
    auth(req, res, next);
});

// Current user and dashboard summary
app.get("/api/me", (req, res) => {
    res.json({ user: req.user });
});

app.get("/api/dashboard", (req, res) => {
    const userId = req.user.id;

    const savings = db.prepare(
        "SELECT COALESCE(SUM(saved_kobo), 0) AS total FROM savings WHERE user_id = ?"
    ).get(userId).total;

    const investments = db.prepare(
        "SELECT COALESCE(SUM(amount_kobo), 0) AS total FROM investments WHERE user_id = ?"
    ).get(userId).total;

    const loans = db.prepare(
        "SELECT COALESCE(SUM(amount_kobo), 0) AS total FROM loans WHERE user_id = ? AND status = 'approved'"
    ).get(userId).total;

    res.json({
        user: req.user,
        balance: naira(balanceKobo(userId)),
        savings: naira(savings),
        investments: naira(investments),
        approvedLoans: naira(loans)
    });
});

// Transaction history
app.get("/api/transactions", (req, res) => {
    const rows = db.prepare(`
    SELECT id, type, amount_kobo, description, created_at
    FROM transactions WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 100
  `).all(req.user.id);

    res.json(rows.map(row => ({
        id: row.id,
        type: row.type,
        amount: naira(row.amount_kobo),
        description: row.description,
        createdAt: row.created_at
    })));
});

// Simulated internal transfer; no real money is sent
app.post("/api/transfers", (req, res) => {
    try {
        const amount = moneyToKobo(req.body.amount);
        const recipient = String(req.body.recipient || "").trim();

        if (recipient.length < 2 || recipient.length > 120) {
            return res.status(400).json({ error: "Enter a valid recipient." });
        }

        const transfer = db.transaction(() => {
            if (balanceKobo(req.user.id) < amount) {
                throw new Error("INSUFFICIENT_FUNDS");
            }

            db.prepare(`
        INSERT INTO transactions
        (id, user_id, type, amount_kobo, description)
        VALUES (?, ?, 'debit', ?, ?)
      `).run(
                crypto.randomUUID(),
                req.user.id,
                amount,
                `Demo transfer to ${recipient}`
            );
        });

        transfer();

        res.status(201).json({
            message: "Demo transfer recorded. No real money was sent.",
            balance: naira(balanceKobo(req.user.id))
        });
    } catch (error) {
        if (error.message === "INSUFFICIENT_FUNDS") {
            return res.status(400).json({ error: "Insufficient demo balance." });
        }
        handleError(res, error);
    }
});

// Create and list savings goals
app.get("/api/savings", (req, res) => {
    const rows = db.prepare(
        "SELECT * FROM savings WHERE user_id = ? ORDER BY created_at DESC"
    ).all(req.user.id);

    res.json(rows.map(row => ({
        id: row.id,
        title: row.title,
        target: naira(row.target_kobo),
        saved: naira(row.saved_kobo),
        createdAt: row.created_at
    })));
});

app.post("/api/savings", (req, res) => {
    try {
        const title = String(req.body.title || "").trim();
        if (title.length < 2 || title.length > 100) {
            return res.status(400).json({ error: "Enter a savings goal name." });
        }

        const target = moneyToKobo(req.body.target);
        const id = crypto.randomUUID();

        db.prepare(`
      INSERT INTO savings (id, user_id, title, target_kobo)
      VALUES (?, ?, ?, ?)
    `).run(id, req.user.id, title, target);

        res.status(201).json({ id, title, target: naira(target), saved: 0 });
    } catch (error) {
        handleError(res, error);
    }
});

// Record savings progress (demo record only)
app.post("/api/savings/:id/contributions", (req, res) => {
    try {
        const amount = moneyToKobo(req.body.amount);

        const result = db.prepare(`
      UPDATE savings SET saved_kobo = saved_kobo + ?
      WHERE id = ? AND user_id = ?
        AND saved_kobo + ? <= target_kobo
    `).run(amount, req.params.id, req.user.id, amount);

        if (!result.changes) {
            return res.status(400).json({
                error: "Goal not found or contribution exceeds the target."
            });
        }

        res.json({ message: "Demo savings progress updated." });
    } catch (error) {
        handleError(res, error);
    }
});

// Investment records; no real investment is purchased
app.get("/api/investments", (req, res) => {
    const rows = db.prepare(
        "SELECT * FROM investments WHERE user_id = ? ORDER BY created_at DESC"
    ).all(req.user.id);

    res.json(rows.map(row => ({
        id: row.id,
        name: row.name,
        amount: naira(row.amount_kobo),
        createdAt: row.created_at
    })));
});

app.post("/api/investments", (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        if (name.length < 2 || name.length > 100) {
            return res.status(400).json({ error: "Enter an investment name." });
        }

        const amount = moneyToKobo(req.body.amount);
        const id = crypto.randomUUID();

        db.prepare(`
      INSERT INTO investments (id, user_id, name, amount_kobo)
      VALUES (?, ?, ?, ?)
    `).run(id, req.user.id, name, amount);

        res.status(201).json({
            id, name, amount: naira(amount),
            note: "Record only; no real investment was purchased."
        });
    } catch (error) {
        handleError(res, error);
    }
});

// Loan application and status tracking
app.get("/api/loans", (req, res) => {
    const rows = db.prepare(
        "SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC"
    ).all(req.user.id);

    res.json(rows.map(row => ({
        id: row.id,
        amount: naira(row.amount_kobo),
        durationMonths: row.duration_months,
        status: row.status,
        createdAt: row.created_at
    })));
});

app.post("/api/loans", (req, res) => {
    try {
        const amount = moneyToKobo(req.body.amount);
        const duration = Number(req.body.durationMonths);

        if (amount < 1000000 || amount > 50000000) {
            return res.status(400).json({
                error: "Demo loan amounts must be between ₦10,000 and ₦500,000."
            });
        }

        if (![3, 6, 9, 12].includes(duration)) {
            return res.status(400).json({ error: "Choose 3, 6, 9 or 12 months." });
        }

        const id = crypto.randomUUID();

        db.prepare(`
      INSERT INTO loans (id, user_id, amount_kobo, duration_months)
      VALUES (?, ?, ?, ?)
    `).run(id, req.user.id, amount, duration);

        res.status(201).json({
            id,
            amount: naira(amount),
            durationMonths: duration,
            status: "pending",
            message: "Demo application received; no loan will be disbursed."
        });
    } catch (error) {
        handleError(res, error);
    }
});

// Consistent error responses
app.use((err, req, res, next) => {
    if (err.message === "Website origin is not allowed.") {
        return res.status(403).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Server error." });
});

app.listen(PORT, () => {
    console.log(`GoodFunds API running on port ${PORT}`);
});
