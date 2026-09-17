import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

function toDatetimeLocal(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function CitaForm() {
  const { role, session } = useAuth()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const [searchParams] = useSearchParams()
  const pacientePreseleccionado = searchParams.get('paciente_id') || ''
  const navigate = useNavigate()

  const [pacientes, setPacientes] = useState([])
  const [profesionales, setProfesionales] = useState([])

  const [pacienteId, setPacienteId] = useState(pacientePreseleccionado)
  const [profesionalId, setProfesionalId] = useState('')
  const [fechaHora, setFechaHora] = useState('')
  const [notas, setNotas] = useState('')
  const [enlaceVideoconsulta, setEnlaceVideoconsulta] = useState('')

  // Guarda fecha_hora y estado originales para detectar si el cambio
  // cuenta como "reprogramación" y para bloquear edición si ya está
  // cancelada o completada.
  const [citaOriginal, setCitaOriginal] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      setError(null)

      const [
        { data: pacientesData, error: pacientesError },
        { data: profesionalesData, error: profesionalesError },
      ] = await Promise.all([
        supabase.from('pacientes').select('id, nombre, apellido').order('nombre'),
        (() => {
          let query = supabase
            .from('profesionales')
            .select('id, nombre, especialidad')
            .eq('estado', 'activo')

          if (role !== 'admin') query = query.eq('profile_id', session.user.id)

          return query.order('nombre')
        })(),
      ])

      if (pacientesError) {
        setError(pacientesError.message)
        setLoading(false)
        return
      }
      if (profesionalesError) {
        setError(profesionalesError.message)
        setLoading(false)
        return
      }

      setPacientes(pacientesData)
      setProfesionales(profesionalesData)

      if (isEditing) {
        const { data: cita, error: citaError } = await supabase
          .from('citas')
          .select('id, paciente_id, profesional_id, fecha_hora, notas, estado, enlace_videoconsulta')
          .eq('id', id)
          .single()

        if (citaError) {
          setError(citaError.message)
          setLoading(false)
          return
        }

        setPacienteId(cita.paciente_id)
        setProfesionalId(cita.profesional_id || '')
        setFechaHora(toDatetimeLocal(cita.fecha_hora))
        setNotas(cita.notas || '')
        setEnlaceVideoconsulta(cita.enlace_videoconsulta || '')
        setCitaOriginal({ fecha_hora: cita.fecha_hora, estado: cita.estado })
      }

      setLoading(false)
    }

    cargar()
  }, [id, isEditing, role, session])

  const bloqueada = citaOriginal && ['cancelada', 'completada'].includes(citaOriginal.estado)

  const generarEnlaceVideoconsulta = () => {
    const sala = `AgendaPro-${crypto.randomUUID()}`
    setEnlaceVideoconsulta(`https://meet.jit.si/${sala}`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (bloqueada) return

    setSaving(true)
    setError(null)

    const fechaHoraISO = new Date(fechaHora).toISOString()

    if (isEditing) {
      const cambioDeFecha = fechaHoraISO !== new Date(citaOriginal.fecha_hora).toISOString()

      const payload = {
        paciente_id: pacienteId,
        profesional_id: profesionalId || null,
        fecha_hora: fechaHoraISO,
        notas,
        enlace_videoconsulta: enlaceVideoconsulta || null,
      }

      // Solo tocamos "estado" si de verdad cambió la fecha/hora; si solo
      // se editaron notas o profesional, el estado queda como estaba.
      if (cambioDeFecha) {
        payload.estado = 'reprogramada'
      }

      const { error } = await supabase.from('citas').update(payload).eq('id', id)

      setSaving(false)

      if (error) {
        setError(error.message)
        return
      }

      navigate('/citas')
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const { data: citaCreada, error } = await supabase.from('citas').insert({
      paciente_id: pacienteId,
      profesional_id: profesionalId || null,
      fecha_hora: fechaHoraISO,
      notas,
      enlace_videoconsulta: enlaceVideoconsulta || null,
      creado_por: userData.user.id,
    }).select('id').single()

    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate(`/citas/${citaCreada.id}/editar`)
  }

  if (loading) return <p>Cargando...</p>

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto' }}>
      <h1>{isEditing ? 'Reprogramar cita' : 'Nueva cita'}</h1>

      {bloqueada && (
        <p style={{ color: 'crimson' }}>
          Esta cita está {citaOriginal.estado} y ya no se puede modificar.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            Paciente
            <select
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
              required
              disabled={bloqueada}
              style={{ display: 'block', width: '100%' }}
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

        <div style={{ marginBottom: 12 }}>
          <label>
            Enlace de videoconsulta
            <input
              type="url"
              value={enlaceVideoconsulta}
              onChange={(e) => setEnlaceVideoconsulta(e.target.value)}
              placeholder="Se generará un enlace de Jitsi Meet"
              disabled={bloqueada}
              style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
            />
          </label>
          <button type="button" onClick={generarEnlaceVideoconsulta} disabled={bloqueada} style={{ marginTop: 6 }}>
            {enlaceVideoconsulta ? 'Regenerar enlace' : 'Generar enlace de videoconsulta'}
          </button>
          {enlaceVideoconsulta && (
            <p>
              <a href={enlaceVideoconsulta} target="_blank" rel="noreferrer">Abrir videoconsulta</a>
            </p>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Profesional
            <select
              value={profesionalId}
              onChange={(e) => setProfesionalId(e.target.value)}
              disabled={bloqueada}
              style={{ display: 'block', width: '100%' }}
            >
              <option value="">-- Sin asignar --</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.especialidad ? ` · ${p.especialidad}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Fecha y hora
            <input
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
              required
              disabled={bloqueada}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Notas
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              disabled={bloqueada}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
        </div>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}

        <button type="submit" disabled={saving || bloqueada}>
          {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear cita'}
        </button>
      </form>

      <p style={{ marginTop: 24 }}>
        <Link to="/citas">&larr; Volver a la agenda</Link>
      </p>
    </div>
  )
}