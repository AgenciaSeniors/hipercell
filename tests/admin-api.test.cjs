const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const context={window:{},URL,crypto};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../admin-api.js'),'utf8'),context);
const biz='46a2d035-836b-472c-9f1f-adcde294a923';
const config={businessId:biz,photoBucket:'hipercell_imagenes',supabaseUrl:'https://example.supabase.co'};
function fixture() {
 const calls=[],uploads=[];
 const state={user:{id:'owner'},error:null,tables:{
  catalogo_usuarios_negocio:[{user_id:'owner',negocio_id:biz,rol:'admin'}],
  catalogo_categorias:[{id:1,negocio_id:biz,nombre:'Audio',orden:0,activo:true},{id:2,negocio_id:'other',nombre:'Otro',orden:0,activo:true}],
  catalogo_negocios:[{id:biz,nombre:'Hipercell',whatsapp:'',monedas:{base:'CUP',activas:['CUP'],tasas:{}}}],
  catalogo_productos:[{id:10,negocio_id:biz,categoria_id:1,nombre:'Audio',descripcion:'',precio:20,stock:2,estado:'disponible',destacado:false,activo:true,imagen_url:null,imagenes_url:[]}]
 }};
 class Query {
  constructor(table){this.table=table;this.filters=[];this.operation='select';this.first=0;this.last=499;calls.push(this);}
  select(){return this;}eq(field,value){this.filters.push({field,value});return this;}is(field,value){return this.eq(field,value);}
  order(){return this;}range(first,last){this.first=first;this.last=last;return this;}
  insert(values){this.operation='insert';this.values=values;return this;}update(values){this.operation='update';this.values=values;return this;}
  result(single=false){
   let rows=state.tables[this.table].filter(row=>this.filters.every(({field,value})=>{
    if(Array.isArray(row[field]))return JSON.stringify(row[field])===value;
    return value==null ? row[field]==null : String(row[field])===String(value);
   }));
   if(this.operation==='update')rows.forEach(row=>Object.assign(row,this.values));
   if(this.operation==='insert'){const row={id:123,...this.values};state.tables[this.table].push(row);rows=[row];}
   rows=rows.slice(this.first,this.last+1);
   return {data:single ? rows[0]||null : rows.map(row=>structuredClone(row)),error:null};
  }
  async maybeSingle(){return this.result(true);}async single(){return this.result(true);}
  then(resolve,reject){return Promise.resolve(this.result()).then(resolve,reject);}
 }
 const client={auth:{getUser:async()=>({data:{user:state.user},error:state.error})},from:table=>new Query(table),storage:{from:bucket=>({
  upload:async(p,file,options)=>{uploads.push({bucket,path:p,file,options});return {data:{path:p},error:null};},
  getPublicUrl:p=>({data:{publicUrl:`${config.supabaseUrl}/storage/v1/object/public/${bucket}/${p}`}})
 })}};
 return {api:context.window.createHipercellAdminAPI(client,config),client,state,calls,uploads};
}
const input={nombre:'Nuevo producto',descripcion:'Detalles',precio:25,stock:3,categoria_id:1,estado:'disponible',destacado:false,activo:true,imagenes_url:[]};
test('no operations before verified user and business membership',async()=>{
 const {api,state}=fixture();await assert.rejects(api.saveProduct(input),/Inicia sesión/);
 state.user={id:'stranger'};await assert.rejects(api.authorize(),/no está vinculada/);await assert.rejects(api.listProducts());
});
test('authorization is cleared when revalidation fails',async()=>{
 const {api,state}=fixture();await api.authorize();state.error={message:'Expired'};await assert.rejects(api.authorize());await assert.rejects(api.getBusiness());
});
test('rejects foreign categories and foreign products before mutation',async()=>{
 const {api,state}=fixture();await api.authorize();
 await assert.rejects(api.saveProduct({...input,categoria_id:2}),/no pertenece/);
 await assert.rejects(api.saveProduct(input,{...state.tables.catalogo_productos[0],negocio_id:'other'}),/ajeno/);
 assert.equal(state.tables.catalogo_productos.length,1);
});
test('product update is tenant filtered and detects concurrent edits',async()=>{
 const {api,state,calls}=fixture();await api.authorize();
 const baseline=structuredClone(state.tables.catalogo_productos[0]);state.tables.catalogo_productos[0].nombre='Changed elsewhere';
 await assert.rejects(api.saveProduct(input,baseline),/otra sesión/);
 assert.equal(state.tables.catalogo_productos[0].nombre,'Changed elsewhere');
 const update=calls.find(q=>q.operation==='update');assert.ok(update.filters.some(f=>f.field==='negocio_id'&&f.value===biz));assert.ok(update.filters.some(f=>f.field==='id'&&f.value===10));
});
test('valid save produces matching primary photo and maximum gallery',async()=>{
 const {api}=fixture();await api.authorize();const photos=['https://example.test/1.jpg','https://example.test/2.jpg','https://example.test/3.jpg'];
 const row=await api.saveProduct({...input,imagenes_url:photos});assert.equal(row.negocio_id,biz);assert.equal(row.imagen_url,photos[0]);assert.equal(row.imagenes_url.length,3);
 await assert.rejects(api.saveProduct({...input,imagenes_url:[...photos,'https://example.test/4.jpg']}),/tres fotos/);
 await assert.rejects(api.saveProduct({...input,imagenes_url:[photos[0],photos[0]]}),/repitas/);
});
test('invalid prices and stock never write products',async()=>{
 const {api,calls}=fixture();await api.authorize();
 for(const precio of [null,'',-1,'bad',Infinity])await assert.rejects(api.saveProduct({...input,precio}));
 for(const stock of [-1,0.5,'bad'])await assert.rejects(api.saveProduct({...input,stock}));
 assert.equal(calls.filter(q=>q.operation==='insert'||q.operation==='update').length,0);
});
test('file upload requires owned product and immutable dedicated bucket path',async()=>{
 const {api,uploads}=fixture();await api.authorize();
 await assert.rejects(api.uploadPhoto(999,{type:'image/jpeg',size:100}),/ajeno/);
 await assert.rejects(api.uploadPhoto(10,{type:'image/svg+xml',size:100}));
 await assert.rejects(api.uploadPhoto(10,{type:'image/jpeg',size:5242881}));
 const url=await api.uploadPhoto(10,{type:'image/jpeg',size:100});
 assert.equal(uploads.length,1);assert.equal(uploads[0].bucket,'hipercell_imagenes');assert.ok(uploads[0].path.startsWith(biz+'/10/'));
 assert.equal(uploads[0].options.upsert,false);assert.ok(url.startsWith(config.supabaseUrl));
});
test('category and business updates are tenant scoped; currency change resets old rates',async()=>{
 const {api,state,calls}=fixture();await api.authorize();
 const cat=structuredClone(state.tables.catalogo_categorias[0]);await api.saveCategory({...cat,nombre:'Audio nuevo'},cat);
 const business=await api.saveBusiness({whatsapp:'+53 5555 5555',currency:'USD'});
 assert.equal(business.whatsapp,'5355555555');assert.equal(business.monedas.base,'USD');assert.equal(business.monedas.activas.length,1);
 for(const q of calls.filter(q=>q.operation==='update'))assert.ok(q.filters.some(f=>(f.field==='negocio_id'||f.field==='id')&&f.value===biz));
});
