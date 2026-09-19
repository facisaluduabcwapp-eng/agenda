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
2. `migracion_asignacion_pacientes.sql`
3. `migracion_asignacion_pacientes2.sql`
4. `actualizacion_schema.sql`
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

## Apéndice: evaluación de seguridad e integridad

### Nivel actual

**Nivel estimado: medio / base sólida en construcción.**

La aplicación tiene una base correcta para un MVP interno: usa Supabase Auth, la clave pública del cliente, RLS en las tablas principales y un bucket privado. Sin embargo, todavía faltan controles de integridad, pruebas automatizadas y medidas operativas antes de considerarla adecuada para producción con datos clínicos reales.

La evaluación se basa en los scripts SQL presentes en este directorio y en el frontend actual. No sustituye una revisión de las policies realmente desplegadas en el proyecto Supabase, porque un script local puede no coincidir con el estado efectivo de la base.

### Controles que ya existen

- `AuthContext` obtiene la sesión de Supabase y carga el rol desde `user_roles`.
- `ProtectedRoute` evita navegación accidental a rutas privadas o admin desde la interfaz.
- El rol no se acepta desde el navegador: se consulta en `user_roles`.
- `profiles`, `user_roles`, `profesionales`, `pacientes`, `citas`, `notas_clinicas` y `documentos` tienen RLS habilitado en el esquema/migraciones correspondientes.
- Las asignaciones paciente-profesional solo se escriben mediante una policy admin.
- El acceso de usuarios no admin a pacientes se limita a pacientes creados por ellos o asignados a su profesional vinculado.
- Los documentos se guardan en un bucket privado y las descargas usan URLs firmadas temporales.
- Los enlaces de videoconsulta se leen a través de la cita y no se publican en un bucket público.
- Las funciones `SECURITY DEFINER` revisadas fijan `search_path = public`, lo cual reduce riesgo de resolución maliciosa de objetos.

### Riesgos prioritarios

#### Alta prioridad: integridad de notas clínicas

La policy de actualización de `notas_clinicas` permite al autor o a un admin actualizar la fila, pero no obliga explícitamente a que `cita_id` siga perteneciendo al mismo `paciente_id` ni a que el autor conserve la relación original. El frontend no ofrece ese cambio, pero un usuario autenticado puede intentar una mutación directa contra la API.

Siguiente acción: añadir una policy `WITH CHECK` que valide la relación cita-paciente y hacer inmutables, mediante policy o trigger, `autor_id`, `cita_id` y `paciente_id` después de crear la nota.

#### Alta prioridad: confirmar el estado efectivo de las policies

Las migraciones reemplazan policies con `drop policy`, pero el nivel real depende de haberlas ejecutado en el orden correcto. En particular, `actualizacion_schema.sql` usa `tiene_acceso_a_paciente` y `es_mi_profesional`, que se crean en `migracion_asignacion_pacientes2.sql`.

Siguiente acción: consultar en Supabase `pg_policies`, `pg_proc`, `information_schema.columns` y `storage.objects` para verificar que las policies y columnas desplegadas coinciden con los scripts finales. No confiar solo en `db.sql` o en el contenido local.

#### Alta prioridad: integridad de citas

Las policies finales deben validar simultáneamente el paciente autorizado, el profesional permitido y la relación entre `citas.paciente_id` y `citas.profesional_id`. También conviene impedir que una actualización directa cambie `creado_por` o reasigne una cita a otro profesional mediante campos que el frontend no muestra.

Siguiente acción: añadir `WITH CHECK` explícito para inserts/updates y, si los campos deben ser inmutables, un trigger que rechace cambios no permitidos.

#### Prioridad media: cuota de documentos no transaccional

El frontend calcula la cuota sumando `documentos.tamaño_bytes`. Dos subidas simultáneas pueden superar 1 GB, y un fallo entre Storage y la tabla puede dejar archivos huérfanos. La barra no representa la cuota real global de Storage.

Siguiente acción: mover el control de cuota a una función RPC/transactional o a un flujo server-side, añadir un proceso de reconciliación Storage-versus-metadata y mantener límites de tamaño/tipo en backend.

#### Prioridad media: funciones `SECURITY DEFINER`

Las funciones usan `search_path` fijo, pero conviene restringir su ejecución explícitamente con `REVOKE EXECUTE ... FROM PUBLIC` y concederla solo al rol necesario, especialmente si la función deja de ser únicamente auxiliar de RLS.

#### Prioridad media: falta de controles operativos

Todavía no aparecen MFA, rate limiting documentado, auditoría de accesos/cambios clínicos, política de retención, backups probados, alertas ni gestión formal de secretos. La clave `anon` no es un secreto, pero nunca debe usarse una clave `service_role` en el navegador.

### Límites del frontend

`ProtectedRoute`, los botones ocultos por rol y el `AuthContext` son controles de navegación y experiencia. No protegen datos por sí mismos. Un usuario puede llamar directamente a PostgREST o Storage; por eso cada lectura y escritura sensible debe seguir siendo rechazada por RLS.

El frontend actual maneja errores de Supabase, pero no constituye una prueba de autorización. La validación de permisos debe probarse con sesiones reales de cada rol, incluyendo intentos directos con IDs ajenos.

### Siguiente paso recomendado

Antes de añadir más funcionalidad, completar una migración de endurecimiento que:

1. Verifique y documente el estado efectivo de todas las policies.
2. Endurezca `UPDATE` de notas y citas con `WITH CHECK` e invariantes de relación.
3. Restrinja la ejecución pública de funciones `SECURITY DEFINER` auxiliares.
4. Añada pruebas RLS automatizadas o un checklist reproducible con tres usuarios: admin, profesional y médico.
5. Añada auditoría mínima para cambios de roles, asignaciones, citas, notas y documentos.
6. Defina límites de archivos, tipos permitidos, cuota transaccional y limpieza de objetos huérfanos.

### Checklist mínimo de pruebas RLS

- Un usuario sin sesión no puede leer ninguna tabla clínica.
- Un profesional no puede leer el paciente de otro profesional.
- Un médico recibe exactamente el mismo acceso que un profesional equivalente.
- Un usuario no puede cambiar su propio rol.
- Un no admin no puede crear, modificar ni borrar asignaciones.
- Un profesional/médico no puede crear o actualizar una cita asignada a otro colega.
- Una nota no puede apuntar a una cita de otro paciente.
- Un autor no puede mover su nota a otra cita o paciente.
- Un no admin no puede borrar metadata ni objetos de documentos.
- Un usuario no puede descargar un objeto Storage cuyo primer segmento pertenece a otro paciente.
- Un admin puede operar sobre todos los recursos autorizados.
