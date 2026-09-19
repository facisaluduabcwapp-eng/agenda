-- =========================================================
-- Migración: mismas capacidades para profesional y medico
-- Ejecutar si migracion_notas_clinicas.sql ya fue aplicada.
-- =========================================================

create or replace function public.puede_escribir_nota(
  p_cita_id uuid,
  p_paciente_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.is_admin()
    or (
      public.get_my_role() in ('profesional', 'medico')
      and public.tiene_acceso_a_paciente(p_paciente_id)
      and exists (
        select 1
        from public.citas c
        where c.id = p_cita_id
          and c.paciente_id = p_paciente_id
          and public.es_mi_profesional(c.profesional_id)
      )
    );
$$;

drop policy if exists "notas_insert_medico_admin" on public.notas_clinicas;
drop policy if exists "notas_insert_autorizados" on public.notas_clinicas;
create policy "notas_insert_autorizados"
  on public.notas_clinicas for insert
  with check (
    autor_id = auth.uid()
    and cita_id is not null
    and public.puede_escribir_nota(cita_id, paciente_id)
    and exists (
      select 1
      from public.citas c
      where c.id = cita_id
        and c.paciente_id = paciente_id
    )
  );
