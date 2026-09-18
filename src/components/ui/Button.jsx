import React from 'react'
import styles from './Button.module.css'

export default function Button({
  children,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost'
  size = 'medium',     // 'small' | 'medium' | 'large'
  disabled = false,
  loading = false,
  onClick,
  style,
  className = '',
  ...props
}) {
  const btnClass = [
    styles.btn,
    styles[variant],
    styles[size],
    disabled || loading ? styles.disabled : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={btnClass}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
      {...props}
    >
      {loading ? (
        <span className={styles.spinnerWrapper}>
          <span className={styles.spinner} />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}