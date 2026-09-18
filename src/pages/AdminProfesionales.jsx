import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import FormPage from '../components/layout/FormPage'
import Button from '../components/ui/Button'

const EMPTY_FORM = { profile_id: '', nombre: '', especialidad: '', estado: 'activo' }

export default function AdminProfesionales() {
  const [profesionales, setProfesionales] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  const cargar = async () => {
    setLoading(true)
    setError(null)

    const [profesionalesResult, perfilesResult] = await Promise.all([
      supabase
        .from('profesionales')
        .select('id, profile_id, nombre, especialidad, estado')
        .order('nombre'),
      supabase
        .from('profiles')
        .select('id, nombre_completo, email, user_roles(rol)')
        .order('nombre_completo'),
    ])

    if (profesionalesResult.error || perfilesResult.error) {
      setError(profesionalesResult.error?.message || perfilesResult.error?.message)
    } else {
      setProfesionales(profesionalesResult.data || [])
      setPerfiles(
        (perfilesResult.data || []).filter((perfil) => {
          const roles = Array.isArray(perfil.user_roles)
            ? perfil.user_roles
            : perfil.user_roles
              ? [perfil.user_roles]
              : []

          return roles.some((userRole) => ['profesional', 'medico'].includes(userRole.rol))
        })
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setInfo(null)

    const payload = {
      profile_id: form.profile_id || null,
      nombre: form.nombre.trim(),
      especialidad: form.especialidad.trim() || null,
      estado: form.estado,
    }

    const result = editingId
      ? await supabase.from('profesionales').update(payload).eq('id', editingId)
      : await supabase.from('profesionales').insert(payload)

    if (result.error) {
      setError(result.error.message)
    } else {
      setInfo(editingId ? 'Profesional actualizado.' : 'Profesional creado.')
      resetForm()
      await cargar()
    }
    setSaving(false)
  }

  const editar = (profesional) => {
    setEditingId(profesional.id)
    setForm({
      profile_id: profesional.profile_id || '',
      nombre: profesional.nombre,
      especialidad: profesional.especialidad || '',
      estado: profesional.estado,
    })
    setError(null)
    setInfo(null)
  }

  const cambiarEstado = async (profesional) => {
    const nuevoEstado = profesional.estado === 'activo' ? 'inactivo' : 'activo'
    setError(null)
    setInfo(null)

    const { error: updateError } = await supabase
      .from('profesionales')
      .update({ estado: nuevoEstado })
      .eq('id', profesional.id)

    if (updateError) setError(updateError.message)
    else {
      setInfo(`Profesional marcado como ${nuevoEstado}.`)
      await cargar()
    }
  }

  if (loading) return <FormPage title="Catálogo de profesionales" description="Cargando profesionales..." />

  return (
    <FormPage
      eyebrow="Administración"
      title="Catálogo de profesionales"
      description="Administra nombre, especialidad, estado y cuenta vinculada."
    >

      <form onSubmit={handleSubmit}>
        <h2 style={{ fontSize: '1.2rem' }}>{editingId ? 'Editar profesional' : 'Nuevo profesional'}</h2>
        <label style={{ display: 'block', marginBottom: 10 }}>
          Nombre
          <input name="nombre" value={form.nombre} onChange={handleChange} required style={{ display: 'block', width: '100%', boxSizing: 'border-box' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 10 }}>
          Especialidad general
          <input name="especialidad" value={form.especialidad} onChange={handleChange} placeholder="Ej. Psicología" style={{ display: 'block', width: '100%', boxSizing: 'border-box' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 10 }}>
          Cuenta de usuario profesional
          <select name="profile_id" value={form.profile_id} onChange={handleChange} style={{ display: 'block', width: '100%' }}>
            <option value="">-- Sin vincular --</option>
            {perfiles.map((perfil) => (
              <option key={perfil.id} value={perfil.id}>
                {perfil.nombre_completo || perfil.email || perfil.id}
                {perfil.email ? ` · ${perfil.email}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: 10 }}>
          Estado
          <select name="estado" value={form.estado} onChange={handleChange} style={{ display: 'block', width: '100%' }}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button type="submit" loading={saving}>{editingId ? 'Guardar cambios' : 'Crear profesional'}</Button>
          {editingId && <Button type="button" variant="secondary" onClick={resetForm}>Cancelar</Button>}
        </div>
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {info && <p style={{ color: 'seagreen' }}>{info}</p>}

      {profesionales.length === 0 ? (
        <p>No hay profesionales en el catálogo.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th>Nombre</th>
              <th>Especialidad</th>
              <th>Estado</th>
              <th>Cuenta</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {profesionales.map((profesional) => {
              const perfil = perfiles.find((item) => item.id === profesional.profile_id)
              return (
                <tr key={profesional.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{profesional.nombre}</td>
                  <td>{profesional.especialidad || '—'}</td>
                  <td>{profesional.estado}</td>
                  <td>{perfil?.email || (profesional.profile_id ? 'Vinculada' : 'Sin vincular')}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <Button type="button" size="small" variant="secondary" onClick={() => editar(profesional)}>Editar</Button>
                    <Button type="button" size="small" variant="outline" onClick={() => cambiarEstado(profesional)}>
                      {profesional.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </FormPage>
  )
}
