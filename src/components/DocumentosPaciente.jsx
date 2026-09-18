import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'

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
  const fileInputRef = useRef(null)
  
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

  if (loading) return <p style={{ color: '#64748b' }}>Cargando documentos...</p>

  return (
    <section>
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#334155' }}>
          {documentos.length} documento{documentos.length === 1 ? '' : 's'} · {formatBytes(usoBytes)} de 1 GB
        </p>
        <progress value={porcentaje} max="100" style={{ width: '100%', height: '8px', borderRadius: '4px' }} aria-label="Uso de almacenamiento" />
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
          Uso registrado de documentos visibles para tu usuario.
        </p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        {/* Input file oculto controlado via useRef */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleSubir}
          style={{ display: 'none' }}
        />
        
        <Button
          variant="secondary"
          size="medium"
          loading={subiendo}
          onClick={() => fileInputRef.current?.click()}
        >
          📁 Seleccionar y subir documento
        </Button>

        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '6px' }}>
          Límite por archivo: {formatBytes(MAX_FILE_BYTES)}.
        </p>
      </div>

      {error && <p style={{ color: 'crimson', fontSize: '0.875rem' }}>{error}</p>}
      {info && <p style={{ color: '#16a34a', fontSize: '0.875rem' }}>{info}</p>}

      {documentos.length === 0 ? (
        <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No hay documentos cargados.</p>
      ) : (
        <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
          {documentos.map((documento) => (
            <li
              key={documento.id}
              style={{
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <span style={{ color: '#1e293b', fontWeight: 500 }}>
                {documento.nombre_archivo}{' '}
                <small style={{ color: '#64748b', fontWeight: 400 }}>({formatBytes(documento.tamaño_bytes || 0)})</small>
              </span>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button
                  variant="outline"
                  size="small"
                  loading={documentoDescargando === documento.id}
                  onClick={() => handleDescargar(documento)}
                >
                  Descargar
                </Button>

                {role === 'admin' && (
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => handleEliminar(documento)}
                    style={{ color: '#ef4444' }}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}