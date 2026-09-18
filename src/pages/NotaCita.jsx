import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import FormPage from '../components/layout/FormPage'

function formatFecha(iso) {
  return new Date(iso).toLocaleString('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function NotaCita() {
  const { id } = useParams()
  const [cita, setCita] = useState(null)
  const [notas, setNotas] = useState([])
  const [contenido, setContenido] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  const cargar = async () => {
    setLoading(true)
    setError(null)

    const { data: citaData, error: citaError } = await supabase
      .from('citas')
      .select('id, paciente_id, fecha_hora, estado, pacientes(nombre, apellido), profesionales(nombre)')
      .eq('id', id)
      .single()

    if (citaError) {
      setError(citaError.message)
      setLoading(false)
      return
    }

    const { data: notasData, error: notasError } = await supabase
      .from('notas_clinicas')
      .select('id, contenido, autor_id, created_at, updated_at')
      .eq('cita_id', id)
      .order('created_at', { ascending: false })

    if (notasError) setError(notasError.message)
    setCita(citaData)
    setNotas(notasData || [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [id])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const texto = contenido.trim()
    if (!texto) return

    setSaving(true)
    setError(null)
    setInfo(null)

    const { data: userData } = await supabase.auth.getUser()
    const { error: insertError } = await supabase.from('notas_clinicas').insert({
      cita_id: id,
      paciente_id: cita.paciente_id,
      autor_id: userData.user.id,
      contenido: texto,
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      setContenido('')
      setInfo('Nota guardada correctamente.')
      await cargar()
    }
    setSaving(false)
  }

  if (loading) return <FormPage title="Nota clínica" description="Cargando la cita..." />
  if (error && !cita) return <FormPage title="Nota clínica"><p style={{ color: 'crimson' }}>{error}</p></FormPage>
  if (!cita) return <FormPage title="Nota clínica"><p>Cita no encontrada.</p></FormPage>

  return (
    <FormPage eyebrow="Atención" title="Nota clínica" description="Registra la evolución de esta consulta.">
      <p>
        <strong>Paciente:</strong> {cita.pacientes?.nombre} {cita.pacientes?.apellido}
      </p>
      <p>
        <strong>Cita:</strong> {formatFecha(cita.fecha_hora)} · {cita.profesionales?.nombre || 'Sin profesional asignado'}
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="contenido-nota">
          Registro de atención
        </label>
        <textarea
          id="contenido-nota"
          value={contenido}
          onChange={(event) => setContenido(event.target.value)}
          rows={12}
          required
          placeholder="Escribe aquí la evolución, observaciones y plan de atención..."
          style={{ display: 'block', width: '100%', marginTop: 8, padding: 12, boxSizing: 'border-box', resize: 'vertical' }}
        />
        <button type="submit" disabled={saving || !contenido.trim()} style={{ marginTop: 12 }}>
          {saving ? 'Guardando...' : 'Guardar nota'}
        </button>
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {info && <p style={{ color: 'seagreen' }}>{info}</p>}

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: '1.2rem' }}>Notas de esta cita</h2>
        {notas.length === 0 ? (
          <p style={{ color: '#777' }}>Todavía no hay notas registradas.</p>
        ) : (
          notas.map((nota) => (
            <article key={nota.id} style={{ padding: 12, marginBottom: 12, border: '1px solid #ddd', whiteSpace: 'pre-wrap' }}>
              <small>{formatFecha(nota.created_at)}</small>
              <p>{nota.contenido}</p>
            </article>
          ))
        )}
      </section>

      <p style={{ marginTop: 24 }}>
        <Link to="/citas">&larr; Volver a la agenda</Link>
      </p>
    </FormPage>
  )
}
