import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import AuthPage from './layout/AuthPage'
import Button from './ui/Button'
import styles from './layout/AuthPage.module.css'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <AuthPage
      eyebrow="Clínica+"
      title="Iniciar sesión"
      description="Accede a tu agenda, pacientes y herramientas clínicas."
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="login-email" className={styles.label}>Correo</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
            autoComplete="email"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="login-password" className={styles.label}>Contraseña</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
            autoComplete="current-password"
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <Button type="submit" loading={loading} size="large">Entrar</Button>
      </form>
      <p className={styles.footer}>
        ¿No tienes cuenta? <Link to="/signup" className={styles.link}>Crear cuenta</Link>
      </p>
    </AuthPage>
  )
}