import styles from './StatCard.module.css'

export default function StatCard({ title, value, badge, icon, colorTheme }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={`${styles.iconWrapper} ${styles[colorTheme]}`}>
          {icon}
        </div>
        <span className={styles.dots}>•••</span>
      </div>
      <div>
        <p className={styles.title}>{title}</p>
        <div className={styles.valueContainer}>
          <span className={styles.value}>{value}</span>
          {badge && <span className={styles.badge}>{badge}</span>}
        </div>
      </div>
    </div>
  )
}