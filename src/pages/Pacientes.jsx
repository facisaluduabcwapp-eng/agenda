import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import StatCard from '../components/dashboard/StatCard'
import styles from './Pacientes.module.css'

export default function Pacientes() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fechaActual = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPacientes(search)
    }, 300)

    return () => clearTimeout(timeout)
  }, [search])

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
            icon="👥"
            colorTheme="purple"
          />
          <StatCard
            title="Nuevos este mes"
            value="18"
            badge="4 esta semana"
            icon="👤"
            colorTheme="pink"
          />
          <StatCard
            title="En seguimiento"
            value="32"
            badge="12 requieren atención"
            icon="⏱️"
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
              <button className={styles.btnSecondary}>🎛️ Filtros</button>
              <button className={styles.btnSecondary}>📥 Exportar</button>
            </div>
          </div>

          {error && <p style={{ color: 'crimson', padding: '1rem' }}>{error}</p>}

          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando directorio...</p>
          ) : pacientes.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No se encontraron pacientes registrados.</p>
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
                {pacientes.map((p) => {
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