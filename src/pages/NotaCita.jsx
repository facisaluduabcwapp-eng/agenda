import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import FormPage from '../components/layout/FormPage'
import Button from '../components/ui/Button'
import { Printer, Save } from 'lucide-react'
import styles from './NotaCita.module.css'

function formatFecha(iso) {
  return new Date(iso).toLocaleString('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatFechaNacimiento(fecha) {
  if (!fecha) return 'No registrada'
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es', {
    dateStyle: 'long',
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
      .select('id, paciente_id, fecha_hora, estado, notas, pacientes(nombre, apellido, fecha_nacimiento, telefono, email), profesionales(nombre, especialidad)')
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
      <article className={styles.hojaImprimible}>
        <header className={styles.encabezadoImpresion}>
          <p className={styles.etiqueta}>Expediente clínico</p>
          <h1>{cita.profesionales?.nombre || 'Profesional de salud'}</h1>
          <p>{cita.profesionales?.especialidad || 'Especialidad no registrada'}</p>
          <h2>Nota de atención</h2>
        </header>

        <section className={styles.seccionImpresion}>
          <h3>Datos del paciente</h3>
          <dl className={styles.datosGrid}>
            <div><dt>Nombre</dt><dd>{cita.pacientes?.nombre} {cita.pacientes?.apellido}</dd></div>
            <div><dt>Fecha de nacimiento</dt><dd>{formatFechaNacimiento(cita.pacientes?.fecha_nacimiento)}</dd></div>
            <div><dt>Teléfono</dt><dd>{cita.pacientes?.telefono || 'No registrado'}</dd></div>
            <div><dt>Correo electrónico</dt><dd>{cita.pacientes?.email || 'No registrado'}</dd></div>
          </dl>
        </section>

        <section className={styles.seccionImpresion}>
          <h3>Datos de la cita</h3>
          <dl className={styles.datosGrid}>
            <div><dt>Fecha y hora</dt><dd>{formatFecha(cita.fecha_hora)}</dd></div>
            <div><dt>Estado</dt><dd>{cita.estado}</dd></div>
            <div><dt>Profesional</dt><dd>{cita.profesionales?.nombre || 'Sin profesional asignado'}</dd></div>
            <div><dt>Especialidad</dt><dd>{cita.profesionales?.especialidad || 'No registrada'}</dd></div>
          </dl>
          {cita.notas && (
            <div className={styles.motivoCita}>
              <h4>Motivo u observaciones de la cita</h4>
              <p>{cita.notas}</p>
            </div>
          )}
        </section>

        <section className={styles.seccionImpresion}>
          <h3>Registro clínico</h3>
          {notas.length === 0 ? (
            <p className={styles.sinNotas}>Todavía no hay notas clínicas registradas para esta cita.</p>
          ) : (
            <div className={styles.notasImpresion}>
              {notas.map((nota) => (
                <article key={nota.id} className={styles.notaImpresion}>
                  <h4>Nota del {formatFecha(nota.created_at)}</h4>
                  <p>{nota.contenido}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </article>

      <div className={styles.accionesPantalla}>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" />
          Imprimir notas
        </Button>
      </div>

      <div className={styles.formularioPantalla}>
        <form onSubmit={handleSubmit}>
          <label htmlFor="contenido-nota">Registro de atención</label>
          <textarea
            id="contenido-nota"
            value={contenido}
            onChange={(event) => setContenido(event.target.value)}
            rows={12}
            required
            placeholder="Escribe aquí la evolución, observaciones y plan de atención..."
            style={{ display: 'block', width: '100%', marginTop: 8, padding: 12, boxSizing: 'border-box', resize: 'vertical' }}
          />
          <Button type="submit" loading={saving} disabled={!contenido.trim()}>
            <Save size={16} aria-hidden="true" />
            {saving ? 'Guardando...' : 'Guardar nota'}
          </Button>
        </form>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        {info && <p style={{ color: 'seagreen' }}>{info}</p>}
      </div>

      <p className={styles.enlacePantalla}>
        <Link to="/citas">&larr; Volver a la agenda</Link>
      </p>
    </FormPage>
  )
}
