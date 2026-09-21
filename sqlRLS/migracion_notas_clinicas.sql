-- =========================================================
-- Migración: notas clínicas ancladas a una cita
-- Ejecutar después de migracion_asignacion_pacientes2.sql.
-- =========================================================

-- Un profesional solo puede escribir la nota de una cita que le fue
-- asignada; médico y admin pueden escribir sobre pacientes autorizados.
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

drop policy if exists "notas_select_staff" on public.notas_clinicas;
create policy "notas_select_staff"
  on public.notas_clinicas for select
  using (public.tiene_acceso_a_paciente(paciente_id));

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

-- Solo el autor o un admin puede editar una nota existente.
drop policy if exists "notas_update_autor_o_admin" on public.notas_clinicas;
create policy "notas_update_autor_o_admin"
  on public.notas_clinicas for update
  using (autor_id = auth.uid() or public.is_admin())
  with check (
    (autor_id = auth.uid() or public.is_admin())
    and cita_id is not null
    and exists (
      select 1
      from public.citas c
      where c.id = cita_id
        and c.paciente_id = paciente_id
    )
  );

-- Impide cambiar la autoría o las relaciones de una nota después de crearla.
-- Se ejecuta antes de cada UPDATE, incluso cuando lo realiza un admin.
create or replace function public.impedir_cambio_identidad_nota()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Los identificadores que anclan la nota a su autor, cita y paciente
  -- deben conservar exactamente el valor original.
  if new.autor_id is distinct from old.autor_id
     or new.cita_id is distinct from old.cita_id
     or new.paciente_id is distinct from old.paciente_id then
    raise exception 'autor_id, cita_id y paciente_id son inmutables';
  end if;

  return new;
end;
$$;

-- Instala la protección para todas las actualizaciones de notas clínicas.
drop trigger if exists trg_notas_identidad_inmutable on public.notas_clinicas;
create trigger trg_notas_identidad_inmutable
  before update on public.notas_clinicas
  for each row execute function public.impedir_cambio_identidad_nota();
