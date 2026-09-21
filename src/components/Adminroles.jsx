import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/ui/Button'
import FormPage from './layout/FormPage'
import { LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import styles from './Adminroles.module.css'

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

  if (loading) {
    return (
      <FormPage eyebrow="Administración" title="Asignación de roles" description="Administra los permisos de acceso y el nivel de privilegio de los usuarios.">
        <div className={styles.loading}>
          <LoaderCircle size={18} aria-hidden="true" />
          Cargando usuarios y roles...
        </div>
      </FormPage>
    )
  }

  return (
    <FormPage eyebrow="Administración" title="Asignación de roles" description="Administra los permisos de acceso y el nivel de privilegio de los usuarios.">
      <div className={styles.toolbar}>
        <div className={styles.intro}>
          <div className={styles.introIcon}><ShieldCheck size={19} aria-hidden="true" /></div>
          <div>
            <strong>Control de acceso</strong>
            <span>Los cambios se aplican inmediatamente a la cuenta seleccionada.</span>
          </div>
        </div>
        <Button variant="ghost" size="small" onClick={loadUsuarios}>
          <RefreshCw size={15} aria-hidden="true" />
          Actualizar
        </Button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {usuarios.length === 0 && !error && <p className={styles.empty}>No hay usuarios registrados.</p>}

      {usuarios.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol asignado</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className={styles.name}>{u.nombre_completo || <span className={styles.muted}>(sin nombre)</span>}</td>
                  <td className={styles.email}>{u.email}</td>
                  <td>
                    <div className={styles.roleCell}>
                      <select
                        value={u.rol}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={savingId === u.id}
                        className={styles.select}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                      </select>
                      {savingId === u.id && <span className={styles.saving}>Guardando...</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FormPage>
  )
}