import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ROLES = ['admin', 'profesional', 'medico']

export default function AdminRoles() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState(null)

  const loadUsuarios = async () => {
    setLoading(true)
    setError(null)

    const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('id, nombre_completo, email')
          .order('nombre_completo'),
        supabase.from('user_roles').select('user_id, rol'),
      ])

    if (profilesError || rolesError) {
      setError(profilesError?.message || rolesError?.message || 'Error al cargar usuarios')
      setLoading(false)
      return
    }

    const roleByUserId = Object.fromEntries((roles || []).map((r) => [r.user_id, r.rol]))

    setUsuarios((profiles || []).map((profile) => ({
        ...profile,
        rol: roleByUserId[profile.id] ?? 'profesional',
      })))
    setLoading(false)
  }

  useEffect(() => {
    loadUsuarios()
  }, [])

  const handleRoleChange = async (userId, newRol) => {
    setSavingId(userId)
    setError(null)

    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, rol: newRol })

    setSavingId(null)

    if (roleError) {
      setError(roleError.message)
      return
    }

    setUsuarios((current) =>
      current.map((usuario) => (usuario.id === userId ? { ...usuario, rol: newRol } : usuario))
    )
  }

  if (loading) return <p>Cargando solicitudes...</p>

  return (
    <div style={{ maxWidth: 980, margin: '2rem auto', padding: '0 1rem' }}>
      <h2>Asignación de roles</h2>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {usuarios.length === 0 && !error && <p>No hay usuarios registrados.</p>}

      {usuarios.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{u.nombre_completo || '(sin nombre)'}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.rol}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={savingId === u.id}
                    style={{ width: '100%' }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}