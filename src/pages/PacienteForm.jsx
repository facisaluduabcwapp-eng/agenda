import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import FormPage from '../components/layout/FormPage'

const emptyForm = {
  nombre: '',
  apellido: '',
  fecha_nacimiento: '',
  telefono: '',
  email: '',
  notas_generales: '',
}

export default function PacienteForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEditing) return

    supabase
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
        } else {
          setForm({
            nombre: data.nombre || '',
            apellido: data.apellido || '',
            fecha_nacimiento: data.fecha_nacimiento || '',
            telefono: data.telefono || '',
            email: data.email || '',
            notas_generales: data.notas_generales || '',
          })
        }
        setLoading(false)
      })
  }, [id, isEditing])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      ...form,
      fecha_nacimiento: form.fecha_nacimiento || null,
    }

    let result

    if (isEditing) {
      result = await supabase.from('pacientes').update(payload).eq('id', id)
    } else {
      const { data: userData } = await supabase.auth.getUser()

      result = await supabase
        .from('pacientes')
        .insert({ ...payload, creado_por: userData.user.id })
        .select()
        .single()
    }

    setSaving(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    navigate(isEditing ? `/pacientes/${id}` : `/pacientes/${result.data.id}`)
  }

  if (loading) {
    return (
      <FormPage title="Paciente" description="Cargando información del paciente...">
        <p style={{ padding: '2rem' }}>Cargando paciente...</p>
      </FormPage>
    )
  }

  return (
    <FormPage
      eyebrow="Pacientes"
      title={isEditing ? 'Editar paciente' : 'Nuevo paciente'}
      description="Completa los datos básicos de identificación y contacto."
    >
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            Nombre
            <input
              type="text"
              value={form.nombre}
              onChange={handleChange('nombre')}
              required
              style={{ display: 'block', width: '100%' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            Apellido
            <input
              type="text"
              value={form.apellido}
              onChange={handleChange('apellido')}
              required
              style={{ display: 'block', width: '100%' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            Fecha de nacimiento
            <input
              type="date"
              value={form.fecha_nacimiento || ''}
              onChange={handleChange('fecha_nacimiento')}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            Teléfono
            <input
              type="tel"
              value={form.telefono}
              onChange={handleChange('telefono')}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            Correo
            <input
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            Notas generales
            <textarea
              value={form.notas_generales}
              onChange={handleChange('notas_generales')}
              rows={3}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
        </div>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}

        <button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear paciente'}
        </button>
      </form>

      <p style={{ marginTop: 24 }}>
        <Link to="/pacientes">&larr; Volver a pacientes</Link>
      </p>
    </FormPage>
  )
}