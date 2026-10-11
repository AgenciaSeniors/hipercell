'use strict';
window.HipercellSettings = (() => {
  const days = [['lun','Lunes'],['mar','Martes'],['mie','Miércoles'],['jue','Jueves'],['vie','Viernes'],['sab','Sábado'],['dom','Domingo']];
  const codes = ['CUP','USD','EUR'];
  function currencies(raw) {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const base = value?.base || 'CUP';
    if (!/^[A-Z]{3}$/.test(base)) throw new Error('Moneda base inválida.');
    const active = [...new Set([base,...(Array.isArray(value?.activas)?value.activas:[])])];
    const rates = {};
    for (const code of active) {
      if (!/^[A-Z]{3}$/.test(code)) throw new Error('Moneda disponible inválida.');
      if (code !== base) {
        const rate = Number(value?.tasas?.[code]);
        if (!Number.isFinite(rate) || rate <= 0) throw new Error('Indica una tasa positiva para '+code+'.');
        rates[code] = rate;
      }
    }
    return {base,activas:active,tasas:rates};
  }
  function schedule(raw) {
    if (raw == null) return null;
    const result = {};
    for (const [key] of days) {
      const day = raw[key] || {abierto:false,apertura:'09:00',cierre:'18:00'};
      const valid = time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time || '');
      if (!valid(day.apertura) || !valid(day.cierre)) throw new Error('Horario inválido para '+key+'.');
      if (day.abierto && day.apertura === day.cierre) throw new Error('Apertura y cierre deben ser diferentes para '+key+'.');
      result[key] = {abierto:day.abierto===true,apertura:day.apertura,cierre:day.cierre};
    }
    return result;
  }
  function social(value,network) {
    const text = String(value || '').trim();
    if (!text) return '';
    let url;
    try { url=new URL(text); } catch { throw new Error('Introduce el enlace completo de '+network+'.'); }
    const host = url.hostname.toLowerCase();
    if (url.protocol!=='https:' || url.username || url.password || !(host===network+'.com' || host==='www.'+network+'.com' || (network==='facebook'&&host==='m.facebook.com'))) throw new Error('Usa un enlace HTTPS de '+network+'.com.');
    return url.href;
  }
  function openNow(raw, date=new Date()) {
    const weekly = schedule(raw);
    if (!weekly) return null;
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Havana',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
    const keys = ['dom','lun','mar','mie','jue','vie','sab'];
    const dayIndex = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday);
    const time = parts.hour+':'+parts.minute;
    const today = weekly[keys[dayIndex]], previous=weekly[keys[(dayIndex+6)%7]];
    return (today.abierto && (today.apertura<today.cierre ? time>=today.apertura&&time<today.cierre : time>=today.apertura)) || (previous.abierto && previous.apertura>previous.cierre && time<previous.cierre);
  }
  return Object.freeze({days,codes,currencies,schedule,social,openNow});
})();
