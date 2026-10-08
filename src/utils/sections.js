// Turns a heading into a URL-safe id: "✅ Fix with useCallback" → "fix-with-usecallback"
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Splits a markdown answer by its "## " headings → [{ label, slug, text }]
// text = the section's content in lowercase, used by search
export function getSections(markdown) {
  const sections = []
  let inCodeBlock = false

  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) inCodeBlock = !inCodeBlock

    if (!inCodeBlock && line.startsWith('## ')) {
      const label = line.slice(3).replace(/[`*]/g, '').trim() // drop markdown code/bold marks
      sections.push({ label, slug: slugify(label), text: '' })
    } else if (sections.length) {
      sections[sections.length - 1].text += line.toLowerCase() + '\n'
    }
  }

  return sections
}
