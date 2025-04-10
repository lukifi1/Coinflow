import express from 'express'
import path from "path";
import 'dotenv/config'
import pg from 'pg'

// Documentation from pg: https://node-postgres.com/apis/pool
const { Pool } = pg
const pool = new Pool({
    host: 'coinflow_postgres',
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    port: 5432,
})

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

// Basic check if connecting to db works
app.get('/api/test_db', async (req, res) => {
    const result = await pool.query('SELECT $1::text as name', ['Works'])
    res.send(result.rows[0].name)
})

// Fetch user info from db as json
app.get('/api/user/:guid', async (req, res) => {
    const filePath = path.join(process.cwd(), 'www/404.html')
    res.sendFile(filePath, (err) => {
        if (err) {
            next(err)
        }
    })
})

app.listen(8080)
