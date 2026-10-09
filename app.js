'use strict';

// Fuente remota o demostración solicitada explícitamente mediante ?demo=1.
const CONFIG = window.HIPERCELL_CONFIG;
const DEMO = new URLSearchParams(location.search).get('demo') === '1' || CONFIG.source === 'demo';
let SETTINGS = { currency: 'USD', whatsapp: '', demo: true };
let PRODUCTS = DEMO ? window.HIPERCELL_PRODUCTS : [];
let productPhotos = {};
let activeDetailId = null;
let activePhotoIndex = 0;
const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('es', { style: 'currency', currency: SETTINGS.currency }).format(value);
const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STORAGE_KEY = DEMO ? 'hipercell:prototype:cart:v1' : `hipercell:${CONFIG.businessId}:cart:v1`;
let selectedCategory = 'Todos';
let cart = {};
let toastTimer;

function illustration(kind) {
  const parts = {
    screen: '<rect x="40" y="8" width="90" height="159" rx="15" fill="#242c2b"/><rect x="45" y="13" width="80" height="147" rx="11" fill="#a6bd75"/><path d="M45 117L125 45v75l-43 40H45z" fill="#cbe49b"/><path d="M80 160l45-42v42" fill="#6c844e"/><rect x="68" y="16" width="33" height="7" rx="4" fill="#242c2b"/>',
    audio: '<path d="M23 112Q23 93 44 93h82q21 0 21 19v35q0 19-21 19H44q-21 0-21-19z" fill="#d9ddcc" stroke="#a3ac92" stroke-width="2"/><path d="M24 121h122" stroke="#a3ac92"/><circle cx="85" cy="142" r="3" fill="#799a47"/><path d="M49 25c-24 0-25 36-4 40v25h13V49c12-8 5-24-9-24zM121 25c24 0 25 36 4 40v25h-13V49c-12-8-5-24 9-24z" fill="#ecefe5" stroke="#abb39f" stroke-width="2"/><ellipse cx="43" cy="43" rx="6" ry="9" fill="#6b755c"/><ellipse cx="127" cy="43" rx="6" ry="9" fill="#6b755c"/>',
    charger: '<rect x="56" y="9" width="10" height="36" rx="3" fill="#aab1ab"/><rect x="102" y="9" width="10" height="36" rx="3" fill="#aab1ab"/><path d="M39 44l17-10h60l16 10v101l-17 14H51l-12-11z" fill="#dce0d3" stroke="#afb7a6" stroke-width="2"/><path d="M39 44h75v115M114 44l18-10" fill="none" stroke="#bcc3b3"/><rect x="61" y="62" width="33" height="9" rx="4" fill="#3b4934"/><path d="M81 96l-9 17h11l-6 17 16-24H82l7-10" fill="#80935f"/>',
    case: '<rect x="41" y="8" width="90" height="159" rx="21" fill="#839770" stroke="#526348" stroke-width="3"/><rect x="49" y="16" width="46" height="49" rx="12" fill="#dfe4d7" stroke="#526348" stroke-width="2"/><circle cx="61" cy="29" r="7" fill="#bbc7ad"/><circle cx="81" cy="49" r="7" fill="#bbc7ad"/><circle cx="61" cy="49" r="7" fill="#bbc7ad"/><circle cx="86" cy="107" r="24" fill="none" stroke="#aaba98" stroke-width="4"/><path d="M86 139v10" stroke="#aaba98" stroke-width="4"/>',
    battery: '<rect x="73" y="11" width="25" height="14" rx="3" fill="#b6bda7"/><rect x="43" y="24" width="86" height="139" rx="8" fill="#303b32"/><rect x="50" y="33" width="72" height="121" rx="4" fill="#43513b"/><path d="M89 53L66 91h18l-6 31 29-44H88z" fill="#c8df9a"/><path d="M62 137h47M72 144h27" stroke="#a3b18c" stroke-width="2"/>',
    cable: '<path d="M51 36v75c0 48 82 49 82 0S51 59 51 107s59 50 59 2V40" fill="none" stroke="#55664a" stroke-width="9"/><path d="M48 40v68c0 43 75 48 82 10" fill="none" stroke="#94a682" stroke-width="2"/><rect x="39" y="14" width="23" height="34" rx="6" fill="#c3cbb7"/><rect x="43" y="5" width="15" height="15" rx="4" fill="#89927d"/><rect x="99" y="18" width="23" height="31" rx="6" fill="#c3cbb7"/><rect x="102" y="8" width="17" height="14" rx="4" fill="#89927d"/>',
    stand: '<path d="M74 93h21l15 51H58z" fill="#88967c"/><ellipse cx="84" cy="147" rx="52" ry="10" fill="#b3bda8"/><path d="M41 28h88l-8 82H49z" fill="#bcc6b2" stroke="#8f9e82" stroke-width="2"/><path d="M52 99h66v17H52z" fill="#718162"/><circle cx="85" cy="68" r="13" fill="#e2e8d8"/>',
    speaker: '<rect x="29" y="30" width="113" height="124" rx="30" fill="#394730"/><rect x="35" y="36" width="101" height="112" rx="25" fill="#627353"/><path d="M47 52h77M44 63h83M42 74h87M42 85h87M42 96h87M43 107h85M46 118h78M52 129h67" stroke="#384a2f" stroke-width="3" stroke-dasharray="2 3"/><path d="M68 19h35" stroke="#9ead8c" stroke-width="6" stroke-linecap="round"/><rect x="72" y="86" width="28" height="18" rx="5" fill="#c4d6a5"/>'
  };
  return `<svg viewBox="0 0 170 180" aria-hidden="true" focusable="false">${parts[kind] || parts.screen}</svg>`;
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
    for (const p of PRODUCTS) {
      const qty = saved[p.id];
      if (p.available && Number.isInteger(qty) && qty > 0) cart[p.id] = Math.min(qty, maxQuantity(p));
    }
  } catch { cart = {}; }
}
function persistCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { /* Funciona también sin almacenamiento. */ }
}
function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2600);
}
function renderCategories() {
  const names = ['Todos', ...new Set(PRODUCTS.map(p => p.category))];
  $('categories').innerHTML = names.map(name => `<button data-category="${escapeHTML(name)}" aria-pressed="${name === selectedCategory}">${escapeHTML(name)}</button>`).join('');
}
function normalize(value) { return value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function renderProducts() {
  const query = normalize($('search').value.trim());
  const products = PRODUCTS.filter(p => (selectedCategory === 'Todos' || p.category === selectedCategory) && (!$('available').checked || p.available) && normalize(`${p.name} ${p.category} ${p.short}`).includes(query));
  const sorting = { low: (a,b) => a.price-b.price, high: (a,b) => b.price-a.price, name: (a,b) => a.name.localeCompare(b.name, 'es'), featured: (a,b) => Number(b.featured)-Number(a.featured) };
  products.sort(sorting[$('sort').value] || sorting.featured);
  $('result-count').textContent = `${products.length} ${products.length === 1 ? 'producto' : 'productos'}`;
  $('empty').hidden = products.length !== 0;
  $('products').innerHTML = products.map(p => `<article class="product-card"><button class="view-product" data-detail="${p.id}" aria-label="Ver ${escapeHTML(p.name)}"><div class="product-visual">${productVisual(p)}${!p.available ? '<span class="tag">AGOTADO</span>' : p.featured ? '<span class="tag featured">DESTACADO</span>' : (SETTINGS.demo ? '<span class="tag">DE MUESTRA</span>' : '')}</div><div class="product-info"><p class="category-label">${escapeHTML(p.category)}</p><h3>${escapeHTML(p.name)}</h3><p class="short-desc">${escapeHTML(p.short)}</p></div></button><div class="product-bottom"><span class="price">${money(p.price)} <small>${escapeHTML(SETTINGS.currency)}</small></span><button class="add" data-add="${p.id}" aria-label="Añadir ${escapeHTML(p.name)} al pedido" ${!p.available ? 'disabled' : ''}>＋</button></div></article>`).join('');
}
function addProduct(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product?.available) return;
  if ((cart[id] || 0) >= maxQuantity(product)) return notify('Has alcanzado la cantidad disponible para este producto.');
  cart[id] = (cart[id] || 0) + 1;
  persistCart(); renderCart(); notify(`${product.name} añadido al pedido`);
}
function maxQuantity(product) { return Math.min(99, product?.stock == null ? 99 : product.stock); }
function canContact() { return !SETTINGS.demo && CONFIG.checkoutEnabled === true && /^\d{8,15}$/.test(SETTINGS.whatsapp); }
function renderCart() {
  const entries = PRODUCTS.filter(p => cart[p.id]);
  $('cart-count').textContent = Object.values(cart).reduce((a,b) => a+b, 0);
  $('cart-items').innerHTML = entries.length ? entries.map(p => `<article class="cart-row">${productVisual(p)}<div><h3>${escapeHTML(p.name)}</h3><p>${money(p.price)} por unidad</p><div class="quantity"><button data-change="${p.id}" data-delta="-1" aria-label="Restar una unidad de ${escapeHTML(p.name)}">−</button><span aria-label="Cantidad">${cart[p.id]}</span><button data-change="${p.id}" data-delta="1" ${cart[p.id] >= maxQuantity(p) ? 'disabled' : ''} aria-label="Sumar una unidad de ${escapeHTML(p.name)}">＋</button><button class="remove" data-remove="${p.id}">Quitar</button></div></div></article>`).join('') : '<div class="cart-empty">Tu pedido está vacío. Explora el catálogo y añade lo que necesitas.</div>';
  $('cart-total').textContent = money(entries.reduce((total,p) => total+p.price*cart[p.id], 0));
  $('checkout').disabled = !entries.length || !canContact();
}
function productURL(id) { const url = new URL(location.href); url.hash = `producto=${encodeURIComponent(id)}`; return url.href; }
function contactProduct(id) {
  if (!canContact()) return;
  const p = PRODUCTS.find(item => item.id === id);
  if (!p) return;
  openWhatsApp(`Hola, Hipercell. Quisiera consultar por ${p.name} (${money(p.price)}).\n${productURL(p.id)}`);
}
function openWhatsApp(message) {
  window.open(`https://wa.me/${SETTINGS.whatsapp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}
function showDetail(id) {
  const p = PRODUCTS.find(product => product.id === id);
  if (!p) return;
  activeDetailId = id;
  activePhotoIndex = 0;
  $('detail-content').innerHTML = `<div class="detail-layout"><div class="detail-gallery">${galleryHTML(p)}</div><div class="detail-copy"><span class="category-label">${escapeHTML(p.category)}${SETTINGS.demo ? ' · EJEMPLO' : ''}</span><h2 id="detail-title">${escapeHTML(p.name)}</h2><p>${escapeHTML(p.description)}</p><span class="price">${money(p.price)} <small>${escapeHTML(SETTINGS.currency)}</small></span><button class="button primary" data-add="${p.id}" ${p.available ? '' : 'disabled'}>${p.available ? 'Añadir a mi pedido ＋' : 'Producto agotado'}</button><button class="button secondary" data-contact="${p.id}" ${canContact() ? '' : 'disabled'}>Consultar por WhatsApp ↗</button><p class="demo-note">${SETTINGS.demo ? 'Producto y precio de muestra. WhatsApp pendiente de configurar.' : canContact() ? 'Confirma disponibilidad, pago y entrega con la tienda.' : 'El envío de consultas estará disponible próximamente.'}</p></div></div>`;
  if (!$('detail').open) $('detail').showModal();
}
document.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.photo !== undefined) selectPhoto(Number(target.dataset.photo));
  if (target.dataset.photoStep) selectPhoto(activePhotoIndex + Number(target.dataset.photoStep));
  if (target.dataset.category) {
    selectedCategory = target.dataset.category;
    for (const button of $('categories').children) button.setAttribute('aria-pressed', String(button === target));
    renderProducts();
  }
  if (target.dataset.detail) showDetail(target.dataset.detail);
  if (target.dataset.add) addProduct(target.dataset.add);
  if (target.dataset.close) $(target.dataset.close).close();
  if (target.dataset.contact) contactProduct(target.dataset.contact);
  if (target.dataset.change) {
    const id = target.dataset.change;
    const product = PRODUCTS.find(p => p.id === id);
    if (!product?.available) return;
    cart[id] = Math.max(0, Math.min(maxQuantity(product), (cart[id] || 0) + Number(target.dataset.delta)));
    if (!cart[id]) delete cart[id];
    persistCart(); renderCart();
    // Keep keyboard focus near the changed quantity after replacing the rows.
    const replacement = $('cart-items').querySelector(`[data-change="${id}"][data-delta="${target.dataset.delta}"]:not(:disabled)`);
    (replacement || $('cart').querySelector('.close')).focus();
  }
  if (target.dataset.remove) {
    delete cart[target.dataset.remove]; persistCart(); renderCart(); $('cart').querySelector('.close').focus();
  }
});
$('search').addEventListener('input', renderProducts);
$('sort').addEventListener('change', renderProducts);
$('available').addEventListener('change', renderProducts);
$('reset-filters').addEventListener('click', () => { selectedCategory = 'Todos'; $('search').value = ''; $('available').checked = false; $('sort').value = 'featured'; renderCategories(); renderProducts(); $('search').focus(); });
$('open-cart').addEventListener('click', () => $('cart').showModal());
$('checkout').addEventListener('click', () => {
  if (!canContact() || !Object.keys(cart).length) return;
  const entries = PRODUCTS.filter(p => cart[p.id]);
  const lines = entries.map(p => `• ${cart[p.id]} × ${p.name}: ${money(p.price*cart[p.id])}`);
  const total = entries.reduce((sum,p) => sum+p.price*cart[p.id], 0);
  openWhatsApp(`Hola, Hipercell. Me interesa este pedido:\n\n${lines.join('\n')}\n\nTotal estimado: ${money(total)}\nQuedo pendiente de confirmar disponibilidad, pago y entrega.`);
});
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', e => {
    const r = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.close();
  });
}
function readProductHash() { if (location.hash.startsWith('#producto=')) { try { showDetail(decodeURIComponent(location.hash.slice(10))); } catch { /* Ignore malformed links. */ } } }
initializeCatalog();
$('retry-catalog').addEventListener('click', initializeCatalog);
window.addEventListener('hashchange', readProductHash);
window.addEventListener('focus', refreshPhotos);


function photosFor(product) { return productPhotos[product.id] || []; }
function productVisual(product) {
  const photos = photosFor(product);
  return photos.length ? `<img class="product-photo" src="${escapeHTML(photos[0])}" alt="${escapeHTML(product.name)}" loading="lazy">` : illustration(product.kind);
}
function galleryHTML(product) {
  const photos = photosFor(product);
  if (!photos.length) return `<div class="detail-art">${illustration(product.kind)}</div><p class="gallery-caption">Ilustración de muestra · Hasta 3 fotos por producto</p>`;
  return `<div class="detail-art"><img id="gallery-main" src="${escapeHTML(photos[0])}" alt="${escapeHTML(product.name)}, foto 1 de ${photos.length}"></div><div class="gallery-controls"><button data-photo-step="-1" aria-label="Foto anterior" ${photos.length < 2 ? 'disabled' : ''}>←</button><span id="photo-position" aria-live="polite">1 / ${photos.length}</span><button data-photo-step="1" aria-label="Foto siguiente" ${photos.length < 2 ? 'disabled' : ''}>→</button></div><div class="photo-thumbnails" role="group" aria-label="Fotos del producto">${photos.map((url,index)=>`<button data-photo="${index}" aria-label="Ver foto ${index+1}" aria-pressed="${index===0}"><img src="${escapeHTML(url)}" alt=""></button>`).join('')}</div>`;
}
function selectPhoto(index) {
  const product = PRODUCTS.find(p=>p.id === activeDetailId);
  if (!product) return;
  const photos = photosFor(product);
  if (!photos.length) return;
  activePhotoIndex = (index + photos.length) % photos.length;
  $('gallery-main').src = photos[activePhotoIndex];
  $('gallery-main').alt = `${product.name}, foto ${activePhotoIndex+1} de ${photos.length}`;
  $('photo-position').textContent = `${activePhotoIndex+1} / ${photos.length}`;
  for (const button of document.querySelectorAll('[data-photo]')) button.setAttribute('aria-pressed', String(Number(button.dataset.photo)===activePhotoIndex));
}
async function refreshPhotos() {
  if (!DEMO) return;
  try {
    const photos = await window.HipercellPhotos.readAll();
    const old = productPhotos;
    productPhotos = Object.fromEntries(Object.entries(photos).map(([id,files])=>[id,files.map(file=>URL.createObjectURL(file))]));
    renderProducts(); renderCart();
    if ($('detail').open && activeDetailId) {
      const product = PRODUCTS.find(p=>p.id === activeDetailId);
      document.querySelector('.detail-gallery').innerHTML = galleryHTML(product);
      activePhotoIndex = 0;
    }
    Object.values(old).flat().forEach(url=>URL.revokeObjectURL(url));
  } catch { /* El catálogo funciona sin almacenamiento local de fotos. */ }
}

async function initializeCatalog() {
  $('retry-catalog').hidden = true;
  $('retry-catalog').disabled = true;
  $('catalog-status').textContent = DEMO ? '' : 'Cargando productos…';
  PRODUCTS = DEMO ? window.HIPERCELL_PRODUCTS : [];
  productPhotos = {};
  cart = {};
  SETTINGS = {currency:'USD',whatsapp:'',demo:true};
  if ($('detail').open) $('detail').close();
  renderCategories(); renderProducts(); renderCart();
  $('empty').hidden = !DEMO;
  try {
    if (!DEMO) {
      const data = await window.HipercellCatalog.load(CONFIG);
      PRODUCTS = data.products;
      SETTINGS = {currency:data.currency,whatsapp:data.whatsapp,demo:false};
      productPhotos = Object.fromEntries(PRODUCTS.map(p=>[p.id,p.photos]));
      document.querySelector('.preview').textContent = 'HIPERCELL · CATÁLOGO';
      document.querySelector('.results-meta>span+span').textContent = `CATÁLOGO · ${SETTINGS.currency}`;
      document.querySelector('footer>a[href="fotos.html"]').hidden = true;
      document.querySelector('.cart-bottom .demo-note').textContent = CONFIG.checkoutEnabled ? 'Confirma tu pedido con la tienda.' : 'El envío de pedidos estará disponible próximamente.';
    }
    selectedCategory = 'Todos';
    loadCart(); renderCategories(); renderProducts(); renderCart();
    if (DEMO) await refreshPhotos();
    $('catalog-status').textContent = '';
    if (!PRODUCTS.length && !DEMO) {
      $('empty').querySelector('h3').textContent = 'Próximamente, nuestros productos';
      $('empty').querySelector('p').textContent = 'Estamos preparando el catálogo de Hipercell.';
      $('reset-filters').hidden = true;
    }
    readProductHash();
  } catch (error) {
    PRODUCTS = []; productPhotos = {}; cart = {};
    SETTINGS = {currency:'USD',whatsapp:'',demo:true};
    renderCategories(); renderProducts(); renderCart();
    $('empty').hidden = true;
    $('catalog-status').textContent = error.message || 'No se pudo cargar el catálogo.';
    $('retry-catalog').hidden = false;
  } finally { $('retry-catalog').disabled = false; }
}
