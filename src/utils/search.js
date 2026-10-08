// Finds questions where every typed word appears in the title, a tag, or the answer.
// "arr" → matches "arrow functions", "array", ...
// Returns [{ question, matchedSlugs }] with title matches first.
export function searchQuestions(questions, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return questions.map((question) => ({ question, matchedSlugs: [] }))
  }

  const results = []

  for (const question of questions) {
    const title = question.title.toLowerCase()
    const everything = title + '\n' + question.content.toLowerCase()
    if (!words.every((word) => everything.includes(word))) continue

    // sections that contain any of the words → highlighted tags
    const matchedSlugs = question.sections
      .filter((s) => words.some((word) => s.label.toLowerCase().includes(word) || s.text.includes(word)))
      .map((s) => s.slug)

    const inTitle = words.some((word) => title.includes(word))
    results.push({ question, matchedSlugs, inTitle })
  }

  // title matches first, then the rest in their normal order
  return results.sort((a, b) => b.inTitle - a.inTitle)
}
