// Shown for a category that has no questions yet
function ComingSoon({ category }) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
      <div className="text-5xl">{category.icon}</div>
      <h2 className="mt-4 text-xl font-semibold text-gray-900">{category.title} practice is coming soon</h2>
      <p className="mt-2 text-gray-600">{category.description} Questions for this section are being written.</p>

      {category.planned && (
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-500">Planned topics</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {category.planned.map((topic) => (
              <span key={topic} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ComingSoon
