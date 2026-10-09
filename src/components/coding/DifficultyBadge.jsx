const COLORS = {
  Easy: 'bg-green-100 text-green-800',
  Medium: 'bg-amber-100 text-amber-800',
  Hard: 'bg-red-100 text-red-800',
}

function DifficultyBadge({ difficulty }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORS[difficulty] ?? COLORS.Easy}`}>
      {difficulty}
    </span>
  )
}

export default DifficultyBadge
