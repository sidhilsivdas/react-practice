import Home from './components/Home.jsx'
import Timer from './components/Timer.jsx'
import {TimerPractice} from './components/TimerPractice.jsx'
import MessageForm from './components/MessageForm.jsx'

function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-100">
      <Home />
      <Timer />
      <TimerPractice />
      <MessageForm />
    </div>
  )
}

export default App
