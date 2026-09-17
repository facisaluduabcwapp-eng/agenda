import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AsignarProfesionales from '../components/AsignarProfesionales'
import DocumentosPaciente from '../components/DocumentosPaciente'

export default function PacienteDetalle() {
  const { id } = useParams()
  const { role } = useAuth()
  const [paciente, setPaciente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setPaciente(data)
        setLoading(false)
      })
  }, [id])

  if (loading) return <p>Cargando...</p>
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>
  if (!paciente) return <p>Paciente no encontrado.</p>

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto' }}>
      <h1>
        {paciente.nombre} {paciente.apellido}
      </h1>
      <p>
        <strong>Fecha de nacimiento:</strong> {paciente.fecha_nacimiento || '—'}
      </p>
      <p>
        <strong>Teléfono:</strong> {paciente.telefono || '—'}
      </p>
      <p>
        <strong>Correo:</strong> {paciente.email || '—'}
      </p>
      <p>
        <strong>Notas generales:</strong> {paciente.notas_generales || '—'}
      </p>

      {role === 'admin' && <AsignarProfesionales pacienteId={id} />}

        <DocumentosPaciente pacienteId={id} />

      {/* Aquí cuelgan las pestañas de citas, notas clínicas y
          cuando se construyan esos módulos, usando este mismo paciente.id */}

      <p style={{ marginTop: 24 }}>
        <Link to={`/pacientes/${id}/editar`}>Editar</Link>
        {' · '}
        <Link to="/pacientes">Volver a pacientes</Link>
      </p>
    </div>
  )
}