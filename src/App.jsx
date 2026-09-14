import { useEffect, useMemo, useState } from 'react'
import './App.css'

const DEFAULT_QUIZ_QUESTIONS = [
  {
    id: 'q1',
    number: 1,
    prompt: 'Which HTML element is the best choice for the main content region of a page?',
    options: ['<section>', '<main>', '<article>', '<div>'],
    correct: '<main>',
  },
  {
    id: 'q2',
    number: 2,
    prompt: 'In CSS, which property controls the space between the border and the content inside an element?',
    options: ['padding', 'margin', 'gap', 'border-spacing'],
    correct: 'padding',
  },
  {
    id: 'q3',
    number: 3,
    prompt: 'Which JavaScript declaration keeps a value from being reassigned?',
    options: ['let', 'var', 'const', 'function'],
    correct: 'const',
  },
  {
    id: 'q4',
    number: 4,
    prompt: 'Which DOM API selects the first matching element in the document?',
    options: ['document.find()', 'document.querySelector()', 'document.getElementById()', 'document.match()'],
    correct: 'document.querySelector()',
  },
  {
    id: 'q5',
    number: 5,
    prompt: 'What is the most common method to fetch JSON data from a server in the browser?',
    options: ['Image()', 'fetch()', 'setTimeout()', 'XMLHttpRequest()'],
    correct: 'fetch()',
  },
  {
    id: 'q6',
    number: 6,
    prompt: 'Which accessibility attribute is most important for an informative image?',
    options: ['aria-label', 'alt text', 'title', 'tabindex'],
    correct: 'alt text',
  },
  {
    id: 'q7',
    number: 7,
    prompt: 'Why is rel="noopener noreferrer" often added to external links opened in a new tab?',
    options: ['It makes them load faster', 'It prevents security issues and tabnabbing', 'It hides the link from search engines', 'It forces the browser to cache them'],
    correct: 'It prevents security issues and tabnabbing',
  },
  {
    id: 'q8',
    number: 8,
    prompt: 'Which CSS layout tool is best for aligning items in rows or columns with responsive spacing?',
    options: ['position: absolute', 'display: flex', 'text-align: center', 'float: left'],
    correct: 'display: flex',
  },
  {
    id: 'q9',
    number: 9,
    prompt: 'A server returns HTTP 404. What does that usually mean?',
    options: ['The request was successful', 'The resource was not found', 'The server is overloaded', 'The page is being redirected'],
    correct: 'The resource was not found',
  },
  {
    id: 'q10',
    number: 10,
    prompt: 'Which approach best supports mobile-friendly layouts on modern websites?',
    options: ['Fixed 1200px widths everywhere', 'Responsive design with flexible layouts and media queries', 'Only using large desktop screenshots', 'Turning off CSS entirely on small screens'],
    correct: 'Responsive design with flexible layouts and media queries',
  },
]

const STORAGE_QUESTIONS_KEY = 'quiz-custom-questions'
const ADMIN_CODE = 'Demo@7078'

const fetchJson = async (url, options) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

const getQuizQuestions = () => {
  if (typeof window === 'undefined') return DEFAULT_QUIZ_QUESTIONS

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_QUESTIONS_KEY) || 'null')
    if (Array.isArray(saved) && saved.length > 0) {
      return saved
    }
  } catch {
    // fall back to default questions
  }

  return DEFAULT_QUIZ_QUESTIONS
}

const saveQuizQuestions = (questions) => {
  localStorage.setItem(STORAGE_QUESTIONS_KEY, JSON.stringify(questions))
}

const getAttempts = () => {
  if (typeof window === 'undefined') return []

  try {
    return JSON.parse(localStorage.getItem('quiz-attempts') || '[]')
  } catch {
    return []
  }
}

const saveAttempts = (attempts) => {
  localStorage.setItem('quiz-attempts', JSON.stringify(attempts))
}

const getCurrentPath = () => {
  if (typeof window === 'undefined') return '/'
  return window.location.pathname || '/'
}

const normalizeQuestion = (question, index) => ({
  id: `q${question.id || index + 1}`,
  number: index + 1,
  prompt: question.prompt,
  options: Array.isArray(question.options) ? question.options : JSON.parse(question.options || '[]'),
  correct: question.correct,
})

function App() {
  const [route, setRoute] = useState(getCurrentPath)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [startError, setStartError] = useState('')
  const [answers, setAnswers] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [lookupEmail, setLookupEmail] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [resultMatch, setResultMatch] = useState(null)
  const [adminCode, setAdminCode] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [questions, setQuestions] = useState(getQuizQuestions)
  const [attempts, setAttempts] = useState([])
  const [newQuestion, setNewQuestion] = useState({
    prompt: '',
    options: ['', '', '', ''],
    correct: '',
  })
  const [questionError, setQuestionError] = useState('')
  const [questionSuccess, setQuestionSuccess] = useState('')
  const [dbStatus, setDbStatus] = useState('checking')

  useEffect(() => {
    const onLocationChange = () => setRoute(getCurrentPath())
    window.addEventListener('popstate', onLocationChange)
    return () => window.removeEventListener('popstate', onLocationChange)
  }, [])

  useEffect(() => {
    const checkDb = async () => {
      try {
        await fetchJson('http://localhost:3001/api/health')
        setDbStatus('connected')
      } catch {
        setDbStatus('offline')
      }
    }

    const loadQuestions = async () => {
      try {
        const data = await fetchJson('http://localhost:3001/api/questions')
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          const normalizedQuestions = data.questions.map((question, index) => normalizeQuestion(question, index))
          setQuestions(normalizedQuestions)
          saveQuizQuestions(normalizedQuestions)
        }
      } catch {
        setQuestions(getQuizQuestions())
      }
    }

    const loadAttempts = async () => {
      try {
        const data = await fetchJson('http://localhost:3001/api/results')
        if (Array.isArray(data.results)) {
          const normalizedAttempts = data.results.map((attempt) => ({
            ...attempt,
            id: Number(attempt.id),
            score: Number(attempt.score),
            totalQuestions: Number(attempt.total_questions || attempt.totalQuestions || 0),
            percentage: Number(attempt.percentage || 0),
            answers: Array.isArray(attempt.answers) ? attempt.answers : JSON.parse(attempt.answers || '[]'),
            createdAt: attempt.created_at || attempt.createdAt || new Date().toISOString(),
          }))
          setAttempts(normalizedAttempts)
          saveAttempts(normalizedAttempts)
        }
      } catch {
        setAttempts(getAttempts())
      }
    }

    checkDb()
    loadQuestions()
    loadAttempts()
  }, [])

  const navigate = (nextPath) => {
    window.history.pushState({}, '', nextPath)
    setRoute(nextPath)
  }

  const currentQuestion = questions[currentIndex] || questions[0]

  useEffect(() => {
    if (route !== '/result') return
    if (!lookupEmail && result) {
      setResultMatch(result)
      return
    }

    const match = getAttempts().find(
      (attempt) => attempt.email.toLowerCase() === lookupEmail.trim().toLowerCase(),
    )
    setResultMatch(match || null)
  }, [lookupEmail, route, result])

  const startQuiz = (event) => {
    event.preventDefault()
    setStartError('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedName) {
      setStartError('Add your name so we can put it on your checkpoint.')
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setStartError('That email does not look quite right yet.')
      return
    }

    const existingAttempt = getAttempts().find(
      (attempt) => attempt.email.toLowerCase() === trimmedEmail,
    )

    if (existingAttempt) {
      setStartError('This email already has a completed checkpoint. Use “Find my result” to review it.')
      return
    }

    setAnswers({})
    setCurrentIndex(0)
    setResult(null)
    setResultMatch(null)
    navigate('/quiz')
  }

  const submitAnswer = (option) => {
    const questionId = currentQuestion.id
    setAnswers((previous) => ({ ...previous, [questionId]: option }))
  }

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1)
    }
  }

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((index) => index - 1)
    }
  }

  const finishQuiz = async () => {
    if (!questions.length) return

    const answerList = questions.map((question) => ({
      questionId: question.id,
      selectedOption: answers[question.id] || 'No answer',
      isCorrect: answers[question.id] === question.correct,
    }))

    const score = answerList.filter((answer) => answer.isCorrect).length
    const percentage = (score / questions.length) * 100
    const attempt = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      score,
      totalQuestions: questions.length,
      percentage,
      answers: answerList,
      createdAt: new Date().toISOString(),
    }

    try {
      await fetchJson('http://localhost:3001/api/results', {
        method: 'POST',
        body: JSON.stringify({
          name: attempt.name,
          email: attempt.email,
          score: attempt.score,
          total_questions: attempt.totalQuestions,
          percentage: attempt.percentage,
          answers: attempt.answers,
        }),
      })
    } catch (error) {
      console.error('Save result failed', error)
    }

    const nextAttempts = [...getAttempts(), attempt]
    setAttempts(nextAttempts)
    saveAttempts(nextAttempts)
    setResult(attempt)
    setResultMatch(attempt)
    setLookupEmail(attempt.email)
    navigate('/result')
  }

  const lookupResult = (event) => {
    event.preventDefault()
    const trimmed = lookupEmail.trim().toLowerCase()

    if (!trimmed) {
      setLookupError('Enter a valid email to find your result.')
      return
    }

    const match = getAttempts().find((attempt) => attempt.email === trimmed)
    if (!match) {
      setLookupError('No result found for this email yet.')
      setResultMatch(null)
      return
    }

    setLookupError('')
    setResultMatch(match)
  }

  const submitAdminCode = (event) => {
    event.preventDefault()
    if (adminCode.trim() === ADMIN_CODE) {
      setAdminUnlocked(true)
      setAdminError('')
      return
    }

    setAdminError('The code is wrong. Please try again.')
  }

  const completedAttempts = attempts
  const averageScore =
    completedAttempts.length > 0
      ? Math.round(
          completedAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0) /
            completedAttempts.length,
        )
      : 0
  const passRate =
    completedAttempts.length > 0
      ? Math.round(
          (completedAttempts.filter((attempt) => attempt.percentage >= 70).length /
            completedAttempts.length) *
            100,
        )
      : 0

  const resetQuizQuestions = async () => {
    try {
      const data = await fetchJson('http://localhost:3001/api/questions/reset', {
        method: 'POST',
      })
      const normalizedQuestions = (data.questions || []).map((question, index) => normalizeQuestion(question, index))
      setQuestions(normalizedQuestions)
      saveQuizQuestions(normalizedQuestions)
    } catch (error) {
      setQuestions(DEFAULT_QUIZ_QUESTIONS)
      saveQuizQuestions(DEFAULT_QUIZ_QUESTIONS)
    }
  }

  const syncQuestionToDb = async (nextQuestions) => {
    try {
      await fetchJson('http://localhost:3001/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          prompt: nextQuestions.at(-1).prompt,
          options: nextQuestions.at(-1).options,
          correct: nextQuestions.at(-1).correct,
        }),
      })
    } catch (error) {
      console.error('Failed to sync question to DB', error)
    }
  }

  const handleNewQuestionInput = (index, value) => {
    setNewQuestion((previous) => ({
      ...previous,
      options: previous.options.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    }))
  }

  const addQuestion = (event) => {
    event.preventDefault()
    const trimmedPrompt = newQuestion.prompt.trim()
    const cleanedOptions = newQuestion.options.map((option) => option.trim()).filter(Boolean)

    if (!trimmedPrompt) {
      setQuestionError('Add a question prompt first.')
      setQuestionSuccess('')
      return
    }

    if (cleanedOptions.length !== 4) {
      setQuestionError('Each question needs exactly four answer options.')
      setQuestionSuccess('')
      return
    }

    const chosenCorrect = newQuestion.correct.trim()
    if (!chosenCorrect || !cleanedOptions.includes(chosenCorrect)) {
      setQuestionError('Choose a correct answer option from the list.')
      setQuestionSuccess('')
      return
    }

    const nextQuestion = {
      id: `q${Date.now()}`,
      number: questions.length + 1,
      prompt: trimmedPrompt,
      options: cleanedOptions,
      correct: chosenCorrect,
    }

    const nextQuestions = [...questions, nextQuestion]
    setQuestions(nextQuestions)
    saveQuizQuestions(nextQuestions)
    syncQuestionToDb(nextQuestions)
    setNewQuestion({ prompt: '', options: ['', '', '', ''], correct: '' })
    setQuestionError('')
    setQuestionSuccess('Question added successfully.')
  }

  const renderHeader = (highlight = '') => (
    <header className="topbar">
      <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }}>
        <span className="brand-mark">✓</span>
        <span className="brand-copy">
          <span className="brand-kicker">Web fundamentals</span>
          <span className="brand-title">Checkpoint</span>
        </span>
      </a>
      <nav className="main-nav">
        {route !== '/result' && (
          <a
            href="/result"
            className={highlight === '/result' ? 'nav-link active' : 'nav-link'}
            onClick={(event) => {
              event.preventDefault()
              navigate('/result')
            }}
          >
            Find my result
          </a>
        )}
        <a
          href="/admin"
          className={highlight === '/admin' ? 'nav-link admin active' : 'nav-link admin'}
          onClick={(event) => {
            event.preventDefault()
            navigate('/admin')
          }}
        >
          <span className="admin-icon">▣</span>
          <span>Admin</span>
        </a>
      </nav>
    </header>
  )

  if (route === '/admin') {
    return (
      <main className="page-shell">
        {renderHeader('/admin')}
        <section className="admin-page">
          <div className="admin-hero">
            <div className="admin-mark">▣</div>
            <p className="eyebrow">Private reporting space</p>
            <h1>See the signal<br />behind the scores.</h1>
            <p className="supporting-copy">
              Admin access gives you a clean view of participation, performance, and every completed checkpoint.
            </p>

            {!adminUnlocked ? (
              <form className="admin-form" onSubmit={submitAdminCode}>
                <label htmlFor="admin-code">Access code</label>
                <div className="input-wrap password-wrap">
                  <span className="input-icon">⌁</span>
                  <input
                    id="admin-code"
                    type="password"
                    value={adminCode}
                    onChange={(event) => setAdminCode(event.target.value)}
                    placeholder="Enter your code"
                  />
                </div>
                {adminError && <p className="form-error">{adminError}</p>}
                <button type="submit" className="primary-button admin-button">
                  Open reporting
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            ) : (
              <div className="admin-dashboard">
                <div className="stat-grid">
                  <div className="stat-card">
                    <p>Participants</p>
                    <strong>{completedAttempts.length}</strong>
                  </div>
                  <div className="stat-card">
                    <p>Average score</p>
                    <strong>{averageScore}%</strong>
                  </div>
                  <div className="stat-card">
                    <p>Pass rate</p>
                    <strong>{passRate}%</strong>
                  </div>
                  <div className="stat-card">
                    <p>Latest</p>
                    <strong>{completedAttempts.length ? `#${completedAttempts.at(-1).id}` : '—'}</strong>
                  </div>
                  <div className="stat-card">
                    <p>DB</p>
                    <strong>{dbStatus === 'connected' ? 'Live' : 'Offline'}</strong>
                  </div>
                </div>

                <div className="table-card">
                  <h2>Recent results</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Score</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedAttempts.length === 0 ? (
                        <tr>
                          <td colSpan="4">No completed checkpoints yet.</td>
                        </tr>
                      ) : (
                        completedAttempts.slice().reverse().map((attempt) => (
                          <tr key={attempt.id}>
                            <td>{attempt.name}</td>
                            <td>{attempt.email}</td>
                            <td>
                              {attempt.score}/{attempt.totalQuestions}
                            </td>
                            <td className={attempt.percentage >= 70 ? 'status pass' : 'status'}>
                              {attempt.percentage >= 70 ? 'Pass' : 'Review'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="table-card quiz-builder-card">
                  <div className="section-header-row">
                    <h2>Quiz management</h2>
                    <button type="button" className="secondary-button small-button" onClick={resetQuizQuestions}>
                      Reset demo questions
                    </button>
                  </div>

                  <div className="question-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Question</th>
                          <th>Correct answer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.map((question, index) => (
                          <tr key={question.id}>
                            <td>{index + 1}</td>
                            <td>{question.prompt}</td>
                            <td>{question.correct}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <form className="quiz-builder-form" onSubmit={addQuestion}>
                    <label className="field">
                      <span>Question prompt</span>
                      <textarea
                        value={newQuestion.prompt}
                        onChange={(event) => setNewQuestion((previous) => ({ ...previous, prompt: event.target.value }))}
                        rows="3"
                        placeholder="Type your question here..."
                      />
                    </label>

                    <div className="option-grid">
                      {newQuestion.options.map((option, index) => (
                        <label className="field" key={`option-${index}`}>
                          <span>Option {index + 1}</span>
                          <input
                            type="text"
                            value={option}
                            onChange={(event) => handleNewQuestionInput(index, event.target.value)}
                            placeholder={`Option ${index + 1}`}
                          />
                        </label>
                      ))}
                    </div>

                    <label className="field">
                      <span>Correct answer</span>
                      <select
                        value={newQuestion.correct}
                        onChange={(event) => setNewQuestion((previous) => ({ ...previous, correct: event.target.value }))}
                      >
                        <option value="">Select the correct answer</option>
                        {newQuestion.options.filter(Boolean).map((option, index) => (
                          <option key={`correct-${index}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    {questionError && <p className="form-error">{questionError}</p>}
                    {questionSuccess && <p className="success-message">{questionSuccess}</p>}

                    <button type="submit" className="primary-button admin-button">
                      Add question to quiz
                      <span aria-hidden="true">＋</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            <p className="meta-note">For instructors and program leads</p>
          </div>
        </section>
      </main>
    )
  }

  if (route === '/quiz') {
    const selectedOption = answers[currentQuestion.id]
    const isLastQuestion = currentIndex === questions.length - 1
    const answeredCount = Object.keys(answers).length

    return (
      <main className="page-shell">
        {renderHeader()}
        <section className="quiz-page">
          <div className="progress-wrap">
            <div>
              <p className="eyebrow">Web fundamentals / checkpoint</p>
              <p className="progress-caption">{answeredCount} of {questions.length} answered</p>
            </div>
            <span className="question-number">{String(currentQuestion.number).padStart(2, '0')}</span>
          </div>

          <div className="progress-bar">
            <span style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
          </div>

          <article className="question-card">
            <h2>{currentQuestion.prompt}</h2>
            <div className="option-list">
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={selectedOption === option ? 'option selected' : 'option'}
                  onClick={() => submitAnswer(option)}
                >
                  <span className="option-letter">{String.fromCharCode(65 + currentQuestion.options.indexOf(option))}</span>
                  <span>{option}</span>
                </button>
              ))}
            </div>

            <div className="question-actions">
              <button type="button" className="secondary-button" onClick={goBack} disabled={currentIndex === 0}>
                Back
              </button>
              {isLastQuestion ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={finishQuiz}
                  disabled={!selectedOption}
                >
                  Finish
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={goNext}
                  disabled={!selectedOption}
                >
                  Next
                </button>
              )}
            </div>
          </article>
        </section>
      </main>
    )
  }

  if (route === '/result') {
    const displayResult = resultMatch || result

    return (
      <main className="page-shell">
        {renderHeader('/result')}
        <section className="result-page">
          {!displayResult ? (
            <div className="result-card lookup-card">
              <p className="eyebrow">Find your checkpoint</p>
              <h1>Enter the email used for this attempt.</h1>
              <form className="lookup-form" onSubmit={lookupResult}>
                <div className="input-wrap">
                  <span className="input-icon">✉</span>
                  <input
                    type="email"
                    value={lookupEmail}
                    onChange={(event) => setLookupEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                {lookupError && <p className="form-error">{lookupError}</p>}
                <button type="submit" className="primary-button full-width">
                  View result
                </button>
              </form>
            </div>
          ) : (
            <div className="result-content">
              <div className={displayResult.percentage >= 70 ? 'overall-card pass' : 'overall-card review'}>
                <div className="status-line">
                  <span className="status-badge">{displayResult.percentage >= 70 ? '✓' : '•'}</span>
                  {displayResult.percentage >= 70 ? 'Checkpoint cleared' : 'Checkpoint complete'}
                </div>
                <h1>{displayResult.percentage >= 70 ? `Nice work, ${displayResult.name.split(' ')[0]}.` : `You made it through, ${displayResult.name.split(' ')[0]}.`}</h1>
                <p>
                  {displayResult.percentage >= 70
                    ? 'Your fundamentals are in a strong place. Keep the momentum going.'
                    : 'Every miss is a useful signal. Review the breakdown below and take another pass when you are ready.'}
                </p>

                <div className="stats-grid">
                  <div className="mini-stat">
                    <label>Score</label>
                    <strong>{displayResult.score}/{displayResult.totalQuestions}</strong>
                  </div>
                  <div className="mini-stat">
                    <label>Accuracy</label>
                    <strong>{Math.round(displayResult.percentage)}%</strong>
                  </div>
                  <div className="mini-stat">
                    <label>Status</label>
                    <strong className={displayResult.percentage >= 70 ? 'pass-text' : 'review-text'}>
                      {displayResult.percentage >= 70 ? 'Pass' : 'Review'}
                    </strong>
                  </div>
                  <div className="mini-stat">
                    <label>Attempt</label>
                    <strong>#{displayResult.id}</strong>
                  </div>
                </div>
              </div>

              <div className="review-panel">
                <div className="review-header">
                  <div>
                    <p className="eyebrow muted">Answer review</p>
                    <h2>What you showed</h2>
                  </div>
                  <span className="signal-count">{displayResult.answers.length} signals</span>
                </div>

                <div className="answer-list">
                  {displayResult.answers.map((answer, index) => (
                    <div className="answer-row" key={answer.questionId}>
                      <span className={answer.isCorrect ? 'status-bullet correct' : 'status-bullet'}>
                        {answer.isCorrect ? '✓' : '•'}
                      </span>
                      <div className="answer-copy">
                        <p>Question {index + 1}</p>
                        <span>{answer.selectedOption}</span>
                      </div>
                      <strong className={answer.isCorrect ? 'pass-text' : 'review-text'}>
                        {answer.isCorrect ? 'Correct' : 'Review'}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="result-actions">
                <button type="button" className="secondary-button" onClick={() => { setResult(null); setResultMatch(null); setLookupEmail(''); navigate('/result'); }}>
                  Try again
                </button>
                <button type="button" className="primary-button" onClick={() => navigate('/')}>
                  Start a new checkpoint
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell">
      {renderHeader('/')}
      <section className="landing-shell">
        <div className="landing-copy">
          <div className="pill">10 questions · one clear signal</div>
          <h1>Make your next move obvious.</h1>
          <p>
            A short web fundamentals checkpoint built to show you what is solid — and exactly what to sharpen next.
          </p>
          <div className="feature-list">
            <div className="feature-item">
              <span className="mini-icon">⚡</span>
              Instant completion score
            </div>
            <div className="feature-item">
              <span className="mini-icon">✓</span>
              No trick questions
            </div>
          </div>
        </div>

        <div className="card-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Ready when you are</p>
              <h2>Start your checkpoint</h2>
            </div>
            <span className="panel-icon">✦</span>
          </div>

          <form className="start-form" onSubmit={startQuiz}>
            <label className="field">
              <span>Your name</span>
              <div className="input-wrap">
                <span className="input-icon">◉</span>
                <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Morgan Lee" />
              </div>
            </label>

            <label className="field">
              <span>Email for your result</span>
              <div className="input-wrap">
                <span className="input-icon">✉</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              </div>
            </label>

            {startError && <p className="form-error">{startError}</p>}

            <button type="submit" className="primary-button full-width">
              <span>
                <strong>Begin checkpoint</strong>
                <small>About 4 minutes · one attempt</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </section>
      <p className="footer-note">Your email keeps attempts unique and results findable</p>
    </main>
  )
}

export default App
