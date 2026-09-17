import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const ESTADOS_VISIBLES_DEFAULT = ['agendada', 'reprogramada']

function formatFecha(iso) {
  return new Date(iso).toLocaleString('es', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Citas() {
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [mostrarTodas, setMostrarTodas] = useState(false)

  const cargar = async () => {
    setLoading(true)
    setError(null)

    // RLS ya filtra: solo ves citas de pacientes a los que tienes
    // acceso, o citas donde tú eres el profesional asignado, o que
    // tú mismo creaste. No hace falta filtrar por usuario aquí.
    const { data, error } = await supabase
      .from('citas')
      .select('id, fecha_hora, estado, notas, enlace_videoconsulta, pacientes(nombre, apellido), profesionales(nombre)')
      .order('fecha_hora', { ascending: true })

    if (error) setError(error.message)
    else setCitas(data)

    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const handleCancelar = async (citaId) => {
    setError(null)
    setInfo(null)

    const { error } = await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', citaId)

    if (error) {
      setError(error.message)
      return
    }

    setInfo('Cita cancelada.')
    cargar()
  }

  const citasVisibles = mostrarTodas
    ? citas
    : citas.filter((c) => ESTADOS_VISIBLES_DEFAULT.includes(c.estado))

  if (loading) return <p>Cargando...</p>

  return (
    <div style={{ maxWidth: 720, margin: '2rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Agenda</h1>
        <Link to="/citas/nueva">
          <button type="button">Nueva cita</button>
        </Link>
      </div>

      <label style={{ display: 'block', margin: '12px 0' }}>
        <input
          type="checkbox"
          checked={mostrarTodas}
          onChange={(e) => setMostrarTodas(e.target.checked)}
        />{' '}
        Mostrar canceladas y completadas
      </label>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {info && <p style={{ color: 'seagreen' }}>{info}</p>}

      {citasVisibles.length === 0 ? (
        <p style={{ color: '#777' }}>No hay citas para mostrar.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th style={{ padding: '8px 4px' }}>Fecha</th>
              <th style={{ padding: '8px 4px' }}>Paciente</th>
              <th style={{ padding: '8px 4px' }}>Profesional</th>
              <th style={{ padding: '8px 4px' }}>Estado</th>
              <th style={{ padding: '8px 4px' }}></th>
            </tr>
          </thead>
          <tbody>
            {citasVisibles.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 4px' }}>{formatFecha(c.fecha_hora)}</td>
                <td style={{ padding: '8px 4px' }}>
                  {c.pacientes?.nombre} {c.pacientes?.apellido}
                </td>
                <td style={{ padding: '8px 4px' }}>{c.profesionales?.nombre || '— Sin asignar —'}</td>
                <td style={{ padding: '8px 4px' }}>{c.estado}</td>
                <td style={{ padding: '8px 4px', display: 'flex', gap: 8 }}>
                  {c.enlace_videoconsulta && (
                    <a href={c.enlace_videoconsulta} target="_blank" rel="noreferrer">
                      Videoconsulta
                    </a>
                  )}
                  {!['cancelada', 'completada'].includes(c.estado) && (
                    <>
                      <Link to={`/citas/${c.id}/editar`}>Reprogramar</Link>
                      <Link to={`/citas/${c.id}/nota`}>Registrar nota</Link>
                      <button type="button" onClick={() => handleCancelar(c.id)}>
                        Cancelar
                      </button>
                    </>
                  )}
                  {c.estado === 'completada' && <Link to={`/citas/${c.id}/nota`}>Ver nota</Link>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}