import { useState } from 'react'
import InputBox from './InputBox.jsx'
import Message from './Message.jsx'

function MessageForm() {
  const [submitted, setSubmitted] = useState('') // shared by both children
  
  

  return (
    <div className="rounded-lg border-2 border-gray-300 bg-white p-6">
      <InputBox onSubmit={setSubmitted} />
      <Message text={submitted} />
    </div>
  )
}

export default MessageForm
