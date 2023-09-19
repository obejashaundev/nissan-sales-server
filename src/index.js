const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
require('./database')

app.use(cors())
app.use(express.json())
app.use('/api', require('./routes/index'))

const port = process.env.API_PORT || 3000

app.listen(port, () => {
    console.log(`Server on http://localhost:${port}`)
})