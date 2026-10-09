'use strict';
window.createHipercellAdminAPI = (client, config) => {
  let authorized = false;
  const businessId = config.businessId;
  const bucket = 'hipercell_imagenes';
  const columns = 'id,negocio_id,categoria_id,nombre,descripcion,precio,stock,estado,destacado,activo,imagen_url,imagenes_url';
  const editable = ['nombre','descripcion','precio','stock','categoria_id','estado','destacado','activo','imagen_url','imagenes_url'];
  const safeId = value => /^\d+$/.test(String(value));
  function guard() { if (!authorized) throw new Error('Inicia sesión con el administrador de Hipercell.'); }
  function fail(error) { if (error) throw new Error(error.message || 'No se pudo completar la operación.'); }
  function checkedPhotos(photos) {
    if (!Array.isArray(photos) || photos.length > 3) throw new Error('Máximo tres fotos por producto.');
    const urls = photos.map(value => {
      let url;
      try { url = new URL(value); } catch { throw new Error('Foto inválida.'); }
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Foto inválida.');
      return url.href;
    });
    if (new Set(urls).size !== urls.length) throw new Error('No repitas la misma foto.');
    return urls;
  }
  async function authorize() {
    authorized = false;
    const {data,error} = await client.auth.getUser(); fail(error);
    if (!data?.user?.id) throw new Error('La sesión no es válida.');
    const link = await client.from('catalogo_usuarios_negocio').select('user_id,negocio_id,rol')
      .eq('user_id',data.user.id).eq('negocio_id',businessId).maybeSingle(); fail(link.error);
    if (!link.data || link.data.user_id !== data.user.id || link.data.negocio_id !== businessId)
      throw new Error('Esta cuenta no está vinculada a Hipercell.');
    authorized = true; return data.user;
  }
  function clear() { authorized = false; }
  async function all(table, select) {
    guard(); const rows=[];
    for (let offset=0;;offset+=500) {
      const result=await client.from(table).select(select).eq('negocio_id',businessId).order('id').range(offset,offset+499);
      fail(result.error);
      if (!Array.isArray(result.data) || result.data.some(row=>row.negocio_id!==businessId)) throw new Error('Respuesta del negocio inválida.');
      rows.push(...result.data); if (result.data.length<500) return rows;
    }
  }
  const listProducts = () => all('catalogo_productos',columns);
  const listCategories = () => all('catalogo_categorias','id,negocio_id,nombre,orden,activo');
  async function getBusiness() {
    guard(); const result=await client.from('catalogo_negocios').select('id,nombre,whatsapp,monedas')
      .eq('id',businessId).single(); fail(result.error);
    if (result.data?.id!==businessId) throw new Error('No se encontró Hipercell.'); return result.data;
  }
  async function productValues(input) {
    guard(); const name=String(input.nombre || '').trim();
    const price=input.precio==null || input.precio==='' ? NaN : Number(input.precio);
    const stock=input.stock==null || input.stock==='' ? null : Number(input.stock);
    if (!name || !Number.isFinite(price) || price<0) throw new Error('Completa el nombre y un precio válido.');
    if (stock!=null && (!Number.isSafeInteger(stock) || stock<0)) throw new Error('Stock inválido.');
    if (!['disponible','agotado'].includes(input.estado)) throw new Error('Disponibilidad inválida.');
    const category=input.categoria_id==null || input.categoria_id==='' ? null : String(input.categoria_id);
    if (category!=null) {
      if (!safeId(category)) throw new Error('Categoría inválida.');
      const result=await client.from('catalogo_categorias').select('id,negocio_id').eq('id',category).eq('negocio_id',businessId).maybeSingle();
      fail(result.error); if (!result.data || result.data.negocio_id!==businessId) throw new Error('La categoría no pertenece a Hipercell.');
    }
    const photos=checkedPhotos(input.imagenes_url || []);
    return {negocio_id:businessId,nombre:name,descripcion:String(input.descripcion || ''),precio:price,stock,categoria_id:category,
      estado:input.estado,destacado:input.destacado===true,activo:input.activo===true,imagenes_url:photos,imagen_url:photos[0] || null};
  }
  async function saveProduct(input, baseline=null) {
    const values=await productValues(input);
    let query;
    if (!baseline) query=client.from('catalogo_productos').insert(values);
    else {
      if (!safeId(baseline.id) || baseline.negocio_id!==businessId) throw new Error('Producto ajeno o inválido.');
      query=client.from('catalogo_productos').update(values).eq('id',baseline.id).eq('negocio_id',businessId);
      // Si otra sesión cambió el producto, no sobrescribir sus cambios.
      for (const field of editable) {
        const value=baseline[field];
        query=value==null ? query.is(field,null) : query.eq(field,field==='imagenes_url' ? JSON.stringify(value) : value);
      }
    }
    const result=await query.select(columns).maybeSingle(); fail(result.error);
    if (!result.data || result.data.negocio_id!==businessId) throw new Error('El producto cambió en otra sesión. Vuelve a cargarlo antes de guardar.');
    return result.data;
  }
  async function saveCategory(input, baseline=null) {
    guard(); const name=String(input.nombre || '').trim(); const order=Number(input.orden);
    if (!name || !Number.isSafeInteger(order) || order<0) throw new Error('Completa el nombre y un orden válido.');
    const values={negocio_id:businessId,nombre:name,orden:order,activo:input.activo===true};
    let query;
    if (!baseline) query=client.from('catalogo_categorias').insert(values);
    else {
      if (!safeId(baseline.id) || baseline.negocio_id!==businessId) throw new Error('Categoría inválida.');
      query=client.from('catalogo_categorias').update(values).eq('id',baseline.id).eq('negocio_id',businessId)
        .eq('nombre',baseline.nombre).eq('orden',baseline.orden).eq('activo',baseline.activo);
    }
    const result=await query.select('id,negocio_id,nombre,orden,activo').maybeSingle(); fail(result.error);
    if (!result.data || result.data.negocio_id!==businessId) throw new Error('La categoría cambió. Vuelve a cargarla.'); return result.data;
  }
  async function saveBusiness(input) {
    guard(); const phone=String(input.whatsapp || '').replace(/[\s()+-]/g,'');
    if (phone && !/^\d{8,15}$/.test(phone)) throw new Error('Introduce WhatsApp con código de país.');
    if (!/^[A-Z]{3}$/.test(input.currency || '')) throw new Error('Moneda inválida.');
    const business=await getBusiness();
    let previous=business.monedas;
    if (typeof previous==='string') previous=JSON.parse(previous);
    const monedas=previous?.base===input.currency ? previous : {base:input.currency,activas:[input.currency],tasas:{}};
    const result=await client.from('catalogo_negocios').update({whatsapp:phone,monedas})
      .eq('id',businessId).select('id,nombre,whatsapp,monedas').single(); fail(result.error); return result.data;
  }
  async function uploadPhoto(productId,file) {
    guard();
    if (config.photoBucket!==bucket || !safeId(productId)) throw new Error('No se puede subir la foto a este producto.');
    const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    const ext=extensions[file.type];
    if (!ext || !Number.isFinite(file.size) || file.size<=0 || file.size>5242880) throw new Error('Usa JPG, PNG o WebP de hasta 5 MB.');
    const product=await client.from('catalogo_productos').select('id,negocio_id').eq('id',productId).eq('negocio_id',businessId).maybeSingle();
    fail(product.error); if (!product.data || product.data.negocio_id!==businessId) throw new Error('Producto ajeno o inexistente.');
    const path=`${businessId}/${productId}/${crypto.randomUUID()}.${ext}`;
    const result=await client.storage.from(bucket).upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false}); fail(result.error);
    const {data}=client.storage.from(bucket).getPublicUrl(path);
    const url=new URL(data.publicUrl);
    if (url.protocol!=='https:' || url.origin!==new URL(config.supabaseUrl).origin) throw new Error('URL de foto inesperada.');
    return url.href;
  }
  return Object.freeze({authorize,clear,listProducts,listCategories,getBusiness,saveProduct,saveCategory,saveBusiness,uploadPhoto,checkedPhotos});
};
