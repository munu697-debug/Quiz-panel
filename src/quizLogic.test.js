import test from 'node:test'
import assert from 'node:assert/strict'
import { filterQuestionsBySection } from './quizLogic.js'

test('section filtering keeps only questions that belong to the selected section', () => {
  const questions = [
    { id: 'q1', sectionId: 'section-a', prompt: 'A' },
    { id: 'q2', sectionId: 'section-b', prompt: 'B' },
    { id: 'q3', sectionId: 'section-a', prompt: 'C' },
    { id: 'q4', prompt: 'Default', },
  ]

  const selected = filterQuestionsBySection(questions, 'section-b', 'section-a')
  assert.deepEqual(selected.map((question) => question.id), ['q2'])
})
