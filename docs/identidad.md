# Identidad visual

La paleta y la tipografía salen del sitio institucional del IPN (ipn.mx), muestreadas
directamente de sus estilos computados — no de memoria ni de una aproximación.

## Guinda institucional

`#611232` es el color de la barra de navegación y del pie de ipn.mx. Es la guinda de la
identidad del Gobierno de México que el Politécnico adopta. Se usa aquí como color primario:
barra superior, pie, encabezados de tabla, cifras del panel y botones principales.

| Token | Hex | Uso |
|---|---|---|
| `--guinda` | `#611232` | Primario: nav, pie, botones, cifras |
| `--guinda-900` | `#3f0b20` | Pie, arranque del degradado del hero |
| `--guinda-800` | `#4e0e29` | Barra lateral del panel |
| `--guinda-600` | `#7a1536` | Enlaces, hover de botones |
| `--guinda-500` | `#932352` | Acento, elemento activo del menú, foco |
| `--guinda-100` | `#f6eaef` | Fondos suaves, hover de filas, medallones |

Otros tonos observados en el sitio del IPN, dejados como referencia: `#5b1237`, `#6f1233`,
`#8d0066`.

## Tipografía

Las mismas familias del sitio institucional, servidas desde Google Fonts:

- **Red Hat Display** (600/700/800) — títulos, cifras y la sigla de la marca
- **Source Sans 3** (400/600/700) — texto corrido e interfaz

Ambas declaran una pila de respaldo del sistema, así que si no hay red el sitio no se rompe.

## Pleca

Franja tricolor de 4 px en el borde superior de cada página (`.pleca`), guiño a la
identidad gráfica de gobierno.

## Colores de área

El guinda es el color de la institución; las áreas necesitan distinguirse entre sí sin
pelearse con él. Son ocho acentos profundos, de valor parejo y saturación contenida:

| Área | Hex | Blanco encima |
|---|---|---|
| Alta Montaña | `#2b4c6f` | 8.88 |
| Media Montaña | `#3f6b4a` | 6.15 |
| Ciclismo de Montaña | `#9c5518` | 5.64 |
| Escalada en Roca | `#8c2f39` | 8.14 |
| Boulder | `#5c6b3f` | 5.79 |
| Cañonismo | `#1f6f7a` | 5.81 |
| Espeleología | `#5b3f7a` | 8.62 |
| Fotografía de Montaña | `#55606b` | 6.42 |

Viven en la base (`areas.color`), así que se cambian desde el panel sin tocar código.

## Contraste

Todas las combinaciones en uso pasan **WCAG 2.1 AA** (4.5:1 para texto normal). El peor caso
del sitio es 5.64:1 y el de la interfaz base 6.58:1. El guinda es lo bastante oscuro para dar
márgenes cómodos con blanco.

## Iconografía

Los iconos son **dibujados a mano para este proyecto**, en `apps/web/src/components/Icono.tsx`:
SVG de trazo, caja de 24, grosor 1.6, sin relleno. Heredan el color y el tamaño del texto con
`currentColor` y `em`, así que el mismo archivo sirve en un menú de 16 px y en un medallón de 56 px.

Se dibujaron en vez de instalar un paquete de iconos para no arrastrar una dependencia ni una
licencia de terceros, y porque ninguna librería general trae cañonismo o espeleología.

Hay ocho de área (uno por disciplina, con el `slug` como llave) y ocho de interfaz. Agregar un
área nueva no rompe nada: `hayIcono()` comprueba antes de dibujar y si no existe simplemente
no se muestra icono.

## Logotipos

El sitio usa dos marcas, con jerarquía deliberada: la barra superior lleva el escudo de la
**AEMIPN**, porque el sitio es de la asociación; el pie lleva el escudo del **IPN**, la
institución a la que pertenece.

| Archivo | Dónde |
|---|---|
| `escudo-aemipn.png` | Barra superior del sitio y del panel |
| `logo-ipn-blanco.svg` | Pie del sitio |
| `logo-ipn.svg` | Original en color, por si se necesita sobre fondo claro |

El escudo del IPN es el vector oficial publicado en ipn.mx (368×160, guinda `#762042`). La
variante blanca se obtuvo cambiando sus dos colores de relleno a blanco: hacía falta porque el
guinda del escudo desaparece contra el guinda del pie.

Si `escudo-aemipn.png` no está presente, `<Emblema>` dibuja un escudo propio en SVG como
respaldo, de modo que la barra nunca se ve rota. Instrucciones en `apps/web/public/LEEME.md`.

## Móvil

Puntos de corte: **860 px** activa el menú desplegable, **640 px** es el diseño de teléfono
(una columna, botones de ancho completo, flechas del carrusel ocultas porque ahí se desliza).

Los objetivos táctiles miden al menos 44 px de alto. Los campos de formulario usan 16 px de
tipografía, que es el mínimo que evita que Safari en iOS haga zoom automático al enfocarlos.

Los enlaces que son acciones —«Entrar a la videoconferencia», «Ver todos»— reciben área propia
en móvil; los enlaces dentro de un párrafo quedan exentos, como permite WCAG 2.5.8.
