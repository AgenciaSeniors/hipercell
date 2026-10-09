-- Solo lectura. Una única consulta devuelve todos los bloques juntos.
select '1. Tablas y políticas' as bloque,
coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) as detalle
from (
  select t.schemaname,t.tablename,t.rowsecurity,p.policyname,p.cmd,p.roles,p.qual,p.with_check
  from pg_tables t left join pg_policies p
    on p.schemaname=t.schemaname and p.tablename=t.tablename
  where (t.schemaname='public' and t.tablename in
    ('catalogo_negocios','catalogo_categorias','catalogo_productos','catalogo_usuarios_negocio'))
    or (t.schemaname='storage' and t.tablename='objects')
  order by t.schemaname,t.tablename,p.policyname
) a
union all
select '2. Bucket de fotos',coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
from (
  select id,public,file_size_limit,allowed_mime_types from storage.buckets
  where id='catalogo_imagenes'
) b
union all
select '3. Función de alta',coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
from (
  select p.proname,p.prosecdef,p.proconfig,
    has_function_privilege('anon',p.oid,'EXECUTE') as anon_puede_ejecutar,
    has_function_privilege('authenticated',p.oid,'EXECUTE') as autenticado_puede_ejecutar
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='catalogo_crear_negocio'
) c
union all
select '4. Restricciones de productos',coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
from (
  select conname,pg_get_constraintdef(oid) as definicion from pg_constraint
  where conrelid='public.catalogo_productos'::regclass
) d
order by bloque;