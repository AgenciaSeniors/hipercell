-- Ejecutar en SQL Editor. Cambios específicos para Hipercell.
-- No modifica las políticas ni el bucket catalogo_imagenes de otros clientes.
begin;
do $$
begin
  if not exists(select 1 from public.catalogo_negocios where id='46a2d035-836b-472c-9f1f-adcde294a923' and nombre='Hipercell') then
    raise exception 'Primero debe existir el negocio Hipercell con el UUID configurado.';
  end if;
  if exists(select 1 from storage.buckets where id='hipercell_imagenes'
    and (public is not true or file_size_limit is distinct from 5242880::bigint
      or allowed_mime_types is distinct from array['image/jpeg','image/png','image/webp'])) then
    raise exception 'Ya existe un bucket hipercell_imagenes con otra configuración. No se modificó.';
  end if;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hipercell_imagenes','hipercell_imagenes',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

drop policy if exists hipercell_owner_lee_fotos on storage.objects;
create policy hipercell_owner_lee_fotos on storage.objects for select to authenticated
using(bucket_id='hipercell_imagenes'
  and (storage.foldername(name))[1]='46a2d035-836b-472c-9f1f-adcde294a923'
  and exists(select 1 from public.catalogo_usuarios_negocio u
    where u.user_id=auth.uid() and u.negocio_id='46a2d035-836b-472c-9f1f-adcde294a923'));

drop policy if exists hipercell_owner_sube_fotos on storage.objects;
create policy hipercell_owner_sube_fotos on storage.objects for insert to authenticated
with check(bucket_id='hipercell_imagenes'
  and (storage.foldername(name))[1]='46a2d035-836b-472c-9f1f-adcde294a923'
  and exists(select 1 from public.catalogo_usuarios_negocio u
    where u.user_id=auth.uid() and u.negocio_id='46a2d035-836b-472c-9f1f-adcde294a923'));
-- El bucket es público para ver las fotos del catálogo, no para escribir.
-- Los archivos no se sobrescriben ni eliminan desde el panel.

create or replace function public.hipercell_fotos_validas(fotos jsonb,portada text)
returns boolean language plpgsql immutable set search_path=pg_catalog as $$
declare f jsonb; n integer;
begin
  fotos:=coalesce(fotos,'[]'::jsonb);
  if jsonb_typeof(fotos)<>'array' then return false; end if;
  n:=jsonb_array_length(fotos);
  if n>3 then return false; end if;
  for f in select value from jsonb_array_elements(fotos) loop
    if jsonb_typeof(f)<>'string' or (f #>> '{}') !~ '^https://[^[:space:]]+$' then return false; end if;
  end loop;
  if (select count(distinct value) from jsonb_array_elements(fotos))<>n then return false; end if;
  if n>0 then return portada is not distinct from (fotos->>0); end if;
  return portada is null or portada ~ '^https://[^[:space:]]+$';
end $$;

do $$
begin
  if not exists(select 1 from pg_constraint where conrelid='public.catalogo_productos'::regclass and conname='hipercell_max_tres_fotos') then
    alter table public.catalogo_productos add constraint hipercell_max_tres_fotos
      check(negocio_id<>'46a2d035-836b-472c-9f1f-adcde294a923'::uuid
        or public.hipercell_fotos_validas(imagenes_url,imagen_url));
  end if;
end $$;

create or replace function public.hipercell_validar_categoria()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
  if new.negocio_id='46a2d035-836b-472c-9f1f-adcde294a923'::uuid
    and new.categoria_id is not null
    and not exists(select 1 from public.catalogo_categorias c where c.id=new.categoria_id and c.negocio_id=new.negocio_id) then
    raise exception 'La categoría no pertenece a Hipercell.' using errcode='23514';
  end if;
  return new;
end $$;
drop trigger if exists hipercell_categoria_del_negocio on public.catalogo_productos;
create trigger hipercell_categoria_del_negocio before insert or update of negocio_id,categoria_id
on public.catalogo_productos for each row execute function public.hipercell_validar_categoria();

create or replace function public.hipercell_evitar_mover_categoria()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
  if old.negocio_id='46a2d035-836b-472c-9f1f-adcde294a923'::uuid
    and new.negocio_id is distinct from old.negocio_id
    and exists(select 1 from public.catalogo_productos p where p.negocio_id=old.negocio_id and p.categoria_id=old.id) then
    raise exception 'No se puede mover una categoría con productos de Hipercell.' using errcode='23514';
  end if;
  return new;
end $$;
drop trigger if exists hipercell_no_mover_categoria on public.catalogo_categorias;
create trigger hipercell_no_mover_categoria before update of negocio_id
on public.catalogo_categorias for each row execute function public.hipercell_evitar_mover_categoria();
commit;

select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='hipercell_imagenes';
