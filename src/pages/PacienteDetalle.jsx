import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import AsignarProfesionales from '../components/AsignarProfesionales'
import DocumentosPaciente from '../components/DocumentosPaciente'
import Button from '../components/ui/Button'
import styles from './PacienteDetalle.module.css'

function formatFechaCita(fechaHora) {
  return new Date(fechaHora).toLocaleString('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const etiquetasEstado = {
  agendada: 'Agendada',
  reprogramada: 'Reprogramada',
  cancelada: 'Cancelada',
  completada: 'Completada',
}

export default function PacienteDetalle() {
  const { id } = useParams()
  const { role } = useAuth()
  const [paciente, setPaciente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [citas, setCitas] = useState([])
  const [notas, setNotas] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(true)
  const [errorHistorial, setErrorHistorial] = useState(null)

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

  useEffect(() => {
    let activo = true

    const cargarHistorial = async () => {
      setLoadingHistorial(true)
      setErrorHistorial(null)

      const [citasResult, notasResult] = await Promise.all([
        supabase
          .from('citas')
          .select('id, fecha_hora, estado, notas, profesionales(nombre)')
          .eq('paciente_id', id)
          .order('fecha_hora', { ascending: false }),
        supabase
          .from('notas_clinicas')
          .select('id, cita_id, contenido, created_at')
          .eq('paciente_id', id)
          .order('created_at', { ascending: false }),
      ])

      if (!activo) return

      if (citasResult.error || notasResult.error) {
        setErrorHistorial(citasResult.error?.message || notasResult.error?.message)
      } else {
        setCitas(citasResult.data || [])
        setNotas(notasResult.data || [])
      }
      setLoadingHistorial(false)
    }

    cargarHistorial()
    return () => {
      activo = false
    }
  }, [id])

  const notasPorCita = notas.reduce((grupos, nota) => {
    if (!nota.cita_id) return grupos
    grupos[nota.cita_id] = [...(grupos[nota.cita_id] || []), nota]
    return grupos
  }, {})

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

        <section className={styles.historial} aria-labelledby="historial-citas-titulo">
          <div className={styles.historialHeader}>
            <div>
              <h2 id="historial-citas-titulo">Historial de citas</h2>
              <p>Citas y notas clínicas de este paciente.</p>
            </div>
            <Link to={`/citas/nueva?paciente_id=${id}`} className={styles.enlaceAccion}>
              + Agendar cita
            </Link>
          </div>

          {errorHistorial && <p className={styles.error}>{errorHistorial}</p>}
          {loadingHistorial ? (
            <p className={styles.estadoVacio}>Cargando historial...</p>
          ) : errorHistorial ? null : citas.length === 0 ? (
            <p className={styles.estadoVacio}>Este paciente todavía no tiene citas registradas.</p>
          ) : (
            <ol className={styles.listaCitas}>
              {citas.map((cita) => {
                const notasCita = notasPorCita[cita.id] || []
                return (
                  <li key={cita.id} className={styles.cita}>
                    <div className={styles.citaResumen}>
                      <div>
                        <time className={styles.fechaCita} dateTime={cita.fecha_hora}>
                          {formatFechaCita(cita.fecha_hora)}
                        </time>
                        <p className={styles.profesionalCita}>
                          {cita.profesionales?.nombre || 'Sin profesional asignado'}
                        </p>
                      </div>
                      <span className={`${styles.estadoCita} ${styles[`estado_${cita.estado}`] || ''}`}>
                        {etiquetasEstado[cita.estado] || cita.estado}
                      </span>
                    </div>

                    {cita.notas && <p className={styles.notasCita}>{cita.notas}</p>}

                    <div className={styles.notasClinicas}>
                      <div className={styles.notasHeader}>
                        <h3>Notas clínicas</h3>
                        <Link to={`/citas/${cita.id}/nota`} className={styles.enlaceAccion}>
                          {notasCita.length ? 'Ver / agregar nota' : 'Agregar nota'}
                        </Link>
                      </div>
                      {notasCita.length === 0 ? (
                        <p className={styles.sinNotas}>Sin notas clínicas para esta cita.</p>
                      ) : (
                        <ul className={styles.listaNotas}>
                          {notasCita.map((nota) => (
                            <li key={nota.id}>
                              <time dateTime={nota.created_at}>{formatFechaCita(nota.created_at)}</time>
                              <p>{nota.contenido}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Documentos Clínicos</h3>
          <DocumentosPaciente pacienteId={id} />
        </div>
      </main>
    </DashboardLayout>
  )
}