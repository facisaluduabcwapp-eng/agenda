import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginForm from './components/LoginForm'
import SignupForm from './components/SignupForm'
import Dashboard from './pages/Dashboard'
import AdminRoles from './components/Adminroles'
import Pacientes from './pages/Pacientes'
import PacienteForm from './pages/PacienteForm'
import PacienteDetalle from './pages/PacienteDetalle'
import AdminAsignaciones from './pages/AdminAsignaciones' 
import AdminProfesionales from './pages/AdminProfesionales'
import Citas from './pages/Citas'
import CitaForm from './pages/CitaForm'
import NotaCita from './pages/NotaCita'
import PendingApproval from './components/PendingApproval'
// Evita que alguien con sesión ya iniciada vea /login o /signup
function GuestOnly({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <p>Cargando...</p>
  if (session) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginForm />
          </GuestOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestOnly>
            <SignupForm />
          </GuestOnly>
        }
      />
      <Route
        path="/pendiente"
        element={
          <ProtectedRoute allowInactive>
            <PendingApproval />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute rolesPermitidos={['admin']}>
            <AdminRoles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profesionales"
        element={
          <ProtectedRoute rolesPermitidos={['admin']}>
            <AdminProfesionales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pacientes"
        element={
          <ProtectedRoute>
            <Pacientes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pacientes/nuevo"
        element={
          <ProtectedRoute rolesPermitidos={['admin']}>
            <PacienteForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pacientes/:id"
        element={
          <ProtectedRoute>
            <PacienteDetalle />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pacientes/:id/editar"
        element={
          <ProtectedRoute>
            <PacienteForm />
          </ProtectedRoute>
        }
      />
      <Route
  path="/admin/asignaciones"
  element={
    <ProtectedRoute rolesPermitidos={['admin']}>
      <AdminAsignaciones />
    </ProtectedRoute>
  }
/>
<Route path="/citas" element={<ProtectedRoute><Citas /></ProtectedRoute>} />
<Route path="/citas/nueva" element={<ProtectedRoute><CitaForm /></ProtectedRoute>} />
<Route path="/citas/:id/editar" element={<ProtectedRoute><CitaForm /></ProtectedRoute>} />
<Route path="/citas/:id/nota" element={<ProtectedRoute><NotaCita /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App