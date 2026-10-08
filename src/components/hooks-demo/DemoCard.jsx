// Shared card layout for the hook demos
function DemoCard({ number, title, hook, children }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900">
        <span className="mr-2 text-gray-400">{number}.</span>
        {title}
      </h3>
      <p className="mt-1 font-mono text-xs text-blue-700">{hook}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default DemoCard
