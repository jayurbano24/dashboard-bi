-- Unificar variantes de modelo ZXV10 B866V en Supabase
-- Ejecutar en el SQL Editor del proyecto que usa la app (ver NEXT_PUBLIC_SUPABASE_URL en .env.local).
-- La tabla vive en schema public: despacho_conduce_rows

DO $$
BEGIN
  IF to_regclass('public.despacho_conduce_rows') IS NULL THEN
    RAISE EXCEPTION
      'La tabla public.despacho_conduce_rows no existe en este proyecto. '
      'Abre el SQL Editor del proyecto correcto (el de NEXT_PUBLIC_SUPABASE_URL).';
  END IF;
END $$;

-- 1) despacho_conduce_rows.modelo
UPDATE public.despacho_conduce_rows
SET modelo = 'ZXV10 B866V'
WHERE upper(regexp_replace(coalesce(modelo, ''), '\s+', ' ', 'g')) IN (
  'ZXV10 866V2 SO ANDROID10',
  'ZXV10 866V2 SO ANDROID12',
  'ZXV10 B866V-ANDROID',
  'ZXV10 B866V'
)
OR modelo ILIKE 'ZXV10%866V2%ANDROID%10%'
OR modelo ILIKE 'ZXV10%866V2%ANDROID%12%'
OR modelo ILIKE 'ZXV10%B866V%Android%';

-- 2) payload JSON (si guarda modelo anidado)
UPDATE public.despacho_conduce_rows
SET payload = jsonb_set(
  coalesce(payload, '{}'::jsonb),
  '{modelo}',
  to_jsonb('ZXV10 B866V'::text),
  true
)
WHERE
  coalesce(payload->>'modelo', '') ILIKE 'ZXV10%866V2%ANDROID%10%'
  OR coalesce(payload->>'modelo', '') ILIKE 'ZXV10%866V2%ANDROID%12%'
  OR coalesce(payload->>'modelo', '') ILIKE 'ZXV10%B866V%Android%'
  OR upper(regexp_replace(coalesce(payload->>'modelo', ''), '\s+', ' ', 'g')) IN (
    'ZXV10 866V2 SO ANDROID10',
    'ZXV10 866V2 SO ANDROID12',
    'ZXV10 B866V-ANDROID'
  );

-- 3) Verificar resultado
SELECT modelo, count(*) AS total
FROM public.despacho_conduce_rows
WHERE modelo ILIKE '%ZXV10%' OR modelo ILIKE '%866V%'
GROUP BY modelo
ORDER BY total DESC;
