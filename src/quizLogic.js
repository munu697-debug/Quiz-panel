export const filterQuestionsBySection = (questions = [], selectedSectionId, fallbackSectionId = 'section-1') => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return []
  }

  const safeSelectedSectionId = selectedSectionId || fallbackSectionId

  return questions.filter((question) => {
    if (!question || typeof question !== 'object') return false
    const sectionValue = question.sectionId || question.section_id
    if (!sectionValue) {
      return safeSelectedSectionId === fallbackSectionId
    }

    return sectionValue === safeSelectedSectionId
  })
}
