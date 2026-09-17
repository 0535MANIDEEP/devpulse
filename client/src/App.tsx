import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { AddMonitor } from './pages/AddMonitor'
import { MonitorDetail } from './pages/MonitorDetail'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/add" element={<AddMonitor />} />
        <Route path="/monitor/:id" element={<MonitorDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
