import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import FormPage from '../components/layout/FormPage'
import Button from '../components/ui/Button'
import styles from './AdminAsignaciones.module.css'

export default function AdminAsignaciones() {
  const [pacientes, setPacientes] = useState([])
  const [profesionales, setProfesionales] = useState([])
  const [pacienteId, setPacienteId] = useState('')
  const [asignaciones, setAsignaciones] = useState([])
  const [profesionalNuevoId, setProfesionalNuevoId] = useState('')

  const [loadingListas, setLoadingListas] = useState(true)
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  // Cargar pacientes y profesionales una sola vez
  useEffect(() => {
    async function cargarListas() {
      setLoadingListas(true)
      setError(null)

      const [{ data: pacientesData, error: pacientesError }, { data: profesionalesData, error: profesionalesError }] =
        await Promise.all([
          supabase.from('pacientes').select('id, nombre, apellido').order('nombre'),
          supabase
            .from('profesionales')
            .select('id, nombre, especialidad, estado')
            .eq('estado', 'activo')
            .order('nombre'),
        ])

      if (pacientesError) setError(pacientesError.message)
      else if (profesionalesError) setError(profesionalesError.message)
      else {
        setPacientes(pacientesData)
        setProfesionales(profesionalesData)
      }

      setLoadingListas(false)
    }

    cargarListas()
  }, [])

  // Cargar asignaciones del paciente seleccionado
  useEffect(() => {
    if (!pacienteId) {
      setAsignaciones([])
      return
    }

    let cancelado = false
    setLoadingAsignaciones(true)
    setError(null)

    supabase
      .from('paciente_profesional')
      .select('profesional_id, created_at, profesionales(nombre, especialidad)')
      .eq('paciente_id', pacienteId)
      .then(({ data, error }) => {
        if (cancelado) return
        if (error) setError(error.message)
        else setAsignaciones(data)
        setLoadingAsignaciones(false)
      })

    return () => {
      cancelado = true
    }
  }, [pacienteId, info])

  const profesionalesDisponibles = profesionales.filter(
    (p) => !asignaciones.some((a) => a.profesional_id === p.id)
  )

  const handleAsignar = async (e) => {
    e.preventDefault()
    if (!pacienteId || !profesionalNuevoId) return

    setGuardando(true)
    setError(null)
    setInfo(null)

    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase.from('paciente_profesional').insert({
      paciente_id: pacienteId,
      profesional_id: profesionalNuevoId,
      asignado_por: userData.user.id,
    })

    setGuardando(false)

    if (error) {
      setError(error.message)
      return
    }

    setProfesionalNuevoId('')
    setInfo(`Asignación creada · ${new Date().toISOString()}`)
  }

  const handleQuitar = async (profesionalId) => {
    setError(null)
    setInfo(null)

    const { error } = await supabase
      .from('paciente_profesional')
      .delete()
      .eq('paciente_id', pacienteId)
      .eq('profesional_id', profesionalId)

    if (error) {
      setError(error.message)
      return
    }

    setInfo(`Asignación eliminada · ${new Date().toISOString()}`)
  }

  if (loadingListas) return <FormPage title="Asignaciones" description="Cargando pacientes y profesionales..." />

  return (
    <FormPage
      eyebrow="Administración"
      title="Asignaciones clínicas"
      description="Organiza qué profesionales pueden dar seguimiento a cada paciente."
    >
      <div className={styles.intro}>
        <div className={styles.introIcon}>+</div>
        <div>
          <strong>Equipo de atención</strong>
          <span>Selecciona un paciente para administrar su equipo clínico.</span>
        </div>
      </div>

      <div className={styles.patientPicker}>
        <label htmlFor="patient-select">Paciente</label>
        <select
          id="patient-select"
          className={styles.select}
          value={pacienteId}
          onChange={(e) => {
            setPacienteId(e.target.value)
            setInfo(null)
            setError(null)
          }}
        >
          <option value="">Selecciona un paciente</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} {p.apellido}
            </option>
          ))}
        </select>
      </div>

      {pacienteId && (
        <div className={styles.workspace}>
          <div className={styles.workspaceHeader}>
            <div>
              <p className={styles.eyebrow}>Paciente seleccionado</p>
              <h2>{pacientes.find((p) => p.id === pacienteId)?.nombre} {pacientes.find((p) => p.id === pacienteId)?.apellido}</h2>
            </div>
            <span className={styles.assignmentCount}>{asignaciones.length} asignados</span>
          </div>

          <div className={styles.assignedSection}>
            <div className={styles.sectionTitle}>
              <div>
                <h3>Profesionales asignados</h3>
                <p>Personas autorizadas para dar seguimiento a este paciente.</p>
              </div>
            </div>

            {loadingAsignaciones ? (
              <div className={styles.emptyState}>Cargando equipo clínico...</div>
            ) : asignaciones.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>Aún no hay profesionales asignados</strong>
                <span>Agrega el primer profesional desde el selector inferior.</span>
              </div>
            ) : (
              <div className={styles.assignedList}>
                {asignaciones.map((a) => (
                  <div className={styles.assignedItem} key={a.profesional_id}>
                    <div className={styles.avatar}>{a.profesionales?.nombre?.charAt(0) || 'P'}</div>
                    <div className={styles.professionalInfo}>
                      <strong>{a.profesionales?.nombre}</strong>
                      <span>{a.profesionales?.especialidad || 'Profesional clínico'}</span>
                    </div>
                    <Button type="button" size="small" variant="outline" onClick={() => handleQuitar(a.profesional_id)}>
                      Quitar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleAsignar} className={styles.addForm}>
            <div>
              <label htmlFor="professional-select">Agregar profesional</label>
              <select
                id="professional-select"
                className={styles.select}
                value={profesionalNuevoId}
                onChange={(e) => setProfesionalNuevoId(e.target.value)}
                disabled={profesionalesDisponibles.length === 0}
              >
                <option value="">
                  {profesionalesDisponibles.length === 0
                    ? 'Todos los profesionales activos ya están asignados'
                    : 'Selecciona un profesional'}
                </option>
                {profesionalesDisponibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}{p.especialidad ? ` · ${p.especialidad}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" loading={guardando} disabled={!profesionalNuevoId}>
              Agregar al equipo
            </Button>
          </form>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
      {info && <p className={styles.info}>{info}</p>}
    </FormPage>
  )
}