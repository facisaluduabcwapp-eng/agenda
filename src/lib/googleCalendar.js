// Genera un link "Agregar a Google Calendar" sin usar la API de Google:
// es solo una URL con parámetros que Google interpreta en /render.
// No requiere OAuth, no requiere backend, y es 100% opt-in: nadie
// recibe nada a menos que la persona haga clic y confirme en Google.
//
// Duración fija porque `citas` todavía no tiene columna de duración.
// Si más adelante agregas `duracion_minutos` a la tabla, pásala aquí
// en vez de usar el default.
const DURACION_CITA_MINUTOS_DEFAULT = 30

function formatFechaUTC(date) {
  // Google espera formato YYYYMMDDTHHMMSSZ (UTC, sin separadores)
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/**
 * @param {Object} params
 * @param {string} params.titulo - Texto del evento (ej. "Cita con Dr. Pérez")
 * @param {string} [params.descripcion] - Notas / detalles del evento
 * @param {string} params.fechaHoraISO - Fecha/hora de inicio en ISO 8601
 * @param {number} [params.duracionMinutos]
 * @returns {string|null} URL lista para abrir en una pestaña nueva, o null si faltan datos
 */
export function buildGoogleCalendarUrl({
  titulo,
  descripcion = '',
  fechaHoraISO,
  duracionMinutos = DURACION_CITA_MINUTOS_DEFAULT,
}) {
  if (!titulo || !fechaHoraISO) return null

  const inicio = new Date(fechaHoraISO)
  if (Number.isNaN(inicio.getTime())) return null

  const fin = new Date(inicio.getTime() + duracionMinutos * 60000)

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo,
    dates: `${formatFechaUTC(inicio)}/${formatFechaUTC(fin)}`,
    details: descripcion,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}