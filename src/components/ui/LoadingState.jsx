import { LoaderCircle } from 'lucide-react'
import styles from './LoadingState.module.css'

export default function LoadingState({ message = 'Cargando...' }) {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <LoaderCircle size={24} aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}