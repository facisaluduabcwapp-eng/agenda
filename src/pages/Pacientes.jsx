import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Pacientes() {
  const { role } = useAuth()
  const [pacientes, setPacientes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPacientes(search)
    }, 300) // pequeño debounce para no pegarle a la DB en cada tecla

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const loadPacientes = async (term) => {
    setLoading(true)
    setError(null)

    let query = supabase.from('pacientes').select('*').order('apellido')

    if (term.trim()) {
      query = query.or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%`)
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
    } else {
      setPacientes(data)
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 720, margin: '2rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Pacientes</h1>
        {role === 'admin' && <Link to="/pacientes/nuevo">+ Nuevo paciente</Link>}
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre o apellido..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', margin: '1rem 0', padding: 8, boxSizing: 'border-box' }}
      />

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {loading ? (
        <p>Cargando...</p>
      ) : pacientes.length === 0 ? (
        <p>No se encontraron pacientes.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>
                  {p.nombre} {p.apellido}
                </td>
                <td>{p.telefono || '—'}</td>
                <td>{p.email || '—'}</td>
                <td>
                  <Link to={`/pacientes/${p.id}`}>Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: 24 }}>
        <Link to="/">&larr; Volver</Link>
      </p>
    </div>
  )
}