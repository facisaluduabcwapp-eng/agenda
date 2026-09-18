import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const { role } = useAuth()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandIcon}>+</div>
        <div>
          <h2 className={styles.brandTitle}>Clínica+</h2>
          <p className={styles.brandSubtitle}>GESTIÓN INTEGRAL</p>
        </div>
      </div>

      <span className={styles.sectionLabel}>MENÚ PRINCIPAL</span>
      <ul className={styles.navList}>
        <li>
          <Link to="/" className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}>
            <span className={styles.navContent}>📊 Resumen</span>
          </Link>
        </li>
        <li>
          <Link to="/pacientes" className={`${styles.navItem} ${isActive('/pacientes') ? styles.active : ''}`}>
            <span className={styles.navContent}>👥 Pacientes</span>
          </Link>
        </li>
        <li>
          <Link to="/citas" className={`${styles.navItem} ${isActive('/citas') ? styles.active : ''}`}>
            <span className={styles.navContent}>📅 Agenda</span>
          </Link>
        </li>

        {role === 'admin' && (
          <li>
            <Link to="/admin/profesionales" className={`${styles.navItem} ${isActive('/admin/profesionales') ? styles.active : ''}`}>
              <span className={styles.navContent}>🩺 Profesionales</span>
            </Link>
          </li>
        )}
          {role === 'admin' && (
            <li>
              <Link to="/admin/asignaciones" className={`${styles.navItem} ${isActive('/admin/asignaciones') ? styles.active : ''}`}>
                <span className={styles.navContent}>📋 Asignaciones</span>
              </Link>
            </li>
          )}
      </ul>

      <span className={styles.sectionLabel}>CONFIGURACIÓN</span>
      <ul className={styles.navList}>
        {role === 'admin' && (
          <li>
            <Link to="/admin/roles" className={`${styles.navItem} ${isActive('/admin/roles') ? styles.active : ''}`}>
              <span className={styles.navContent}>⚙️ Ajustes / Roles</span>
            </Link>
          </li>
        )}
        <li>
          <a href="#ayuda" className={styles.navItem}>
            <span className={styles.navContent}>❓ Centro de ayuda</span>
          </a>
        </li>
      </ul>
    </aside>
  )
}