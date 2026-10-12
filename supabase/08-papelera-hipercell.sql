-- Ejecutar una vez en Supabase > SQL Editor (se puede repetir).
-- Conserva productos, fotos y estadísticas. No borra registros.
BEGIN;
ALTER TABLE public.catalogo_productos
  ADD COLUMN IF NOT EXISTS hipercell_eliminado_en timestamptz;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='hipercell_papelera_oculta' AND conrelid='public.catalogo_productos'::regclass) THEN
    ALTER TABLE public.catalogo_productos ADD CONSTRAINT hipercell_papelera_oculta
      CHECK (negocio_id <> '46a2d035-836b-472c-9f1f-adcde294a923'::uuid OR hipercell_eliminado_en IS NULL OR activo IS FALSE);
  END IF;
END $$;
COMMIT;
SELECT 'Papelera de Hipercell preparada' AS resultado;
