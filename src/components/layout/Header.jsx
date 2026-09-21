import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import styles from './Header.module.css'
import { Bell, Search } from 'lucide-react'

export default function Header() {
  const { session } = useAuth()
  const email = session?.user?.email || 'Usuario'
  const initials = email.substring(0, 2).toUpperCase()

  return (
    <header className={styles.header}>
      <div className={styles.searchContainer}>
        <Search size={17} aria-hidden="true" className={styles.searchIcon} />
        <input 
          type="text" 
          placeholder="Buscar pacientes, citas..." 
          className={styles.searchInput}
        />
      </div>

      <div className={styles.userSection}>
        <button className={styles.bellBtn} title="Notificaciones"><Bell size={18} aria-hidden="true" /></button>
        <div className={styles.userProfile}>
          <div className={styles.avatar}>{initials}</div>
          <span className={styles.userName}>{email.split('@')[0]}</span>
        </div>
        <button 
          onClick={() => supabase.auth.signOut()} 
          className={styles.logoutBtn}
        >
          Salir
        </button>
      </div>
    </header>
  )
}