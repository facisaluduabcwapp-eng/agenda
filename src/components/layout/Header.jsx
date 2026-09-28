import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import styles from './Header.module.css'
import { Bell, CalendarDays, Search, UserRound } from 'lucide-react'

function formatFechaCita(fechaHora) {
  return new Date(fechaHora).toLocaleString('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function Header() {
  const { session } = useAuth()
  const email = session?.user?.email || 'Usuario'
  const initials = email.substring(0, 2).toUpperCase()
  const [termino, setTermino] = useState('')
  const [resultados, setResultados] = useState({ pacientes: [], citas: [] })
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState(null)
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const contenedorBusqueda = useRef(null)

  useEffect(() => {
    const texto = termino.trim()
    if (texto.length < 2) return undefined

    let activo = true
    const timeout = setTimeout(async () => {
      const patron = `%${texto}%`
      const [pacientesResult, citasNotasResult] = await Promise.all([
        supabase
          .from('pacientes')
          .select('id, nombre, apellido, email, telefono')
          .or(`nombre.ilike.${patron},apellido.ilike.${patron},email.ilike.${patron},telefono.ilike.${patron}`)
          .limit(5),
        supabase
          .from('citas')
          .select('id, paciente_id, fecha_hora, estado, pacientes(nombre, apellido)')
          .ilike('notas', patron)
          .order('fecha_hora', { ascending: false })
          .limit(5),
      ])

      if (!activo) return

      if (pacientesResult.error || citasNotasResult.error) {
        setErrorBusqueda(pacientesResult.error?.message || citasNotasResult.error?.message)
        setBuscando(false)
        return
      }

      const pacientes = pacientesResult.data || []
      const pacienteIds = pacientes.map((paciente) => paciente.id)
      let citasPaciente = []

      if (pacienteIds.length) {
        const { data, error } = await supabase
          .from('citas')
          .select('id, paciente_id, fecha_hora, estado, pacientes(nombre, apellido)')
          .in('paciente_id', pacienteIds)
          .order('fecha_hora', { ascending: false })
          .limit(5)

        if (!activo) return
        if (error) {
          setErrorBusqueda(error.message)
          setBuscando(false)
          return
        }
        citasPaciente = data || []
      }

      const citasUnicas = new Map()
      ;[...(citasNotasResult.data || []), ...citasPaciente].forEach((cita) => {
        citasUnicas.set(cita.id, cita)
      })

      setResultados({ pacientes, citas: [...citasUnicas.values()].slice(0, 5) })
      setErrorBusqueda(null)
      setBuscando(false)
    }, 250)

    return () => {
      activo = false
      clearTimeout(timeout)
    }
  }, [termino])

  useEffect(() => {
    const cerrarAlHacerClickFuera = (event) => {
      if (!contenedorBusqueda.current?.contains(event.target)) {
        setMostrarResultados(false)
      }
    }

    document.addEventListener('mousedown', cerrarAlHacerClickFuera)
    return () => document.removeEventListener('mousedown', cerrarAlHacerClickFuera)
  }, [])

  const handleBuscar = (event) => {
    const valor = event.target.value
    setTermino(valor)
    setResultados({ pacientes: [], citas: [] })
    setErrorBusqueda(null)
    setBuscando(valor.trim().length >= 2)
    setMostrarResultados(true)
  }

  const cerrarResultados = () => setMostrarResultados(false)

  return (
    <header className={styles.header}>
      <div className={styles.searchContainer} ref={contenedorBusqueda}>
        <Search size={17} aria-hidden="true" className={styles.searchIcon} />
        <input
          type="search"
          value={termino}
          onChange={handleBuscar}
          onFocus={() => setMostrarResultados(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') cerrarResultados()
          }}
          placeholder="Buscar pacientes, citas..."
          aria-label="Buscar pacientes y citas"
          aria-expanded={mostrarResultados}
          aria-controls="resultados-busqueda"
          className={styles.searchInput}
        />
        {mostrarResultados && termino.trim() && (
          <div className={styles.searchResults} id="resultados-busqueda" role="region" aria-label="Resultados de búsqueda">
            {termino.trim().length < 2 ? (
              <p className={styles.searchMessage}>Escribe al menos 2 caracteres.</p>
            ) : buscando ? (
              <p className={styles.searchMessage}>Buscando...</p>
            ) : errorBusqueda ? (
              <p className={styles.searchError}>{errorBusqueda}</p>
            ) : resultados.pacientes.length === 0 && resultados.citas.length === 0 ? (
              <p className={styles.searchMessage}>No se encontraron pacientes ni citas.</p>
            ) : (
              <>
                {resultados.pacientes.length > 0 && (
                  <section className={styles.resultGroup}>
                    <h2>Pacientes</h2>
                    {resultados.pacientes.map((paciente) => (
                      <Link
                        key={paciente.id}
                        to={`/pacientes/${paciente.id}`}
                        className={styles.resultItem}
                        onClick={cerrarResultados}
                      >
                        <UserRound size={17} aria-hidden="true" />
                        <span>
                          <strong>{paciente.nombre} {paciente.apellido}</strong>
                          <small>{paciente.email || paciente.telefono || 'Abrir expediente'}</small>
                        </span>
                      </Link>
                    ))}
                  </section>
                )}
                {resultados.citas.length > 0 && (
                  <section className={styles.resultGroup}>
                    <h2>Citas</h2>
                    {resultados.citas.map((cita) => (
                      <Link
                        key={cita.id}
                        to={`/citas/${cita.id}/nota`}
                        className={styles.resultItem}
                        onClick={cerrarResultados}
                      >
                        <CalendarDays size={17} aria-hidden="true" />
                        <span>
                          <strong>{cita.pacientes?.nombre} {cita.pacientes?.apellido}</strong>
                          <small>{formatFechaCita(cita.fecha_hora)} · {cita.estado}</small>
                        </span>
                      </Link>
                    ))}
                  </section>
                )}
              </>
            )}
          </div>
        )}
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