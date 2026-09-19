-- =========================================================
-- Esquema Supabase — Plataforma Clínica (Fase 1)
-- Roles: admin, profesional, medico
-- Ejecutar todo este script en el SQL Editor de Supabase,
-- de arriba hacia abajo, en una sola pasada.
-- =========================================================

-- 1) ROL DE USUARIO
create type public.rol_usuario as enum ('admin', 'profesional', 'medico');

-- 2) PROFILES (extiende auth.users) — datos que el propio usuario
--    puede editar. El rol NO vive aquí a propósito.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Datos de perfil editables por el propio usuario. El rol vive aparte en user_roles.';

-- 2.5) USER_ROLES — tabla separada a propósito: ningún usuario
--      tiene permiso de escritura aquí, solo lectura de su propio
--      rol. Así se evita la auto-asignación de rol de raíz, sin
--      depender de lógica adicional en triggers.
create table public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  rol public.rol_usuario not null default 'profesional',
  created_at timestamptz not null default now()
);

comment on table public.user_roles is 'Rol de cada usuario. Solo un admin puede insertar/actualizar aquí.';

-- 3) TRIGGER: crear profile + rol por defecto al registrarse un usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre_completo)
  values (new.id, new.raw_user_meta_data ->> 'full_name');

  insert into public.user_roles (user_id, rol)
  values (new.id, 'profesional'); -- rol por defecto; el admin lo asigna después

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) FUNCIONES AUXILIARES (usadas en las políticas RLS)
create or replace function public.get_my_role()
returns public.rol_usuario
language sql stable security definer set search_path = public
as $$
  select rol from public.user_roles where user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = auth.uid() and rol = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.user_roles r on r.user_id = p.id
    where p.id = auth.uid() and p.activo = true
  );
$$;

-- 5) TRIGGER GENÉRICO PARA updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 6) RLS: PROFILES (solo datos de perfil, ya no incluye rol)
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin());

-- 6.5) RLS: USER_ROLES
alter table public.user_roles enable row level security;

create policy "user_roles_select_own_or_admin"
  on public.user_roles for select
  using (user_id = auth.uid() or public.is_admin());

-- Sin policy de UPDATE/INSERT/DELETE para usuarios normales:
-- solo el admin puede escribir aquí.
create policy "user_roles_admin_write"
  on public.user_roles for all
  using (public.is_admin())
  with check (public.is_admin());

-- 7) PROFESIONALES
create table public.profesionales (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id),
  nombre text not null,
  especialidad text,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  created_at timestamptz not null default now()
);

alter table public.profesionales enable row level security;

create policy "profesionales_select_staff"
  on public.profesionales for select
  using (public.is_staff());

create policy "profesionales_admin_write"
  on public.profesionales for all
  using (public.is_admin())
  with check (public.is_admin());

-- 8) PACIENTES
create table public.pacientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null,
  fecha_nacimiento date,
  telefono text,
  email text,
  notas_generales text,
  creado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_pacientes_nombre on public.pacientes (lower(nombre), lower(apellido));

alter table public.pacientes enable row level security;

create policy "pacientes_select_staff"
  on public.pacientes for select
  using (public.is_staff());

create policy "pacientes_insert_staff"
  on public.pacientes for insert
  with check (public.is_staff());

create policy "pacientes_update_staff"
  on public.pacientes for update
  using (public.is_staff());

create policy "pacientes_delete_admin"
  on public.pacientes for delete
  using (public.is_admin());

-- 9) CITAS
create table public.citas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profesional_id uuid references public.profesionales(id),
  fecha_hora timestamptz not null,
  estado text not null default 'agendada'
    check (estado in ('agendada', 'reprogramada', 'cancelada', 'completada')),
  notas text,
  creado_por uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_citas_fecha on public.citas (fecha_hora);
create index idx_citas_paciente on public.citas (paciente_id);

create trigger trg_citas_updated_at
  before update on public.citas
  for each row execute function public.set_updated_at();

alter table public.citas enable row level security;

create policy "citas_select_staff"
  on public.citas for select
  using (public.is_staff());

create policy "citas_insert_staff"
  on public.citas for insert
  with check (public.is_staff());

create policy "citas_update_staff"
  on public.citas for update
  using (public.is_staff());

-- Sin política de DELETE a propósito: una cita se cancela cambiando
-- "estado", no se borra. Si de verdad necesitas borrar, agrega una
-- policy FOR DELETE USING (public.is_admin()).

-- 10) NOTAS CLÍNICAS
create table public.notas_clinicas (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid references public.citas(id),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  autor_id uuid not null references public.profiles(id),
  contenido text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_notas_paciente on public.notas_clinicas (paciente_id);

create trigger trg_notas_updated_at
  before update on public.notas_clinicas
  for each row execute function public.set_updated_at();

alter table public.notas_clinicas enable row level security;

create policy "notas_select_staff"
  on public.notas_clinicas for select
  using (public.is_staff());

-- Médico y profesional pueden crear notas; admin conserva acceso completo.
create policy "notas_insert_autorizados"
  on public.notas_clinicas for insert
  with check (
    public.get_my_role() in ('profesional', 'medico', 'admin')
    and autor_id = auth.uid()
  );

create policy "notas_update_autor_o_admin"
  on public.notas_clinicas for update
  using (autor_id = auth.uid() or public.is_admin());

-- 11) DOCUMENTOS (metadata; los archivos viven en Storage)
create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  nombre_archivo text not null,
  storage_path text not null,
  subido_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_documentos_paciente on public.documentos (paciente_id);

alter table public.documentos enable row level security;

create policy "documentos_select_staff"
  on public.documentos for select
  using (public.is_staff());

create policy "documentos_insert_staff"
  on public.documentos for insert
  with check (public.is_staff());

create policy "documentos_delete_admin"
  on public.documentos for delete
  using (public.is_admin());

-- =========================================================
-- 12) STORAGE: bucket de documentos de pacientes
-- =========================================================
insert into storage.buckets (id, name, public)
values ('documentos-pacientes', 'documentos-pacientes', false)
on conflict (id) do nothing;

create policy "storage_select_staff"
  on storage.objects for select
  using (bucket_id = 'documentos-pacientes' and public.is_staff());

create policy "storage_insert_staff"
  on storage.objects for insert
  with check (bucket_id = 'documentos-pacientes' and public.is_staff());

create policy "storage_delete_admin"
  on storage.objects for delete
  using (bucket_id = 'documentos-pacientes' and public.is_admin());

-- =========================================================
-- 13) PRIMER ADMIN (manual, después de correr el script)
-- =========================================================
-- 1. Regístrate normalmente desde el frontend (o desde
--    Authentication > Users en el dashboard de Supabase).
--    El trigger crea tu profile y tu user_roles con rol = 'profesional'.
-- 2. Sube tu propio rol a admin corriendo esto UNA vez,
--    reemplazando el correo:
--
-- update public.user_roles
-- set rol = 'admin'
-- where user_id = (select id from auth.users where email = 'tu_correo@ejemplo.com');