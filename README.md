# Flujo actual y permisos

Este documento resume el comportamiento actual de AgendaPro. La seguridad real la aplican las políticas **RLS de Supabase**; ocultar botones en React solo mejora la experiencia y no sustituye las políticas.

## Roles

- **admin**: administra usuarios, profesionales, pacientes, asignaciones, citas, notas y documentos.
- **profesional**: trabaja con los pacientes a los que tiene acceso y con sus citas asignadas.
- **medico**: tiene las mismas capacidades operativas que `profesional`; la diferencia es únicamente de categorización del usuario.

Todos los roles se almacenan en `public.user_roles`. El rol predeterminado al registrarse es `profesional`. Solo un admin puede cambiar roles.

## Capacidades por área

| Área | admin | profesional | medico |
|---|---|---|---|
| Iniciar sesión y consultar su rol | Sí | Sí | Sí |
| Ver pacientes | Todos | Pacientes creados por sí mismo o asignados | Igual que profesional |
| Crear pacientes | Sí | No, según la migración actual | No, según la migración actual |
| Editar pacientes autorizados | Sí | Sí | Sí |
| Borrar pacientes | Sí | No | No |
| Ver profesionales activos | Todos | Su propio registro vinculado | Su propio registro vinculado |
| Crear/editar profesionales | Sí | No | No |
| Activar/desactivar profesionales | Sí | No | No |
| Asignar pacientes a profesionales | Sí | No | No |
| Crear citas | Sí | Sí, sobre pacientes autorizados | Sí, sobre pacientes autorizados |
| Elegir profesional en una cita | Cualquiera activo | Solo sí mismo | Solo sí mismo |
| Reprogramar/actualizar citas autorizadas | Sí | Sí | Sí |
| Cancelar una cita | Sí, si la policy de actualización lo permite | Sí, si tiene acceso | Sí, si tiene acceso |
| Crear notas clínicas | Sí | Sí, en una cita asignada a sí mismo | Sí, en una cita asignada a sí mismo |
| Consultar notas autorizadas | Sí | Sí | Sí |
| Editar una nota | Sí | Solo sus propias notas | Solo sus propias notas |
| Subir documentos | Sí | Sí, para pacientes autorizados | Sí, para pacientes autorizados |
| Ver/descargar documentos | Sí | Solo pacientes autorizados | Solo pacientes autorizados |
| Eliminar documentos | Sí | No | No |
| Generar/usar videoconsulta | Sí | Sí, sobre citas visibles | Sí, sobre citas visibles |

## Pacientes y asignaciones

La tabla `paciente_profesional` relaciona pacientes con profesionales. Un paciente puede tener varios profesionales asignados.

Un usuario no administrador obtiene acceso a un paciente si:

1. Lo creó él mismo; o
2. El administrador se lo asignó mediante `paciente_profesional`.

Las asignaciones solo las puede crear o eliminar un admin. El profesional y el médico pueden consultar sus propias asignaciones.

## Citas

Las citas se guardan en `public.citas` y pueden incluir:

- Paciente.
- Profesional asignado.
- Fecha y hora.
- Estado: `agendada`, `reprogramada`, `cancelada` o `completada`.
- Notas generales.
- Enlace externo de videoconsulta en `enlace_videoconsulta`.

Las reglas actuales impiden que un profesional o médico asigne una cita a otro colega desde el frontend o directamente mediante la API. La policy valida el `profile_id` del profesional vinculado.

La videoconsulta usa actualmente una sala externa de Jitsi Meet. El enlace se guarda en la cita y solo se muestra a usuarios que pueden consultar esa cita.

## Notas clínicas

Las notas se almacenan en `public.notas_clinicas` y deben estar ancladas a una cita mediante `cita_id`. También guardan el `paciente_id` y `autor_id`.

La función `public.puede_escribir_nota(...)` valida que:

- La nota tenga una cita válida del mismo paciente.
- El autor sea el usuario autenticado.
- El autor sea admin, o sea el profesional/médico vinculado a la cita.
- El autor tenga acceso al paciente.

Solo el autor o un admin puede editar una nota. Actualmente no hay una policy de borrado para notas.

## Documentos

Los archivos viven en el bucket privado `documentos-pacientes`. La tabla `public.documentos` guarda la metadata:

- `paciente_id`
- `nombre_archivo`
- `storage_path`
- `tamaño_bytes`
- `tipo_mime`
- `subido_por`

El frontend genera rutas con el formato `{paciente_id}/{uuid}-{nombre_archivo}`. Las descargas se realizan mediante URLs firmadas temporales. Solo admin puede eliminar documentos.

La barra de almacenamiento del frontend representa el tamaño registrado en `documentos` sobre una capacidad configurada de 1 GB. No es una lectura directa de la cuota global de Storage y no incluye archivos huérfanos sin metadata.

## Rutas principales

- `/` — Dashboard después del login.
- `/pacientes` — Búsqueda y listado de pacientes autorizados.
- `/pacientes/:id` — Detalle, documentos y asignaciones admin.
- `/citas` — Agenda.
- `/citas/nueva` — Crear cita.
- `/citas/:id/editar` — Reprogramar o actualizar cita.
- `/citas/:id/nota` — Registrar y consultar notas de esa cita.
- `/admin/profesionales` — Catálogo de profesionales, solo admin.
- `/admin/asignaciones` — Asignaciones paciente-profesional, solo admin.
- `/admin/roles` — Gestión de roles, solo admin.

## Orden de migraciones

Para una base creada desde cero, ejecutar `supabase_schema.sql` y después las migraciones necesarias. Para la configuración actual completa, el orden recomendado es:

1. `supabase_schema.sql`
2. `actualizacion_schema.sql`
3. `migracion_asignacion_pacientes.sql`
4. `migracion_asignacion_pacientes2.sql`
5. `migracion_documentos_storage.sql`
6. `migracion_notas_clinicas.sql`
7. `migracion_paridad_profesional_medico.sql`
8. `migracion_videoconsulta.sql`

`db.sql` es una exportación/estado de base de datos y no sustituye necesariamente a las migraciones anteriores. Si alguna migración ya fue ejecutada, no es necesario repetirla salvo que el script indique lo contrario.

## Comprobación después de migrar

1. Confirmar que existe un usuario admin en `user_roles`.
2. Crear o revisar una cuenta con rol `profesional` y otra con rol `medico`.
3. Crear un registro en `profesionales` y vincularlo a cada cuenta mediante `profile_id`.
4. Crear una asignación paciente-profesional desde `/admin/asignaciones`.
5. Probar con cada usuario que no pueda consultar pacientes, citas, notas o documentos ajenos.
6. Probar que un profesional/médico no pueda insertar una cita con el `profesional_id` de otro colega.
