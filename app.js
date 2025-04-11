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

// Landing/Main Page
// Takes in no arguments
// Returns an HTML file
// TODO: Check if user is logged in and either display the landing or main page
app.get("/", (req, res) => {
    const filePath = path.join(process.cwd(), "www/index.html")
    res.sendFile(filePath, (error) => {
        if (error) {
            if (error.statusCode == 404) {
                res.status(error.statusCode).sendFile(path.join(process.cwd(), "internal/404.html"))
            } else {
                res.status(error.statusCode).json({ error })
            }
        }
    })
})

// API Spec
// Takes in no arguments
// Returns an HTML file
app.get("/api", (req, res) => {
    const filePath = path.join(process.cwd(), "internal/api.html")
    res.sendFile(filePath, (error) => {
        if (error) {
            if (error.statusCode == 404) {
                res.status(error.statusCode).sendFile(path.join(process.cwd(), "internal/404.html"))
            } else {
                res.status(error.statusCode).json({ error })
            }
        }
    })
})

// Healthcheck for docker and for whoever wants it
// Takes in no arguments
// Returns "Works" on success and a json on error
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
// Takes in a UUID in the URI
// Returns HTTP code 400 if uuid is not a valid UUID
// Returns username, email and password_hash as json or error as json
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
