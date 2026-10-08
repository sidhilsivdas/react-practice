import Timer from '../components/Timer.jsx'
import { TimerPractice } from '../components/TimerPractice.jsx'
import MessageForm from '../components/MessageForm.jsx'

// my practice components
function Playground() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Playground</h1>
      <div className="mt-8 flex flex-col items-center gap-8">
        <Timer />
        <TimerPractice />
        <MessageForm />
      </div>
    </div>
  )
}

export default Playground
