'use strict';
window.HipercellCatalog = (() => {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function photoURL(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
    catch { return null; }
  }
  function mapProducts(rows, categories, businessId) {
    const visibleCategories = new Map();
    for (const category of categories) {
      if (category.negocio_id !== businessId) throw new Error('Respuesta de categorías de otro negocio.');
      if (category.activo === true) visibleCategories.set(String(category.id), String(category.nombre || 'Productos'));
    }
    const seen = new Set();
    const products = [];
    for (const row of rows) {
      if (row.negocio_id !== businessId) throw new Error('Respuesta de productos de otro negocio.');
      if (row.activo !== true) continue;
      const id = String(row.id);
      if (!/^\d+$/.test(id) || seen.has(id)) throw new Error('Identificador de producto inválido o repetido.');
      seen.add(id);
      // Ocultar también los productos de categorías ocultas o ajenas.
      if (row.categoria_id != null && !visibleCategories.has(String(row.categoria_id))) continue;
      const price = row.precio == null || row.precio === '' ? NaN : Number(row.precio);
      if (!Number.isFinite(price) || price < 0) throw new Error('Un producto tiene un precio inválido.');
      const stock = row.stock == null ? null : Number(row.stock);
      if (stock != null && (!Number.isSafeInteger(stock) || stock < 0)) throw new Error('Un producto tiene un stock inválido.');
      const gallery = Array.isArray(row.imagenes_url) ? row.imagenes_url : [];
      const photos = [...new Set(gallery.map(photoURL).filter(Boolean))];
      const legacy = photoURL(row.imagen_url);
      if (!photos.length && legacy) photos.push(legacy);
      products.push({id, name: String(row.nombre || 'Producto'), category: visibleCategories.get(String(row.categoria_id)) || 'Productos', price, stock,
        available: row.estado === 'disponible' && (stock == null || stock > 0), featured: row.destacado === true,
        description: String(row.descripcion || ''), short: String(row.descripcion || '').slice(0, 100), kind: 'screen', photos: photos.slice(0,3)});
    }
    return products;
  }
  async function load(config, fetcher = fetch) {
    if (!uuid.test(config.businessId || '')) throw new Error('Falta el identificador válido de Hipercell.');
    const base = new URL(config.supabaseUrl);
    if (base.protocol !== 'https:' || base.username || base.password) throw new Error('URL de Supabase inválida.');
    if (!config.publishableKey?.startsWith('sb_publishable_')) throw new Error('Falta la clave pública de Supabase.');
    async function read(table, parameters) {
      const url = new URL('/rest/v1/' + table, base);
      url.search = new URLSearchParams(parameters).toString();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetcher(url.href, {headers:{apikey:config.publishableKey, Accept:'application/json'}, signal:controller.signal, cache:'no-store'});
        if (!response.ok) throw new Error('Supabase no pudo leer el catálogo (HTTP ' + response.status + ').');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Respuesta de catálogo inválida.');
        return data;
      } catch(error) { if(error.name === 'AbortError') throw new Error('Supabase tardó demasiado en responder. Vuelve a intentarlo.'); throw error; }
      finally { clearTimeout(timer); }
    }
    async function all(table, parameters) {
      const result = [];
      for (let offset = 0; ; offset += 500) {
        const page = await read(table, {...parameters, order:'id.asc', limit:500, offset});
        result.push(...page);
        if (page.length < 500) return result;
      }
    }
    const businessRows = await read('catalogo_negocios', {select:'id,nombre,whatsapp,monedas',id:'eq.'+config.businessId,limit:1});
    const business = businessRows[0];
    if (!business || business.id !== config.businessId) throw new Error('Hipercell todavía no está dado de alta o no tiene lectura pública habilitada.');
    let currencies = business.monedas;
    if (typeof currencies === 'string') { try { currencies = JSON.parse(currencies); } catch { throw new Error('Configuración de moneda inválida.'); } }
    const currency = currencies?.base;
    if (!/^[A-Z]{3}$/.test(currency || '')) throw new Error('Configura la moneda base de Hipercell en Supabase.');
    new Intl.NumberFormat('es', {style:'currency',currency});
    const [categories, rows] = await Promise.all([
      all('catalogo_categorias',{select:'id,negocio_id,nombre,activo',negocio_id:'eq.'+config.businessId,activo:'eq.true'}),
      all('catalogo_productos',{select:'id,negocio_id,categoria_id,nombre,descripcion,precio,stock,estado,destacado,activo,imagen_url,imagenes_url',negocio_id:'eq.'+config.businessId,activo:'eq.true'})
    ]);
    const whatsapp = String(business.whatsapp || '').replace(/[\s()+-]/g,'');
    return {business, products:mapProducts(rows,categories,config.businessId),currency,whatsapp};
  }
  return Object.freeze({load,mapProducts,photoURL});
})();
