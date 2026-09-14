import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import pg from 'pg'
import { pathToFileURL } from 'node:url'

dotenv.config()

export const app = express()
const port = process.env.PORT || 3001
const ADMIN_CODE = process.env.ADMIN_CODE || 'Demo@7078'
const { Pool } = pg
const hasDatabase = Boolean(process.env.DB_URL)

const pool = hasDatabase
  ? new Pool({
      connectionString: process.env.DB_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null

const DEFAULT_QUESTIONS = [
  {
    prompt: 'Which HTML element is the best choice for the main content region of a page?',
    options: ['<section>', '<main>', '<article>', '<div>'],
    correct: '<main>',
  },
  {
    prompt: 'In CSS, which property controls the space between the border and the content inside an element?',
    options: ['padding', 'margin', 'gap', 'border-spacing'],
    correct: 'padding',
  },
  {
    prompt: 'Which JavaScript declaration keeps a value from being reassigned?',
    options: ['let', 'var', 'const', 'function'],
    correct: 'const',
  },
  {
    prompt: 'Which DOM API selects the first matching element in the document?',
    options: ['document.find()', 'document.querySelector()', 'document.getElementById()', 'document.match()'],
    correct: 'document.querySelector()',
  },
  {
    prompt: 'What is the most common method to fetch JSON data from a server in the browser?',
    options: ['Image()', 'fetch()', 'setTimeout()', 'XMLHttpRequest()'],
    correct: 'fetch()',
  },
  {
    prompt: 'Which accessibility attribute is most important for an informative image?',
    options: ['aria-label', 'alt text', 'title', 'tabindex'],
    correct: 'alt text',
  },
  {
    prompt: 'Why is rel="noopener noreferrer" often added to external links opened in a new tab?',
    options: ['It makes them load faster', 'It prevents security issues and tabnabbing', 'It hides the link from search engines', 'It forces the browser to cache them'],
    correct: 'It prevents security issues and tabnabbing',
  },
  {
    prompt: 'Which CSS layout tool is best for aligning items in rows or columns with responsive spacing?',
    options: ['position: absolute', 'display: flex', 'text-align: center', 'float: left'],
    correct: 'display: flex',
  },
  {
    prompt: 'A server returns HTTP 404. What does that usually mean?',
    options: ['The request was successful', 'The resource was not found', 'The server is overloaded', 'The page is being redirected'],
    correct: 'The resource was not found',
  },
  {
    prompt: 'Which approach best supports mobile-friendly layouts on modern websites?',
    options: ['Fixed 1200px widths everywhere', 'Responsive design with flexible layouts and media queries', 'Only using large desktop screenshots', 'Turning off CSS entirely on small screens'],
    correct: 'Responsive design with flexible layouts and media queries',
  },
]

const inMemoryQuestions = DEFAULT_QUESTIONS.map((question, index) => ({
  id: index + 1,
  ...question,
}))

const inMemoryResults = []

const initializeDatabase = async () => {
  if (!pool) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id SERIAL PRIMARY KEY,
      prompt TEXT NOT NULL,
      options JSONB NOT NULL,
      correct TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quiz_results (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      percentage NUMERIC(5,2) NOT NULL,
      answers JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  const questionCount = await pool.query('SELECT COUNT(*) AS count FROM quiz_questions')
  if (Number(questionCount.rows[0].count) === 0) {
    for (const question of DEFAULT_QUESTIONS) {
      await pool.query(
        'INSERT INTO quiz_questions (prompt, options, correct) VALUES ($1, $2, $3)',
        [question.prompt, JSON.stringify(question.options), question.correct],
      )
    }
  }
}

app.use(cors())
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  if (!pool) {
    return res.json({ ok: true, mode: 'local', message: 'Database not configured; using in-memory fallback storage.' })
  }

  try {
    const result = await pool.query('SELECT NOW() as now')
    res.json({ ok: true, mode: 'database', now: result.rows[0].now })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.get('/api/questions', async (_req, res) => {
  if (!pool) {
    return res.json({ questions: inMemoryQuestions })
  }

  try {
    const result = await pool.query('SELECT * FROM quiz_questions ORDER BY id')
    res.json({ questions: result.rows })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.get('/api/results', async (_req, res) => {
  if (!pool) {
    return res.json({ results: inMemoryResults })
  }

  try {
    const result = await pool.query('SELECT * FROM quiz_results ORDER BY created_at DESC')
    res.json({ results: result.rows })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

const requireAdmin = (req, res, next) => {
  const adminCode = req.get('x-admin-code') || req.body?.adminCode

  if (adminCode !== ADMIN_CODE) {
    return res.status(401).json({ ok: false, error: 'Admin access required.' })
  }

  next()
}

app.post('/api/questions', requireAdmin, async (req, res) => {
  try {
    const { prompt, options, correct } = req.body || {}

    if (!prompt || !Array.isArray(options) || options.length !== 4 || !correct) {
      return res.status(400).json({ ok: false, error: 'Invalid question payload' })
    }

    if (!pool) {
      const question = {
        id: Date.now(),
        prompt,
        options,
        correct,
      }
      inMemoryQuestions.push(question)
      return res.json({ ok: true, question })
    }

    const result = await pool.query(
      `INSERT INTO quiz_questions (prompt, options, correct) VALUES ($1, $2, $3) RETURNING *`,
      [prompt, JSON.stringify(options), correct],
    )

    res.json({ ok: true, question: result.rows[0] })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.post('/api/questions/reset', requireAdmin, async (_req, res) => {
  if (!pool) {
    inMemoryQuestions.length = 0
    DEFAULT_QUESTIONS.forEach((question, index) => {
      inMemoryQuestions.push({ id: index + 1, ...question })
    })
    return res.json({ ok: true, questions: inMemoryQuestions })
  }

  try {
    await pool.query('DELETE FROM quiz_questions')
    for (const question of DEFAULT_QUESTIONS) {
      await pool.query(
        'INSERT INTO quiz_questions (prompt, options, correct) VALUES ($1, $2, $3)',
        [question.prompt, JSON.stringify(question.options), question.correct],
      )
    }

    const result = await pool.query('SELECT * FROM quiz_questions ORDER BY id')
    res.json({ ok: true, questions: result.rows })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.post('/api/results', async (req, res) => {
  try {
    const { name, email, score, total_questions, percentage, answers } = req.body || {}

    if (!name || !email) {
      return res.status(400).json({ ok: false, error: 'Name and email are required' })
    }

    if (!pool) {
      const result = {
        id: Date.now(),
        name,
        email,
        score: Number(score),
        total_questions: Number(total_questions),
        percentage: Number(percentage),
        answers: Array.isArray(answers) ? answers : [],
        created_at: new Date().toISOString(),
      }
      inMemoryResults.push(result)
      return res.json({ ok: true, result })
    }

    const result = await pool.query(
      `INSERT INTO quiz_results (name, email, score, total_questions, percentage, answers) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, email, Number(score), Number(total_questions), Number(percentage), JSON.stringify(answers || [])],
    )

    res.json({ ok: true, result: result.rows[0] })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

const startServer = async () => {
  if (pool) {
    try {
      await initializeDatabase()
    } catch (error) {
      console.error('Database initialization failed:', error)
      process.exit(1)
    }
  }

  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`)
  })
}

const isDirectExecution = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url

if (isDirectExecution) {
  startServer()
}
