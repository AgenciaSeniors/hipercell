'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const config=window.HIPERCELL_CONFIG;
  const state={busy:false,needsRefresh:false,products:[],categories:[],business:null,baseline:null,categoryBaseline:null,photos:[],previews:[],dirty:false,user:null};
  let client,api;
  function message(text,error=false) { $('admin-status').textContent=text; $('admin-status').classList.toggle('error',error); }
  function busy(value) {
    state.busy=value;
    for(const control of document.querySelectorAll('main button,main input,main select,main textarea'))control.disabled=value;
    if(!value){
      $('photo-upload').disabled=state.photos.length>=3;
      for(const button of document.querySelectorAll('#admin-pane button[type=submit]'))button.disabled=state.needsRefresh;
      $('new-product').disabled=state.needsRefresh;$('new-category').disabled=state.needsRefresh;
    }
  }
  async function run(action) {
    if(state.busy)return;
    busy(true);
    try { await action(); }
    catch(error) { message(error.message || 'No se pudo completar la operaciÃ³n.',true); }
    finally { busy(false); }
  }
  function loggedOut() {
    if(api)api.clear();
    state.user=null;state.needsRefresh=false;state.products=[];state.categories=[];state.business=null;state.baseline=null;state.categoryBaseline=null;state.dirty=false;
    state.previews.forEach(URL.revokeObjectURL);state.previews=[];state.photos=[];
    $('trash-list').replaceChildren();$('product-list').replaceChildren();$('category-list').replaceChildren();$('admin-photos').replaceChildren();
    $('product-form').reset();$('category-form').reset();$('business-form').reset();
    $('admin-pane').hidden=true;$('login-pane').hidden=false;$('password').value='';
    window.dispatchEvent(new Event('hipercell:logout'));
  }
  function rowButton(label,action) { const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',action);return button; }
  function currency() { let value=state.business?.monedas;if(typeof value==='string')value=JSON.parse(value);return value?.base || 'CUP'; }
  function renderLists() {
    const inventory=state.products.filter(p=>!p.hipercell_eliminado_en);
    $('summary-products').textContent=String(inventory.length);
    $('summary-active').textContent=String(inventory.filter(p=>p.activo&&(p.categoria_id==null||state.categories.some(c=>String(c.id)===String(p.categoria_id)&&c.activo))).length);
    $('summary-categories').textContent=String(state.categories.length);
    const list=$('product-list');list.replaceChildren();
    const format=new Intl.NumberFormat('es',{style:'currency',currency:currency()});
    for(const product of inventory) {
      const row=document.createElement('tr');
      for(const text of [product.nombre,format.format(product.precio),product.stock==null?'Sin lÃ­mite':String(product.stock),!product.activo?'Oculto':product.estado==='agotado'||product.stock===0?'Agotado':'Visible']){
        const cell=document.createElement('td');cell.textContent=text;row.append(cell);
      }
      const actions=document.createElement('td');actions.append(rowButton('Editar',()=>editProduct(product)),rowButton('Mover a la papelera',()=>changeTrash(product,true)));row.append(actions);list.append(row);
    }
    $('no-products').hidden=inventory.length>0;
    const trash=state.products.filter(p=>p.hipercell_eliminado_en);
    $('trash-count').textContent=String(trash.length);
    $('trash-list').replaceChildren();
    for(const product of trash){
      const row=document.createElement('tr');
      for(const text of [product.nombre,new Date(product.hipercell_eliminado_en).toLocaleDateString('es')]){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}
      const actions=document.createElement('td');actions.append(rowButton('Restaurar',()=>changeTrash(product,false)));row.append(actions);$('trash-list').append(row);
    }
    $('no-trash').hidden=trash.length>0;
    const selected=$('product-category').value;
    $('product-category').replaceChildren(new Option('Sin categorÃ­a',''));
    for(const category of state.categories)$('product-category').append(new Option(category.nombre+(category.activo?'':' (oculta)'),category.id));
    $('product-category').value=selected;
    const categoryList=$('category-list');categoryList.replaceChildren();
    for(const category of state.categories) {
      const row=document.createElement('div');row.className='category-row';
      const text=document.createElement('span');text.textContent=`${category.nombre} Â· ${category.activo?'Visible':'Oculta'} Â· Orden ${category.orden}`;
      row.append(text,rowButton('Editar',()=>{
        state.categoryBaseline=structuredClone(category);$('category-heading').textContent='Editar categorÃ­a';
        $('category-name').value=category.nombre;$('category-order').value=category.orden;$('category-active').checked=category.activo;$('category-name').focus();
      }));categoryList.append(row);
    }
    if(!state.categories.length)categoryList.textContent='Crea categorÃ­as para organizar tus productos.';
    $('price-currency').textContent=currency();
  }
  function changeTrash(product,trashed){
    if(state.busy)return;
    if(state.needsRefresh){message('Actualiza los datos antes de continuar.',true);return;}
    if(!discardChanges())return;
    if(!window.confirm(trashed?`Â¿Mover Â«${product.nombre}Â» a la papelera? DejarÃ¡ de aparecer en el catÃ¡logo. PodrÃ¡s restaurarlo con sus fotos.`:`Â¿Restaurar Â«${product.nombre}Â»? QuedarÃ¡ oculto hasta que lo publiques desde Productos.`))return;
    run(async()=>{
      try{
        await api.setTrashed(structuredClone(product),trashed);
        state.dirty=false;state.baseline=null;$('product-form').hidden=true;
        state.previews.forEach(URL.revokeObjectURL);state.previews=[];state.photos=[];
        await loadData();message(trashed?'Producto movido a la papelera.':'Producto restaurado y oculto. Puedes editarlo y activar su visibilidad desde Productos.');
      }catch(error){state.needsRefresh=true;throw new Error('Actualiza los datos para comprobar el resultado. '+error.message);}
    });
  }
  async function loadData() {
    const [business,categories,products]=await Promise.all([api.getBusiness(),api.listCategories(),api.listProducts()]);
    if(!state.user)throw new Error('La sesiÃ³n terminÃ³. Inicia sesiÃ³n de nuevo.');
    state.business=business;state.categories=categories.sort((a,b)=>a.orden-b.orden);state.products=products;
    renderLists();
    $('business-phone').value=business.whatsapp || '';
    const code=currency();if(!Array.from($('business-currency').options).some(option=>option.value===code))$('business-currency').append(new Option(code,code));
    $('business-currency').value=code;
    window.dispatchEvent(new CustomEvent('hipercell:business',{detail:business}));
  }
  function discardChanges() { return !state.dirty || window.confirm('Hay cambios sin guardar en este producto. Â¿Quieres descartarlos?'); }
  function editProduct(product=null) {
    if(state.busy || !discardChanges())return;
    state.baseline=product ? structuredClone(product) : null;state.dirty=false;
    $('product-form').hidden=false;$('product-form').reset();
    $('product-heading').textContent=product?'Editar producto':'Nuevo producto';
    $('product-name').value=product?.nombre || '';$('product-description').value=product?.descripcion || '';
    $('product-price').value=product?.precio ?? '';$('product-stock').value=product?.stock ?? '';
    $('product-category').value=product?.categoria_id ?? '';$('product-state').value=product?.estado || 'disponible';
    $('product-active').checked=product?.activo ?? true;$('product-featured').checked=product?.destacado ?? false;
    let photos=Array.isArray(product?.imagenes_url)&&product.imagenes_url.length ? product.imagenes_url : product?.imagen_url ? [product.imagen_url] : [];
    try { photos=api.checkedPhotos(photos); }
    catch(error) { $('product-form').hidden=true;message(error.message,true);return; }
    state.photos=photos.map(url=>({url,file:null}));renderPhotos();$('product-name').focus();
  }
  function renderPhotos() {
    state.previews.forEach(URL.revokeObjectURL);state.previews=[];
    const slots=$('admin-photos');slots.replaceChildren();
    for(let index=0;index<3;index++) {
      const slot=document.createElement('article');slot.className='photo-slot';const photo=state.photos[index];
      if(!photo){slot.classList.add('empty-slot');slot.textContent=`Espacio ${index+1} de 3`;}
      else {
        const image=document.createElement('img');image.alt=`Foto ${index+1}`;
        if(photo.url)image.src=photo.url;else{image.src=URL.createObjectURL(photo.file);state.previews.push(image.src);}
        const label=document.createElement('p');label.textContent=index===0?'PRINCIPAL Â· Foto 1':`Foto ${index+1}`;
        slot.append(image,label,rowButton('Quitar',()=>{if(state.busy)return;state.photos.splice(index,1);state.dirty=true;renderPhotos();}));
        if(index>0)slot.append(rowButton('Hacer principal',()=>{if(state.busy)return;state.photos.unshift(state.photos.splice(index,1)[0]);state.dirty=true;renderPhotos();}));
      }
      slots.append(slot);
    }
    $('admin-photo-count').textContent=`${state.photos.length} / 3`;
    $('photo-upload').disabled=state.busy || state.photos.length>=3;
  }
  function verifyFile(file) {
    const formats=['image/jpeg','image/png','image/webp'];
    if(!formats.includes(file.type)||file.size<=0||file.size>5242880)throw new Error('Usa JPG, PNG o WebP de hasta 5 MB.');
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);const image=new Image();
      const timer=setTimeout(()=>finish(false),15000);
      function finish(valid){clearTimeout(timer);image.onload=image.onerror=null;URL.revokeObjectURL(url);valid?resolve():reject(new Error('Una foto no se puede abrir. Selecciona una imagen vÃ¡lida.'));}
      image.onload=()=>finish(image.naturalWidth>0&&image.naturalHeight>0);image.onerror=()=>finish(false);image.src=url;
    });
  }
  function productInput() {
    return {nombre:$('product-name').value,descripcion:$('product-description').value,precio:$('product-price').value,
      stock:$('product-stock').value===''?null:$('product-stock').value,categoria_id:$('product-category').value || null,
      estado:$('product-state').value,activo:$('product-active').checked,destacado:$('product-featured').checked};
  }
  $('product-form').addEventListener('input',()=>{state.dirty=true;});
  $('photo-upload').addEventListener('change',event=>{
    const files=Array.from(event.target.files || []);event.target.value='';if(!files.length)return;
    run(async()=>{
      if(files.length+state.photos.length>3)throw new Error('MÃ¡ximo tres fotos en total. Las fotos anteriores se conservaron.');
      await Promise.all(files.map(verifyFile));state.photos.push(...files.map(file=>({file,url:null})));state.dirty=true;renderPhotos();message('Fotos listas. Guarda el producto para aplicarlas.');
    });
  });
  $('product-form').addEventListener('submit',event=>{
    event.preventDefault();run(async()=>{
      if(state.needsRefresh)throw new Error('Actualiza la lista antes de guardar de nuevo.');
      try {
      const input=productInput();message('Guardando productoâ€¦');
      if(!state.baseline){state.baseline=await api.saveProduct({...input,activo:false,imagenes_url:[]});$('product-heading').textContent='Editar producto';}
      for(const photo of state.photos)if(!photo.url)photo.url=await api.uploadPhoto(state.baseline.id,photo.file);
      state.baseline=await api.saveProduct({...input,imagenes_url:state.photos.map(photo=>photo.url)},state.baseline);
      state.photos=state.photos.map(photo=>({url:photo.url,file:null}));state.dirty=false;renderPhotos();
      await loadData();message('Producto guardado. Ya puedes revisarlo en el catÃ¡logo.');
      } catch(error) {state.needsRefresh=true;throw new Error('No se pudo confirmar el guardado. Actualiza la lista antes de repetir.\n'+error.message);}
    });
  });
  $('new-product').addEventListener('click',()=>editProduct());
  $('cancel-product').addEventListener('click',()=>{if(!discardChanges())return;state.dirty=false;$('product-form').hidden=true;state.previews.forEach(URL.revokeObjectURL);state.previews=[];});
  $('reload').addEventListener('click',()=>{if(!discardChanges())return;run(async()=>{state.dirty=false;$('product-form').hidden=true;await loadData();state.needsRefresh=false;state.categoryBaseline=null;$('category-form').reset();$('category-heading').textContent='Nueva categorÃ­a';message('Lista actualizada.');});});
  $('new-category').addEventListener('click',()=>{state.categoryBaseline=null;$('category-form').reset();$('category-heading').textContent='Nueva categorÃ­a';$('category-name').focus();});
  $('category-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{
    if(state.needsRefresh)throw new Error('Actualiza la lista antes de guardar de nuevo.');
    try {
    state.categoryBaseline=await api.saveCategory({nombre:$('category-name').value,orden:$('category-order').value,activo:$('category-active').checked},state.categoryBaseline);
    $('category-heading').textContent='Editar categorÃ­a';await loadData();message('CategorÃ­a guardada.');
    } catch(error) {state.needsRefresh=true;throw new Error('No se pudo confirmar el guardado. Actualiza la lista antes de repetir.\n'+error.message);}
  });});
  $('business-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{
    if(state.needsRefresh)throw new Error('Actualiza la lista antes de guardar de nuevo.');
    if($('business-currency').value!==currency()&&!window.confirm('Cambiar la moneda no convierte los precios. Â¿Quieres cambiarla?'))return;
    const extra=window.HipercellAdminExtras.read();
    state.business=await api.saveBusiness({whatsapp:$('business-phone').value,currency:$('business-currency').value,...extra});renderLists();message('Datos de la tienda guardados.');
  });});
  for(const button of document.querySelectorAll('[data-tab]'))button.addEventListener('click',()=>{
    for(const tab of document.querySelectorAll('.admin-tab'))tab.hidden=tab.id!=='tab-'+button.dataset.tab;
    for(const item of document.querySelectorAll('[data-tab]'))item.setAttribute('aria-pressed',String(item===button));
  });
  async function enter() {
    try {state.user=await api.authorize();await loadData();$('login-pane').hidden=true;$('admin-pane').hidden=false;message('SesiÃ³n iniciada.');}
    catch(error){api.clear();await client.auth.signOut({scope:'local'});loggedOut();throw error;}
  }
  $('login-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{
    if(!client)throw new Error('No se pudo iniciar el acceso. Recarga la pÃ¡gina.');
    const email=$('email').value.trim(),password=$('password').value;$('password').value='';message('Comprobando accesoâ€¦');
    const {error}=await client.auth.signInWithPassword({email,password});if(error)throw new Error('No se pudo iniciar sesiÃ³n. Revisa tu correo y contraseÃ±a.');await enter();
  });});
  $('logout').addEventListener('click',()=>{if(!discardChanges())return;run(async()=>{
    const {error}=await client.auth.signOut({scope:'local'});window.sessionStorage.removeItem(`hipercell:${config.businessId}:auth`);loggedOut();if(error)throw new Error('El acceso local se cerrÃ³, pero no se pudo confirmar el cierre de la sesiÃ³n remota.');message('SesiÃ³n cerrada.');
  });});
  window.addEventListener('beforeunload',event=>{if(state.dirty){event.preventDefault();event.returnValue='';}});
  run(async()=>{
    if(location.protocol==='file:')throw new Error('Abre el panel desde la web o un servidor local para iniciar sesiÃ³n.');
    if(!window.supabase)throw new Error('No se pudo cargar el acceso. Recarga la pÃ¡gina.');
    const timedFetch=async(input,options={})=>{
      const controller=new AbortController();const abort=()=>controller.abort();
      if(options.signal?.aborted)controller.abort();else options.signal?.addEventListener('abort',abort,{once:true});
      const timer=setTimeout(abort,20000);
      try{return await fetch(input,{...options,signal:controller.signal});}
      finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
    };
    client=window.supabase.createClient(config.supabaseUrl,config.publishableKey,{global:{fetch:timedFetch},auth:{storage:window.sessionStorage,storageKey:`hipercell:${config.businessId}:auth`,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    api=window.createHipercellAdminAPI(client,config);
    window.HipercellAdminExtras.setStatsLoader(days=>api.statistics(days));
    client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')loggedOut();});
    const {data,error}=await client.auth.getSession();if(error)throw new Error('No se pudo recuperar la sesiÃ³n.');if(data.session)await enter();
  });
})();
