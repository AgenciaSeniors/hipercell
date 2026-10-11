# Hipercell · catálogo y panel gerencial

Sitio estático en HTML, CSS y JavaScript. Los datos, imágenes y cuentas se guardan en el proyecto compartido de Supabase, con consultas y permisos por negocio. El diseño es propio de Hipercell.

## Catálogo

Identidad Sistema Hiper en lima y grafito, símbolo original flotante en capas CSS, fondo con profundidad, movimiento adaptable y control de pausa. Incluye búsqueda, categorías, disponibilidad, ordenación, ficha con hasta tres fotos, carrito con límite de stock y pedidos o consultas por WhatsApp. Los precios, carrito y mensaje usan la moneda elegida y las tasas manuales del panel. El destinatario y las tasas se vuelven a comprobar antes de abrir WhatsApp.

El pie enlaza al panel gerencial y a agenciaseniors.com. El botón de contratación abre el WhatsApp comercial de Señores, separado del número configurable que atiende pedidos de Hipercell.

## Administración

Acceso con Supabase Auth y vínculo con Hipercell. Productos, categorías, precios, stock, estado, fotos y portada; datos de atención, dirección, redes, horario de Cuba, monedas y tasas. Navegación lateral en escritorio, navegación compacta en móvil y resumen de inventario. Incluye enlace y QR SVG, estadísticas de vistas y productos solicitados por WhatsApp.

Ver ADMINISTRACION.md y FUNCIONES-DEL-PANEL.md para los detalles. Las solicitudes son aperturas de WhatsApp, no ventas confirmadas.

## Desarrollo y pruebas

Servir esta carpeta por HTTP local; por ejemplo, python -m http.server 8877 --bind 127.0.0.1. Abrir /index.html y /admin.html. El panel no permite iniciar sesión desde file://. index.html?demo=1 carga ejemplos explícitos y bloquea WhatsApp; un error remoto nunca se sustituye por una demo.

Con Node 22 o posterior: npm install y npm test. Las dependencias de desarrollo se usan solo en las pruebas. La web no requiere instalar Node o compilarse en Hostinger.

21 pruebas de adaptadores/configuración y suites de SQL en PostgreSQL aislado superadas. También se comprobaron recorridos en DOM simulado: monedas, galería, stock, carrito, enlaces, configuración, QR y estadísticas. La revisión corrigió la referencia al pie, validación de tasas inactivas y respuestas atrasadas tras cerrar sesión.

El navegador automatizado no arranca en este entorno: no se considera completada la revisión visual real de móvil. El usuario confirmó previamente acceso, productos, fotos y WhatsApp contra Supabase. Las pruebas nuevas de interfaz usan datos y sesión simulados.

## Estado de publicación

Ubicación prevista: https://agenciaseniors.com/hipercell/ en Hostinger. No se ha desplegado. Se conserva noindex,nofollow al presentarlo como ejemplo de cliente. Al subir los archivos, index.html y admin.html deben quedar directamente en public_html/hipercell junto con assets y vendor. No ejecutar los SQL otra vez como parte de subir archivos.
