-- =========================================================
-- Migración: asignación de pacientes a profesionales
-- Ejecutar en el SQL Editor de Supabase, de arriba hacia abajo.
-- =========================================================

-- 1) Tabla de relación paciente <-> profesional (multidisciplinario:
--    un paciente puede tener varios profesionales asignados a la vez)
create table public.paciente_profesional (
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profesional_id uuid not null references public.profesionales(id) on delete cascade,
  asignado_por uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (paciente_id, profesional_id)
);

alter table public.paciente_profesional enable row level security;

-- 2) Función auxiliar: ¿este paciente está asignado a mí?
--    (security definer para no depender de la RLS de la tabla
--    dentro de otra policy — mismo patrón que is_admin/is_staff)
create or replace function public.paciente_asignado_a_mi(p_paciente_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.paciente_profesional pp
    join public.profesionales prof on prof.id = pp.profesional_id
    where pp.paciente_id = p_paciente_id
      and prof.profile_id = auth.uid()
  );
$$;

-- 3) RLS de paciente_profesional: el propio profesional ve sus
--    asignaciones; solo el admin puede crear/borrar asignaciones.
create policy "paciente_profesional_select"
  on public.paciente_profesional for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.profesionales prof
      where prof.id = paciente_profesional.profesional_id
        and prof.profile_id = auth.uid()
    )
  );

create policy "paciente_profesional_admin_write"
  on public.paciente_profesional for all
  using (public.is_admin())
  with check (public.is_admin());

-- 4) Reemplazar las policies de pacientes: un profesional/medico ya
--    NO ve todos los pacientes — solo los que él mismo registró o
--    los que el admin le asignó. El admin sigue viendo todo.
drop policy "pacientes_select_staff" on public.pacientes;
create policy "pacientes_select_staff"
  on public.pacientes for select
  using (
    public.is_admin()
    or creado_por = auth.uid()
    or public.paciente_asignado_a_mi(id)
  );

drop policy "pacientes_update_staff" on public.pacientes;
create policy "pacientes_update_staff"
  on public.pacientes for update
  using (
    public.is_admin()
    or creado_por = auth.uid()
    or public.paciente_asignado_a_mi(id)
  );

-- pacientes_insert_staff y pacientes_delete_admin quedan igual:
-- cualquier staff puede registrar pacientes nuevos (típicamente
-- recepción), y solo el admin puede borrarlos.