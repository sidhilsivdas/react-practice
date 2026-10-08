// Turns a heading into a URL-safe id: "✅ Fix with useCallback" → "fix-with-usecallback"
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Reads the "## " headings of a markdown answer → [{ label, slug }]
export function getSections(markdown) {
  const sections = []
  let inCodeBlock = false

  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) inCodeBlock = !inCodeBlock
    if (inCodeBlock || !line.startsWith('## ')) continue

    const label = line.slice(3).replace(/[`*]/g, '').trim() // drop markdown code/bold marks
    sections.push({ label, slug: slugify(label) })
  }

  return sections
}
