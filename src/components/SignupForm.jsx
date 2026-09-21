import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/ui/Button'

const ESPECIALIDADES = [
  'Psiquiatría',
  'Nutrición',
  'Medicina general',
  'Pediatría',
  'Endocrinología',
  'Cardiología',
  'Fisioterapia',
  'Psicología',
  'Terapia familiar',
  'Terapia de pareja',
  'Trabajo social',
  'Enfermería',
  'Otros',
]

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

    if (!especialidad) {
      setError('Por favor selecciona una especialidad.')
      return
    }

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

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '1px solid transparent',
    backgroundColor: '#ebf0fe',
    color: '#1e293b',
    fontSize: '0.925rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '6px',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f6f7fb',
        padding: '2rem 1rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '2.5rem 2rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            backgroundColor: '#7c3aed',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
          }}
        >
          +
        </div>

        <span
          style={{
            color: '#7c3aed',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '4px',
          }}
        >
          CLÍNICA+
        </span>

        <h1
          style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#0f172a',
            fontFamily: 'serif',
          }}
        >
          Crear cuenta
        </h1>

        <p
          style={{
            margin: '0 0 1.75rem 0',
            color: '#64748b',
            fontSize: '0.875rem',
            lineHeight: 1.4,
          }}
        >
          Regístrate para solicitar acceso a tu agenda y expediente clínico.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>
              Nombre completo
              <input
                type="text"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                required
                placeholder="Dr. Juan Pérez"
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>
              Especialidad
              <select
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                required
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                  color: especialidad ? '#1e293b' : '#94a3b8',
                }}
              >
                <option value="" disabled hidden>
                  Selecciona tu especialidad
                </option>
                {ESPECIALIDADES.map((esp) => (
                  <option key={esp} value={esp} style={{ color: '#1e293b' }}>
                    {esp}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>
              Correo
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ejemplo@correo.com"
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                style={inputStyle}
              />
            </label>
          </div>

          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {error}
            </p>
          )}

          {info && (
            <p style={{ color: '#16a34a', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {info}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="large"
            loading={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Crear cuenta
          </Button>

          <p
            style={{
              marginTop: '1.5rem',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#64748b',
            }}
          >
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              style={{
                color: '#7c3aed',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}