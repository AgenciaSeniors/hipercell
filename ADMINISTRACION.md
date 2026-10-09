# Administración de Hipercell

## Activación pendiente en el proyecto real

1. Ejecutar `supabase/04-proteger-hipercell.sql` en SQL Editor. Crea `hipercell_imagenes`, con lectura pública de fotos, escritura limitada al administrador vinculado a Hipercell, 5 MB por archivo y JPG/PNG/WebP. La base exige máximo tres fotos y portada coherente, y valida que la categoría corresponda al negocio. Las restricciones solo se aplican a Hipercell; no reemplazan las políticas de otros clientes.
2. En Authentication > Users, crear el usuario `hipercell@gmail.com`. Definir su contraseña directamente en Supabase y confirmar la cuenta por el procedimiento del Dashboard. No enviar esa contraseña al chat ni guardarla en el repositorio.
3. Ejecutar `supabase/05-vincular-administrador.sql`. Busca el usuario por correo y lo vincula al UUID de Hipercell. Si ya administra otro negocio, aborta sin reasignarlo. No crea cuentas ni envía correos.
4. Servir la carpeta del proyecto por HTTP local o HTTPS y abrir `admin.html`. El panel no inicia sesión desde un archivo `file://`. Probar acceso, creación de una categoría, un producto y hasta tres fotos. Verificar en `index.html` y en otro navegador antes de publicar.

Los SQL están preparados y probados en una base aislada; no se han ejecutado sobre Supabase desde este chat.

## Panel incluido

- Acceso mediante Supabase Auth con SDK oficial 2.117.3, distribuido localmente. Valida el usuario contra el servidor y su vínculo con Hipercell antes de cargar datos o habilitar escrituras.
- Sesión en sessionStorage, separada de otras aplicaciones. Renovación gestionada por el SDK; no se guardan contraseñas. Cierre de acceso local incluso si la conexión falla.
- Crear/editar productos, categorías, precios, descripción, stock, disponibilidad, visibilidad y destacados. Ocultar se realiza mediante activo=false; no se eliminan registros.
- Hasta tres fotos: validación de formato, tamaño y decodificación, portada y eliminación de una foto de la galería. Rutas por negocio/producto y nombres aleatorios sin sobrescribir archivos.
- La primera creación queda como borrador oculto hasta completar las fotos y confirmar el guardado final. Si no puede confirmarse una escritura, el panel exige actualizar la lista antes de repetirla.
- Todas las consultas y escrituras del panel se filtran por el UUID del negocio. Las políticas de Supabase siguen siendo la protección efectiva.
- Las ediciones de producto/categoría comprueban el estado leído para no sobrescribir cambios realizados en otra sesión.
- Permite configurar moneda base y WhatsApp. Cambiar la moneda no convierte precios. El envío permanece desactivado en config.js hasta confirmar datos y flujo.

## Conservación de archivos

Quitar una foto modifica la galería del producto; no borra físicamente el archivo de Storage. Tampoco se borran automáticamente los archivos de una subida incompleta. Se conservan para evitar eliminar una imagen cuyo guardado pudiera haberse confirmado en el servidor durante un fallo de red. La limpieza de imágenes sin uso queda pendiente; no hay permisos de sobrescritura o borrado desde el panel.

## Hallazgos de la revisión recibida

Las tablas catalogo_* tienen RLS activo y las escrituras exigen vínculo de usuario/negocio. catalogo_imagenes permite escrituras a cualquier autenticado; ese bucket compartido NO se usa para las nuevas fotos de Hipercell. No se modifica en esta entrega.

catalogo_crear_negocio es SECURITY DEFINER, sin search_path configurado y ejecutable por anon/authenticated. `supabase/06-cerrar-alta-publica-opcional.sql` propone restringirla al backend y SQL Editor. Es un cambio independiente que afecta al alta compartida de la agencia; revisar ese uso antes de ejecutarlo. No es un paso automático del alta de Hipercell ni se ha aplicado.

## Validación y límites

Dieciséis pruebas de adaptadores, con respuestas simuladas: lectura por negocio, paginación, precios/stock/moneda, autorización, escritura scoped, conflictos, fotos, formato/tamaño y errores. Los SQL 04/05 se ejecutaron dos veces en PostgreSQL aislado (PGlite 0.5.8): límite de fotos, categorías, RLS entre propietarios, subidas, no sobrescritura/borrado y vínculo de administrador. Se validó también el SQL opcional 06 en ese entorno aislado.

Se verificaron el origen y la integridad SHA-512 del SDK descargado del registro oficial npm. Licencia MIT incluida en vendor/SUPABASE-LICENSE.txt.

Para reproducir las pruebas: instalar las dependencias de desarrollo de package.json y ejecutar `npm test` desde la carpeta del repositorio. El catálogo y el panel se sirven como archivos estáticos; esas dependencias solo se usan en pruebas. La suite SQL usa PostgreSQL en memoria y no se conecta al proyecto real.

El navegador automatizado del entorno sigue fallando al arrancar. Revisión visual, login con la cuenta real, decodificación real de fotos y recorrido completo de subida/guardado en Supabase pendientes. No hay despliegue ni datos de muestra insertados en la base real.

