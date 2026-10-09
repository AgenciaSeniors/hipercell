# Hipercell — primera propuesta de catálogo

Prototipo personalizado en HTML, CSS y JavaScript, sin dependencias de instalación. Abrir `index.html` o ejecutar `python -m http.server 8080` en la carpeta del proyecto.

## Dirección visual provisional

- Portada tecnológica en grafito, dispositivos ilustrados con CSS y cuadrícula sutil.
- Catálogo claro para facilitar la lectura y comparar productos.
- Acento lima provisional centralizado en `--accent`; confirmar logo, paleta y tipografías con el cliente. Las ilustraciones también usan colores provisionales.
- Diseño adaptable, controles de teclado, diálogos nativos, estados vacíos y respeto por movimiento reducido.

## Incluido en esta entrega

- Ocho productos de demostración con precios ficticios, identificados en la interfaz.
- Búsqueda sin distinción de tildes, categorías, ordenación y filtro de disponibilidad.
- Ficha individual y enlaces con `#producto=ID`.
- Carrito con cantidades, total y persistencia local validada. El carrito es de demostración y no reserva stock.
- Composición de mensajes para consultar un producto y pedir varios productos por WhatsApp. Envío deshabilitado en modo demo y sin número configurado; no se contacta a nadie.
- Sin recursos externos, claves API ni conexión a la base de datos existente.

## Integración pendiente

Mantener el MISMO proyecto de Supabase que los menús y catálogos de la agencia. La familia de tablas todavía no está decidida: el cliente aclaró que `catalogo_*` pertenece a su plantilla económica. Revisar ese código y sus automatismos antes de reutilizar las tablas; compartirlas no implica reutilizar el diseño.

Esquema conocido: `restaurantes`/`productos`/`perfiles_admin`, y `catalogo_negocios`/`catalogo_categorias`/`catalogo_productos`/`catalogo_usuarios_negocio`. No ejecutar el esquema de contexto como migración.

Antes de conectar producción:

1. Confirmar identidad visual, productos, categorías, moneda y WhatsApp reales.
2. Revisar RLS de tablas y Storage, pertenencia del administrador y coherencia entre negocio, categoría y producto. No considerar suficiente un filtro JavaScript por negocio.
3. Implementar el adaptador de lectura y un panel de administración con permisos por negocio. El admin no está incluido todavía.
4. Validar precios y disponibilidad reales; eliminar datos y mensajes de demo, ajustar moneda, activar WhatsApp y revisar el flujo completo. `SETTINGS.demo` protege contra envíos de prueba accidentales y no debe desactivarse antes de sustituir los datos.
5. Incorporar el dominio final, metadatos, logo, fotografías optimizadas y retirar `noindex` al publicar.

No se han creado tablas, aplicado migraciones, editado políticas, dado de alta usuarios ni modificado negocios existentes. No se ha publicado un sitio.

## Validación

Sintaxis JavaScript revisada. Pruebas de interacción en DOM simulado (jsdom) superadas: búsqueda sin tildes, categorías, disponibilidad, estado vacío, añadir/cambiar/quitar productos, totales, persistencia, contenido de fichas, enlaces a producto y bloqueo del envío en modo demo. Los diálogos nativos y el diseño adaptable requieren aún revisión en navegador real. La revisión visual en navegador está pendiente: Chromium no pudo descargarse en el entorno de trabajo. No presentar este prototipo como versión final de producción.
