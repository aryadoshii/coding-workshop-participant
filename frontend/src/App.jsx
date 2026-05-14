import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import EmployeesPage from './pages/EmployeesPage'
import ReviewsPage from './pages/ReviewsPage'
import CompetenciesPage from './pages/CompetenciesPage'
import TrainingPage from './pages/TrainingPage'
import PlansPage from './pages/PlansPage'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')
  if (!token) return <Navigate to="/login" />
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/dashboard" />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/employees" element={
          <ProtectedRoute allowedRoles={['HR', 'Manager']}>
            <EmployeesPage />
          </ProtectedRoute>
        } />
        <Route path="/reviews" element={
          <ProtectedRoute allowedRoles={['HR', 'Manager', 'Employee']}>
            <ReviewsPage />
          </ProtectedRoute>
        } />
        <Route path="/competencies" element={
          <ProtectedRoute allowedRoles={['HR', 'Manager', 'Employee']}>
            <CompetenciesPage />
          </ProtectedRoute>
        } />
        <Route path="/training" element={
          <ProtectedRoute allowedRoles={['HR', 'Manager', 'Employee']}>
            <TrainingPage />
          </ProtectedRoute>
        } />
        <Route path="/plans" element={
          <ProtectedRoute allowedRoles={['HR', 'Manager', 'Employee']}>
            <PlansPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App