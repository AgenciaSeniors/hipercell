-- Solo estadísticas de Hipercell. No modifica catalogo_eventos ni otros negocios.
begin;
create table if not exists public.hipercell_eventos (
  id bigint generated always as identity primary key,
  clave text not null check(length(clave) between 1 and 128),
  tipo text not null check(tipo in ('vista_catalogo','vista_producto','solicitud_whatsapp')),
  producto_id bigint references public.catalogo_productos(id) on delete set null,
  clave_producto bigint not null default 0,
  cantidad integer not null default 1 check(cantidad between 1 and 99),
  creado_en timestamptz not null default now()
);
create unique index if not exists hipercell_eventos_unicos on public.hipercell_eventos(clave,tipo,clave_producto);
create index if not exists hipercell_eventos_fecha on public.hipercell_eventos(creado_en,tipo);
alter table public.hipercell_eventos enable row level security;
revoke all on public.hipercell_eventos from anon,authenticated;
grant select on public.hipercell_eventos to authenticated;
drop policy if exists hipercell_admin_lee_eventos on public.hipercell_eventos;
create policy hipercell_admin_lee_eventos on public.hipercell_eventos for select to authenticated using (
  exists(select 1 from public.catalogo_usuarios_negocio where user_id=auth.uid() and negocio_id='46a2d035-836b-472c-9f1f-adcde294a923')
);
create or replace function public.hipercell_registrar_evento(p_tipo text,p_clave text,p_items jsonb default '[]'::jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; product_id bigint; units integer;
begin
  if p_tipo is null or p_tipo not in ('vista_catalogo','vista_producto','solicitud_whatsapp') or p_clave is null or length(p_clave) not between 1 and 128 then raise exception 'Evento inválido'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Productos inválidos'; end if;
  if p_tipo='vista_catalogo' then
    if jsonb_array_length(p_items)<>0 then raise exception 'Visita inválida'; end if;
    insert into public.hipercell_eventos(clave,tipo) values(p_clave,p_tipo) on conflict do nothing; return;
  end if;
  if jsonb_array_length(p_items) not between 1 and 100 or (p_tipo='vista_producto' and jsonb_array_length(p_items)<>1) then raise exception 'Productos inválidos'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item)<>'object' or coalesce(item->>'id','') !~ '^[1-9][0-9]{0,17}$' or coalesce(item->>'cantidad','') !~ '^[1-9][0-9]?$' then raise exception 'Producto inválido'; end if;
    product_id=(item->>'id')::bigint; units=(item->>'cantidad')::integer;
    if not exists(select 1 from public.catalogo_productos p where p.id=product_id and p.negocio_id='46a2d035-836b-472c-9f1f-adcde294a923' and p.activo=true and (p.categoria_id is null or exists(select 1 from public.catalogo_categorias c where c.id=p.categoria_id and c.negocio_id=p.negocio_id and c.activo=true))) then raise exception 'Producto ajeno u oculto'; end if;
    if p_tipo='vista_producto' and units<>1 then raise exception 'Vista inválida'; end if;
    insert into public.hipercell_eventos(clave,tipo,producto_id,clave_producto,cantidad) values(p_clave,p_tipo,product_id,product_id,units) on conflict do nothing;
  end loop;
end;
$$;
revoke all on function public.hipercell_registrar_evento(text,text,jsonb) from public;
grant execute on function public.hipercell_registrar_evento(text,text,jsonb) to anon,authenticated;
create or replace function public.hipercell_estadisticas(p_dias integer default 7)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare since_time timestamptz;
begin
  if not exists(select 1 from public.catalogo_usuarios_negocio where user_id=auth.uid() and negocio_id='46a2d035-836b-472c-9f1f-adcde294a923') then raise exception 'No autorizado'; end if;
  if p_dias is null or p_dias not in (0,7,30) then raise exception 'Período inválido'; end if;
  since_time=case when p_dias=0 then '-infinity'::timestamptz else now()-make_interval(days=>p_dias) end;
  return jsonb_build_object(
    'visitas',(select count(*) from public.hipercell_eventos where tipo='vista_catalogo' and creado_en>=since_time),
    'vistas',(select count(*) from public.hipercell_eventos where tipo='vista_producto' and creado_en>=since_time),
    'solicitudes',(select count(distinct clave) from public.hipercell_eventos where tipo='solicitud_whatsapp' and creado_en>=since_time),
    'top_vistos',coalesce((select jsonb_agg(row_to_json(t)) from (select e.producto_id,p.nombre,count(*) as vistas from public.hipercell_eventos e left join public.catalogo_productos p on p.id=e.producto_id where e.tipo='vista_producto' and e.creado_en>=since_time group by e.producto_id,p.nombre order by vistas desc,e.producto_id limit 10)t),'[]'::jsonb),
    'top_solicitados',coalesce((select jsonb_agg(row_to_json(t)) from (select e.producto_id,p.nombre,sum(e.cantidad) as unidades,count(*) as solicitudes from public.hipercell_eventos e left join public.catalogo_productos p on p.id=e.producto_id where e.tipo='solicitud_whatsapp' and e.creado_en>=since_time group by e.producto_id,p.nombre order by unidades desc,e.producto_id limit 10)t),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.hipercell_estadisticas(integer) from public,anon;
grant execute on function public.hipercell_estadisticas(integer) to authenticated;
commit;
select 'Estadísticas de Hipercell preparadas' as resultado;
