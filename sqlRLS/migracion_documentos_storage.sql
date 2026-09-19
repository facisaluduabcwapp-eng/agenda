-- =========================================================
-- Migración: gestión de documentos de pacientes
-- Ejecutar después de migracion_asignacion_pacientes2.sql.
-- =========================================================

-- Tamaño y tipo para mostrar cuota y metadatos en el frontend.
alter table public.documentos
  add column if not exists tamaño_bytes bigint not null default 0,
  add column if not exists tipo_mime text;

-- Reemplazar las policies para conservar el mismo control de acceso
-- por paciente en la metadata y en el objeto privado de Storage.
drop policy if exists "documentos_select_staff" on public.documentos;
create policy "documentos_select_staff"
  on public.documentos for select
  using (public.tiene_acceso_a_paciente(paciente_id));

drop policy if exists "documentos_insert_staff" on public.documentos;
create policy "documentos_insert_staff"
  on public.documentos for insert
  with check (
    subido_por = auth.uid()
    and public.tiene_acceso_a_paciente(paciente_id)
  );

drop policy if exists "documentos_delete_admin" on public.documentos;
create policy "documentos_delete_admin"
  on public.documentos for delete
  using (public.is_admin());

drop policy if exists "storage_select_staff" on storage.objects;
create policy "storage_select_staff"
  on storage.objects for select
  using (
    bucket_id = 'documentos-pacientes'
    and public.tiene_acceso_a_paciente((split_part(name, '/', 1))::uuid)
  );

drop policy if exists "storage_insert_staff" on storage.objects;
create policy "storage_insert_staff"
  on storage.objects for insert
  with check (
    bucket_id = 'documentos-pacientes'
    and public.tiene_acceso_a_paciente((split_part(name, '/', 1))::uuid)
  );

drop policy if exists "storage_delete_admin" on storage.objects;
create policy "storage_delete_admin"
  on storage.objects for delete
  using (
    bucket_id = 'documentos-pacientes'
    and public.is_admin()
  );
