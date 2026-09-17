import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="bg-gray-900 text-white min-h-screen p-8"><h1 className="text-3xl font-bold">DevPulse</h1><p className="mt-4 text-gray-400">API Uptime Monitor</p></div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
