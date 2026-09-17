import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function SignupForm() {
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    // Nota: aquí NO se manda rol. El trigger handle_new_user() en la
    // base de datos siempre crea al usuario nuevo con rol 'profesional'.
    // El rol real se asigna después desde el panel de admin.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: nombreCompleto },
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    if (data.session) {
      // Confirmación de correo desactivada en el proyecto: ya quedó
      // con sesión iniciada, App.jsx se encarga de redirigir.
      return
    }

    setInfo('Cuenta creada. Revisa tu correo para confirmar antes de iniciar sesión.')
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: '4rem auto' }}>
      <h2>Crear cuenta</h2>
      <div style={{ marginBottom: 12 }}>
        <label>
          Nombre completo
          <input
            type="text"
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            required
            style={{ display: 'block', width: '100%' }}
          />
        </label>
      </div>
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
            minLength={6}
            style={{ display: 'block', width: '100%' }}
          />
        </label>
      </div>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {info && <p style={{ color: 'seagreen' }}>{info}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Creando...' : 'Crear cuenta'}
      </button>
      <p style={{ marginTop: 12 }}>
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </form>
  )
}