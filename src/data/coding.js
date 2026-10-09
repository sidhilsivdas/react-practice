// Coding problems. To add one:
// 1. src/coding/<id>.md: problem, then a "<!-- SOLUTION -->" line, then the solutions
// 2. src/coding/<id>.starter.js: the code the editor starts with
// 3. an entry below with the function name and tests ({ args: [...], expected })
import { getSections } from '../utils/sections.js'
import removeDuplicates from '../coding/remove-duplicates.md?raw'
import removeDuplicatesStarter from '../coding/remove-duplicates.starter.js?raw'

const SOLUTION_MARKER = '<!-- SOLUTION -->'

const coding = [
  {
    id: 'remove-duplicates',
    title: 'Remove duplicates from an array',
    difficulty: 'Easy',
    topics: ['Arrays', 'Set', 'filter', 'Time complexity'],
    content: removeDuplicates,
    starter: removeDuplicatesStarter,
    functionName: 'removeDuplicates',
    tests: [
      { args: [[1, 2, 2, 3, 1]], expected: [1, 2, 3] },
      { args: [['a', 'b', 'a', 'c', 'b']], expected: ['a', 'b', 'c'] },
      { args: [[1, '1', 1, '1']], expected: [1, '1'] },
      { args: [[NaN, 1, NaN]], expected: [NaN, 1] },
      { args: [[5, 5, 5, 5]], expected: [5] },
      { args: [[]], expected: [] },
    ],
  },
]

for (const problem of coding) {
  problem.category ??= 'react-js'
  const [problemPart, solutionPart = ''] = problem.content.split(SOLUTION_MARKER)
  problem.problem = problemPart
  problem.solution = solutionPart
  problem.problemSections = getSections(problemPart)
  problem.solutionSections = getSections(solutionPart)
  problem.sections = [...problem.problemSections, ...problem.solutionSections] // used by search
}

export default coding
