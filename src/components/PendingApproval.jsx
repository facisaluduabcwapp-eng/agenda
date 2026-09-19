import { Link, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Button from './ui/Button'
import styles from './PendingApproval.module.css'

export default function PendingApproval() {
  const { session, requestStatus, isActive } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ nombre: '', especialidad: '' })
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const rejected = requestStatus === 'rechazada'
  const blocked = requestStatus === 'bloqueada'

  useEffect(() => {
    if (!session?.user?.id || !rejected) return

    supabase.from('profiles')
      .select('nombre_completo, especialidad')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error: profileError }) => {
        if (profileError) setError(profileError.message)
        else setForm({ nombre: data?.nombre_completo || '', especialidad: data?.especialidad || '' })
      })
  }, [session?.user?.id, rejected])

  useEffect(() => {
    if (!blocked || !session?.user?.id) return

    const timer = window.setTimeout(async () => {
      setDeleting(true)
      const { error: deleteError } = await supabase.rpc('eliminar_mi_cuenta_bloqueada')
      if (deleteError) {
        setError(deleteError.message)
        setDeleting(false)
        return
      }
      await supabase.auth.signOut()
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [blocked, session?.user?.id])

  const handleResubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase.from('profiles').update({
      nombre_completo: form.nombre.trim(),
      especialidad: form.especialidad.trim(),
      activo: false,
      estado_solicitud: 'pendiente',
    }).eq('id', session.user.id)

    setSaving(false)
    if (updateError) setError(updateError.message)
    else setFormOpen(false)
  }

  if (isActive === true) return <Navigate to="/" replace />

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={`${styles.statusIcon} ${rejected || blocked ? styles.rejected : ''}`}>
          {rejected || blocked ? '!' : '...'}
        </div>
        <p className={styles.eyebrow}>Clínica+</p>
        <h1>{blocked ? 'Cuenta bloqueada' : rejected ? 'Solicitud rechazada' : 'Solicitud en revisión'}</h1>
        <p className={styles.description}>
          {blocked
            ? 'Tu cuenta fue bloqueada por motivos de seguridad después de varios rechazos. No puedes acceder a la plataforma.'
            : rejected
            ? 'El administrador rechazó esta solicitud. Puedes comunicarte con la administración si necesitas más información.'
            : 'Tu cuenta fue creada correctamente. Un administrador revisará tus datos antes de darte acceso a la plataforma.'}
        </p>

        <div className={styles.statusBox}>
          <span className={rejected || blocked ? styles.statusDotRejected : styles.statusDot} />
          <div>
            <strong>{blocked ? 'Bloqueo de seguridad' : rejected ? 'Acceso no habilitado' : 'Pendiente de aprobación'}</strong>
            <span>{blocked ? 'Comunícate con la administración si necesitas revisar tu caso.' : rejected ? 'La cuenta permanece inactiva.' : 'Te avisaremos cuando tu cuenta esté activa.'}</span>
          </div>
        </div>

        {rejected && !blocked && !formOpen && (
          <Button type="button" size="large" onClick={() => setFormOpen(true)}>
            Editar y reenviar solicitud
          </Button>
        )}

        {rejected && !blocked && formOpen && (
          <form className={styles.form} onSubmit={handleResubmit}>
            <label>Nombre completo<input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
            <label>Especialidad<input required value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} /></label>
            {error && <p className={styles.formError}>{error}</p>}
            <Button type="submit" size="large" loading={saving}>Reenviar solicitud</Button>
          </form>
        )}

        <Button type="button" variant="secondary" size="large" onClick={handleSignOut} disabled={deleting}>
          {deleting ? 'Eliminando cuenta...' : 'Cerrar sesión'}
        </Button>
        <Link to="/login" className={styles.link}>Volver a iniciar sesión</Link>
      </section>
    </main>
  )
}
