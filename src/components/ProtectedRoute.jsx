import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Envuelve una ruta que requiere sesión iniciada.
 * Si se pasa rolesPermitidos, además exige que el rol del usuario
 * esté en esa lista (ej. rolesPermitidos={['admin']}).
 */
export default function ProtectedRoute({ rolesPermitidos, children }) {
  const { session, role, loading } = useAuth()

  if (loading) return <p>Cargando...</p>
  if (!session) return <Navigate to="/login" replace />

  if (rolesPermitidos && !rolesPermitidos.includes(role)) {
    return <Navigate to="/" replace />
  }

  return children
}