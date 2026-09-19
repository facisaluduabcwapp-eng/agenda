-- Ejecutar después de actualizacion_schema.sql.
-- Usa profiles como bandeja de tickets; no crea una tabla adicional.

alter table public.profiles
  add column if not exists especialidad text;

alter table public.profiles
  add column if not exists estado_solicitud text not null default 'aprobada';

alter table public.profiles
  drop constraint if exists profiles_estado_solicitud_check;

alter table public.profiles
  add constraint profiles_estado_solicitud_check
  check (estado_solicitud in ('pendiente', 'aprobada', 'rechazada'));

-- Las cuentas nuevas nacen bloqueadas. El admin las activa al aprobarlas.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    nombre_completo,
    email,
    especialidad,
    activo,
    estado_solicitud
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'specialty',
    false,
    'pendiente'
  );

  insert into public.user_roles (user_id, rol)
  values (new.id, 'profesional');

  return new;
end;
$$;

-- Las cuentas existentes siguen activas; las cuentas inactivas existentes
-- pasan a mostrarse como solicitudes pendientes.
update public.profiles
set estado_solicitud = 'pendiente'
where activo = false and estado_solicitud = 'aprobada';

-- Una cuenta administradora no participa en el flujo de aprobación.
update public.profiles p
set activo = true,
    estado_solicitud = 'aprobada'
from public.user_roles r
where r.user_id = p.id
  and r.rol = 'admin';

-- Recupera en el catálogo las cuentas profesionales/médicas ya aprobadas.
insert into public.profesionales (profile_id, nombre, especialidad, estado)
select
  p.id,
  coalesce(p.nombre_completo, p.email, 'Profesional'),
  p.especialidad,
  'activo'
from public.profiles p
join public.user_roles r on r.user_id = p.id
where p.activo = true
  and p.estado_solicitud = 'aprobada'
  and r.rol in ('profesional', 'medico')
on conflict (profile_id) do update
set nombre = excluded.nombre,
    especialidad = excluded.especialidad,
    estado = 'activo';