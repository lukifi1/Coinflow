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

app.get("/", (req, res) => {
    const filePath = path.join(process.cwd(), "www/index.html")
    res.sendFile(filePath, (err) => {
        if (err) {
            next(err)
        }
    })
})

// API Spec as html
app.get("/api", (req, res) => {
    const filePath = path.join(process.cwd(), "www/404.html")
    res.sendFile(filePath, (err) => {
        if (err) {
            next(err)
        }
    })
})

// Healthcheck for docker and for whoever wants it
app.get("/api/healthcheck", async (req, res) => {
    pool.query("SELECT $1::text as name", ["Works"])
        .then((result) => {
            res.send(result)
        })
        .catch((error) => {
            res.status(500).json({ error })
        })
})

// Fetch user info from db as json
app.get("/api/user/:uuid", async (req, res) => {
    // Helpful documentation https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions
    // Where I got the expression from https://stackoverflow.com/a/38191104
    // This Expression only works for UUIDv4, which is the version prostgresql uses
    const regex = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/, "i")
    if (!regex.test(req.params.uuid)) {
        res.status(400).end()
        return
    }

    pool.query("SELECT * FROM get_user($1::uuid)", [req.params.uuid])
        .then((result) => {
            res.send(result.rows[0])
        })
        .catch((error) => {
            res.status(500).json({ error })
        })
})

app.listen(8080)
