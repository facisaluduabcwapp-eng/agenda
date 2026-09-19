import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Button from './ui/Button'
import styles from './PendingApproval.module.css'

export default function PendingApproval() {
  const { requestStatus, isActive } = useAuth()
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const rejected = requestStatus === 'rechazada'

  if (isActive === true) return <Navigate to="/" replace />

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={`${styles.statusIcon} ${rejected ? styles.rejected : ''}`}>
          {rejected ? '!' : '...'}
        </div>
        <p className={styles.eyebrow}>Clínica+</p>
        <h1>{rejected ? 'Solicitud rechazada' : 'Solicitud en revisión'}</h1>
        <p className={styles.description}>
          {rejected
            ? 'El administrador rechazó esta solicitud. Puedes comunicarte con la administración si necesitas más información.'
            : 'Tu cuenta fue creada correctamente. Un administrador revisará tus datos antes de darte acceso a la plataforma.'}
        </p>

        <div className={styles.statusBox}>
          <span className={rejected ? styles.statusDotRejected : styles.statusDot} />
          <div>
            <strong>{rejected ? 'Acceso no habilitado' : 'Pendiente de aprobación'}</strong>
            <span>{rejected ? 'La cuenta permanece inactiva.' : 'Te avisaremos cuando tu cuenta esté activa.'}</span>
          </div>
        </div>

        <Button type="button" variant="secondary" size="large" onClick={handleSignOut}>
          Cerrar sesión
        </Button>
        <Link to="/login" className={styles.link}>Volver a iniciar sesión</Link>
      </section>
    </main>
  )
}
