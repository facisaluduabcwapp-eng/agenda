import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AsignarProfesionales({ pacienteId }) {
  const [profesionales, setProfesionales] = useState([])
  const [asignados, setAsignados] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId])

  const load = async () => {
    setLoading(true)
    setError(null)

    const [{ data: profs, error: profsError }, { data: asigns, error: asignsError }] =
      await Promise.all([
        supabase.from('profesionales').select('id, nombre, especialidad').eq('estado', 'activo'),
        supabase.from('paciente_profesional').select('profesional_id').eq('paciente_id', pacienteId),
      ])

    if (profsError || asignsError) {
      setError(profsError?.message || asignsError?.message)
      setLoading(false)
      return
    }

    setProfesionales(profs)
    setAsignados(new Set(asigns.map((a) => a.profesional_id)))
    setLoading(false)
  }

  const toggle = async (profesionalId, isAssigned) => {
    setSavingId(profesionalId)
    setError(null)

    const result = isAssigned
      ? await supabase
          .from('paciente_profesional')
          .delete()
          .eq('paciente_id', pacienteId)
          .eq('profesional_id', profesionalId)
      : await supabase
          .from('paciente_profesional')
          .insert({ paciente_id: pacienteId, profesional_id: profesionalId })

    setSavingId(null)

    if (result.error) {
      // Si quien está logueado no es admin, la policy
      // paciente_profesional_admin_write rechaza esto.
      setError(result.error.message)
      return
    }

    setAsignados((prev) => {
      const next = new Set(prev)
      isAssigned ? next.delete(profesionalId) : next.add(profesionalId)
      return next
    })
  }

  if (loading) return <p>Cargando profesionales...</p>

  return (
    <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd' }}>
      <h3>Profesionales asignados</h3>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {profesionales.length === 0 && <p>No hay profesionales activos en el catálogo.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {profesionales.map((prof) => {
          const isAssigned = asignados.has(prof.id)
          return (
            <li key={prof.id}>
              <label>
                <input
                  type="checkbox"
                  checked={isAssigned}
                  disabled={savingId === prof.id}
                  onChange={() => toggle(prof.id, isAssigned)}
                />{' '}
                {prof.nombre} {prof.especialidad ? `— ${prof.especialidad}` : ''}
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}