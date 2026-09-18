import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import StatCard from '../components/dashboard/StatCard'
import AgendaHoy from '../components/dashboard/AgendaHoy'
import Recordatorios from '../components/dashboard/Recordatorios'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { session, role } = useAuth()
  const nombreUsuario = session?.user?.email ? session.user.email.split('@')[0] : 'Usuario'
  const fechaActual = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  const [stats, setStats] = useState({ pacientes: 0, citas: 0, completadas: 0, documentos: 0 })

  useEffect(() => {
    const inicio = new Date()
    inicio.setHours(0, 0, 0, 0)
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 1)

    Promise.all([
      supabase.from('pacientes').select('id', { count: 'exact', head: true }),
      supabase.from('citas').select('id', { count: 'exact', head: true }).gte('fecha_hora', inicio.toISOString()).lt('fecha_hora', fin.toISOString()),
      supabase.from('citas').select('id', { count: 'exact', head: true }).eq('estado', 'completada'),
      supabase.from('documentos').select('id', { count: 'exact', head: true }),
    ]).then(([pacientes, citas, completadas, documentos]) => {
      setStats({
        pacientes: pacientes.count || 0,
        citas: citas.count || 0,
        completadas: completadas.count || 0,
        documentos: documentos.count || 0,
      })
    })
  }, [])

  return (
    <DashboardLayout>
        <main className={styles.body}>
          <section className={styles.welcomeSection}>
            <div>
              <p className={styles.date}>{fechaActual}</p>
              <h1 className={styles.title}>
                Buenos días, {nombreUsuario} <span className={styles.sparkle}>✦</span>
              </h1>
              <p className={styles.subtitle}>
                Aquí tienes el resumen de tu clínica para hoy. (Rol: <strong>{role}</strong>)
              </p>
            </div>
            <Link to="/citas/nueva" className={styles.btnCita}>
              <span>+</span> Nueva cita
            </Link>
          </section>

          <section className={styles.statsGrid}>
            <StatCard
              title="Pacientes visibles"
              value={stats.pacientes}
              icon="👥"
              colorTheme="purple"
            />
            <StatCard
              title="Citas de hoy"
              value={stats.citas}
              icon="📅"
              colorTheme="pink"
            />
            <StatCard
              title="Consultas completadas"
              value={stats.completadas}
              icon="✓"
              colorTheme="green"
            />
            <StatCard
              title="Documentos registrados"
              value={stats.documentos}
              icon="📄"
              colorTheme="yellow"
            />
          </section>

          <div className={styles.gridTwoCols}>
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>Agenda de hoy</h3>
              <AgendaHoy />
            </div>

            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>Próximos recordatorios</h3>
              <Recordatorios />
            </div>
          </div>
        </main>
    </DashboardLayout>
  )
}