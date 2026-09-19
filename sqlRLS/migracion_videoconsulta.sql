-- =========================================================
-- Migración: enlace de videoconsulta por cita
-- =========================================================

alter table public.citas
  add column if not exists enlace_videoconsulta text;

-- El enlace se protege igual que el resto de datos de la cita:
-- solo lo reciben usuarios autorizados por citas_select_staff.
