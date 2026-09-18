import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import AsignarProfesionales from '../components/AsignarProfesionales'
import DocumentosPaciente from '../components/DocumentosPaciente'
import Button from '../components/ui/Button'
import styles from './PacienteDetalle.module.css'

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

  if (loading) {
    return (
      <DashboardLayout>
        <p style={{ padding: '2rem' }}>Cargando expediente...</p>
      </DashboardLayout>
    )
  }

  if (error || !paciente) {
    return (
      <DashboardLayout>
        <p style={{ padding: '2rem', color: 'crimson' }}>
          {error || 'Paciente no encontrado.'}
        </p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Botón de regreso usando variante ghost */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to="/pacientes" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="small">
              ← Volver al directorio
            </Button>
          </Link>
        </div>

        <div style={{ background: '#fff', padding: '2rem', borderRadius: '16px', border: '1px solid #f1f5f9', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <h1 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>
                {paciente.nombre} {paciente.apellido}
              </h1>
              <p style={{ color: '#64748b', margin: 0 }}>
                Nacimiento: {paciente.fecha_nacimiento || '—'} | Teléfono: {paciente.telefono || '—'} | Email: {paciente.email || '—'}
              </p>
            </div>

            {/* Acciones del paciente */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Link to={`/citas/nueva?paciente_id=${id}`} style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="small">
                  + Agendar cita
                </Button>
              </Link>
              
              <Link to={`/pacientes/${id}/editar`} style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="small">
                  Editar datos
                </Button>
              </Link>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#475569' }}>Notas generales</h4>
            <p style={{ color: '#334155', margin: 0 }}>{paciente.notas_generales || 'Sin notas registradas.'}</p>
          </div>
        </div>

        {/* RESTRICCIÓN DE SEGURIDAD VISUAL:
            Solo los administradores pueden ver y asignar profesionales.
            El profesional solo consulta sus pacientes asignados */}
        {role === 'admin' && (
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f1f5f9', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Asignación de Profesionales</h3>
            <AsignarProfesionales pacienteId={id} />
          </div>
        )}

        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Documentos Clínicos</h3>
          <DocumentosPaciente pacienteId={id} />
        </div>
      </main>
    </DashboardLayout>
  )
}