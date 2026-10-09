-- Cambio independiente que afecta a la función compartida de alta de la agencia.
-- Ejecutar solo si el alta de negocios se realiza en SQL Editor o desde backend.
-- No afecta la lectura pública ni el login de los catálogos.
-- No es requisito para que funcione el panel de Hipercell.
begin;
revoke execute on function public.catalogo_crear_negocio(uuid,text) from public,anon,authenticated;
grant execute on function public.catalogo_crear_negocio(uuid,text) to service_role;
alter function public.catalogo_crear_negocio(uuid,text) set search_path=public,pg_temp;
commit;
