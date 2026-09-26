import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { buildGoogleCalendarUrl } from '../lib/googleCalendar'
import { enviarNotificacionCita } from '../lib/emailNotifications'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import StatCard from '../components/dashboard/StatCard'
import styles from './Citas.module.css'
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Video,
  CalendarClock,
  CalendarPlus,
  FileText,
  XCircle,
} from 'lucide-react'

const ESTADOS_VISIBLES_DEFAULT = ['agendada', 'reprogramada']

function formatHora(iso) {
  return new Date(iso).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFechaCompleta(iso) {
  return new Date(iso).toLocaleDateString('es', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

function formatFechaLegible(iso) {
  return new Date(iso).toLocaleString('es', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Citas() {
  const { role, session } = useAuth()
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const [completandoId, setCompletandoId] = useState(null)

  const fechaActual = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const cargar = async () => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('citas')
      .select(
        // pacientes(email) y profesionales(profile_id, profiles(email))
        // se traen para poder notificar al cancelar, sin otra consulta.
        'id, fecha_hora, estado, notas, enlace_videoconsulta, pacientes(nombre, apellido, email), profesionales(nombre, profile_id, profiles(email))'
      )
      .order('fecha_hora', { ascending: true })

    if (error) setError(error.message)
    else setCitas(data || [])

    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const handleCancelar = async (cita) => {
    setError(null)
    setInfo(null)

    const { error } = await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', cita.id)

    if (error) {
      setError(error.message)
      return
    }

    setInfo('Cita cancelada correctamente.')

    const nombrePaciente = `${cita.pacientes?.nombre || ''} ${cita.pacientes?.apellido || ''}`.trim()
    const fechaHoraTexto = formatFechaLegible(cita.fecha_hora)
    const envios = []

    // Profesional: solo si quien cancela no es el propio profesional.
    const profesional = cita.profesionales
    if (profesional && profesional.profile_id !== session.user.id) {
      envios.push(
        enviarNotificacionCita({
          destinatarioEmail: profesional.profiles?.email,
          destinatarioNombre: profesional.nombre,
          pacienteNombre: nombrePaciente,
          fechaHoraTexto,
          notas: cita.notas,
          tipoEvento: 'cancelada',
        })
      )
    }

    // Paciente: siempre que tenga correo registrado.
    if (cita.pacientes?.email) {
      envios.push(
        enviarNotificacionCita({
          destinatarioEmail: cita.pacientes.email,
          destinatarioNombre: nombrePaciente,
          pacienteNombre: nombrePaciente,
          fechaHoraTexto,
          notas: cita.notas,
          tipoEvento: 'cancelada',
        })
      )
    }

    await Promise.all(envios)

    cargar()
  }

  const handleCompletar = async (cita) => {
    setError(null)
    setInfo(null)
    setCompletandoId(cita.id)

    const { error: updateError } = await supabase
      .from('citas')
      .update({ estado: 'completada' })
      .eq('id', cita.id)

    if (updateError) {
      setError(updateError.message)
      setCompletandoId(null)
      return
    }

    setInfo('Cita marcada como completada.')
    setMostrarTodas(true)
    await cargar()
    setCompletandoId(null)
  }

  const citasVisibles = mostrarTodas
    ? citas
    : citas.filter((c) => ESTADOS_VISIBLES_DEFAULT.includes(c.estado))

  const inicioHoy = new Date()
  inicioHoy.setHours(0, 0, 0, 0)
  const finHoy = new Date(inicioHoy)
  finHoy.setDate(finHoy.getDate() + 1)
  const citasDeHoy = citas.filter((cita) => {
    const fecha = new Date(cita.fecha_hora)
    return fecha >= inicioHoy && fecha < finHoy
  })
  const citasPendientes = citas.filter((cita) =>
    ['agendada', 'reprogramada'].includes(cita.estado)
  )
  const proximasCitas = citas
    .filter((cita) => new Date(cita.fecha_hora) >= new Date() && ['agendada', 'reprogramada'].includes(cita.estado))
    .slice(0, 3)

  const getBadgeClass = (estado) => {
    switch (estado) {
      case 'agendada':
        return styles.badgeAgendada
      case 'reprogramada':
        return styles.badgeReprogramada
      case 'cancelada':
        return styles.badgeCancelada
      case 'completada':
        return styles.badgeCompletada
      default:
        return styles.badgeCompletada
    }
  }

  return (
    <DashboardLayout>
      <main className={styles.body}>
        {/* Header con botón de acción */}
        <section className={styles.welcomeSection}>
          <div>
            <p className={styles.date}>{fechaActual}</p>
            <h1 className={styles.title}>Agenda médica</h1>
            <p className={styles.subtitle}>
              Gestiona tus citas, llamadas virtuales y estado de atención. Rol: <strong>{role}</strong>
            </p>
          </div>

          <Link to="/citas/nueva" className={styles.btnNuevo}>
            <span>+</span> Nueva cita
          </Link>
        </section>

        {/* Tarjetas resumen */}
        <section className={styles.statsGrid}>
          <StatCard
            title="Citas de hoy"
            value={citasDeHoy.length}
            icon={<CalendarDays size={19} aria-hidden="true" />}
            colorTheme="pink"
          />
          <StatCard
            title="Consultas completadas"
            value={citasDeHoy.filter((c) => c.estado === 'completada').length}
            icon={<CheckCircle2 size={19} aria-hidden="true" />}
            colorTheme="green"
          />
          <StatCard
            title="Atenciones pendientes"
            value={citasPendientes.length}
            icon={<Clock3 size={19} aria-hidden="true" />}
            colorTheme="yellow"
          />
        </section>

        {/* Grid principal */}
        <div className={styles.agendaGrid}>
          {/* Listado principal */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Agenda de atención</h3>
                <p className={styles.sectionDesc}>
                  {citasVisibles.length} citas registradas
                </p>
              </div>

              <div className={styles.controls}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={mostrarTodas}
                    onChange={(e) => setMostrarTodas(e.target.checked)}
                  />
                  Mostrar completadas / canceladas
                </label>
              </div>
            </div>

            {error && <p style={{ color: 'crimson', marginBottom: '1rem' }}>{error}</p>}
            {info && <p style={{ color: 'seagreen', marginBottom: '1rem' }}>{info}</p>}

            {loading ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                Cargando agenda...
              </p>
            ) : citasVisibles.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                No hay citas programadas para mostrar.
              </p>
            ) : (
              <div className={styles.citasList}>
                {citasVisibles.map((c) => {
                  const iniciales = `${c.pacientes?.nombre?.[0] || ''}${c.pacientes?.apellido?.[0] || ''}`.toUpperCase()

                  const nombrePaciente = `${c.pacientes?.nombre || ''} ${c.pacientes?.apellido || ''}`.trim()
                  const tituloEvento = c.profesionales?.nombre
                    ? `Cita: ${nombrePaciente} con ${c.profesionales.nombre}`
                    : `Cita: ${nombrePaciente}`
                  const descripcionEvento = [c.notas, c.enlace_videoconsulta]
                    .filter(Boolean)
                    .join('\n')
                  const googleCalendarUrl = buildGoogleCalendarUrl({
                    titulo: tituloEvento,
                    descripcion: descripcionEvento,
                    fechaHoraISO: c.fecha_hora,
                  })

                  return (
                    <div key={c.id} className={styles.citaRow}>
                      <div className={styles.time}>
                        <div>{formatHora(c.fecha_hora)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {formatFechaCompleta(c.fecha_hora)}
                        </div>
                      </div>

                      <div className={styles.patientCell}>
                        <div className={styles.avatar}>{iniciales || 'P'}</div>
                        <div>
                          <span className={styles.patientName}>
                            {c.pacientes?.nombre} {c.pacientes?.apellido}
                          </span>
                          <span className={styles.patientSub}>
                            {c.notas || 'Consulta general'}
                          </span>
                        </div>
                      </div>

                      <div className={styles.profName}>
                        {c.profesionales?.nombre || '— Sin asignar —'}
                      </div>

                      <div>
                        <span className={`${styles.badge} ${getBadgeClass(c.estado)}`}>
                          {c.estado}
                        </span>
                      </div>

                      <div className={styles.actions}>
                        {c.enlace_videoconsulta && (
                          <a
                            href={c.enlace_videoconsulta}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.actionBtn}
                            title="Ir a videoconsulta"
                          >
                            <Video size={16} />
                          </a>
                        )}

                        {!['cancelada', 'completada'].includes(c.estado) && googleCalendarUrl && (
                          <a
                            href={googleCalendarUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.actionBtn}
                            title="Agregar a Google Calendar"
                          >
                            <CalendarPlus size={16} />
                          </a>
                        )}

                        {!['cancelada', 'completada'].includes(c.estado) && (
                          <>
                            <Link
                              to={`/citas/${c.id}/editar`}
                              className={styles.actionBtn}
                              title="Reprogramar"
                            >
                              <CalendarClock size={16} />
                            </Link>
                            <Link
                              to={`/citas/${c.id}/nota`}
                              className={styles.actionBtn}
                              title="Registrar nota"
                            >
                              <FileText size={16} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleCompletar(c)}
                              disabled={completandoId === c.id}
                              className={`${styles.actionBtn} ${styles.btnSuccess}`}
                              title="Marcar como completada"
                              aria-label={`Marcar cita de ${nombrePaciente} como completada`}
                            >
                              <CheckCircle2 size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelar(c)}
                              className={`${styles.actionBtn} ${styles.btnDanger}`}
                              title="Cancelar"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}

                        {c.estado === 'completada' && (
                          <Link
                            to={`/citas/${c.id}/nota`}
                            className={styles.actionBtn}
                          >
                            Ver nota
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Panel lateral de recordatorios */}
          <div className={styles.sideCard}>
            <h3 className={styles.sectionTitle}>Próximos recordatorios</h3>
            <p className={styles.sectionDesc} style={{ marginBottom: '1rem' }}>
              Próximas citas visibles para tu cuenta
            </p>
            {proximasCitas.length === 0 ? (
              <p className={styles.emptyReminder}>No hay citas próximas.</p>
            ) : (
              proximasCitas.map((cita) => (
                <div className={styles.reminderItem} key={cita.id}>
                  <div className={styles.reminderIcon}><Bell size={17} aria-hidden="true" /></div>
                  <div>
                    <strong className={styles.reminderTitle}>
                      {new Date(cita.fecha_hora).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                    </strong>
                    <span className={styles.reminderText}>
                      {cita.pacientes?.nombre} {cita.pacientes?.apellido}
                    </span>
                    <Link to={`/citas/${cita.id}/nota`} className={styles.reminderLink}>Abrir cita</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}