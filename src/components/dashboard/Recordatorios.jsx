import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function Recordatorios() {
	const [citas, setCitas] = useState([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		supabase
			.from('citas')
			.select('id, fecha_hora, pacientes(nombre, apellido)')
			.gte('fecha_hora', new Date().toISOString())
			.in('estado', ['agendada', 'reprogramada'])
			.order('fecha_hora')
			.limit(3)
			.then(({ data }) => {
				setCitas(data || [])
				setLoading(false)
			})
	}, [])

	if (loading) return <p style={{ color: '#64748b' }}>Cargando recordatorios...</p>
	if (citas.length === 0) return <p style={{ color: '#64748b' }}>No hay citas próximas.</p>

	return (
		<ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
			{citas.map((cita) => (
				<li key={cita.id} style={{ padding: '10px 0', borderBottom: '1px solid #ffe4e6' }}>
					<strong>{new Date(cita.fecha_hora).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
					<p style={{ margin: '4px 0', color: '#9f1239' }}>
						{cita.pacientes?.nombre} {cita.pacientes?.apellido}
					</p>
					<Link to={`/citas/${cita.id}/nota`}>Abrir cita</Link>
				</li>
			))}
		</ul>
	)
}
