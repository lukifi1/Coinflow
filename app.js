import express from 'express'
import path from "path";
import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({
    host: 'coinflow_postgres',
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    port: 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
})

// const result = await pool.query('SELECT $1::text as name', ['toast'])
// console.log(result.rows[0].name)

const app = express()

app.use(express.static('www'))

app.get('/', (req, res) => {
    const filePath = path.join(process.cwd(), 'www/index.html')
    res.sendFile(filePath, (err) => {
        if (err) {
            next(err)
        }
    })
})

// API Spec as html
app.get('/api', (req, res) => {
    const filePath = path.join(process.cwd(), 'www/404.html')
    res.sendFile(filePath, (err) => {
        if (err) {
            next(err)
        }
    })
})

// Fetch user info from db as json
app.get('/api/user/:guid', (req, res) => {
    const filePath = path.join(process.cwd(), 'www/404.html')
    res.sendFile(filePath, (err) => {
        if (err) {
            next(err)
        }
    })
})

app.listen(8080)
