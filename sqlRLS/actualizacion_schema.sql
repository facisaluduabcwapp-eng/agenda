alter table public.profiles add column email text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nombre_completo, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  insert into public.user_roles (user_id, rol) values (new.id, 'profesional');
  return new;
end;
$$;

-- backfill para el/los usuario(s) que ya se registraron antes de este cambio
update public.profiles p set email = u.email
from auth.users u where u.id = p.id and p.email is null;

-- Comprueba que el profesional elegido esté asignado al paciente.
-- Se redefine aquí para que esta actualización pueda ejecutarse de forma
-- segura aunque la función no se haya creado en una ejecución anterior.
create or replace function public.profesional_asignado_a_paciente(
  p_paciente_id uuid,
  p_profesional_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.paciente_profesional pp
    where pp.paciente_id = p_paciente_id
      and pp.profesional_id = p_profesional_id
  );
$$;


drop policy if exists "pacientes_insert_staff" on public.pacientes;
drop policy if exists "pacientes_insert_admin" on public.pacientes;
create policy "pacientes_insert_admin"
  on public.pacientes for insert
  with check (public.is_admin());
 
-- pacientes_select_staff / pacientes_update_staff quedan igual:
-- un profesional/medico sigue pudiendo VER y EDITAR (ej. corregir
-- teléfono) los pacientes que el admin le asignó, solo no puede
-- crear pacientes nuevos ni asignarlos (eso ya lo cubre
-- paciente_profesional_admin_write).


-- citas_insert_staff: conserva el control de acceso al paciente,
-- y exige que el profesional elegido esté asignado a ese paciente.
drop policy if exists "citas_insert_staff" on public.citas;
create policy "citas_insert_staff"
  on public.citas for insert
  with check (
    public.is_staff()
    and public.tiene_acceso_a_paciente(paciente_id)
    and (
      profesional_id is null
      or public.profesional_asignado_a_paciente(paciente_id, profesional_id)
    )
  );

-- citas_update_staff: mismo criterio de "qué fila puedo tocar" que ya
-- tenías (using), más la restricción de asignación aplicada al resultado
-- final (with check).
drop policy if exists "citas_update_staff" on public.citas;
create policy "citas_update_staff"
  on public.citas for update
  using (
    public.is_staff()
    and (
      public.tiene_acceso_a_paciente(paciente_id)
      or public.es_mi_profesional(profesional_id)
      or creado_por = auth.uid()
    )
  )
  with check (
    public.is_staff()
    and (
      public.tiene_acceso_a_paciente(paciente_id)
      or public.es_mi_profesional(profesional_id)
      or creado_por = auth.uid()
    )
    and (
      profesional_id is null
      or public.profesional_asignado_a_paciente(paciente_id, profesional_id)
    )
  );

  sqlRLS/migracion_documentos_storage.sql