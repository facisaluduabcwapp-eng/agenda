import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import FormPage from '../components/layout/FormPage'

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
      title="Asignar pacientes a profesionales"
      description="Gestiona las asignaciones multidisciplinarias del expediente."
    >
      <p style={{ color: '#555' }}>
        Solo el admin puede crear o quitar asignaciones (policy{' '}
        <code>paciente_profesional_admin_write</code>).
      </p>

      <div style={{ marginBottom: 20 }}>
        <label>
          Paciente
          <select
            value={pacienteId}
            onChange={(e) => {
              setPacienteId(e.target.value)
              setInfo(null)
              setError(null)
            }}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          >
            <option value="">-- Selecciona un paciente --</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.apellido}
              </option>
            ))}
          </select>
        </label>
      </div>

      {pacienteId && (
        <>
          <h2 style={{ fontSize: '1.1rem' }}>Profesionales asignados</h2>

          {loadingAsignaciones ? (
            <p>Cargando asignaciones...</p>
          ) : asignaciones.length === 0 ? (
            <p style={{ color: '#777' }}>Este paciente no tiene profesionales asignados todavía.</p>
          ) : (
            <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
              {asignaciones.map((a) => (
                <li
                  key={a.profesional_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <span>
                    {a.profesionales?.nombre}
                    {a.profesionales?.especialidad ? ` · ${a.profesionales.especialidad}` : ''}
                  </span>
                  <button type="button" onClick={() => handleQuitar(a.profesional_id)}>
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAsignar} style={{ marginTop: 20, display: 'flex', gap: 8 }}>
            <select
              value={profesionalNuevoId}
              onChange={(e) => setProfesionalNuevoId(e.target.value)}
              style={{ flex: 1 }}
              disabled={profesionalesDisponibles.length === 0}
            >
              <option value="">
                {profesionalesDisponibles.length === 0
                  ? 'Todos los profesionales activos ya están asignados'
                  : '-- Elige un profesional para asignar --'}
              </option>
              {profesionalesDisponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.especialidad ? ` · ${p.especialidad}` : ''}
                </option>
              ))}
            </select>
            <button type="submit" disabled={guardando || !profesionalNuevoId}>
              {guardando ? 'Asignando...' : 'Asignar'}
            </button>
          </form>
        </>
      )}

      {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}
      {info && <p style={{ color: 'seagreen', marginTop: 12 }}>{info}</p>}
    </FormPage>
  )
}