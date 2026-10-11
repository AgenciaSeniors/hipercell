'use strict';
window.HipercellAdminExtras = (() => {
  const $=id=>document.getElementById(id), helpers=window.HipercellSettings;
  let config={base:'CUP',activas:['CUP'],tasas:{}},statsLoader,qrSVG='',statsRevision=0;
  function rates() {
    const base=$('business-currency').value;
    const container=$('business-rates');container.replaceChildren();
    for(const code of [...new Set([...helpers.codes,...config.activas])].filter(c=>c!==base)) {
      const row=document.createElement('div');row.className='settings-row';
      const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.dataset.currency=code;check.checked=config.activas.includes(code);
      label.append(check,document.createTextNode(' '+code));
      const rate=document.createElement('input');rate.type='number';rate.min='0.000001';rate.step='any';rate.dataset.rate=code;rate.value=config.tasas[code]||'';rate.setAttribute('aria-label',`1 ${code} equivale a cuántos ${base}`);
      const toggleRate=()=>{rate.readOnly=!check.checked;rate.required=check.checked;};
      check.addEventListener('change',toggleRate);toggleRate();
      const unit=document.createElement('span');unit.textContent=`${base} por 1 ${code}`;row.append(label,rate,unit);container.append(row);
    }
  }
  function rememberRates() {
    config.activas=[$('business-currency').value];config.tasas={};
    for(const check of document.querySelectorAll('[data-currency]'))if(check.checked){config.activas.push(check.dataset.currency);config.tasas[check.dataset.currency]=Number(document.querySelector(`[data-rate="${check.dataset.currency}"]`).value);}
  }
  $('business-currency').addEventListener('change',()=>{config={base:$('business-currency').value,activas:[$('business-currency').value],tasas:{}};rates();});
  for(const [key,name] of helpers.days) {
    const row=document.createElement('div');row.className='settings-row';
    const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.id='day-'+key;
    label.append(check,document.createTextNode(' '+name));row.append(label);
    for(const [part,title,value] of [['open','Apertura','09:00'],['close','Cierre','18:00']]){const input=document.createElement('input');input.type='time';input.id=part+'-'+key;input.value=value;input.setAttribute('aria-label',title+' '+name);row.append(input);}
    $('business-schedule').append(row);
  }
  window.addEventListener('hipercell:business',event=>{
    const b=event.detail;config=helpers.currencies(b.monedas);rates();
    for(const [id,field] of [['business-address','direccion'],['business-instagram','instagram'],['business-facebook','facebook'],['business-hours-note','horario']])$(id).value=b[field]||'';
    $('schedule-enabled').checked=!!b.horario_semanal;
    const weekly=helpers.schedule(b.horario_semanal);
    for(const [key] of helpers.days){const day=weekly?.[key];$('day-'+key).checked=day?.abierto||false;$('open-'+key).value=day?.apertura||'09:00';$('close-'+key).value=day?.cierre||'18:00';}
  });
  function read() {
    rememberRates();const monedas=helpers.currencies({...config,base:$('business-currency').value});
    const weekly={};for(const [key] of helpers.days)weekly[key]={abierto:$('day-'+key).checked,apertura:$('open-'+key).value,cierre:$('close-'+key).value};
    return {monedas,details:{direccion:$('business-address').value,instagram:$('business-instagram').value,facebook:$('business-facebook').value,horario:$('business-hours-note').value,horario_semanal:$('schedule-enabled').checked?helpers.schedule(weekly):null}};
  }
  $('catalog-public-url').value=window.HIPERCELL_CONFIG.publicCatalogUrl || new URL('index.html',location.href).href;
  function publicURL(){const url=new URL($('catalog-public-url').value);if(url.protocol!=='https:'||url.username||url.password||url.hostname==='localhost'||url.hostname==='127.0.0.1')throw new Error('Usa la dirección pública HTTPS del catálogo.');url.hash='';return url.href;}
  function shareAction(action){try{action();$('share-status').textContent='';}catch(error){$('share-status').textContent=error.message;}}
  $('generate-qr').addEventListener('click',()=>shareAction(()=>{
    const url=publicURL();const qr=window.qrcode(0,'M');qr.addData(url);qr.make();qrSVG=qr.createSvgTag({cellSize:6,margin:24,scalable:true});
    $('catalog-qr').innerHTML=qrSVG;$('download-qr').disabled=false;
  }));
  $('catalog-public-url').addEventListener('input',()=>{qrSVG='';$('catalog-qr').replaceChildren();$('download-qr').disabled=true;});
  $('copy-catalog-url').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(publicURL());$('share-status').textContent='Enlace copiado.';}catch(error){$('share-status').textContent='No se pudo copiar. Selecciona y copia el enlace manualmente.';}});
  $('download-qr').addEventListener('click',()=>{if(!qrSVG)return;const url=URL.createObjectURL(new Blob([qrSVG],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download='Hipercell-QR.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  async function statistics(){
    const revision=++statsRevision;
    const button=$('refresh-stats');button.disabled=true;$('stats-status').textContent='Cargando estadísticas…';$('stats-summary').replaceChildren();$('stats-views').replaceChildren();$('stats-requests').replaceChildren();
    try{if(!statsLoader)throw new Error('Inicia sesión para consultar estadísticas.');const data=await statsLoader($('stats-period').value);
      if(revision!==statsRevision)return;
      $('stats-summary').textContent=`${data.visitas||0} visitas al catálogo · ${data.vistas||0} vistas de productos · ${data.solicitudes||0} solicitudes por WhatsApp`;
      for(const [id,rows,field,label] of [['stats-views',data.top_vistos,'vistas','vistas'],['stats-requests',data.top_solicitados,'unidades','unidades solicitadas']]){
        for(const row of rows||[]){const item=document.createElement('li');item.textContent=`${row.nombre||'Producto retirado'} — ${row[field]} ${label}`;$(id).append(item);}
        if(!$(id).children.length){const item=document.createElement('li');item.textContent='Aún no hay actividad en este período.';$(id).append(item);}
      }$('stats-status').textContent='';
    }catch(error){if(revision===statsRevision)$('stats-status').textContent=error.message;}finally{if(revision===statsRevision)button.disabled=false;}
  }
  $('refresh-stats').addEventListener('click',statistics);$('stats-period').addEventListener('change',statistics);
  document.querySelector('[data-tab="stats"]').addEventListener('click',statistics);
  window.addEventListener('hipercell:logout',()=>{statsRevision++;$('stats-summary').replaceChildren();$('stats-views').replaceChildren();$('stats-requests').replaceChildren();$('stats-status').textContent='';$('refresh-stats').disabled=false;});
  return {read,setStatsLoader:loader=>{statsLoader=loader;}};
})();
