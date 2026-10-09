'use strict';
// Adaptador de demostración local. Sustituir por Storage + RLS al integrar Supabase.
window.HipercellPhotos = (() => {
  const MAX_PHOTOS = 3;
  const MAX_BYTES = 5 * 1024 * 1024;
  const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  let database;
  function validate(files) {
    if (!Array.isArray(files)) throw new Error('La lista de fotos no es válida.');
    if (files.length > MAX_PHOTOS) throw new Error('Cada producto admite un máximo de 3 fotos. Quita una antes de añadir otra.');
    for (const file of files) {
      if (!(file instanceof Blob) || !TYPES.includes(file.type)) throw new Error('Usa imágenes JPG, PNG o WebP.');
      if (file.size <= 0 || file.size > MAX_BYTES) throw new Error('Cada foto debe pesar entre 1 byte y 5 MB.');
    }
  }
  function open() {
    if (database) return database;
    database = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('Este navegador no permite guardar las fotos localmente.'));
      const request = indexedDB.open('hipercell-photos-preview', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'productId' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('No se pudo abrir el almacenamiento local.'));
      request.onblocked = () => reject(new Error('Cierra las otras pestañas del editor e inténtalo de nuevo.'));
    });
    return database;
  }
  async function readAll() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('photos', 'readonly');
      const request = transaction.objectStore('photos').getAll();
      request.onsuccess = () => {
        const result = {};
        for (const row of request.result) {
          try { validate(row.files); result[row.productId] = row.files; } catch { /* Ignore invalid local records. */ }
        }
        resolve(result);
      };
      request.onerror = () => reject(new Error('No se pudieron leer las fotos guardadas.'));
    });
  }
  async function save(productId, files) {
    validate(files);
    if (!window.HIPERCELL_PRODUCTS.some(product => product.id === productId)) throw new Error('Producto desconocido.');
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('photos', 'readwrite');
      const store = transaction.objectStore('photos');
      if (files.length) store.put({ productId, files }); else store.delete(productId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(new Error('No se pudieron guardar las fotos. Comprueba el espacio disponible del navegador.'));
    });
  }
  return Object.freeze({ MAX_PHOTOS, MAX_BYTES, validate, readAll, save });
})();
