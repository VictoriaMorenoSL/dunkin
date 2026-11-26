# Dunkin Web

Rediseño académico no oficial de Dunkin México. Proyecto estático en HTML, CSS y JavaScript nativo.

- [Abrir Inicio (index.html)](https://victoriamorenosl.github.io/dunkin/index.html)
- [Abrir la guía de estilos (style-guide.html)](https://victoriamorenosl.github.io/dunkin/style-guide.html)

## Abrir en local

Desde la carpeta del proyecto, ejecuta `python3 -m http.server 8765` y abre [Inicio](http://localhost:8765/index.html) o [la guía visual](http://localhost:8765/style-guide.html). El servidor local permite usar el directorio y probar la geolocalización cuando el navegador concede permiso.

## Estructura

- `index.html`, `menu-cafe.html`, `producto.html`, `sucursales.html` y `nosotros.html` contienen las páginas. `style-guide.html` reúne el sistema visual.
- `css/` reúne los tokens y estilos. `js/` contiene las interacciones.
- `assets/` contiene recursos visuales y fuentes. `data/` contiene el directorio. `vendor/leaflet/` incluye la biblioteca cartográfica.
- `docs/` contiene el [informe de entrega](docs/entrega-final.md). `references/` conserva referencias de desarrollo.

Se puede servir desde la raíz o desde una subruta de GitHub Pages sin un proceso de compilación. Conserva la estructura de carpetas al publicar.

## Limitaciones conocidas

- El mapa usa Stadia Maps y requiere conexión. En GitHub Pages, las teselas dependen de que el dominio esté autorizado y de la cuota del proveedor. Si fallan, el directorio, los filtros y las indicaciones externas siguen disponibles. [Autenticación de Stadia Maps](https://docs.stadiamaps.com/authentication/)
- El catálogo tiene una sola ficha de producto. Los precios de COLD BREW y los datos de contacto del prototipo carecen de confirmación comercial. Las categorías sin catálogo, empleo, redes y documentos legales quedan pendientes de destinos confirmados.
- Algunos pares de color de marca quedan por debajo del mínimo de contraste para texto normal. El sitio no declara conformidad WCAG AA.
