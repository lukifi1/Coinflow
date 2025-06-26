import express from "express"
import path from "path"
import "dotenv/config"
import pg from "pg"
import crypto from "crypto";
import nodemailer from "nodemailer";

// Documentation from pg: https://node-postgres.com/apis/pool
const { Pool } = pg
const pool = new Pool({
  host: "coinflow_postgres",
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  port: 5432,
})

// Nodemailer (Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sessions = new Map(); // In-memory session store

const app = express()

app.use(express.static("www"))
app.use(express.json())

function isValidUuid(uuid) {
  // Helpful documentation https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions
  // Where I got the expression from https://stackoverflow.com/a/38191104
  // This Expression only works for UUIDv4, which is the version prostgresql uses
  const regex = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/, "i")
  return regex.test(uuid)
}

// TODO: Check if user is logged in and either display the landing or main page
app.get("/", (req, res) => {
  const filePath = path.join(process.cwd(), "www/index.html")
  res.sendFile(filePath, (error) => {
    if (error) {
      res.status(error.statusCode).json({ error })
    }
  })
})

app.get("/api", (req, res) => {
  const filePath = path.join(process.cwd(), "internal/api.html")
  res.sendFile(filePath, (error) => {
    if (error) {
      res.status(error.statusCode).json({ error })
    }
  })
})

app.get("/api/healthcheck", (req, res) => {
  pool.query("SELECT $1::text as name", ["Works"])
    .then((result) => {
      res.send(result)
    })
    .catch((error) => {
      res.status(500).json({ error })
    })
})

app.get("/api/user", (req, res) => {
  pool.query("SELECT uuid FROM users")
    .then((result) => {
      res.send(result.rows)
    })
    .catch((error) => {
      res.status(500).json({ error })
    })
})

app.post("/api/user/new", (req, res) => {
  const { username, email, password_hash } = req.body;

  // Validate payload presence
  if (!req.body) {
    return res.status(400).json({ error: "Missing JSON body" });
  }

  // Validate required fields
  if (!username || !email || !password_hash) {
    return res.status(400).json({ error: "Missing required fields: username, email, or password_hash" });
  }

  pool.query("SELECT insert_user($1, $2, $3)", [username, email, password_hash])
    .then((result) => {
      res.status(201).json({ uuid: result.rows[0].insert_user });
    })
    .catch((error) => {
      // Handle known PL/pgSQL RAISE EXCEPTIONs
      const message = error.message || "";
      if (error.code === "P0001") {
        if (message.includes("User already exists")) {
          return res.status(409).json({ error: "Username or email already in use." });
        } else if (message.includes("Username is invalid")) {
          return res.status(400).json({ error: "Invalid username format." });
        } else if (message.includes("Email is invalid")) {
          return res.status(400).json({ error: "Invalid email format." });
        }
      }

      // Generic fallback
      console.error("Unexpected error during user insert:", error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.get("/api/user/:uuid", (req, res) => {
  if (!isValidUuid(req.params.uuid)) {
    res.status(400).json({ message: "bruh, this shit ain't a valid uuid" })
    return
  }

  pool.query("SELECT * FROM get_user($1)", [req.params.uuid])
    .then((result) => {
      res.send(result.rows[0])
    })
    .catch((error) => {
      res.status(500).json({ error })
    })
})

app.put("/api/user/:uuid", (req, res) => {
  if (!isValidUuid(req.params.uuid)) {
    res.status(400).json({ message: "bruh, this shit ain't a valid uuid" })
    return
  }

  if (!req.body) {
    res.status(400).json({ message: "bruh, I need me some json" })
    return
  }

  if (!req.body.username || !req.body.email || !req.body.password_hash) {
    res.status(400).json({ message: "bruh, this shit wrong" })
    return
  }

  pool.query("SELECT * FROM update_user($1, $2, $3, $4)", [req.params.uuid, req.body.username, req.body.email, req.body.password_hash])
    .then((result) => {
      res.send(result.rows[0])
    })
    .catch((error) => {
      res.status(500).json({ error })
    })
})

app.delete("/api/user/:uuid", (req, res) => {
  if (!isValidUuid(req.params.uuid)) {
    res.status(400).json({ message: "bruh, this shit ain't a valid uuid" })
    return
  }

  pool.query("SELECT * FROM delete_user($1)", [req.params.uuid])
    .then((result) => {
      res.send(result.rows[0])
    })
    .catch((error) => {
      res.status(500).json({ error })
    })
})

app.post("/api/user/login", (req, res) => {
  if (!req.body) {
    res.status(400).json({ message: "bruh, I need me some json" })
    return
  }

  if (!req.body.email || !req.body.password_hash) {
    res.status(400).json({ message: "Email and password required" })
    return
  }

  pool.query("SELECT uuid, password_hash FROM users WHERE email = $1", [req.body.email])
    .then((result) => {
      if (result.rowCount == 0 || result.rows[0].password_hash != req.body.password_hash) {
        res.status(401).json({ message: "Invalid credentials" })
        return
      }

      const token = crypto.randomUUID()

      sessions.set(token, {
        uuid: result.rows[0].uuid,
        createdAt: Date.now()
      })

      res.json({
        uuid: result.rows[0].uuid,
        token
      })
    })
    .catch((error) => {
      res.status(500).json({ error })
    })
})

app.post("/api/user/request_password_reset", (req, res) => {
  if (!req.body) {
    res.status(400).json({ message: "bruh, I need me some json" })
    return
  }

  if (!req.body.email) {
    res.status(400).json({ message: "Email required" })
    return
  }

  pool.query("SELECT uuid FROM users WHERE email = $1", [req.body.email])
    .then((result) => {
      if (result.rowCount == 0) {
        res.status(401).json({ message: "Invalid credentials" })
        return
      }

      const reset_code = crypto.randomBytes(20).toString('hex')
      sessions.set(reset_code, {
        uuid: result.rows[0].uuid,
        expires: new Date(Date.now() + 1000 * 60 * 15).getTime()
      }
      )

      const reset_link = `http://localhost:8080/update-password.html?code=${reset_code}`

      transporter.sendMail({
        from: `CoinFlow <${process.env.EMAIL_USER}>`,
        to: req.body.email,
        subject: "Reset your CoinFlow password",
        html: `
                      <p>Hello,</p>
                      <p>Click the link below to reset your password:</p>
                      <a href="${reset_link}">Reset Password</a>
                      <p>This link will expire in 15 minutes.</p>
                  `
      })

      res.status(200).end()
    })
    .catch((error) => {
      res.status(500).json({ error })
    })
})

app.post("/api/user/reset_password", async (req, res) => {
  if (!req.body) {
    res.status(400).json({ message: "bruh, I need me some json" })
    return
  }

  if (!req.body.reset_code || !req.body.new_password_hash) {
    res.status(400).json({ message: "Reset code and new password required" })
    return
  }

  if (!sessions.has(req.body.reset_code)) {
    res.status(400).json({ message: "Invalid reset code" })
    return
  }

  const reset = sessions.get(req.body.reset_code)
  if (reset.expires < Date.now()) {
    sessions.delete(req.body.reset_code)
    res.status(400).json({ message: "Invalid reset code" })
    return
  }

  pool.query("UPDATE users SET password_hash = $1 WHERE uuid = $2", [req.body.new_password_hash, reset.uuid])
    .then((result) => {
      sessions.delete(req.body.reset_code)
      res.status(200).end()
    })
    .catch((error) => {
      res.status(500).json({ error })
    })
})

// Copied from fink branch

app.get("/api/incomes/:uuid", async (req, res) => {
  const userUuid = req.params.uuid;

  if (!isValidUuid(userUuid)) {
    return res.status(400).json({ error: "Invalid user UUID" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM incomes WHERE user_uuid = $1 ORDER BY created_at DESC",
      [userUuid]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch incomes", details: err.message });
  }
});

app.post("/api/income/new", async (req, res) => {
  const { user_uuid, name, amount, tags, account_id } = req.body;

  if (!user_uuid || !name || !amount || !account_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!isValidUuid(user_uuid) || !isValidUuid(account_id)) {
    return res.status(400).json({ error: "Invalid UUID format for user or account" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO incomes (user_uuid, name, amount, tags, account_uuid)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
      [user_uuid, name, amount, tags || [], account_id]
    );

    res.status(201).json({ message: "Income created", income: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create income", details: err.message });
  }
});

app.post("/api/income/bulk", async (req, res) => {
  const incomes = req.body;

  if (!Array.isArray(incomes) || incomes.length === 0) {
    return res.status(400).json({ error: "Invalid or empty data" });
  }

  const values = [];
  for (const income of incomes) {
    const { user_uuid, name, amount, tags, account_id, date } = income;

    if (!user_uuid || !name || !amount || !account_id || isNaN(amount) || !date) {
      return res.status(400).json({ error: "Missing or invalid fields in one or more entries" });
    }

    if (!isValidUuid(user_uuid) || !isValidUuid(account_id)) {
      return res.status(400).json({ error: "Invalid UUID in one or more entries" });
    }

    values.push([user_uuid, name, amount, tags || [], account_id, date]);
  }

  const query = `
    INSERT INTO incomes (user_uuid, name, amount, tags, account_uuid, date)
    VALUES ${values.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(",")}
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, values.flat());
    res.status(201).json({ message: "Incomes inserted", count: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to insert incomes", details: err.message });
  }
});

app.post("/api/account/new", async (req, res) => {
  const { user_uuid, name, balance } = req.body;

  if (!user_uuid || !name) {
    return res.status(400).json({ error: "Missing required fields: user_uuid and name" });
  }

  if (!isValidUuid(user_uuid)) {
    return res.status(400).json({ error: "Invalid user UUID" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO accounts (user_uuid, name, balance)
         VALUES ($1, $2, $3)
         RETURNING *`,
      [user_uuid, name || "general", balance || 0]
    );

    res.status(201).json({ message: "Account created", account: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create account", details: err.message });
  }
});

app.get("/api/accounts/:uuid", async (req, res) => {
  const uuid = req.params.uuid;

  if (!isValidUuid(uuid)) {
    return res.status(400).json({ error: "Invalid UUID format" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM accounts WHERE user_uuid = $1 ORDER BY name ASC",
      [uuid]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch accounts", details: err.message });
  }
});

app.delete("/api/income/:user_uuid/:income_id", async (req, res) => {
  const { user_uuid, income_id } = req.params;

  if (!isValidUuid(user_uuid) || !isValidUuid(income_id)) {
    return res.status(400).json({ error: "Invalid UUID format" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM incomes WHERE uuid = $1 AND user_uuid = $2 RETURNING *",
      [income_id, user_uuid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Income not found or not owned by user" });
    }

    res.json({ message: "Income deleted", income: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete income", details: err.message });
  }
});

// Get all expenses for a user
app.get("/api/expenses/:uuid", async (req, res) => {
  const user_uuid = req.params.uuid;
  if (!isValidUuid(user_uuid)) {
    return res.status(400).json({ error: "Invalid user UUID" });
  }

  try {
    const result = await pool.query("SELECT * FROM expenses WHERE user_uuid = $1 ORDER BY created_at DESC", [user_uuid]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch expenses", details: err.message });
  }
});

// Create a new expense
app.post("/api/expense/new", async (req, res) => {
  const { user_uuid, name, amount, tags, account_id } = req.body;

  if (!isValidUuid(user_uuid) || !name || !amount || !account_id) {
    return res.status(400).json({ error: "Missing required fields or invalid UUIDs" });
  }

  try {
    await pool.query(
      "INSERT INTO expenses (user_uuid, name, amount, tags, account_uuid) VALUES ($1, $2, $3, $4, $5)",
      [user_uuid, name, amount, tags || [], account_id]
    );
    res.status(201).json({ message: "Expense added successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to create expense", details: err.message });
  }
});

app.post("/api/expense/bulk", async (req, res) => {
  const expenses = req.body;

  if (!Array.isArray(expenses) || expenses.length === 0) {
    return res.status(400).json({ error: "Invalid or empty expense data" });
  }

  const values = [];
  for (const expense of expenses) {
    const { user_uuid, name, amount, tags, account_id, date } = expense;

    if (!user_uuid || !name || !amount || !account_id || isNaN(amount) || !date) {
      return res.status(400).json({ error: "Missing or invalid fields in one or more entries" });
    }

    if (!isValidUuid(user_uuid) || !isValidUuid(account_id)) {
      return res.status(400).json({ error: "Invalid UUID in one or more entries" });
    }

    values.push([user_uuid, name, amount, tags || [], account_id, date]);
  }

  const placeholders = values
    .map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`)
    .join(",");

  const query = `
    INSERT INTO expenses (user_uuid, name, amount, tags, account_uuid, date)
    VALUES ${placeholders}
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, values.flat());
    res.status(201).json({ message: "Expenses inserted", count: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to insert expenses", details: err.message });
  }
});

// Delete a specific expense
app.delete("/api/expense/:uuid/:expense_id", async (req, res) => {
  const { uuid, expense_id } = req.params;

  if (!isValidUuid(uuid) || !isValidUuid(expense_id)) {
    return res.status(400).json({ error: "Invalid UUID format" });
  }

  try {
    const result = await pool.query("DELETE FROM expenses WHERE uuid = $1 AND user_uuid = $2 RETURNING *", [expense_id, uuid]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json({ message: "Expense deleted", expense: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete expense", details: err.message });
  }
});

app.delete("/api/account/:user_uuid/:account_id", async (req, res) => {
  const { user_uuid, account_id } = req.params;

  if (!isValidUuid(user_uuid) || !isValidUuid(account_id)) {
    return res.status(400).json({ error: "Invalid UUID format" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM accounts WHERE uuid = $1 AND user_uuid = $2 RETURNING *",
      [account_id, user_uuid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Account not found or not owned by user" });
    }

    res.json({ message: "Account deleted", account: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete account", details: err.message });
  }
});

app.post("/api/transaction/new", async (req, res) => {
  const { user_uuid, from_account, to_account, amount, description, date } = req.body;

  if (!user_uuid || !from_account || !to_account || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!isValidUuid(user_uuid) || !isValidUuid(from_account) || !isValidUuid(to_account)) {
    return res.status(400).json({ error: "Invalid UUID format" });
  }

  if (from_account === to_account) {
    return res.status(400).json({ error: "Cannot transfer to the same account" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO transactions (user_uuid, from_account, to_account, amount, description, date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_uuid, from_account, to_account, amount, description || null, date || null]
    );

    res.status(201).json({ message: "Transaction created", transaction: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create transaction", details: err.message });
  }
});

app.post("/api/transaction/bulk", async (req, res) => {
  const transactions = req.body;

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({ error: "Invalid or empty transaction data" });
  }

  const values = [];
  for (const transaction of transactions) {
    const { user_uuid, from_account, to_account, amount, description, date } = transaction;

    if (!user_uuid || !from_account || !to_account || !amount || isNaN(amount) || !date) {
      return res.status(400).json({ error: "Missing or invalid fields in one or more entries" });
    }

    if (!isValidUuid(user_uuid) || !isValidUuid(from_account) || !isValidUuid(to_account)) {
      return res.status(400).json({ error: "Invalid UUID in one or more entries" });
    }

    values.push([user_uuid, from_account, to_account, amount, description || null, date || null]);
  }

  const placeholders = values.map((_, i) =>
    `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
  ).join(",");

  const query = `
    INSERT INTO transactions (user_uuid, from_account, to_account, amount, description, date)
    VALUES ${placeholders}
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, values.flat());
    res.status(201).json({ message: "Transactions inserted", count: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to insert transactions", details: err.message });
  }
});

app.get("/api/transactions/:uuid", async (req, res) => {
  const user_uuid = req.params.uuid;

  if (!isValidUuid(user_uuid)) {
    return res.status(400).json({ error: "Invalid UUID format" });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM transactions
       WHERE user_uuid = $1
       ORDER BY created_at DESC`,
      [user_uuid]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch transactions", details: err.message });
  }
});

app.delete("/api/transaction/:uuid/:transaction_id", async (req, res) => {
  const { uuid, transaction_id } = req.params;

  if (!isValidUuid(uuid) || !isValidUuid(transaction_id)) {
    return res.status(400).json({ error: "Invalid UUID format" });
  }

  try {
    const result = await pool.query(
      `DELETE FROM transactions
       WHERE uuid = $1 AND user_uuid = $2
       RETURNING *`,
      [transaction_id, uuid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({ message: "Transaction deleted", transaction: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete transaction", details: err.message });
  }
});

app.get("/api/settings/:user_uuid", async (req, res) => {
  const { user_uuid } = req.params;

  if (!isValidUuid(user_uuid)) {
    return res.status(400).json({ error: "Invalid UUID" });
  }

  try {
    const result = await pool.query("SELECT * FROM settings WHERE user_uuid = $1", [user_uuid]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Settings not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve settings", details: err.message });
  }
});

app.post("/api/settings/update", async (req, res) => {
  const { user_uuid, currency_symbol } = req.body;

  if (!isValidUuid(user_uuid) || !currency_symbol) {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }

  try {
    await pool.query(
      `INSERT INTO settings (user_uuid, currency_symbol)
       VALUES ($1, $2)
       ON CONFLICT (user_uuid)
       DO UPDATE SET currency_symbol = EXCLUDED.currency_symbol`,
      [user_uuid, currency_symbol]
    );
    res.status(200).json({ message: "Settings updated" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings", details: err.message });
  }
});

app.listen(8080)
