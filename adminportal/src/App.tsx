import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Tools from './pages/Tools'
import Users from './pages/Users'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<div>Welcome to Sasi HVAC Tool Tracker</div>} />
          <Route path="tools" element={<Tools />} />
          <Route path="users" element={<Users />} />
          <Route path="transactions" element={<div>Transactions Page</div>} />
        </Route>
      </Routes>
    </Router>
  )
}
