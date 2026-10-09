// Every HTML/CSS practice page starts with this small reset (like most real projects)
export const BASE_CSS = `*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }`

export function buildDocument(html, css) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${BASE_CSS}</style>
<style>${css}</style>
</head>
<body>${html}</body>
</html>`
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))

// Loads the page into a hidden, sandboxed iframe (scripts can't run) and runs each check.
// A check is { label, run } where `run` is the body of an async function receiving:
//   doc          the page's document
//   win          its window (e.g. win.getComputedStyle)
//   setViewport  async (width) → resizes the hidden page, so media queries apply
// It returns true to pass, or a string explaining what's wrong.
export async function runHtmlChecks(srcdoc, checks) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('sandbox', 'allow-same-origin')
  Object.assign(iframe.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '800px',
    height: '600px',
    border: '0',
    visibility: 'hidden',
  })
  iframe.srcdoc = srcdoc

  const loaded = new Promise((resolve) => (iframe.onload = resolve))
  document.body.appendChild(iframe)

  try {
    await loaded
    const doc = iframe.contentDocument
    const win = iframe.contentWindow
    const setViewport = async (width) => {
      iframe.style.width = `${width}px`
      await nextFrame()
    }

    const results = []
    for (const check of checks) {
      try {
        await setViewport(800)
        const output = await new Function('doc', 'win', 'setViewport', `return (async () => {\n${check.run}\n})()`)(
          doc,
          win,
          setViewport
        )
        results.push({
          pass: output === true,
          message: typeof output === 'string' ? output : output === true ? '' : 'Not quite yet.',
        })
      } catch (error) {
        results.push({ pass: false, message: `${error.name}: ${error.message}` })
      }
    }
    return results
  } finally {
    iframe.remove()
  }
}
