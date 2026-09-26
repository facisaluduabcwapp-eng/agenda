import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { buildGoogleCalendarUrl } from '../lib/googleCalendar'
import { enviarNotificacionCita } from '../lib/emailNotifications'
import FormPage from '../components/layout/FormPage'
import Button from '../components/ui/Button'

function toDatetimeLocal(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatFechaLegible(isoString) {
  return new Date(isoString).toLocaleString('es', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
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
  const [profesionalesAsignados, setProfesionalesAsignados] = useState([])

  const [pacienteId, setPacienteId] = useState(pacientePreseleccionado)
  const [profesionalId, setProfesionalId] = useState('')
  const [fechaHora, setFechaHora] = useState('')
  const [notas, setNotas] = useState('')
  const [enlaceVideoconsulta, setEnlaceVideoconsulta] = useState('')

  const [citaOriginal, setCitaOriginal] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function cargarProfesionalesAsignados() {
      if (!pacienteId) {
        setProfesionalesAsignados([])
        return
      }

      const { data, error: asignacionesError } = await supabase
        .from('paciente_profesional')
        .select('profesional_id')
        .eq('paciente_id', pacienteId)

      if (asignacionesError) {
        setError(asignacionesError.message)
        setProfesionalesAsignados([])
        return
      }

      setProfesionalesAsignados(data.map((asignacion) => asignacion.profesional_id))
    }

    cargarProfesionalesAsignados()
  }, [pacienteId])

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      setError(null)

      const [
        { data: pacientesData, error: pacientesError },
        { data: profesionalesData, error: profesionalesError },
      ] = await Promise.all([
        // email se trae aquí para poder notificar al paciente al
        // crear/reprogramar/cancelar su cita.
        supabase.from('pacientes').select('id, nombre, apellido, email').order('nombre'),
        (() => {
          let query = supabase
            .from('profesionales')
            .select('id, nombre, especialidad, profile_id, profiles(email)')
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
  const profesionalesDisponibles = profesionales.filter((profesional) =>
    profesionalesAsignados.includes(profesional.id)
  )

  const generarEnlaceVideoconsulta = () => {
    const sala = `AgendaPro-${crypto.randomUUID()}`
    setEnlaceVideoconsulta(`https://meet.jit.si/${sala}`)
  }

  const pacienteSeleccionado = pacientes.find((p) => p.id === pacienteId)
  const profesionalSeleccionado = profesionales.find((p) => p.id === profesionalId)
  const nombrePacienteSeleccionado = pacienteSeleccionado
    ? `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}`
    : ''
  const tituloEventoCalendar = profesionalSeleccionado
    ? `Cita: ${nombrePacienteSeleccionado} con ${profesionalSeleccionado.nombre}`
    : `Cita: ${nombrePacienteSeleccionado}`

  const fechaHoraSeleccionadaISO = fechaHora ? new Date(fechaHora).toISOString() : null
  const googleCalendarUrl = pacienteId
    ? buildGoogleCalendarUrl({
        titulo: tituloEventoCalendar,
        descripcion: [notas, enlaceVideoconsulta].filter(Boolean).join('\n'),
        fechaHoraISO: fechaHoraSeleccionadaISO,
      })
    : null

  // Notifica a las dos partes posibles, cada una con su propia regla:
  // - Profesional: solo si alguien MÁS lo asignó (si te agendas tú
  //   mismo, no hace falta que te avises a ti mismo).
  // - Paciente: siempre que tenga correo registrado, sin importar
  //   quién creó la cita (el paciente nunca es quien la crea).
  const notificarPersonasSiAplica = async (tipoEvento) => {
    const envios = []

    if (profesionalSeleccionado && profesionalSeleccionado.profile_id !== session.user.id) {
      envios.push(
        enviarNotificacionCita({
          destinatarioEmail: profesionalSeleccionado.profiles?.email,
          destinatarioNombre: profesionalSeleccionado.nombre,
          pacienteNombre: nombrePacienteSeleccionado,
          fechaHoraTexto: formatFechaLegible(fechaHoraSeleccionadaISO),
          notas,
          tipoEvento,
        })
      )
    }

    if (pacienteSeleccionado?.email) {
      envios.push(
        enviarNotificacionCita({
          destinatarioEmail: pacienteSeleccionado.email,
          destinatarioNombre: nombrePacienteSeleccionado,
          pacienteNombre: nombrePacienteSeleccionado,
          fechaHoraTexto: formatFechaLegible(fechaHoraSeleccionadaISO),
          notas,
          tipoEvento,
        })
      )
    }

    await Promise.all(envios)
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

      if (cambioDeFecha) {
        payload.estado = 'reprogramada'
      }

      const { error } = await supabase.from('citas').update(payload).eq('id', id)

      setSaving(false)

      if (error) {
        setError(error.message)
        return
      }

      if (cambioDeFecha) {
        notificarPersonasSiAplica('reprogramada')
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

    notificarPersonasSiAplica('nueva')

    navigate(`/citas/${citaCreada.id}/editar`)
  }

  if (loading) return <FormPage title="Cita" description="Cargando datos de la cita..." />

  return (
    <FormPage
      eyebrow="Agenda"
      title={isEditing ? 'Reprogramar cita' : 'Nueva cita'}
      description="Selecciona paciente, profesional, horario y modalidad de atención."
    >
      {bloqueada && (
        <p style={{ color: 'crimson', marginBottom: '1rem' }}>
          Esta cita está {citaOriginal.estado} y ya no se puede modificar.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.875rem' }}>
            Paciente
            <select
              value={pacienteId}
              onChange={(e) => {
                setPacienteId(e.target.value)
                setProfesionalId('')
              }}
              required
              disabled={bloqueada}
              style={{ display: 'block', width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px' }}
            >
              <option value="">-- Selecciona un paciente --</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.apellido}
                </option>
              ))}
            </select>
          </label>
          {pacienteSeleccionado && (
            <p style={{ marginTop: '6px', fontSize: '0.8rem', color: '#64748b' }}>
              {pacienteSeleccionado.email
                ? `Se notificará por correo a ${pacienteSeleccionado.email}`
                : 'Este paciente no tiene correo registrado; no se le podrá notificar.'}
            </p>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.875rem' }}>
            Enlace de videoconsulta
            <input
              type="url"
              value={enlaceVideoconsulta}
              onChange={(e) => setEnlaceVideoconsulta(e.target.value)}
              placeholder="Se generará un enlace de Jitsi Meet"
              disabled={bloqueada}
              style={{ display: 'block', width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px', boxSizing: 'border-box' }}
            />
          </label>

          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={generarEnlaceVideoconsulta}
            disabled={bloqueada}
            style={{ marginTop: '8px' }}
          >
            {enlaceVideoconsulta ? '🔄 Regenerar enlace' : '📹 Generar enlace de videoconsulta'}
          </Button>

          {enlaceVideoconsulta && (
            <p style={{ marginTop: '6px', fontSize: '0.85rem' }}>
              <a href={enlaceVideoconsulta} target="_blank" rel="noreferrer" style={{ color: '#7c3aed', fontWeight: 600 }}>
                Abrir videoconsulta ↗
              </a>
            </p>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.875rem' }}>
            Profesional
            <select
              value={profesionalId}
              onChange={(e) => setProfesionalId(e.target.value)}
              disabled={bloqueada}
              style={{ display: 'block', width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px' }}
            >
              <option value="">-- Sin asignar --</option>
              {profesionalesDisponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.especialidad ? ` · ${p.especialidad}` : ''}
                </option>
              ))}
            </select>
          </label>
          {profesionalSeleccionado && profesionalSeleccionado.profile_id !== session.user.id && (
            <p style={{ marginTop: '6px', fontSize: '0.8rem', color: '#64748b' }}>
              {profesionalSeleccionado.profiles?.email
                ? `Se notificará por correo a ${profesionalSeleccionado.profiles.email}`
                : 'Este profesional no tiene correo registrado; no se le podrá notificar.'}
            </p>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.875rem' }}>
            Fecha y hora
            <input
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
              required
              disabled={bloqueada}
              style={{ display: 'block', width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px' }}
            />
          </label>

          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => window.open(googleCalendarUrl, '_blank', 'noopener,noreferrer')}
            disabled={bloqueada || !googleCalendarUrl}
            style={{ marginTop: '8px' }}
          >
            📅 Agregar a Google Calendar
          </Button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.875rem' }}>
            Notas
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              disabled={bloqueada}
              style={{ display: 'block', width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px' }}
            />
          </label>
        </div>

        {error && <p style={{ color: 'crimson', marginBottom: '1rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Button
            type="submit"
            variant="primary"
            size="medium"
            loading={saving}
            disabled={bloqueada}
          >
            {isEditing ? 'Guardar cambios' : 'Crear cita'}
          </Button>

          <Link to="/citas" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="medium">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </FormPage>
  )
}