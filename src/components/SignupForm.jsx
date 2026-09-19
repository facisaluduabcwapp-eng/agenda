import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function SignupForm() {
  const navigate = useNavigate()
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [especialidad, setEspecialidad] = useState('')
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

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: nombreCompleto, specialty: especialidad },
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    const userId = data?.user?.id

    if (userId) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        nombre_completo: nombreCompleto,
        email,
        especialidad,
        activo: false,
        estado_solicitud: 'pendiente',
      })

      if (profileError) {
        setError(profileError.message)
        return
      }
    }

    if (data.session) {
      navigate('/pendiente', { replace: true })
      return
    }

    setInfo('Cuenta creada. Confirma tu correo y espera la aprobación del administrador.')
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 360, margin: '4rem auto' }}>
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
          Especialidad
          <input
            type="text"
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
            required
            placeholder="Ej. Psicología"
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