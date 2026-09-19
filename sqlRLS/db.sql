-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  nombre_completo text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  email text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL,
  rol USER-DEFINED NOT NULL DEFAULT 'profesional'::rol_usuario,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profesionales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE,
  nombre text NOT NULL,
  especialidad text,
  estado text NOT NULL DEFAULT 'activo'::text CHECK (estado = ANY (ARRAY['activo'::text, 'inactivo'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profesionales_pkey PRIMARY KEY (id),
  CONSTRAINT profesionales_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.pacientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  apellido text NOT NULL,
  fecha_nacimiento date,
  telefono text,
  email text,
  notas_generales text,
  creado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pacientes_pkey PRIMARY KEY (id),
  CONSTRAINT pacientes_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.profiles(id)
);
CREATE TABLE public.citas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL,
  profesional_id uuid,
  fecha_hora timestamp with time zone NOT NULL,
  estado text NOT NULL DEFAULT 'agendada'::text CHECK (estado = ANY (ARRAY['agendada'::text, 'reprogramada'::text, 'cancelada'::text, 'completada'::text])),
  notas text,
  creado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT citas_pkey PRIMARY KEY (id),
  CONSTRAINT citas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id),
  CONSTRAINT citas_profesional_id_fkey FOREIGN KEY (profesional_id) REFERENCES public.profesionales(id),
  CONSTRAINT citas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.profiles(id)
);
CREATE TABLE public.notas_clinicas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cita_id uuid,
  paciente_id uuid NOT NULL,
  autor_id uuid NOT NULL,
  contenido text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notas_clinicas_pkey PRIMARY KEY (id),
  CONSTRAINT notas_clinicas_cita_id_fkey FOREIGN KEY (cita_id) REFERENCES public.citas(id),
  CONSTRAINT notas_clinicas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id),
  CONSTRAINT notas_clinicas_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.documentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL,
  nombre_archivo text NOT NULL,
  storage_path text NOT NULL,
  subido_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT documentos_pkey PRIMARY KEY (id),
  CONSTRAINT documentos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id),
  CONSTRAINT documentos_subido_por_fkey FOREIGN KEY (subido_por) REFERENCES public.profiles(id)
);
CREATE TABLE public.paciente_profesional (
  paciente_id uuid NOT NULL,
  profesional_id uuid NOT NULL,
  asignado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT paciente_profesional_pkey PRIMARY KEY (paciente_id, profesional_id),
  CONSTRAINT paciente_profesional_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id),
  CONSTRAINT paciente_profesional_profesional_id_fkey FOREIGN KEY (profesional_id) REFERENCES public.profesionales(id),
  CONSTRAINT paciente_profesional_asignado_por_fkey FOREIGN KEY (asignado_por) REFERENCES public.profiles(id)
);