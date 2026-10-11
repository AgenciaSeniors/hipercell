'use strict';
// Solo credenciales públicas. No poner service_role ni claves secretas aquí.
window.HIPERCELL_CONFIG = Object.freeze({
  source: 'supabase',
  supabaseUrl: 'https://xwkmhpcombsauoozyidi.supabase.co',
  publishableKey: 'sb_publishable_5iDJi-xK69y1DM0nFYjqlw_TaozemSt',
  businessId: '46a2d035-836b-472c-9f1f-adcde294a923',
  photoBucket: 'hipercell_imagenes',
  publicCatalogUrl: 'https://agenciaseniors.com/hipercell/',
  // El destinatario se configura en el panel; sin número válido no se envían pedidos.
  checkoutEnabled: true
});
