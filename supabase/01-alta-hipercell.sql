-- Ejecutar UNA VEZ en SQL Editor del proyecto existente.
-- No ejecuta el schema de la plantilla ni modifica políticas o negocios previos.
-- La moneda se deja en el valor por defecto de la tabla; confirmar antes de vender.
begin;
do $$
begin
  if exists(select 1 from public.catalogo_negocios where lower(trim(nombre)) = 'hipercell' and id <> '46a2d035-836b-472c-9f1f-adcde294a923'::uuid) then
    raise exception 'Hipercell ya existe con otro UUID. No se creó un duplicado.';
  end if;
  if exists(select 1 from public.catalogo_negocios where id = '46a2d035-836b-472c-9f1f-adcde294a923'::uuid and nombre <> 'Hipercell') then
    raise exception 'El UUID previsto pertenece a otro negocio.';
  end if;
  insert into public.catalogo_negocios(id,nombre,descripcion,color_acento,opiniones_activas)
    values('46a2d035-836b-472c-9f1f-adcde294a923','Hipercell','Hipermercado tecnológico · Todo conecta.','#C6EF00',false)
    on conflict (id) do nothing;
end $$;
commit;
select id,nombre,monedas from public.catalogo_negocios where id = '46a2d035-836b-472c-9f1f-adcde294a923';
