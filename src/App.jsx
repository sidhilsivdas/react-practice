import { HashRouter, Link, Route, Routes } from 'react-router'
import Home from './components/Home.jsx'
import QuestionPage from './pages/QuestionPage.jsx'
import Playground from './pages/Playground.jsx'

// HashRouter keeps URLs like /#/q/strict-mode, which work on GitHub Pages
function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link to="/" className="font-semibold text-gray-900">
              ⚛️ React Practice
            </Link>
            <Link to="/playground" className="text-sm text-gray-600 hover:text-gray-900">
              Playground
            </Link>
          </nav>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/q/:id" element={<QuestionPage />} />
            <Route path="/playground" element={<Playground />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

export default App
