import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingState from './ui/LoadingState'

/**
 * Envuelve una ruta que requiere sesión iniciada.
 * Si se pasa rolesPermitidos, además exige que el rol del usuario
 * esté en esa lista (ej. rolesPermitidos={['admin']}).
 */
export default function ProtectedRoute({ rolesPermitidos, allowInactive = false, children }) {
  const { session, role, isActive, loading } = useAuth()

  if (loading) return <LoadingState />
  if (!session) return <Navigate to="/login" replace />

  if (isActive === false && !allowInactive) {
    return <Navigate to="/pendiente" replace />
  }

  if (rolesPermitidos && !rolesPermitidos.includes(role)) {
    return <Navigate to="/" replace />
  }

  return children
}