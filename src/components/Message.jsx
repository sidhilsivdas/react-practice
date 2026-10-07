function Message({ text }) {
  return (
    <p className="mt-4 text-lg">
      Child received: <strong>{text || '(nothing yet)'}</strong>
    </p>
  )
}

export default Message
