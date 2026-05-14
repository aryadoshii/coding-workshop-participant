import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage         from './pages/LoginPage'
import Dashboard         from './pages/Dashboard'
import EmployeesPage     from './pages/EmployeesPage'
import ReviewsPage       from './pages/ReviewsPage'
import CompetenciesPage  from './pages/CompetenciesPage'
import TrainingPage      from './pages/TrainingPage'
import PlansPage         from './pages/PlansPage'
import AnalyticsPage     from './pages/AnalyticsPage'

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/dashboard"     element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/employees"     element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
        <Route path="/reviews"       element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
        <Route path="/competencies"  element={<ProtectedRoute><CompetenciesPage /></ProtectedRoute>} />
        <Route path="/training"      element={<ProtectedRoute><TrainingPage /></ProtectedRoute>} />
        <Route path="/plans"         element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
        <Route path="/analytics"     element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="*"              element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
