# Archivos públicos

Lo que esté en esta carpeta se sirve desde la raíz del sitio: `imagen.png` → `/imagen.png`.

## logo-ipn.png

Coloca aquí el escudo del Instituto Politécnico Nacional con **ese nombre exacto**:

    apps/web/public/logo-ipn.png

Aparece en la barra superior del sitio público y del panel, sobre una placa blanca
para que el guinda del escudo contraste con el guinda de la barra.

Recomendado: PNG cuadrado con fondo transparente, de 256×256 px o más.

Si el archivo no está, la aplicación no se rompe: `<Emblema>` dibuja un escudo
propio en SVG como respaldo (ver `src/components/Marca.tsx`).

Cuando consigas el vector oficial (SVG) por tu canal institucional, guárdalo como
`logo-ipn.svg` y cambia la extensión en `Marca.tsx`; escalará mejor y pesará menos.
