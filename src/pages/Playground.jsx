import Timer from '../components/Timer.jsx'
import { TimerPractice } from '../components/TimerPractice.jsx'
import MessageForm from '../components/MessageForm.jsx'
import DebounceThrottleDemo from '../components/hooks-demo/DebounceThrottleDemo.jsx'
import DebouncedSearchDemo from '../components/hooks-demo/DebouncedSearchDemo.jsx'
import AutoSaveDemo from '../components/hooks-demo/AutoSaveDemo.jsx'

// my practice components
function Playground() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Playground</h1>

      <h2 className="mt-8 text-xl font-semibold text-gray-900">Custom hooks: debounce & throttle</h2>
      <p className="mt-1 text-sm text-gray-600">Type in the boxes and watch the counters.</p>
      <div className="mt-4 space-y-6">
        <DebounceThrottleDemo />
        <DebouncedSearchDemo />
        <AutoSaveDemo />
      </div>

      <h2 className="mt-12 text-xl font-semibold text-gray-900">Earlier practice</h2>
      <div className="mt-6 flex flex-col items-center gap-8">
        <Timer />
        <TimerPractice />
        <MessageForm />
      </div>
    </div>
  )
}

export default Playground
