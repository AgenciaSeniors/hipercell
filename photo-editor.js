'use strict';
const editor = {
  productId: window.HIPERCELL_PRODUCTS[0].id,
  files: [],
  urls: [],
  busy: false,
  dirty: false
};
const byId = id => document.getElementById(id);
function editorMessage(message, error = false) {
  byId('photo-status').textContent = message;
  byId('photo-status').classList.toggle('error', error);
}
function editorBusy(value) {
  editor.busy = value;
  byId('product-select').disabled = value;
  byId('save-photos').disabled = value;
  byId('photo-files').disabled = value || editor.files.length >= 3;
  for (const button of byId('photo-slots').querySelectorAll('button')) button.disabled = value;
}
function renderSlots() {
  editor.urls.forEach(url => URL.revokeObjectURL(url));
  editor.urls = editor.files.map(file => URL.createObjectURL(file));
  const container = byId('photo-slots');
  container.replaceChildren();
  for (let index = 0; index < 3; index++) {
    const slot = document.createElement('article');
    slot.className = 'photo-slot';
    if (!editor.files[index]) {
      slot.classList.add('empty-slot');
      slot.textContent = `Espacio ${index + 1} de 3`;
    } else {
      const image = document.createElement('img');
      image.src = editor.urls[index]; image.alt = `Foto ${index+1} del producto`;
      const caption = document.createElement('p');
      caption.textContent = index === 0 ? 'PRINCIPAL · Foto 1' : `Foto ${index+1}`;
      const remove = document.createElement('button');
      remove.textContent = 'Quitar'; remove.setAttribute('aria-label', `Quitar foto ${index+1}`);
      remove.addEventListener('click', () => {
        if (editor.busy) return;
        editor.files.splice(index, 1); editor.dirty = true; renderSlots();
        editorMessage('Foto quitada. Guarda para aplicar el cambio.'); byId('save-photos').focus();
      });
      slot.append(image, caption, remove);
      if (index > 0) {
        const primary = document.createElement('button');
        primary.textContent = 'Hacer principal';
        primary.addEventListener('click', () => {
          if (editor.busy) return;
          editor.files.unshift(editor.files.splice(index, 1)[0]); editor.dirty = true; renderSlots();
          editorMessage('Imagen principal cambiada. Guarda para aplicar el cambio.'); byId('save-photos').focus();
        });
        slot.append(primary);
      }
    }
    container.append(slot);
  }
  byId('photo-count').textContent = `${editor.files.length} / 3`;
  byId('view-product').href = `index.html#producto=${encodeURIComponent(editor.productId)}`;
  editorBusy(editor.busy);
}
function verifyImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const timer = setTimeout(() => finish(false), 15000);
    function finish(valid) {
      clearTimeout(timer); image.onload = image.onerror = null; URL.revokeObjectURL(url);
      valid ? resolve() : reject(new Error('Una de las fotos no se puede abrir. Selecciona una imagen válida.'));
    }
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    image.onerror = () => finish(false);
    image.src = url;
  });
}
async function loadProduct(id) {
  editorBusy(true);
  try {
    const all = await window.HipercellPhotos.readAll();
    editor.productId = id; editor.files = all[id] || []; editor.dirty = false;
    byId('product-select').value = id;
    renderSlots(); editorMessage('');
  } catch (error) { byId('product-select').value = editor.productId; editorMessage(error.message, true); }
  finally { editorBusy(false); }
}
for (const product of window.HIPERCELL_PRODUCTS) {
  const option = document.createElement('option'); option.value = product.id; option.textContent = product.name;
  byId('product-select').append(option);
}
byId('product-select').addEventListener('change', event => {
  if (editor.dirty && !window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos y cambiar de producto?')) {
    event.target.value = editor.productId; return;
  }
  loadProduct(event.target.value);
});
byId('photo-files').addEventListener('change', async event => {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length || editor.busy) return;
  editorBusy(true);
  try {
    window.HipercellPhotos.validate([...editor.files, ...files]);
    await Promise.all(files.map(verifyImage));
    editor.files.push(...files); editor.dirty = true; renderSlots();
    editorMessage(`${editor.files.length} de 3 fotos. Guarda para verlas en el catálogo.`);
  } catch (error) { editorMessage(error.message, true); }
  finally { editorBusy(false); }
});
byId('save-photos').addEventListener('click', async () => {
  if (editor.busy) return;
  editorBusy(true);
  try {
    await window.HipercellPhotos.save(editor.productId, editor.files);
    editor.dirty = false; editorMessage('Fotos guardadas en este navegador. Ya puedes abrir la ficha del producto.');
  } catch (error) { editorMessage(error.message, true); }
  finally { editorBusy(false); }
});
window.addEventListener('beforeunload', event => { if (editor.dirty) { event.preventDefault(); event.returnValue = ''; } });
renderSlots(); loadProduct(editor.productId);
