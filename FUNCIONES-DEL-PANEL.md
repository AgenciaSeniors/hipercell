# Funciones añadidas a Hipercell

## Ajustes

WhatsApp de atención, dirección, Instagram y Facebook. Los enlaces sociales deben ser HTTPS de la red correspondiente. Quedan visibles en el catálogo cuando están configurados.

Horario semanal con apertura/cierre y días cerrados; se pueden definir turnos que pasan de medianoche. El catálogo calcula abierto/cerrado en America/Havana, independientemente del huso del visitante. El horario informa, pero no impide abrir WhatsApp fuera de horario. Se puede desactivar su visualización y añadir una nota.

Moneda base y monedas disponibles, con tasas manuales. La estructura de Supabase conserva el formato de la plantilla: una tasa es el número de unidades de moneda base por una unidad de la moneda destino. Con base CUP y USD=400, un producto de 800 CUP se muestra como 2 USD. El cliente selecciona moneda; precios, detalle, carrito y mensaje usan esa moneda. No se convierten los precios almacenados al cambiar la base. Si la tasa cambia mientras el cliente prepara el pedido, se pide actualizar antes de enviarlo.

## Compartir y QR

El panel propone https://agenciaseniors.com/hipercell/. Permite editar el enlace, copiarlo, generar QR y descargar SVG para imprimir. Generación local con qrcode-generator 1.4.4, licencia MIT, sin enviar el enlace a un servicio de QR. El QR apunta al enlace escrito; aún no estará accesible hasta publicar. Editar este enlace no publica la web. La personalización del campo de enlace se conserva durante la sesión abierta del panel; la dirección propuesta está en config.js.

## Estadísticas

El usuario confirmó la ejecución de supabase/07-estadisticas-hipercell.sql en el proyecto actual. Para una instalación nueva, ejecutar ese archivo en SQL Editor. Es repetible y crea una tabla y dos funciones dedicadas a Hipercell; no modifica catalogo_eventos ni el esquema de otros clientes. El catálogo sigue funcionando antes de aplicar el SQL, pero la pestaña no podrá leer estadísticas.

Visitas y productos vistos se deduplican por sesión del navegador. Pedidos y consultas registran aperturas de WhatsApp, con productos y cantidades. El ranking de solicitudes suma unidades solicitadas. Hay períodos de 7 días, 30 días y todo el historial. No se registran ventas confirmadas, datos de contacto de clientes ni contenido de mensajes. Abrir WhatsApp no demuestra que el usuario envió el mensaje o compró.

El registro público valida tipos, cantidades y que los productos estén visibles y pertenezcan a Hipercell. Solo su administrador puede consultar los resultados. Las métricas son orientativas: un cliente público puede generar eventos artificiales y una petición de actividad fallida no interrumpe la compra. No hay historial anterior al momento de activar esta función.

## Comprobación manual

Actualizar panel y catálogo con Ctrl+F5. Guardar horario, redes y una segunda moneda con tasa. Comprobar horarios y enlaces, cambiar moneda y revisar un pedido. Generar el QR y comprobarlo con un teléfono. Aplicar SQL 07, abrir el catálogo, ver un producto e iniciar un pedido; luego consultar Estadísticas. Las pruebas automatizadas del SQL se realizan en PostgreSQL aislado y no aplican cambios al proyecto real.

Esta versión incluye el diseño futurista del catálogo y el rediseño del panel. Todavía no se ha desplegado en Hostinger.
