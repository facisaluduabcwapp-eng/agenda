import DashboardLayout from '../dashboard/DashboardLayout'
import styles from './FormPage.module.css'

export default function FormPage({ eyebrow, title, description, children }) {
  return (
    <DashboardLayout>
      <main className={styles.page}>
        <div className={styles.header}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        <section className={styles.card}>{children}</section>
      </main>
    </DashboardLayout>
  )
}
