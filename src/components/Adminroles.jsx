import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ROLES = ['admin', 'profesional', 'medico']

export default function AdminRoles() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState(null)

  const loadUsers = async () => {
    setLoading(true)
    setError(null)

    // Dos consultas simples y las unimos en el cliente — evita
    // depender de cómo PostgREST decida anidar la relación 1-a-1.
    const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
      await Promise.all([
        supabase.from('profiles').select('id, nombre_completo, email, activo'),
        supabase.from('user_roles').select('user_id, rol'),
      ])

    if (profilesError || rolesError) {
      // Si no eres admin, RLS simplemente te devuelve solo tu propia
      // fila (o ningún user_roles ajeno) — no truena, pero la tabla
      // sale vacía o incompleta. Igual mostramos el error si lo hay.
      setError(profilesError?.message || rolesError?.message || 'Error al cargar usuarios')
      setLoading(false)
      return
    }

    const roleByUserId = Object.fromEntries(roles.map((r) => [r.user_id, r.rol]))
    const merged = profiles.map((p) => ({
      ...p,
      rol: roleByUserId[p.id] ?? 'profesional',
    }))

    setUsers(merged)
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleRoleChange = async (userId, newRol) => {
    setSavingId(userId)
    setError(null)

    const { error } = await supabase
      .from('user_roles')
      .update({ rol: newRol })
      .eq('user_id', userId)

    setSavingId(null)

    if (error) {
      // Si el usuario logueado no es admin, RLS rechaza el UPDATE
      // y esto es lo que se dispara.
      setError(`No se pudo actualizar el rol: ${error.message}`)
      return
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, rol: newRol } : u))
    )
  }

  if (loading) return <p>Cargando usuarios...</p>

  return (
    <div style={{ maxWidth: 720, margin: '2rem auto' }}>
      <h2>Asignación de roles</h2>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {users.length === 0 && !error && (
        <p>No hay usuarios visibles — si no eres admin, es esperado.</p>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{u.nombre_completo || '(sin nombre)'}</td>
              <td>{u.email}</td>
              <td>
                <select
                  value={u.rol}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  disabled={savingId === u.id}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td>{savingId === u.id ? 'Guardando...' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}