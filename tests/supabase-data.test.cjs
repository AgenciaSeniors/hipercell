const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = {window:{},URL,Intl,URLSearchParams,AbortController,setTimeout,clearTimeout,fetch};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../supabase-data.js'),'utf8'),context);
const api=context.window.HipercellCatalog;
const id='46a2d035-836b-472c-9f1f-adcde294a923';
const config={businessId:id,supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_test'};
const categories=[{id:1,negocio_id:id,nombre:'Repuestos',activo:true}];
const product={id:10,negocio_id:id,categoria_id:1,nombre:'Pantalla',precio:'35.50',stock:2,estado:'disponible',activo:true,imagenes_url:[]};
test('mapping preserves currency-neutral prices and finite stock',()=>{
 const p=api.mapProducts([product],categories,id)[0];assert.equal(p.price,35.5);assert.equal(p.stock,2);assert.equal(p.available,true);
 assert.equal(api.mapProducts([{...product,stock:0}],categories,id)[0].available,false);
 assert.equal(api.mapProducts([{...product,stock:null}],categories,id)[0].stock,null);
});
test('ignores hidden products and hidden or foreign categories',()=>{
 assert.equal(api.mapProducts([{...product,activo:false}],categories,id).length,0);
 assert.equal(api.mapProducts([product],[{...categories[0],activo:false}],id).length,0);
 assert.equal(api.mapProducts([{...product,categoria_id:999}],categories,id).length,0);
 assert.equal(api.mapProducts([{...product,categoria_id:null}],categories,id)[0].category,'Productos');
});
test('refuses cross-business responses and malformed records',()=>{
 assert.throws(()=>api.mapProducts([{...product,negocio_id:'other'}],categories,id));
 assert.throws(()=>api.mapProducts([product],[{...categories[0],negocio_id:'other'}],id));
 for(const precio of [null,'',-1,'bad',Infinity])assert.throws(()=>api.mapProducts([{...product,precio}],categories,id));
 for(const stock of [-1,1.5,'bad'])assert.throws(()=>api.mapProducts([{...product,stock}],categories,id));
 assert.throws(()=>api.mapProducts([product,product],categories,id));
 assert.throws(()=>api.mapProducts([{...product,id:'"><script>'}],categories,id));
});
test('photo URLs are HTTPS only, unique, max three, with legacy fallback',()=>{
 const urls=['https://example.com/a.png','javascript:alert(1)','https://example.com/a.png','https://example.com/b.png','https://example.com/c.png','https://example.com/d.png'];
 const p=api.mapProducts([{...product,imagenes_url:urls}],categories,id)[0];assert.equal(p.photos.length,3);
 assert.equal(api.mapProducts([{...product,imagen_url:'https://example.com/legacy.png'}],categories,id)[0].photos.length,1);
 assert.equal(api.photoURL('https://user:pass@example.com/a.png'),null);
});
test('requires UUID before making any request',async()=>{
 let calls=0;await assert.rejects(api.load({...config,businessId:''},()=>{calls++}));assert.equal(calls,0);
});
test('missing business or HTTP failure never returns demo products',async()=>{
 await assert.rejects(api.load(config,async()=>({ok:true,json:async()=>[]})),/todavía no/);
 await assert.rejects(api.load(config,async()=>({ok:false,status:403})),/HTTP 403/);
});
test('requests are read-only, tenant scoped, public-key authenticated and paginated',async()=>{
 const calls=[];
 const result=await api.load(config,async(raw,options)=>{
   const url=new URL(raw);calls.push(url);
   assert.equal(options.headers.apikey,config.publishableKey);assert.equal(options.method,undefined);
   assert.equal(options.headers.Authorization,undefined);
   let data;
   if(url.pathname.endsWith('catalogo_negocios')){
     assert.equal(url.searchParams.get('id'),'eq.'+id);data=[{id,monedas:{base:'CUP'},whatsapp:'+53 5555 5555'}];
   }else{
     assert.equal(url.searchParams.get('negocio_id'),'eq.'+id);assert.equal(url.searchParams.get('activo'),'eq.true');
     if(url.pathname.endsWith('catalogo_categorias'))data=categories;
     else data=url.searchParams.get('offset')==='0' ? Array.from({length:500},(_,i)=>({...product,id:100+i})) : [{...product,id:700}];
   }
   return {ok:true,json:async()=>data};
 });
 assert.equal(result.products.length,501);assert.equal(result.currency,'CUP');assert.equal(result.whatsapp,'5355555555');assert.equal(calls.length,4);
});
test('rejects mismatched business identity and missing currency',async()=>{
 await assert.rejects(api.load(config,async()=>({ok:true,json:async()=>[{id:'other',monedas:{base:'USD'}}]})));
 await assert.rejects(api.load(config,async()=>({ok:true,json:async()=>[{id,monedas:{}}]})),/moneda base/);
});
