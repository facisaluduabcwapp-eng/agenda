import emailjs from '@emailjs/browser'

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

/**
 * Envía un correo de notificación de cita. Nunca lanza excepción hacia
 * arriba: un fallo de EmailJS no debe tumbar la creación/edición de la
 * cita, que ya quedó guardada en Supabase antes de llamar esto.
 *
 * @param {Object} params
 * @param {string} params.destinatarioEmail
 * @param {string} params.destinatarioNombre
 * @param {string} params.pacienteNombre
 * @param {string} params.fechaHoraTexto - ya formateada para lectura humana
 * @param {string} [params.notas]
 * @param {'nueva'|'reprogramada'|'cancelada'} params.tipoEvento
 */
export async function enviarNotificacionCita({
  destinatarioEmail,
  destinatarioNombre,
  pacienteNombre,
  fechaHoraTexto,
  notas,
  tipoEvento,
}) {
  if (!destinatarioEmail) {
    return { skipped: true, motivo: 'sin_email' }
  }

  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn('EmailJS no está configurado (faltan variables VITE_EMAILJS_*).')
    return { skipped: true, motivo: 'no_configurado' }
  }

  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: destinatarioEmail,
        to_name: destinatarioNombre || 'Profesional',
        paciente_nombre: pacienteNombre,
        fecha_hora: fechaHoraTexto,
        notas: notas || 'Sin notas',
        tipo_evento: tipoEvento,
      },
      { publicKey: PUBLIC_KEY }
    )
    return { success: true }
  } catch (error) {
    // Falla silenciosa a propósito: la cita ya se guardó, esto es
    // "mejor esfuerzo" de notificación, no una operación crítica.
    console.error('No se pudo enviar la notificación por correo:', error)
    return { success: false, error }
  }
}