-- =========================================================
-- Migración: separar citas, notas clínicas y documentos por
-- acceso al paciente (mismo criterio que ya aplica a pacientes)
-- Ejecutar en el SQL Editor de Supabase, de arriba hacia abajo.
-- =========================================================

-- 1) FUNCIONES AUXILIARES

-- ¿Tengo acceso a este paciente? (admin, lo registré yo, o me lo asignaron)
create or replace function public.tiene_acceso_a_paciente(p_paciente_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.pacientes p
      where p.id = p_paciente_id and p.creado_por = auth.uid()
    )
    or public.paciente_asignado_a_mi(p_paciente_id);
$$;

-- ¿Este registro de profesionales soy yo?
create or replace function public.es_mi_profesional(p_profesional_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profesionales prof
    where prof.id = p_profesional_id and prof.profile_id = auth.uid()
  );
$$;

-- 2) PACIENTES — mismo criterio, ahora centralizado en la función
drop policy "pacientes_select_staff" on public.pacientes;
create policy "pacientes_select_staff"
  on public.pacientes for select
  using (public.tiene_acceso_a_paciente(id));

drop policy "pacientes_update_staff" on public.pacientes;
create policy "pacientes_update_staff"
  on public.pacientes for update
  using (public.tiene_acceso_a_paciente(id));

-- 3) CITAS
drop policy "citas_select_staff" on public.citas;
create policy "citas_select_staff"
  on public.citas for select
  using (
    public.tiene_acceso_a_paciente(paciente_id)
    or public.es_mi_profesional(profesional_id)
    or creado_por = auth.uid()
  );

drop policy "citas_insert_staff" on public.citas;
create policy "citas_insert_staff"
  on public.citas for insert
  with check (public.tiene_acceso_a_paciente(paciente_id));

drop policy "citas_update_staff" on public.citas;
create policy "citas_update_staff"
  on public.citas for update
  using (
    public.tiene_acceso_a_paciente(paciente_id)
    or public.es_mi_profesional(profesional_id)
    or creado_por = auth.uid()
  );

-- 4) NOTAS CLÍNICAS
drop policy "notas_select_staff" on public.notas_clinicas;
create policy "notas_select_staff"
  on public.notas_clinicas for select
  using (public.tiene_acceso_a_paciente(paciente_id));

drop policy "notas_insert_medico_admin" on public.notas_clinicas;
create policy "notas_insert_medico_admin"
  on public.notas_clinicas for insert
  with check (
    autor_id = auth.uid()
    and public.get_my_role() in ('medico', 'admin')
    and public.tiene_acceso_a_paciente(paciente_id)
  );

-- notas_update_autor_o_admin queda igual (autor o admin), sin cambios.

-- 5) DOCUMENTOS
drop policy "documentos_select_staff" on public.documentos;
create policy "documentos_select_staff"
  on public.documentos for select
  using (public.tiene_acceso_a_paciente(paciente_id));

drop policy "documentos_insert_staff" on public.documentos;
create policy "documentos_insert_staff"
  on public.documentos for insert
  with check (public.tiene_acceso_a_paciente(paciente_id));

-- documentos_delete_admin queda igual (solo admin borra).

-- 6) STORAGE — el archivo en sí, no solo su metadata en "documentos"
--    Convención obligatoria a partir de ahora: sube cada archivo con
--    el path "{paciente_id}/{nombre_de_archivo}" dentro del bucket
--    documentos-pacientes. Ej: "3fa8.../estudio_lab.pdf".
--    Si subes con otro formato de path, estas policies lo van a
--    rechazar porque no pueden extraer un paciente_id válido.
drop policy "storage_select_staff" on storage.objects;
create policy "storage_select_staff"
  on storage.objects for select
  using (
    bucket_id = 'documentos-pacientes'
    and public.tiene_acceso_a_paciente((split_part(name, '/', 1))::uuid)
  );

drop policy "storage_insert_staff" on storage.objects;
create policy "storage_insert_staff"
  on storage.objects for insert
  with check (
    bucket_id = 'documentos-pacientes'
    and public.tiene_acceso_a_paciente((split_part(name, '/', 1))::uuid)
  );

-- storage_delete_admin queda igual (solo admin borra archivos).