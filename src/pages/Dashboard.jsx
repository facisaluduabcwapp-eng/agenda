import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const { session, role } = useAuth()

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto' }}>
      <h1>Bienvenido</h1>
      <p>
        {session.user.email} — rol: <strong>{role}</strong>
      </p>

      {role === 'admin' && (
        <p>
          <Link to="/admin/roles">Ir a asignación de roles</Link>
        </p>
      )}

      {/* Aquí van los links a pacientes / agenda / notas cuando existan */}

      <button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </div>
  )
}