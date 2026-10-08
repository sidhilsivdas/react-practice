// Practice sections shown as tabs on the home page.
// A category with no questions yet shows a "Coming soon" message with its planned topics.
const categories = [
  {
    id: 'react-js',
    title: 'React & JavaScript',
    icon: '⚛️',
    description: 'React concepts and core JavaScript.',
  },
  {
    id: 'node',
    title: 'Node.js',
    icon: '🟢',
    description: 'Server-side JavaScript with Node.js.',
    planned: ['Event loop phases', 'Streams & buffers', 'Express & middleware', 'Authentication (JWT, sessions)', 'Error handling', 'Worker threads & cluster'],
  },
  {
    id: 'frontend-architecture',
    title: 'Frontend Architecture',
    icon: '🏛️',
    description: 'Designing large, maintainable frontend apps.',
    planned: ['Folder structure', 'State management choices', 'Micro-frontends', 'Design systems', 'Performance & Core Web Vitals', 'Rendering: CSR, SSR, SSG'],
  },
  {
    id: 'system-design',
    title: 'System Design',
    icon: '🧩',
    description: 'Designing scalable systems end to end.',
    planned: ['Scalability basics', 'Caching & CDNs', 'Load balancing', 'Design a URL shortener', 'Design a chat app', 'Rate limiting'],
  },
  {
    id: 'database',
    title: 'Database',
    icon: '🗄️',
    description: 'SQL, NoSQL and working with data.',
    planned: ['SQL vs NoSQL', 'Indexing', 'MongoDB aggregation', 'Transactions & ACID', 'Normalization', 'Sharding & replication'],
  },
]

export default categories
