import { Link } from 'react-router-dom'
import {
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Settings,
  Stethoscope,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import styles from './CentroAyuda.module.css'

export default function CentroAyuda() {
  const { role } = useAuth()
  const secciones = [
    {
      titulo: 'Resumen',
      descripcion: 'Consulta de un vistazo las citas del día y los indicadores principales.',
      enlace: '/',
      accion: 'Ir al resumen',
      Icono: LayoutDashboard,
    },
    {
      titulo: 'Pacientes y expediente',
      descripcion: 'Busca pacientes y abre su expediente para revisar sus datos, historial de citas, notas clínicas y documentos.',
      enlace: '/pacientes',
      accion: 'Ver pacientes',
      Icono: Users,
    },
    {
      titulo: 'Agenda',
      descripcion: 'Programa y reprograma citas, abre videoconsultas y actualiza su estado al cancelarlas o completarlas.',
      enlace: '/citas',
      accion: 'Abrir agenda',
      Icono: CalendarDays,
    },
    {
      titulo: 'Notas clínicas',
      descripcion: 'Desde una cita puedes registrar la atención, consultar sus notas e imprimir una ficha con los datos del paciente y la consulta.',
      enlace: '/citas',
      accion: 'Buscar una cita',
      Icono: FileText,
    },
    {
      titulo: 'Documentos',
      descripcion: 'Los documentos se consultan y administran dentro del expediente del paciente al que pertenecen.',
      enlace: '/pacientes',
      accion: 'Abrir expedientes',
      Icono: FolderOpen,
    },
  ]

  if (role === 'admin') {
    secciones.push(
      {
        titulo: 'Profesionales',
        descripcion: 'Administra el catálogo de profesionales y sus especialidades.',
        enlace: '/admin/profesionales',
        accion: 'Ver profesionales',
        Icono: Stethoscope,
      },
      {
        titulo: 'Asignaciones',
        descripcion: 'Relaciona pacientes con los profesionales que pueden atenderlos.',
        enlace: '/admin/asignaciones',
        accion: 'Administrar asignaciones',
        Icono: ClipboardList,
      },
      {
        titulo: 'Ajustes y roles',
        descripcion: 'Consulta usuarios y gestiona sus roles y permisos de acceso.',
        enlace: '/admin/roles',
        accion: 'Abrir ajustes',
        Icono: Settings,
      }
    )
  }

  return (
    <DashboardLayout>
      <main className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Guía del sistema</p>
          <h1>Centro de ayuda</h1>
          <p>Encuentra qué puedes hacer en cada sección de Clínica+.</p>
        </header>

        <div className={styles.sections}>
          {secciones.map(({ titulo, descripcion, enlace, accion, Icono }) => (
            <section className={styles.section} key={titulo}>
              <div className={styles.icon}><Icono size={19} aria-hidden="true" /></div>
              <div className={styles.content}>
                <h2>{titulo}</h2>
                <p>{descripcion}</p>
                <Link to={enlace}>{accion} <span aria-hidden="true">→</span></Link>
              </div>
            </section>
          ))}
        </div>
      </main>
    </DashboardLayout>
  )
}