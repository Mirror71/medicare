import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import gemmaRouter from './routes/gemma.js'
import errorHandler from './middleware/errorHandler.js'

const app = express()

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '10mb' }))

app.get('/health', (req, res) => res.json({ ok: true }))

app.use('/api/gemma', gemmaRouter)

app.use(errorHandler)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
