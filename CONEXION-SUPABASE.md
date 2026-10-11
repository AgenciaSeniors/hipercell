# Conexión de Hipercell

Se reutiliza el proyecto existente y las tablas `catalogo_*`, con diseño propio. La plantilla consultada no muestra un proceso que obligue a los negocios a compartir el diseño; cada copia usa su BUSINESS_ID. Esto no confirma por sí solo las políticas instaladas.

La URL y la clave publishable suministradas responden a la API. El usuario ejecutó el alta y el adaptador real confirmó lectura de Hipercell con el UUID previsto, CUP como moneda base, un producto publicado y WhatsApp configurado. Ver `ADMINISTRACION.md` para la fase actual y los resultados de permisos recibidos.

## Activar la lectura

1. En SQL Editor del proyecto existente, ejecutar `supabase/01-alta-hipercell.sql`. Crea únicamente el negocio Hipercell, sin productos ficticios, cambios de políticas ni vínculos con usuarios. Se puede repetir sin duplicar este UUID.
2. La revisión de permisos ya se recibió mediante `supabase/03-revision-en-un-resultado.sql`. Continuar con los SQL 04/05 y la cuenta de Authentication según `ADMINISTRACION.md`.
3. Abrir `index.html` mediante un servidor local o alojamiento web. `config.js` ya contiene el UUID previsto. Sin alta o lectura pública, muestra un error con reintento. Después del alta, un catálogo vacío muestra «Próximamente».
4. Confirmar moneda base, WhatsApp, productos y administrador. El alta conserva la moneda por defecto de la tabla; no interpreta los USD de la demo como decisión comercial.
5. El usuario confirmó la apertura de WhatsApp y checkoutEnabled está activado. El destinatario se obtiene del panel antes de cada apertura.

`index.html?demo=1` permite revisar explícitamente los productos de ejemplo. No se usan como sustituto de un fallo de conexión. El HTML portátil generado para revisión mantiene modo demo explícito.

## Implementado

- API REST con clave pública, sin SDK externo, sin credenciales privadas.
- Consultas con negocio_id y activo, paginación, orden estable, tiempo máximo y estados de carga/error/vacío.
- Moneda base, WhatsApp, precios y stock obtenidos de Supabase.
- Carrito separado por negocio y por demo; limita cantidades al stock y recalcula al abrir.
- Fotos HTTPS desde imagenes_url (máximo tres visibles), con respaldo imagen_url para productos antiguos. No mezcla IndexedDB de muestra con datos reales.
- Oculta productos de categorías inactivas o que no corresponden al negocio.

## Revisión anterior y resolución

El schema del repositorio de plantilla tiene políticas de Storage que permiten gestionar el bucket catalogo_imagenes a cualquier autenticado. Es necesario comprobar si siguen instaladas y limitar escritura por carpeta y pertenencia al negocio. Las políticas de la base y de Storage se evalúan en Supabase; el filtro JavaScript no es una autorización.

La revisión recibida identificó la función compartida catalogo_crear_negocio; su corrección sigue siendo opcional e independiente. SQL 04 protege categorías y límite remoto de fotos para Hipercell, y el usuario confirmó su activación.

No se reutiliza el administrador de plantilla. Se construyó `admin.html` con verificación de usuario y pertenencia, consultas/escrituras filtradas por negocio y fotos en un bucket dedicado. El usuario confirmó Auth, el vínculo y el bucket de protección; ver `ADMINISTRACION.md`.

No ejecutar schema.sql ni migraciones de la plantilla sobre producción como parte de esta entrega. No se han modificado datos, creado usuarios, activado subidas ni aplicado SQL remoto desde este chat.

