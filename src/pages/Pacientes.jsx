import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import StatCard from '../components/dashboard/StatCard'
import styles from './Pacientes.module.css'
import { Clock3, UserRound, Users, SlidersHorizontal, Download } from 'lucide-react'

export default function Pacientes() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [soloConEmail, setSoloConEmail] = useState(false)
  const [soloConTelefono, setSoloConTelefono] = useState(false)
  const [orden, setOrden] = useState('apellido')

  const fechaActual = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const loadPacientes = async (term) => {
    setLoading(true)
    setError(null)

    let query = supabase.from('pacientes').select('*').order('apellido')

    if (term.trim()) {
      query = query.or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%`)
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
    } else {
      setPacientes(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPacientes(search)
    }, 300)

    return () => clearTimeout(timeout)
  }, [search])

  // Utilidad para calcular edad desde la fecha de nacimiento
  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return '—'
    const hoy = new Date()
    const nacimiento = new Date(fechaNacimiento)
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    const m = hoy.getMonth() - nacimiento.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--
    }
    return `${edad} años`
  }

  const pacientesFiltrados = useMemo(() => {
    return [...pacientes]
      .filter((paciente) => !soloConEmail || Boolean(paciente.email?.trim()))
      .filter((paciente) => !soloConTelefono || Boolean(paciente.telefono?.trim()))
      .sort((a, b) => {
        const valorA = orden === 'nombre' ? `${a.nombre} ${a.apellido}` : `${a.apellido} ${a.nombre}`
        const valorB = orden === 'nombre' ? `${b.nombre} ${b.apellido}` : `${b.apellido} ${b.nombre}`
        return valorA.localeCompare(valorB, 'es', { sensitivity: 'base' })
      })
  }, [pacientes, soloConEmail, soloConTelefono, orden])

  const exportarPacientes = () => {
    const encabezados = ['Nombre', 'Apellido', 'Edad', 'Telefono', 'Correo', 'Notas']
    const escapar = (valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`
    const filas = pacientesFiltrados.map((paciente) => [
      paciente.nombre,
      paciente.apellido,
      calcularEdad(paciente.fecha_nacimiento),
      paciente.telefono,
      paciente.email,
      paciente.notas_generales,
    ].map(escapar).join(','))
    const csv = `\uFEFF${[encabezados, ...filas.map((fila) => fila)].map((fila) => Array.isArray(fila) ? fila.map(escapar).join(',') : fila).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `pacientes-${new Date().toISOString().slice(0, 10)}.csv`
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout>
      <main className={styles.body}>
        {/* Encebezado */}
        <section className={styles.welcomeSection}>
          <div>
            <p className={styles.date}>{fechaActual}</p>
            <h1 className={styles.title}>Pacientes</h1>
            <p className={styles.subtitle}>
              Gestiona la información de tu clínica de forma simple y ordenada.
            </p>
          </div>

          {/* Restricción: Solo Admin puede crear nuevos pacientes */}
          {role === 'admin' && (
            <Link to="/pacientes/nuevo" className={styles.btnNuevo}>
              <span>+</span> Nuevo paciente
            </Link>
          )}
        </section>

        {/* Tarjetas de Estadísticas de Pacientes */}
        <section className={styles.statsGrid}>
          <StatCard
            title="Total pacientes"
            value={pacientes.length}
            badge="+12.5% este mes"
            icon={<Users size={19} aria-hidden="true" />}
            colorTheme="purple"
          />
          <StatCard
            title="Nuevos este mes"
            value="18"
            badge="4 esta semana"
            icon={<UserRound size={19} aria-hidden="true" />}
            colorTheme="pink"
          />
          <StatCard
            title="En seguimiento"
            value="32"
            badge="12 requieren atención"
            icon={<Clock3 size={19} aria-hidden="true" />}
            colorTheme="yellow"
          />
        </section>

        {/* Tabla / Directorio de Pacientes */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <h3 className={styles.sectionTitle}>Directorio de pacientes</h3>
              <p className={styles.sectionDesc}>
                {role === 'admin'
                  ? 'Consulta y gestiona la información clínica.'
                  : 'Consulta la información de tus pacientes autorizados.'}
              </p>
            </div>

            <div className={styles.controls}>
              <input
                type="text"
                placeholder="Buscar pacientes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
              <button type="button" className={styles.btnSecondary} onClick={() => setMostrarFiltros((visible) => !visible)} aria-expanded={mostrarFiltros}>
                <SlidersHorizontal size={16} aria-hidden="true" /> Filtros
              </button>
              <button type="button" className={styles.btnSecondary} onClick={exportarPacientes} disabled={pacientesFiltrados.length === 0}>
                <Download size={16} aria-hidden="true" /> Exportar
              </button>
            </div>
          </div>

          {mostrarFiltros && (
            <div className={styles.filterPanel} aria-label="Filtros de pacientes">
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={soloConEmail} onChange={(event) => setSoloConEmail(event.target.checked)} />
                Con correo electrónico
              </label>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={soloConTelefono} onChange={(event) => setSoloConTelefono(event.target.checked)} />
                Con teléfono
              </label>
              <label className={styles.sortLabel}>
                Ordenar por
                <select value={orden} onChange={(event) => setOrden(event.target.value)}>
                  <option value="apellido">Apellido</option>
                  <option value="nombre">Nombre</option>
                </select>
              </label>
            </div>
          )}

          {error && <p style={{ color: 'crimson', padding: '1rem' }}>{error}</p>}

          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando directorio...</p>
          ) : pacientesFiltrados.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{pacientes.length === 0 ? 'No se encontraron pacientes registrados.' : 'Ningún paciente coincide con los filtros.'}</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PACIENTE</th>
                  <th>EDAD</th>
                  <th>TELÉFONO</th>
                  <th>CORREO</th>
                  <th>ESTADO</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pacientesFiltrados.map((p) => {
                  const iniciales = `${p.nombre?.[0] || ''}${p.apellido?.[0] || ''}`.toUpperCase()
                  return (
                    <tr
                      key={p.id}
                      className={styles.row}
                      onClick={() => navigate(`/pacientes/${p.id}`)}
                    >
                      <td>
                        <div className={styles.patientCell}>
                          <div className={styles.avatar}>{iniciales || 'P'}</div>
                          <div>
                            <span className={styles.patientName}>{p.nombre} {p.apellido}</span>
                            <span className={styles.patientSub}>{p.notas_generales || 'Sin notas'}</span>
                          </div>
                        </div>
                      </td>
                      <td>{calcularEdad(p.fecha_nacimiento)}</td>
                      <td>{p.telefono || '—'}</td>
                      <td>{p.email || '—'}</td>
                      <td>
                        <span className={styles.statusBadge}>Activo</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={styles.arrowLink}>›</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </DashboardLayout>
  )
}