import { useEffect, useMemo, useState } from 'react'
import { filterQuestionsBySection } from './quizLogic.js'
import './App.css'

const DEFAULT_QUIZ_QUESTIONS = [
  {
    id: 'q1',
    number: 1,
    sectionId: 'section-1',
    prompt: 'A landing page has a logo at the top, links to Home, About, Pricing, and a Get Started button. Which part is this?',
    options: ['Navigation structure', 'Content section', 'Footer structure', 'Dashboard structure'],
    correct: 'Navigation structure',
  },
  {
    id: 'q2',
    number: 2,
    sectionId: 'section-1',
    prompt: 'A product page shows a large product image, product name, price, short description, and Buy Now button together. What is this grouping best called?',
    options: ['Footer', 'Navigation bar', 'Product card', 'Login form'],
    correct: 'Product card',
  },
  {
    id: 'q3',
    number: 3,
    sectionId: 'section-1',
    prompt: 'A website looks beautiful, but users cannot easily find the main Book Appointment button. What is the biggest problem?',
    options: ['Poor database design', 'Poor user experience', 'Poor domain setup', 'Poor server structure'],
    correct: 'Poor user experience',
  },
  {
    id: 'q4',
    number: 4,
    sectionId: 'section-1',
    prompt: 'A page has a huge heading, a smaller description, and one highly visible primary button. Which UI principle is being used?',
    options: ['Database normalization', 'User authentication', 'Visual hierarchy', 'Server hosting'],
    correct: 'Visual hierarchy',
  },
  {
    id: 'q5',
    number: 5,
    sectionId: 'section-1',
    prompt: 'On desktop, four course cards appear in one row. On mobile, they become one card per row. Why?',
    options: ['Responsive layout', 'Dynamic content', 'Website navigation', 'Database structure'],
    correct: 'Responsive layout',
  },
  {
    id: 'q6',
    number: 6,
    sectionId: 'section-1',
    prompt: 'Which checkout flow is most logical for an online store?',
    options: ['Payment → Product → Cart → Confirmation → Checkout', 'Product → Cart → Checkout → Payment → Confirmation', 'Confirmation → Product → Payment → Cart → Checkout', 'Cart → Confirmation → Product → Checkout → Payment'],
    correct: 'Product → Cart → Checkout → Payment → Confirmation',
  },
  {
    id: 'q7',
    number: 7,
    sectionId: 'section-1',
    prompt: 'You must choose between two mobile login designs. Design A: Tiny text and a small Login button. Design B: Readable text, clear spacing, and an easy-to-tap button. Which is better?',
    options: ['Design B', 'Design A', 'Both are equally usable', 'Neither needs mobile design'],
    correct: 'Design B',
  },
  {
    id: 'q8',
    number: 8,
    sectionId: 'section-1',
    prompt: 'A dashboard has sidebar navigation, a welcome message, statistics cards, recent activity, and quick action buttons. Which statement is best?',
    options: ['It combines information and actions', 'It is only a landing page', 'It is only a navigation bar', 'It is only a database'],
    correct: 'It combines information and actions',
  },
  {
    id: 'q9',
    number: 9,
    sectionId: 'section-1',
    prompt: 'Two buttons perform different actions. One is blue and filled, while the other is light and less prominent. Why might this be good UI?',
    options: ['It creates action hierarchy', 'It removes user flow', 'It stores more data', 'It changes the domain'],
    correct: 'It creates action hierarchy',
  },
  {
    id: 'q10',
    number: 10,
    sectionId: 'section-1',
    prompt: 'A website works well on desktop, but on mobile the menu overlaps text, buttons go off-screen, and cards are cut off. What should be improved first?',
    options: ['Footer content', 'Database security', 'Domain naming', 'Responsive design'],
    correct: 'Responsive design',
  },
]

const STORAGE_QUESTIONS_KEY = 'quiz-custom-questions'
const STORAGE_SECTIONS_KEY = 'quiz-sections'
const STORAGE_PENDING_APPROVALS_KEY = 'quiz-pending-approvals'
const STORAGE_APPROVED_EMAILS_KEY = 'quiz-approved-emails'
const ADMIN_CODE = 'Demo@7078'
const LEGACY_QUESTION_PROMPTS = [
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
      const hasLegacyQuestion = saved.some((question) =>
        typeof question?.prompt === 'string' && LEGACY_QUESTION_PROMPTS.includes(question.prompt),
      )

      if (hasLegacyQuestion) {
        localStorage.setItem(STORAGE_QUESTIONS_KEY, JSON.stringify(DEFAULT_QUIZ_QUESTIONS))
        return DEFAULT_QUIZ_QUESTIONS
      }

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

const getSections = () => {
  if (typeof window === 'undefined') return [{ id: 'section-1', heading: 'Section 1: Web Fundamentals', description: 'Please stay focused and keep the tab active while answering.' }]

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_SECTIONS_KEY) || 'null')
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map((section, index) => ({
        id: section.id || `section-${index + 1}`,
        heading: section.heading || `Section ${index + 1}`,
        description: section.description || 'Please stay focused and keep the tab active while answering.',
      }))
    }
  } catch {
    // fall back to default sections
  }

  return [{ id: 'section-1', heading: 'Section 1: Web Fundamentals', description: 'Please stay focused and keep the tab active while answering.' }]
}

const saveSections = (sections) => {
  localStorage.setItem(STORAGE_SECTIONS_KEY, JSON.stringify(sections))
}

const getPendingApprovals = () => {
  if (typeof window === 'undefined') return []

  try {
    return JSON.parse(localStorage.getItem(STORAGE_PENDING_APPROVALS_KEY) || '[]')
  } catch {
    return []
  }
}

const savePendingApprovals = (items) => {
  localStorage.setItem(STORAGE_PENDING_APPROVALS_KEY, JSON.stringify(items))
}

const getApprovedEmails = () => {
  if (typeof window === 'undefined') return []

  try {
    return JSON.parse(localStorage.getItem(STORAGE_APPROVED_EMAILS_KEY) || '[]')
  } catch {
    return []
  }
}

const saveApprovedEmails = (items) => {
  localStorage.setItem(STORAGE_APPROVED_EMAILS_KEY, JSON.stringify(items))
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
  sectionId: question.sectionId || question.section_id || 'section-1',
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
  const [sections, setSections] = useState(getSections)
  const [selectedSectionId, setSelectedSectionId] = useState(getSections()[0]?.id || 'section-1')
  const [pendingApprovals, setPendingApprovals] = useState(getPendingApprovals)
  const [securityWarningCount, setSecurityWarningCount] = useState(0)
  const [securityNotice, setSecurityNotice] = useState('')
  const [quizSuspended, setQuizSuspended] = useState(false)
  const [newSectionHeading, setNewSectionHeading] = useState('')
  const [sectionError, setSectionError] = useState('')
  const [sectionSuccess, setSectionSuccess] = useState('')

  const activeSection = sections.find((section) => section.id === selectedSectionId) || sections[0] || { id: 'section-1', heading: 'Section 1: Web Fundamentals', description: 'Please stay focused and keep the tab active while answering.' }
  const visibleQuestions = useMemo(
    () => filterQuestionsBySection(questions, selectedSectionId, activeSection.id),
    [questions, selectedSectionId, activeSection.id],
  )

  useEffect(() => {
    setSelectedSectionId((current) => {
      if (current && sections.some((section) => section.id === current)) return current
      return sections[0]?.id || 'section-1'
    })
  }, [sections])

  useEffect(() => {
    if (route !== '/quiz') return
    if (!name || !email || quizSuspended) return

    const registerSecurityWarning = (message) => {
      setSecurityWarningCount((previousCount) => {
        const nextCount = previousCount + 1
        setSecurityNotice(`${message} Warning ${nextCount} of 3.`)

        if (nextCount >= 3) {
          const approvals = getPendingApprovals()
          const nextApprovals = [
            ...approvals,
            {
              id: Date.now(),
              name: name.trim(),
              email: email.trim().toLowerCase(),
              heading: activeSection.heading,
              createdAt: new Date().toISOString(),
            },
          ]
          savePendingApprovals(nextApprovals)
          setPendingApprovals(nextApprovals)
          setQuizSuspended(true)
          setSecurityNotice('Quiz closed automatically after three warnings. An admin must approve continued access before the user can resume.')
        }

        return nextCount
      })
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerSecurityWarning('The quiz tab was left while the assessment was in progress.')
      }
    }

    const handleBlur = () => {
      registerSecurityWarning('The window lost focus while the assessment was active.')
    }

    const handleKeyDown = (event) => {
      if (event.getModifierState && event.getModifierState('CapsLock')) {
        registerSecurityWarning('Caps Lock was activated during the assessment.')
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeSection.heading, email, name, quizSuspended, route])

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
          const hasLegacyQuestion = normalizedQuestions.some((question) =>
            LEGACY_QUESTION_PROMPTS.includes(question.prompt),
          )

          const nextQuestions = hasLegacyQuestion ? DEFAULT_QUIZ_QUESTIONS : normalizedQuestions
          setQuestions(nextQuestions)
          saveQuizQuestions(nextQuestions)
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

  const currentQuestion = visibleQuestions[currentIndex] || visibleQuestions[0]

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
      setResult(existingAttempt)
      setResultMatch(existingAttempt)
      setLookupEmail(trimmedEmail)
      setLookupError('')
      navigate('/result')
      return
    }

    const pendingApproval = getPendingApprovals().find(
      (approval) => approval.email === trimmedEmail && !approval.approved,
    )

    if (pendingApproval) {
      const approvedEmails = getApprovedEmails()
      if (!approvedEmails.includes(trimmedEmail)) {
        setStartError('This attempt is waiting for admin approval after a security warning. Please try again after approval.')
        return
      }
    }

    setAnswers({})
    setCurrentIndex(0)
    setResult(null)
    setResultMatch(null)
    setSecurityWarningCount(0)
    setSecurityNotice('')
    setQuizSuspended(false)
    navigate('/quiz')
  }

  const submitAnswer = (option) => {
    const questionId = currentQuestion.id
    setAnswers((previous) => ({ ...previous, [questionId]: option }))
  }

  const goNext = () => {
    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex((index) => index + 1)
    }
  }

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((index) => index - 1)
    }
  }

  const finishQuiz = async () => {
    if (!visibleQuestions.length) return

    const answerList = visibleQuestions.map((question) => ({
      questionId: question.id,
      selectedOption: answers[question.id] || 'No answer',
      isCorrect: answers[question.id] === question.correct,
    }))

    const score = answerList.filter((answer) => answer.isCorrect).length
    const percentage = (score / visibleQuestions.length) * 100
    const attempt = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      score,
      totalQuestions: visibleQuestions.length,
      percentage,
      answers: answerList,
      sectionId: activeSection.id,
      sectionHeading: activeSection.heading,
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
          section_id: attempt.sectionId,
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
        headers: {
          'X-Admin-Code': ADMIN_CODE,
        },
      })
      const normalizedQuestions = (data.questions || []).map((question, index) => normalizeQuestion(question, index))
      setQuestions(normalizedQuestions)
      saveQuizQuestions(normalizedQuestions)
    } catch (error) {
      setQuestions(DEFAULT_QUIZ_QUESTIONS)
      saveQuizQuestions(DEFAULT_QUIZ_QUESTIONS)
    }
  }

  const approvePendingAccess = (approvalId) => {
    const approvals = getPendingApprovals().map((approval) =>
      approval.id === approvalId ? { ...approval, approved: true } : approval,
    )
    const approvedEmails = new Set(getApprovedEmails())
    const approvedApproval = approvals.find((approval) => approval.id === approvalId)
    if (approvedApproval) {
      approvedEmails.add(approvedApproval.email)
      saveApprovedEmails([...approvedEmails])
    }
    savePendingApprovals(approvals.filter((approval) => approval.id !== approvalId))
    setPendingApprovals(approvals.filter((approval) => approval.id !== approvalId))
  }

  const deleteSection = async (sectionId) => {
    const targetSection = sections.find((section) => section.id === sectionId)
    if (!targetSection) return

    const nextSections = sections.filter((section) => section.id !== sectionId)
    try {
      await fetchJson(`http://localhost:3001/api/sections/${encodeURIComponent(targetSection.id)}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Code': ADMIN_CODE,
        },
      })
    } catch (error) {
      console.error('Delete section failed', error)
      setSectionError('This section could not be deleted from the database.')
      return
    }

    setSections(nextSections)
    saveSections(nextSections)
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(nextSections[0]?.id || 'section-1')
    }
    setSectionError('')
    setSectionSuccess(`Section deleted successfully: ${targetSection.heading}`)
  }

  const addSection = (event) => {
    event.preventDefault()
    const trimmedHeading = newSectionHeading.trim()

    if (!trimmedHeading) {
      setSectionError('Add a section heading before saving it.')
      setSectionSuccess('')
      return
    }

    const nextSections = [
      ...sections,
      {
        id: `section-${Date.now()}`,
        heading: trimmedHeading,
        description: 'Please stay focused and keep the tab active while answering.',
      },
    ]

    setSections(nextSections)
    saveSections(nextSections)
    setSelectedSectionId(nextSections[nextSections.length - 1].id)
    setNewSectionHeading('')
    setSectionError('')
    setSectionSuccess('Section heading saved successfully.')
  }

  const syncQuestionToDb = async (nextQuestions) => {
    try {
      await fetchJson('http://localhost:3001/api/questions', {
        method: 'POST',
        headers: {
          'X-Admin-Code': ADMIN_CODE,
        },
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

  const addQuestionOption = () => {
    setNewQuestion((previous) => ({
      ...previous,
      options: [...previous.options, ''],
    }))
  }

  const removeQuestionOption = (index) => {
    setNewQuestion((previous) => {
      if (previous.options.length <= 2) {
        return previous
      }

      const nextOptions = previous.options.filter((_, optionIndex) => optionIndex !== index)
      const nextCorrect = previous.correct && nextOptions.includes(previous.correct) ? previous.correct : nextOptions[0] || ''

      return {
        ...previous,
        options: nextOptions,
        correct: nextCorrect,
      }
    })
  }

  const deleteQuestion = async (questionId) => {
    try {
      await fetchJson(`http://localhost:3001/api/questions/${encodeURIComponent(questionId)}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Code': ADMIN_CODE,
        },
      })

      const nextQuestions = questions.filter((question) => String(question.id) !== String(questionId))
      setQuestions(nextQuestions)
      saveQuizQuestions(nextQuestions)
      setQuestionError('')
      setQuestionSuccess('Question deleted successfully.')
    } catch (error) {
      console.error('Delete question failed', error)
      setQuestionError('This question could not be deleted from the database.')
      setQuestionSuccess('')
    }
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

    if (cleanedOptions.length < 2) {
      setQuestionError('Each question needs at least two answer options.')
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
      sectionId: selectedSectionId,
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
        <span className="brand-mark" aria-label="Web Fundamentals logo">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <rect x="8" y="8" width="48" height="48" rx="14" fill="currentColor" opacity="0.18" />
            <path d="M18 35.5L28.5 46L46 26.5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 16H44V26H20z" fill="currentColor" opacity="0.18" />
          </svg>
        </span>
        <span className="brand-copy">
          <span className="brand-kicker">WEB FUNDAMENTALS</span>
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

                  <div className="table-card compact-table">
                    <h2>Attempt summary</h2>
                    <div className="question-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Section</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedAttempts.length === 0 ? (
                            <tr>
                              <td colSpan="4">No attempts yet.</td>
                            </tr>
                          ) : (
                            completedAttempts.slice().reverse().map((attempt) => (
                              <tr key={attempt.id}>
                                <td>{attempt.name}</td>
                                <td>{attempt.email}</td>
                                <td>{attempt.sectionHeading || attempt.section || 'General'}</td>
                                <td className={attempt.percentage >= 70 ? 'status pass' : 'status'}>
                                  {attempt.percentage >= 70 ? 'Pass' : 'Review'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <form className="quiz-builder-form" onSubmit={addSection}>
                    <label className="field">
                      <span>Section heading</span>
                      <input
                        type="text"
                        value={newSectionHeading}
                        onChange={(event) => setNewSectionHeading(event.target.value)}
                        placeholder="e.g. Section 2: UI Design Principles"
                      />
                    </label>

                    {sectionError && <p className="form-error">{sectionError}</p>}
                    {sectionSuccess && <p className="success-message">{sectionSuccess}</p>}

                    <button type="submit" className="primary-button admin-button">
                      Add section heading
                      <span aria-hidden="true">＋</span>
                    </button>
                  </form>

                  <div className="section-list">
                    {sections.map((section) => (
                      <div key={section.id} className={selectedSectionId === section.id ? 'section-card selected' : 'section-card'}>
                        <div>
                          <p className="eyebrow muted">Section</p>
                          <h3>{section.heading}</h3>
                        </div>
                        <div className="inline-button-group">
                          <button type="button" className="secondary-button small-button" onClick={() => setSelectedSectionId(section.id)}>
                            {selectedSectionId === section.id ? 'Selected' : 'Open'}
                          </button>
                          <button type="button" className="secondary-button small-button danger-button" onClick={() => deleteSection(section.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="question-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Question</th>
                          <th>Section</th>
                          <th>Correct answer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.filter((question) => question.sectionId === selectedSectionId || (!question.sectionId && selectedSectionId === 'section-1')).map((question, index) => (
                          <tr key={question.id}>
                            <td>{index + 1}</td>
                            <td>{question.prompt}</td>
                            <td>{sections.find((section) => section.id === (question.sectionId || selectedSectionId))?.heading || 'Section 1'}</td>
                            <td>
                              <div className="inline-button-group">
                                <span>{question.correct}</span>
                                <button type="button" className="secondary-button small-button danger-button" onClick={() => deleteQuestion(question.id)}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <form className="quiz-builder-form" onSubmit={addQuestion}>
                    <label className="field">
                      <span>Question section</span>
                      <select
                        value={selectedSectionId}
                        onChange={(event) => setSelectedSectionId(event.target.value)}
                      >
                        {sections.map((section) => (
                          <option key={section.id} value={section.id}>{section.heading}</option>
                        ))}
                      </select>
                    </label>

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
                        <div className="option-input-row" key={`option-${index}`}>
                          <label className="field">
                            <span>Option {index + 1}</span>
                            <input
                              type="text"
                              value={option}
                              onChange={(event) => handleNewQuestionInput(index, event.target.value)}
                              placeholder={`Option ${index + 1}`}
                            />
                          </label>
                          <button
                            type="button"
                            className="secondary-button small-button danger-button"
                            onClick={() => removeQuestionOption(index)}
                            disabled={newQuestion.options.length <= 2}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <button type="button" className="secondary-button small-button" onClick={addQuestionOption}>
                      Add option
                    </button>

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
    if (!visibleQuestions.length) {
      return (
        <main className="page-shell">
          {renderHeader('/')} 
          <section className="quiz-page">
            <div className="locked-panel">
              <p className="eyebrow">Section empty</p>
              <h1>No questions available in this section yet.</h1>
              <p>Choose another section or ask the admin to add a question for this part of the quiz.</p>
              <div className="locked-actions">
                <button type="button" className="secondary-button" onClick={() => navigate('/')}>Return home</button>
              </div>
            </div>
          </section>
        </main>
      )
    }

    const selectedOption = answers[currentQuestion.id]
    const isLastQuestion = currentIndex === visibleQuestions.length - 1
    const answeredCount = Object.keys(answers).length

    if (quizSuspended) {
      return (
        <main className="page-shell">
          {renderHeader('/')}
          <section className="quiz-page">
            <div className="locked-panel">
              <p className="eyebrow">Assessment paused</p>
              <h1>Quiz temporarily closed for review.</h1>
              <p>
                {securityNotice || 'The quiz was interrupted and requires admin approval before it can resume.'}
              </p>
              <div className="locked-actions">
                <button type="button" className="secondary-button" onClick={() => navigate('/')}>
                  Return home
                </button>
              </div>
            </div>
          </section>
        </main>
      )
    }

    return (
      <main className="page-shell">
        {renderHeader()}
        <section className="quiz-page">
          <div className="quiz-section-banner">
            <p className="eyebrow">Current section</p>
            <h3>{activeSection.heading}</h3>
          </div>

          {securityNotice && (
            <div className="security-banner">
              <strong>Warning:</strong> {securityNotice}
            </div>
          )}

          <div className="progress-wrap">
            <div>
              <p className="eyebrow">Web fundamentals / checkpoint</p>
              <p className="progress-caption">{answeredCount} of {questions.length} answered</p>
            </div>
            <span className="question-number">{String(currentQuestion.number).padStart(2, '0')}</span>
          </div>

          <div className="progress-bar">
            <span style={{ width: `${((currentIndex + 1) / visibleQuestions.length) * 100}%` }} />
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

  const existingAttemptForEmail = email.trim() ? getAttempts().find((attempt) => attempt.email.toLowerCase() === email.trim().toLowerCase()) : null

  return (
    <main className="page-shell">
      {renderHeader('/')}
      <section className="landing-shell">
        <div className="landing-copy">
          <div className="pill">10 questions · one clear signal</div>
          <h1>
            <span>Make your</span><br />
            <span className="highlight">next move</span><br />
            <span>obvious.</span>
          </h1>
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
            <div className="section-panel">
              <p className="eyebrow muted">Available section</p>
              {sections.map((section) => (
                <div key={section.id} className={selectedSectionId === section.id ? 'section-card landing selected' : 'section-card landing'}>
                  <div>
                    <strong>{section.heading}</strong>
                    <p>{section.description}</p>
                  </div>
                  <button type="button" className="secondary-button small-button" onClick={() => setSelectedSectionId(section.id)}>
                    {selectedSectionId === section.id ? 'Opened' : 'Open'}
                  </button>
                </div>
              ))}
            </div>

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
                <strong>{existingAttemptForEmail ? 'Continue to result' : 'Begin checkpoint'}</strong>
                <small>{existingAttemptForEmail ? 'This email already has a completed attempt' : 'About 4 minutes · one attempt'}</small>
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
