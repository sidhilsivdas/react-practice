import { useState } from 'react'
import useDebouncedCallback from '../../hooks/useDebouncedCallback.js'
import { debounce } from '../../utils/debounce.js'
import DemoCard from './DemoCard.jsx'

// Pretend server save
const fakeSave = () => new Promise((resolve) => setTimeout(resolve, 300))

// ❌ debounce() inside the component: a NEW debounced function every render,
// so old timers are never cancelled and it saves once per keystroke
function BrokenAutoSave() {
  const [text, setText] = useState('')
  const [saves, setSaves] = useState(0)

  const save = debounce(async () => {
    await fakeSave()
    setSaves((n) => n + 1)
  }, 1000)

  return (
    <AutoSaveBox
      label="❌ Broken: debounce() in the component body"
      text={text}
      saves={saves}
      onChange={(value) => {
        setText(value)
        save(value)
      }}
    />
  )
}

// ✅ useDebouncedCallback keeps ONE timer in a ref, so it saves once after you stop
function FixedAutoSave() {
  const [text, setText] = useState('')
  const [saves, setSaves] = useState(0)

  const save = useDebouncedCallback(async () => {
    await fakeSave()
    setSaves((n) => n + 1)
  }, 1000)

  return (
    <AutoSaveBox
      label="✅ Fixed: useDebouncedCallback"
      text={text}
      saves={saves}
      onChange={(value) => {
        setText(value)
        save(value)
      }}
    />
  )
}

function AutoSaveBox({ label, text, saves, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-800">Saves: {saves}</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type a sentence, then stop for 1 second"
        rows={2}
        className="mt-2 w-full rounded border border-gray-300 px-3 py-2"
      />
    </div>
  )
}

function AutoSaveDemo() {
  return (
    <DemoCard number={3} title="Autosave: the classic debounce bug" hook="debounce(fn) vs useDebouncedCallback(fn, 1000)">
      <div className="space-y-4">
        <BrokenAutoSave />
        <FixedAutoSave />
      </div>
    </DemoCard>
  )
}

export default AutoSaveDemo
