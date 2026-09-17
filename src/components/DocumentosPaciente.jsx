import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const BUCKET = 'documentos-pacientes'
const CAPACIDAD_BYTES = 1024 ** 3
const MAX_FILE_BYTES = 25 * 1024 ** 2

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function safeFileName(name) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_')
}

export default function DocumentosPaciente({ pacienteId }) {
  const { role } = useAuth()
  const [documentos, setDocumentos] = useState([])
  const [usoBytes, setUsoBytes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [documentoDescargando, setDocumentoDescargando] = useState(null)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  const cargar = async () => {
    setLoading(true)
    setError(null)

    const [{ data, error: documentosError }, { data: uso, error: usoError }] = await Promise.all([
      supabase
        .from('documentos')
        .select('id, nombre_archivo, storage_path, tamaño_bytes, tipo_mime, subido_por, created_at')
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false }),
      supabase.from('documentos').select('tamaño_bytes'),
    ])

    if (documentosError || usoError) {
      setError(documentosError?.message || usoError?.message)
    } else {
      setDocumentos(data || [])
      setUsoBytes((uso || []).reduce((total, documento) => total + (documento.tamaño_bytes || 0), 0))
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [pacienteId])

  const handleSubir = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)
    setInfo(null)

    if (file.size > MAX_FILE_BYTES) {
      setError(`El archivo supera el límite de ${formatBytes(MAX_FILE_BYTES)}.`)
      return
    }

    if (usoBytes + file.size > CAPACIDAD_BYTES) {
      setError('No hay espacio disponible en la cuota registrada.')
      return
    }

    setSubiendo(true)
    const storagePath = `${pacienteId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
    const { data: userData } = await supabase.auth.getUser()

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (uploadError) {
      setError(uploadError.message)
      setSubiendo(false)
      return
    }

    const { error: metadataError } = await supabase.from('documentos').insert({
      paciente_id: pacienteId,
      nombre_archivo: file.name,
      storage_path: storagePath,
      tamaño_bytes: file.size,
      tipo_mime: file.type || null,
      subido_por: userData.user.id,
    })

    if (metadataError) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      setError(metadataError.message)
    } else {
      setInfo('Documento subido correctamente.')
      await cargar()
    }
    setSubiendo(false)
  }

  const handleDescargar = async (documento) => {
    setError(null)
    setDocumentoDescargando(documento.id)

    const { data, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(documento.storage_path, 60)

    if (downloadError) {
      setError(downloadError.message)
    } else {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    }
    setDocumentoDescargando(null)
  }

  const handleEliminar = async (documento) => {
    if (!window.confirm(`¿Eliminar "${documento.nombre_archivo}"?`)) return

    setError(null)
    setInfo(null)
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([documento.storage_path])

    if (storageError) {
      setError(storageError.message)
      return
    }

    const { error: metadataError } = await supabase.from('documentos').delete().eq('id', documento.id)
    if (metadataError) {
      setError(metadataError.message)
      return
    }

    setInfo('Documento eliminado.')
    await cargar()
  }

  const porcentaje = Math.min((usoBytes / CAPACIDAD_BYTES) * 100, 100)

  if (loading) return <p>Cargando documentos...</p>

  return (
    <section style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}>
      <h2 style={{ fontSize: '1.2rem' }}>Documentos</h2>
      <p>
        {documentos.length} documento{documentos.length === 1 ? '' : 's'} · {formatBytes(usoBytes)} de 1 GB
      </p>
      <progress value={porcentaje} max="100" style={{ width: '100%' }} aria-label="Uso de almacenamiento" />
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Uso registrado de documentos visibles para tu usuario.
      </p>

      <label style={{ display: 'inline-block', marginBottom: 12 }}>
        <span style={{ display: 'block', marginBottom: 4 }}>Subir documento</span>
        <input type="file" onChange={handleSubir} disabled={subiendo} />
      </label>
      <p style={{ color: '#666', fontSize: '0.85rem' }}>Límite por archivo: {formatBytes(MAX_FILE_BYTES)}.</p>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {info && <p style={{ color: 'seagreen' }}>{info}</p>}

      {documentos.length === 0 ? (
        <p style={{ color: '#777' }}>No hay documentos cargados.</p>
      ) : (
        <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
          {documentos.map((documento) => (
            <li
              key={documento.id}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid #eee' }}
            >
              <span>
                {documento.nombre_archivo} <small>({formatBytes(documento.tamaño_bytes || 0)})</small>
              </span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => handleDescargar(documento)} disabled={documentoDescargando === documento.id}>
                  {documentoDescargando === documento.id ? 'Preparando...' : 'Descargar'}
                </button>
                {role === 'admin' && (
                  <button type="button" onClick={() => handleEliminar(documento)}>
                    Eliminar
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
