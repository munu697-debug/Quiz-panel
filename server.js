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
const connectionString = process.env.SUPABASE_SERVICE_ROLE_URL || process.env.DB_URL
const hasDatabase = Boolean(connectionString)

const pool = hasDatabase
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null

const DEFAULT_SECTIONS = [
  {
    sectionKey: 'section-1',
    title: 'General Quiz: Web Fundamentals',
    description: 'Web fundamentals checkpoint covering structure, UX, and responsive design.',
    sortOrder: 1,
  },
]

const DEFAULT_QUESTIONS = [
  {
    sectionId: 'section-1',
    prompt: 'Which HTML element is the best choice for the main content region of a page?',
    options: ['<section>', '<main>', '<article>', '<div>'],
    correct: '<main>',
  },
  {
    sectionId: 'section-1',
    prompt: 'In CSS, which property controls the space between the border and the content inside an element?',
    options: ['padding', 'margin', 'gap', 'border-spacing'],
    correct: 'padding',
  },
  {
    sectionId: 'section-1',
    prompt: 'Which JavaScript declaration keeps a value from being reassigned?',
    options: ['let', 'var', 'const', 'function'],
    correct: 'const',
  },
  {
    sectionId: 'section-1',
    prompt: 'Which DOM API selects the first matching element in the document?',
    options: ['document.find()', 'document.querySelector()', 'document.getElementById()', 'document.match()'],
    correct: 'document.querySelector()',
  },
  {
    sectionId: 'section-1',
    prompt: 'What is the most common method to fetch JSON data from a server in the browser?',
    options: ['Image()', 'fetch()', 'setTimeout()', 'XMLHttpRequest()'],
    correct: 'fetch()',
  },
  {
    sectionId: 'section-1',
    prompt: 'Which accessibility attribute is most important for an informative image?',
    options: ['aria-label', 'alt text', 'title', 'tabindex'],
    correct: 'alt text',
  },
  {
    sectionId: 'section-1',
    prompt: 'Why is rel="noopener noreferrer" often added to external links opened in a new tab?',
    options: ['It makes them load faster', 'It prevents security issues and tabnabbing', 'It hides the link from search engines', 'It forces the browser to cache them'],
    correct: 'It prevents security issues and tabnabbing',
  },
  {
    sectionId: 'section-1',
    prompt: 'Which CSS layout tool is best for aligning items in rows or columns with responsive spacing?',
    options: ['position: absolute', 'display: flex', 'text-align: center', 'float: left'],
    correct: 'display: flex',
  },
  {
    sectionId: 'section-1',
    prompt: 'A server returns HTTP 404. What does that usually mean?',
    options: ['The request was successful', 'The resource was not found', 'The server is overloaded', 'The page is being redirected'],
    correct: 'The resource was not found',
  },
  {
    sectionId: 'section-1',
    prompt: 'Which approach best supports mobile-friendly layouts on modern websites?',
    options: ['Fixed 1200px widths everywhere', 'Responsive design with flexible layouts and media queries', 'Only using large desktop screenshots', 'Turning off CSS entirely on small screens'],
    correct: 'Responsive design with flexible layouts and media queries',
  },
]

const LEGACY_DEFAULT_QUESTIONS = [
  'Which HTML element is the best choice for the main content region of a page?',
  'In CSS, which property controls the space between the border and the content inside an element?',
  'Which JavaScript declaration keeps a value from being reassigned?',
  'Which DOM API selects the first matching element in the document?',
  'What is the most common method to fetch JSON data from a server in the browser?',
  'Which accessibility attribute is most important for an informative image?',
  'Why is rel="noopener noreferrer" often added to external links opened in a new tab?',
  'Which CSS layout tool is best for aligning items in rows or columns with responsive spacing?',
  'A server returns HTTP 404. What does that usually mean?',
  'Which approach best supports mobile-friendly layouts on modern websites?',
]

const inMemoryQuestions = DEFAULT_QUESTIONS.map((question, index) => ({
  id: index + 1,
  sectionId: question.sectionId || 'section-1',
  ...question,
}))

const inMemoryResults = []

const shouldResetLegacyQuestions = (questions = []) =>
  Array.isArray(questions) && questions.some((question) =>
    typeof question?.prompt === 'string' && LEGACY_DEFAULT_QUESTIONS.includes(question.prompt),
  )

const isRlsPermissionError = (error) => {
  const message = String(error?.message || '')
  return /row level security|permission denied|42501|RLS|policy/i.test(message)
}

const normalizeSectionRow = (section, index = 0) => {
  const sectionKey = section.section_key || section.sectionKey || section.section_id || section.id || `section-${index + 1}`
  const title = section.title || section.heading || `Section ${index + 1}`
  return {
    id: Number(section.id ?? index + 1),
    sectionId: String(sectionKey),
    section_key: sectionKey,
    title,
    heading: title,
    description: section.description || '',
    sort_order: Number(section.sort_order ?? section.sortOrder ?? index + 1),
  }
}

const getDefaultSections = () => DEFAULT_SECTIONS.map((section, index) => normalizeSectionRow({ ...section, id: index + 1 }, index))

const insertDefaultSections = async (sectionList = DEFAULT_SECTIONS) => {
  for (const [index, section] of sectionList.entries()) {
    const sectionKey = section.sectionKey || section.section_key || `section-${index + 1}`
    await pool.query(
      `INSERT INTO quiz_sections (section_key, title, description, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (section_key) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         sort_order = EXCLUDED.sort_order`,
      [sectionKey, section.title || `Section ${index + 1}`, section.description || '', section.sortOrder || index + 1],
    )
  }
}

const insertDefaultQuestions = async (questionList = DEFAULT_QUESTIONS) => {
  for (const [index, question] of questionList.entries()) {
    const sectionKey = question.sectionId || question.section_id || 'section-1'
    const result = await pool.query(
      'INSERT INTO quiz_questions (section_id, prompt, options, correct) VALUES ($1, $2, $3, $4) RETURNING id',
      [sectionKey, question.prompt, JSON.stringify(question.options), question.correct],
    )

    await pool.query(
      `INSERT INTO quiz_section_questions (section_key, question_id, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (section_key, question_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
      [sectionKey, result.rows[0].id, index + 1],
    )
  }
}

const resetQuestionsToDefaults = async (questionList = DEFAULT_QUESTIONS) => {
  if (!pool) {
    return
  }

  await pool.query('DELETE FROM quiz_section_questions')
  await pool.query('DELETE FROM quiz_questions')
  await insertDefaultSections(DEFAULT_SECTIONS)
  await insertDefaultQuestions(questionList)
}

let databaseReady = false

const initializeDatabase = async () => {
  if (!pool || databaseReady) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_sections (
      id SERIAL PRIMARY KEY,
      section_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id SERIAL PRIMARY KEY,
      section_id TEXT NOT NULL DEFAULT 'section-1',
      prompt TEXT NOT NULL,
      options JSONB NOT NULL,
      correct TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quiz_section_questions (
      id SERIAL PRIMARY KEY,
      section_key TEXT NOT NULL,
      question_id INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(section_key, question_id),
      UNIQUE(section_key, sort_order)
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

  await pool.query(`ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS section_id TEXT NOT NULL DEFAULT 'section-1';`)
  await pool.query(`ALTER TABLE quiz_sections ADD COLUMN IF NOT EXISTS section_key TEXT;`)
  await pool.query(`ALTER TABLE quiz_sections ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';`)
  await pool.query(`ALTER TABLE quiz_sections ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;`)

  const sectionCount = await pool.query('SELECT COUNT(*) AS count FROM quiz_sections')
  if (Number(sectionCount.rows[0].count) === 0) {
    await insertDefaultSections(DEFAULT_SECTIONS)
  }

  const questionCount = await pool.query('SELECT COUNT(*) AS count FROM quiz_questions')
  if (Number(questionCount.rows[0].count) === 0) {
    await insertDefaultQuestions(DEFAULT_QUESTIONS)
    databaseReady = true
    return
  }

  const existingQuestions = await pool.query('SELECT prompt FROM quiz_questions ORDER BY id')
  if (shouldResetLegacyQuestions(existingQuestions.rows)) {
    await resetQuestionsToDefaults()
  }

  databaseReady = true
}

const ensureDatabaseReady = async () => {
  if (!pool) return
  await initializeDatabase()
}

app.use(cors())
app.use(express.json())
app.use(async (_req, _res, next) => {
  await ensureDatabaseReady()
  next()
})

const requireAdmin = (req, res, next) => {
  const adminCode = req.get('x-admin-code') || req.body?.adminCode

  if (adminCode !== ADMIN_CODE) {
    return res.status(401).json({ ok: false, error: 'Admin access required.' })
  }

  next()
}

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
    const result = await pool.query(`
      SELECT q.*, s.title AS section_title
      FROM quiz_questions q
      LEFT JOIN quiz_sections s ON s.section_key = q.section_id
      ORDER BY q.id
    `)
    res.json({ questions: result.rows.map((question) => ({
      ...question,
      sectionId: question.section_id || question.sectionId || 'section-1',
      sectionTitle: question.section_title || 'General Quiz',
    })) })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.get('/api/sections', async (_req, res) => {
  if (!pool) {
    return res.json({ sections: getDefaultSections() })
  }

  try {
    const result = await pool.query(
      'SELECT * FROM quiz_sections ORDER BY sort_order ASC, id ASC',
    )
    res.json({
      sections: result.rows.map((section, index) => normalizeSectionRow(section, index)),
    })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.post('/api/sections', requireAdmin, async (req, res) => {
  const { title, description, sectionKey, sortOrder } = req.body || {}

  if (!title || !String(title).trim()) {
    return res.status(400).json({ ok: false, error: 'Section title is required.' })
  }

  if (!pool) {
    const nextSection = {
      id: Date.now(),
      sectionKey: sectionKey || `section-${Date.now()}`,
      title: String(title).trim(),
      description: description || '',
      sortOrder: Number(sortOrder || 0),
    }
    return res.json({ ok: true, section: nextSection })
  }

  try {
    const key = sectionKey || `section-${Date.now()}`
    const row = await pool.query(
      `INSERT INTO quiz_sections (section_key, title, description, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (section_key) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         sort_order = EXCLUDED.sort_order
       RETURNING *`,
      [key, String(title).trim(), description || '', Number(sortOrder || 0)],
    )

    res.json({ ok: true, section: normalizeSectionRow(row.rows[0], 0) })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.delete('/api/sections/:sectionKey', requireAdmin, async (req, res) => {
  const { sectionKey } = req.params

  if (!sectionKey) {
    return res.status(400).json({ ok: false, error: 'Section key is required.' })
  }

  if (!pool) {
    return res.json({ ok: true, deleted: true })
  }

  try {
    await pool.query('DELETE FROM quiz_section_questions WHERE section_key = $1', [sectionKey])
    await pool.query('DELETE FROM quiz_questions WHERE section_id = $1', [sectionKey])
    await pool.query('DELETE FROM quiz_sections WHERE section_key = $1', [sectionKey])
    res.json({ ok: true, deleted: true })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.delete('/api/questions/:questionId', requireAdmin, async (req, res) => {
  const { questionId } = req.params

  if (!questionId) {
    return res.status(400).json({ ok: false, error: 'Question id is required.' })
  }

  if (!pool) {
    return res.json({ ok: true, deleted: true })
  }

  try {
    const parsedId = Number(questionId)
    await pool.query('DELETE FROM quiz_section_questions WHERE question_id = $1', [parsedId])
    await pool.query('DELETE FROM quiz_questions WHERE id = $1', [parsedId])
    res.json({ ok: true, deleted: true })
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

app.post('/api/questions', requireAdmin, async (req, res) => {
  try {
    const { prompt, options, correct, sectionId } = req.body || {}

    if (!prompt || !Array.isArray(options) || options.length < 2 || !correct) {
      return res.status(400).json({ ok: false, error: 'Each question needs at least two answer options and a correct answer.' })
    }

    if (!pool) {
      const question = {
        id: Date.now(),
        sectionId: sectionId || 'section-1',
        prompt,
        options,
        correct,
      }
      inMemoryQuestions.push(question)
      return res.json({ ok: true, question })
    }

    const result = await pool.query(
      `INSERT INTO quiz_questions (section_id, prompt, options, correct) VALUES ($1, $2, $3, $4) RETURNING *`,
      [sectionId || 'section-1', prompt, JSON.stringify(options), correct],
    )

    const nextSortOrder = await pool.query(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order
       FROM quiz_section_questions
       WHERE section_key = $1`,
      [sectionId || 'section-1'],
    )

    await pool.query(
      `INSERT INTO quiz_section_questions (section_key, question_id, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (section_key, question_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
      [sectionId || 'section-1', result.rows[0].id, Number(nextSortOrder.rows[0].next_sort_order)],
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
    await resetQuestionsToDefaults()
    const result = await pool.query('SELECT * FROM quiz_questions ORDER BY id')
    res.json({ ok: true, questions: result.rows.map((question) => ({
      ...question,
      sectionId: question.section_id || question.sectionId || 'section-1',
    })) })
  } catch (error) {
    if (isRlsPermissionError(error)) {
      return res.status(403).json({
        ok: false,
        error: 'Database reset is blocked by Supabase row-level security. Use a service-role connection or disable RLS for quiz_questions.',
      })
    }

    res.status(500).json({ ok: false, error: error.message })
  }
})

app.post('/api/results', async (req, res) => {
  try {
    const { name, email, score, total_questions, percentage, answers, section_id } = req.body || {}

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
        section_id: section_id || 'section-1',
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
