-- Perfil/cargo del usuario (ej. Gerente General) para permisos de negocio.
alter table public.user_profiles
  add column if not exists job_title text;

comment on column public.user_profiles.job_title is
  'Cargo o perfil del usuario. Ej: Gerente General — habilita eliminar cajas cerradas en Separación SAP.';
