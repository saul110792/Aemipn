# Archivos públicos

Lo que esté aquí se sirve desde la raíz del sitio: `imagen.png` → `/imagen.png`.

## Qué hay

| Archivo | Uso |
|---|---|
| `logo-ipn.svg` | Escudo oficial del IPN en color, tomado del sitio institucional (ipn.mx) |
| `logo-ipn-blanco.svg` | La misma marca en monocromo blanco, para fondos oscuros. Es la que aparece en el pie del sitio |

La variante blanca se generó del original cambiando los dos colores de relleno a blanco.
Los trazos son idénticos; es la adaptación monocromática habitual para fondo oscuro, y hacía
falta porque el guinda del escudo se pierde contra el guinda del pie.

## Falta: escudo-aemipn.png

El escudo **de la asociación** va en la barra superior. Colócalo aquí con ese nombre exacto:

    apps/web/public/escudo-aemipn.png

Recomendado: PNG cuadrado con fondo transparente, 256×256 px o más. Como la barra es guinda
oscuro, conviene la versión **en blanco** del escudo.

> El archivo `Escudo AEMIPN blanco.png` que está en Descargas sirve, pero trae una flecha roja
> encima que hay que quitar antes de usarlo.

Si el archivo no está, la aplicación no se rompe: `<Emblema>` en `src/components/Marca.tsx`
dibuja un escudo propio en SVG como respaldo.

## Jerarquía

La barra lleva el escudo de la **AEMIPN**, porque el sitio es suyo. El pie lleva el escudo del
**IPN**, la institución a la que pertenece.
