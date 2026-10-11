const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const context={window:{},URL,Intl,Date};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../settings.js'),'utf8'),context);const api=context.window.HipercellSettings;
test('currencies preserve base and validate positive active exchange rates',()=>{
 const c=api.currencies({base:'CUP',activas:['USD','CUP','USD'],tasas:{USD:400,EUR:440}});assert.equal(c.activas.length,2);assert.equal(c.tasas.USD,400);assert.equal(c.tasas.EUR,undefined);
 for(const rate of [0,-1,null,'',Infinity,'bad'])assert.throws(()=>api.currencies({base:'CUP',activas:['USD'],tasas:{USD:rate}}));
 assert.equal(api.currencies(null).base,'CUP');
});
test('schedule uses Cuba time, end boundary, and overnight shifts',()=>{
 const weekly={lun:{abierto:true,apertura:'09:00',cierre:'18:00'},vie:{abierto:true,apertura:'22:00',cierre:'02:00'}};
 assert.equal(api.openNow(weekly,new Date('2026-10-05T13:00:00Z')),true);
 assert.equal(api.openNow(weekly,new Date('2026-10-05T22:00:00Z')),false);
 assert.equal(api.openNow(weekly,new Date('2026-10-10T05:00:00Z')),true);
 assert.equal(api.openNow(weekly,new Date('2026-10-10T06:00:00Z')),false);
 assert.equal(api.openNow(null),null);
 assert.throws(()=>api.schedule({lun:{abierto:true,apertura:'09:00',cierre:'09:00'}}));
 assert.throws(()=>api.schedule({lun:{abierto:true,apertura:'25:00',cierre:'18:00'}}));
});
test('social links require HTTPS and the requested network',()=>{
 assert.equal(api.social('https://instagram.com/hipercell','instagram'),'https://instagram.com/hipercell');
 for(const link of ['javascript:alert(1)','https://instagram.com.evil.test/','http://instagram.com/','https://x:y@instagram.com/'])assert.throws(()=>api.social(link,'instagram'));
 assert.equal(api.social('','facebook'),'');
});
