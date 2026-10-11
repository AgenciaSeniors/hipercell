'use strict';
window.HipercellExtras = (() => {
  const config=window.HIPERCELL_CONFIG,helpers=window.HipercellSettings;
  let selected=null,currencies={base:'CUP',activas:['CUP'],tasas:{}},session,weeklySchedule=null;
  const viewed=new Set();
  try{session=sessionStorage.getItem('hipercell:activity-session');if(!session){session=crypto.randomUUID();sessionStorage.setItem('hipercell:activity-session',session);}}catch{session=crypto.randomUUID();}
  async function event(type,items=[],key=crypto.randomUUID()) {
    if(new URLSearchParams(location.search).get('demo')==='1'||config.source==='demo')return;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
    try{await fetch(new URL('/rest/v1/rpc/hipercell_registrar_evento',config.supabaseUrl),{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({p_tipo:type,p_clave:key,p_items:items}),signal:controller.signal});}catch{/* La actividad no bloquea el catálogo. */}finally{clearTimeout(timer);}
  }
  function view(id=null){const key=id==null?'catalog':String(id);if(viewed.has(key))return;viewed.add(key);void event(id==null?'vista_catalogo':'vista_producto',id==null?[]:[{id:Number(id),cantidad:1}],session+':'+key);}
  function load(data,onChange){
    currencies=helpers.currencies(data.business.monedas);selected=currencies.activas.includes(selected)?selected:currencies.base;
    let selector=document.getElementById('catalog-currency');
    if(!selector){const label=document.createElement('label');label.className='sort-label';label.append(document.createTextNode('Moneda'));selector=document.createElement('select');selector.id='catalog-currency';selector.setAttribute('aria-label','Moneda para precios y pedido');label.append(selector);document.querySelector('.toolbar').append(label);selector.addEventListener('change',()=>{selected=selector.value;onChange();});}
    selector.replaceChildren();for(const code of currencies.activas)selector.append(new Option(code,code));selector.value=selected;selector.parentElement.hidden=currencies.activas.length<2;
    let contact=document.getElementById('store-info');
    if(!contact){contact=document.createElement('section');contact.id='store-info';contact.className='wrap store-info';document.querySelector('main').append(contact);}
    contact.replaceChildren();const title=document.createElement('h2');title.textContent='Horario y contacto';contact.append(title);
    const b=data.business;weeklySchedule=b.horario_semanal;
    if(b.direccion){const p=document.createElement('p');p.textContent=b.direccion;contact.append(p);}
    if(b.horario_semanal){const p=document.createElement('p');p.textContent=(helpers.openNow(b.horario_semanal)?'Abierto ahora':'Fuera del horario de atención')+' · Hora de Cuba';p.id='store-open-state';contact.append(p);
      const list=document.createElement('ul');const weekly=helpers.schedule(b.horario_semanal);for(const [key,name] of helpers.days){const li=document.createElement('li'),day=weekly[key];li.textContent=`${name}: ${day.abierto?day.apertura+' – '+day.cierre:'Cerrado'}`;list.append(li);}contact.append(list);
    }
    if(b.horario){const p=document.createElement('p');p.textContent=b.horario;contact.append(p);}
    for(const network of ['instagram','facebook'])if(b[network]){try{const a=document.createElement('a');a.href=helpers.social(b[network],network);a.textContent=network==='instagram'?'Instagram ↗':'Facebook ↗';a.target='_blank';a.rel='noopener noreferrer';contact.append(a);}catch{/* No publicar enlaces inválidos heredados. */}}
    contact.hidden=!b.direccion&&!b.horario&&!b.horario_semanal&&!b.instagram&&!b.facebook;
    view();
  }
  function currency(){return selected;}
  function convert(value){return Number(value)/(selected===currencies.base?1:currencies.tasas[selected]);}
  function sameRates(raw){const current=helpers.currencies(raw);return current.base===currencies.base&&current.activas.includes(selected)&&(selected===current.base||current.tasas[selected]===currencies.tasas[selected]);}
  setInterval(()=>{const state=document.getElementById('store-open-state');if(state&&weeklySchedule)state.textContent=(helpers.openNow(weeklySchedule)?'Abierto ahora':'Fuera del horario de atención')+' · Hora de Cuba';},60000);
  return {load,currency,convert,sameRates,view,request:items=>event('solicitud_whatsapp',items)};
})();
