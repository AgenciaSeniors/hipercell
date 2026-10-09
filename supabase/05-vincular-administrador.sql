-- Primero crear el usuario en Authentication > Users con hipercell@gmail.com.
-- La contraseña se define en Supabase y no se comparte en el chat.
-- No crea cuentas ni cambia un usuario de otro negocio.
begin;
do $$
declare admin_id uuid;
begin
  select id into admin_id from auth.users where lower(email)='hipercell@gmail.com';
  if admin_id is null then raise exception 'Primero crea el usuario hipercell@gmail.com en Authentication > Users.'; end if;
  if exists(select 1 from public.catalogo_usuarios_negocio where user_id=admin_id
    and negocio_id<>'46a2d035-836b-472c-9f1f-adcde294a923'::uuid) then
    raise exception 'Ese usuario administra otro negocio. No se cambió su vínculo.';
  end if;
  insert into public.catalogo_usuarios_negocio(user_id,negocio_id,rol)
  values(admin_id,'46a2d035-836b-472c-9f1f-adcde294a923','admin')
  on conflict(user_id) do nothing;
end $$;
commit;
select u.user_id,u.negocio_id,u.rol from public.catalogo_usuarios_negocio u
join auth.users a on a.id=u.user_id where lower(a.email)='hipercell@gmail.com';
