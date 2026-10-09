# Hipercell — primera propuesta de catálogo

## Estado actual de conexión (9 de octubre de 2026)

Se añadió lectura desde el proyecto compartido de Supabase usando `catalogo_*`, después de revisar el repositorio catalogo-plantilla. `config.js` contiene credenciales públicas y el UUID previsto para el alta; el negocio todavía no se ha creado. Consultar `CONEXION-SUPABASE.md` y los dos SQL de `supabase/` para los pasos de activación y revisión de permisos. Los apartados siguientes describen la entrega inicial y sus pruebas; no sustituyen esta actualización.

La web no mezcla datos remotos con la demo. La demo solo se abre de forma explícita mediante `?demo=1` o en el HTML portátil. WhatsApp permanece desactivado mediante `checkoutEnabled: false`. Las fotos remotas se leen de imagenes_url/imagen_url; el editor fotos.html sigue siendo SOLO una prueba local.

Validación nueva: ocho pruebas del adaptador de lectura, con respuestas simuladas, superadas; cobertura de negocio, paginación, moneda, stock, fotos, entradas inválidas y errores. Consulta real limitada por nombre: la API respondió y no encontró Hipercell. No se verificó todavía lectura de productos reales, ejecución visual, permisos efectivos de administración ni subida remota. No se aplicó SQL al proyecto.

Prototipo personalizado en HTML, CSS y JavaScript, sin dependencias de instalación. Abrir `index.html` o ejecutar `python -m http.server 8080` en la carpeta del proyecto.

## Identidad visual aplicada

- Portada tecnológica en grafito, dispositivos ilustrados con CSS y cuadrícula sutil.
- Catálogo claro para facilitar la lectura y comparar productos.
- Documento recibido: Hipercell Sistema Hiper Carrito Integrado. Lima #C6EF00, grafito #121416, blanco #F6F7F4, gris #969C9E y carbón #0A0B0C. Montserrat 400–800 mediante Google Fonts, con fallback local.
- Logo original extraído del DOCX sin alterar sus píxeles; la presentación CSS elimina el margen visual exterior. No se ha redibujado el símbolo. El PNG es una referencia raster, no un vector maestro.
- Mensajes: «Todo conecta» y «Hipermercado tecnológico». Productos e ilustraciones siguen siendo demostrativos.
- Diseño adaptable, controles de teclado, diálogos nativos, estados vacíos y respeto por movimiento reducido.

## Incluido en esta entrega

- Ocho productos de demostración con precios ficticios, identificados en la interfaz.
- Búsqueda sin distinción de tildes, categorías, ordenación y filtro de disponibilidad.
- Ficha individual y enlaces con `#producto=ID`.
- Carrito con cantidades, total y persistencia local validada. El carrito es de demostración y no reserva stock.
- Composición de mensajes para consultar un producto y pedir varios productos por WhatsApp. Envío deshabilitado en modo demo y sin número configurado; no se contacta a nadie.
- Google Fonts para Montserrat. Sin claves API ni conexión a la base de datos existente.

## Integración pendiente

Mantener el MISMO proyecto de Supabase que los menús y catálogos de la agencia. La familia de tablas todavía no está decidida: el cliente aclaró que `catalogo_*` pertenece a su plantilla económica. Revisar ese código y sus automatismos antes de reutilizar las tablas; compartirlas no implica reutilizar el diseño.

Esquema conocido: `restaurantes`/`productos`/`perfiles_admin`, y `catalogo_negocios`/`catalogo_categorias`/`catalogo_productos`/`catalogo_usuarios_negocio`. No ejecutar el esquema de contexto como migración.

Antes de conectar producción:

1. Incorporar productos, categorías, moneda y WhatsApp reales; la identidad ya se recibió.
2. Revisar RLS de tablas y Storage, pertenencia del administrador y coherencia entre negocio, categoría y producto. No considerar suficiente un filtro JavaScript por negocio.
3. Implementar el adaptador de lectura y un panel de administración con permisos por negocio. El admin no está incluido todavía.
4. Validar precios y disponibilidad reales; eliminar datos y mensajes de demo, ajustar moneda, activar WhatsApp y revisar el flujo completo. `SETTINGS.demo` protege contra envíos de prueba accidentales y no debe desactivarse antes de sustituir los datos.
5. Incorporar el dominio final, metadatos, fotografías optimizadas y retirar `noindex` al publicar.

No se han creado tablas, aplicado migraciones, editado políticas, dado de alta usuarios ni modificado negocios existentes. No se ha publicado un sitio.

## Validación

Sintaxis JavaScript revisada. Pruebas de interacción en DOM simulado (jsdom) superadas: búsqueda sin tildes, categorías, disponibilidad, estado vacío, añadir/cambiar/quitar productos, totales, persistencia, contenido de fichas, enlaces a producto y bloqueo del envío en modo demo. Los diálogos nativos y el diseño adaptable requieren aún revisión en navegador real. La revisión visual en navegador está pendiente: Chromium no pudo descargarse en el entorno de trabajo. No presentar este prototipo como versión final de producción.

## Requisito confirmado: máximo 3 fotos por producto

- Editor de prueba en `fotos.html`: añadir varias imágenes, vista previa, quitar y hacer principal. Primera imagen = portada; hasta dos adicionales en la ficha.
- Límite total de 3 validado al seleccionar y al guardar, contando las fotos existentes. Seleccionar más de las permitidas rechaza el lote completo y conserva las fotos anteriores.
- JPG/PNG/WebP, máximo 5 MB por archivo, con comprobación de decodificación en navegador antes de aceptar. SVG no permitido como foto subida.
- Galería con miniaturas, contador y navegación circular; 0 fotos muestra la ilustración de respaldo, 1 foto desactiva las flechas, 2 o 3 permiten recorrerlas.
- Persistencia SOLO local en IndexedDB, por producto. Se mantienen al volver a abrir el catálogo en el mismo navegador y origen. No son públicas ni se sincronizan con otros dispositivos; borrar datos del navegador las elimina. Servir por HTTP local para un origen consistente.
- Al integrar Supabase, reemplazar el adaptador local con Storage y permisos del negocio, y hacer cumplir el máximo de 3 en la base de datos o backend, además del frontend. Ninguna migración se ha aplicado. El límite remoto no está implementado todavía.
- El documento de identidad original permanece sin modificaciones.

Pruebas de fotos superadas con jsdom e IndexedDB simulado: límite total al seleccionar y guardar; rechazo de cuarta foto conservando las tres anteriores; formato y tamaño; separación por producto; cambio de principal; eliminación; galería con 0, 1 y 3 fotos; navegación circular; regresión del carrito. Decodificación real de imágenes y revisión visual siguen pendientes en navegador.
