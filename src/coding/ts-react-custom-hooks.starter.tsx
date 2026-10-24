import { useState } from 'react'

// 1. Returns [on, toggle]. Right now TypeScript sees an ARRAY of (boolean | (() => void)),
//    so `const [on, toggle] = useToggle()` gives both the same mixed type. Make it a tuple.
function useToggle(initial = false) {
  const [on, setOn] = useState(initial)
  const toggle = () => setOn((v) => !v)
  return [on, toggle]
}

// 2. Like useState, but saved in localStorage. Make it generic:
//    useLocalStorage('theme', 'dark') → [string, (value: string) => void]
function useLocalStorage(key: string, initial: any) {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key)
    return saved !== null ? JSON.parse(saved) : initial
  })

  function save(next: any) {
    setValue(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  return [value, save]
}

function Settings() {
  const [open, toggle] = useToggle()
  const [theme, setTheme] = useLocalStorage('theme', 'dark')
  return <button onClick={toggle}>{open ? theme : 'closed'}</button>
}
