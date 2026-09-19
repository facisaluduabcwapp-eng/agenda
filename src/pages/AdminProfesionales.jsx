import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import FormPage from '../components/layout/FormPage'
import Button from '../components/ui/Button'
import styles from './AdminProfesionales.module.css'

const ROLES = ['profesional', 'medico']

export default function AdminProfesionales() {
  const [profesionales, setProfesionales] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  const cargar = async () => {
    setLoading(true)
    setError(null)

    const [profesionalesResult, profilesResult, rolesResult] = await Promise.all([
      supabase
        .from('profesionales')
        .select('id, profile_id, nombre, especialidad, estado')
        .order('nombre'),
      supabase
        .from('profiles')
        .select('id, nombre_completo, email, especialidad, activo, estado_solicitud, created_at')
        .order('nombre_completo'),
      supabase.from('user_roles').select('user_id, rol'),
    ])

    if (profesionalesResult.error || profilesResult.error || rolesResult.error) {
      setError(
        profesionalesResult.error?.message ||
          profilesResult.error?.message ||
          rolesResult.error?.message
      )
    } else {
      setProfesionales(profesionalesResult.data || [])
      const roleByUserId = Object.fromEntries(
        (rolesResult.data || []).map((item) => [item.user_id, item.rol])
      )
      setSolicitudes(
        (profilesResult.data || [])
          .filter(
            (profile) =>
              roleByUserId[profile.id] !== 'admin' &&
              (profile.estado_solicitud === 'pendiente' ||
                (profile.activo === false && !profile.estado_solicitud))
          )
          .map((profile) => ({
            ...profile,
            rol: ROLES.includes(roleByUserId[profile.id])
              ? roleByUserId[profile.id]
              : 'profesional',
          }))
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const cambiarEstado = async (profesional) => {
    const nuevoEstado = profesional.estado === 'activo' ? 'inactivo' : 'activo'
    setError(null)
    setInfo(null)

    const { error: updateError } = await supabase
      .from('profesionales')
      .update({ estado: nuevoEstado })
      .eq('id', profesional.id)

    if (updateError) setError(updateError.message)
    else {
      setInfo(`Profesional marcado como ${nuevoEstado}.`)
      await cargar()
    }
  }

  const cambiarRolSolicitud = (userId, rol) => {
    setSolicitudes((current) =>
      current.map((solicitud) => (solicitud.id === userId ? { ...solicitud, rol } : solicitud))
    )
  }

  const decidirSolicitud = async (solicitud, aprobada) => {
    setSavingId(solicitud.id)
    setError(null)
    setInfo(null)

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        activo: aprobada,
        estado_solicitud: aprobada ? 'aprobada' : 'rechazada',
      })
      .eq('id', solicitud.id)

    let roleError = null
    let professionalError = null
    if (!profileError && aprobada) {
      const result = await supabase
        .from('user_roles')
        .upsert({ user_id: solicitud.id, rol: solicitud.rol })
      roleError = result.error

      if (!roleError) {
        const professionalResult = await supabase
          .from('profesionales')
          .upsert(
            {
              profile_id: solicitud.id,
              nombre: solicitud.nombre_completo || solicitud.email || 'Profesional',
              especialidad: solicitud.especialidad || null,
              estado: 'activo',
            },
            { onConflict: 'profile_id' }
          )
        professionalError = professionalResult.error
      }
    }

    setSavingId(null)

    if (profileError || roleError || professionalError) {
      setError(
        profileError?.message ||
          roleError?.message ||
          professionalError?.message ||
          'No se pudo procesar el ticket.'
      )
      return
    }

    setInfo(aprobada ? 'Solicitud aprobada.' : 'Solicitud rechazada.')
    await cargar()
  }

  if (loading) return <FormPage title="Catálogo de profesionales" description="Cargando profesionales..." />

  return (
    <FormPage
      eyebrow="Administración"
      title="Catálogo de profesionales"
      description="Gestiona las solicitudes nuevas y el estado de los profesionales registrados."
    >
      {error && <p className={styles.error}>{error}</p>}
      {info && <p className={styles.info}>{info}</p>}

      <section className={styles.ticketSection}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Bandeja de entrada</p>
            <h2>Solicitudes nuevas</h2>
            <p>Revisa los datos enviados antes de dar acceso a la plataforma.</p>
          </div>
          <span className={styles.counter}>{solicitudes.length} pendientes</span>
        </div>

        {solicitudes.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>Todo al día</strong>
            <span>No hay solicitudes nuevas pendientes.</span>
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Solicitante</th>
                  <th>Especialidad</th>
                  <th>Rol</th>
                  <th>Decisión</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((solicitud) => (
                  <tr key={solicitud.id}>
                    <td>
                      <strong>{solicitud.nombre_completo || 'Sin nombre'}</strong>
                      <span className={styles.secondaryText}>{solicitud.email || 'Sin correo'}</span>
                      <span className={styles.ticketDate}>
                        Recibida: {solicitud.created_at ? new Date(solicitud.created_at).toLocaleDateString() : 'Sin fecha'}
                      </span>
                    </td>
                    <td>{solicitud.especialidad || '—'}</td>
                    <td>
                      <select
                        className={styles.select}
                        value={solicitud.rol}
                        onChange={(event) => cambiarRolSolicitud(solicitud.id, event.target.value)}
                        disabled={savingId === solicitud.id}
                      >
                        {ROLES.map((rol) => (
                          <option key={rol} value={rol}>{rol}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Button
                          type="button"
                          size="small"
                          onClick={() => decidirSolicitud(solicitud, true)}
                          disabled={savingId === solicitud.id}
                        >
                          {savingId === solicitud.id ? 'Guardando...' : 'Aprobar'}
                        </Button>
                        <Button
                          type="button"
                          size="small"
                          variant="outline"
                          onClick={() => decidirSolicitud(solicitud, false)}
                          disabled={savingId === solicitud.id}
                        >
                          Rechazar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.catalogSection}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Directorio</p>
            <h2>Profesionales registrados</h2>
          </div>
          <span className={styles.catalogCount}>{profesionales.length} registrados</span>
        </div>
        {profesionales.length === 0 ? (
          <div className={styles.emptyState}><span>No hay profesionales en el catálogo.</span></div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr><th>Nombre</th><th>Especialidad</th><th>Estado</th><th>Cuenta</th><th /></tr>
              </thead>
              <tbody>
                {profesionales.map((profesional) => (
                  <tr key={profesional.id}>
                    <td><strong>{profesional.nombre}</strong></td>
                    <td>{profesional.especialidad || '—'}</td>
                    <td><span className={profesional.estado === 'activo' ? styles.active : styles.inactive}>{profesional.estado}</span></td>
                    <td>{profesional.profile_id ? 'Vinculada' : 'Sin vincular'}</td>
                    <td>
                      <Button type="button" size="small" variant="outline" onClick={() => cambiarEstado(profesional)}>
                        {profesional.estado === 'activo' ? 'Desactivar' : 'Activar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </FormPage>
  )
}
