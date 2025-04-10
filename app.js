import express from 'express'
import path from "path";
import 'dotenv/config'

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
