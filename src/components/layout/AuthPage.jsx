import styles from './AuthPage.module.css'

export default function AuthPage({ eyebrow, title, description, children }) {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brandMark}>+</div>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
        {children}
      </section>
    </main>
  )
}
