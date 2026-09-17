import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

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
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: '4rem auto' }}>
      <h2>Iniciar sesión</h2>
      <div style={{ marginBottom: 12 }}>
        <label>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%' }}
          />
        </label>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ display: 'block', width: '100%' }}
          />
        </label>
      </div>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
      <p style={{ marginTop: 12 }}>
        ¿No tienes cuenta? <Link to="/signup">Crear cuenta</Link>
      </p>
    </form>
  )
}