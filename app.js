import express from "express"
import path from "path";
import "dotenv/config"
import pg from "pg"

// Documentation from pg: https://node-postgres.com/apis/pool
const { Pool } = pg
const pool = new Pool({
    host: "coinflow_postgres",
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    port: 5432,
})

const app = express()

app.use(express.static("www"))
app.use(express.json())

// Landing/Main Page
// Takes in no arguments
// Returns an HTML file or error as json
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

app.get("/api/user/:uuid", (req, res) => {
    // Helpful documentation https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions
    // Where I got the expression from https://stackoverflow.com/a/38191104
    // This Expression only works for UUIDv4, which is the version prostgresql uses
    const regex = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/, "i")
    if (!regex.test(req.params.uuid)) {
        res.status(400).json({ })
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

app.post("/api/user/new", (req, res) => {
    if (!req.body) {
        res.status(400).json({ message: "bruh, I need me some json" })
        return
    }
    
    if (!req.body.username || !req.body.email || !req.body.password_hash) {
        res.status(400).json({ message: "bruh, this shit wrong" })
        return
    }
    
    pool.query("SELECT * FROM insert_user($1, $2, $3)", [req.body.username, req.body.email, req.body.password_hash])
        .then((result) => {
            res.json({ uuid: result.rows[0].insert_user })
        })
        .catch((error) => {
            res.status(500).json({ error })
        })
})

app.listen(8080)
