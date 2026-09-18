import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

function formatHora(fecha) {
	return new Date(fecha).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

export default function AgendaHoy() {
	const [citas, setCitas] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)

	useEffect(() => {
		const inicio = new Date()
		inicio.setHours(0, 0, 0, 0)
		const fin = new Date(inicio)
		fin.setDate(fin.getDate() + 1)

		supabase
			.from('citas')
			.select('id, fecha_hora, estado, pacientes(nombre, apellido), profesionales(nombre)')
			.gte('fecha_hora', inicio.toISOString())
			.lt('fecha_hora', fin.toISOString())
			.order('fecha_hora')
			.then(({ data, error: queryError }) => {
				if (queryError) setError(queryError.message)
				else setCitas(data || [])
				setLoading(false)
			})
	}, [])

	if (loading) return <p>Cargando agenda...</p>
	if (error) return <p style={{ color: 'crimson' }}>{error}</p>
	if (citas.length === 0) return <p style={{ color: '#64748b' }}>No hay citas para hoy.</p>

	return (
		<ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
			{citas.map((cita) => (
				<li key={cita.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
					<span>
						<strong>{formatHora(cita.fecha_hora)}</strong>{' '}
						{cita.pacientes?.nombre} {cita.pacientes?.apellido}
						<small style={{ display: 'block', color: '#64748b' }}>{cita.profesionales?.nombre || 'Sin asignar'}</small>
					</span>
					<Link to={`/citas/${cita.id}/nota`}>Nota</Link>
				</li>
			))}
		</ul>
	)
}
