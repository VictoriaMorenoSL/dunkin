# Dunkin Web

Prototipo académico de maquetación web. Incluye Index, Menú-Café, Producto, Sucursales, Nosotros y una guía de estilos interactiva.

## Abrir en local

Desde esta carpeta, ejecuta:

```sh
python3 -m http.server 8765
```

Abre [Index](http://localhost:8765/) o la [guía de estilos](http://localhost:8765/style-guide.html). Las imágenes optimizadas se sirven junto con los archivos de respaldo que utiliza el sitio. La ficha de COLD BREW contiene precios del prototipo cuya vigencia comercial está pendiente de confirmación.

## Mapa y publicación

El directorio funciona con datos locales y el mapa de Sucursales usa Stadia Maps Alidade Smooth. En localhost o 127.0.0.1, el proveedor admite el desarrollo sin clave y con límites de uso. Para mostrar las teselas en GitHub Pages, registra el dominio anfitrión en una propiedad de Stadia Maps. Si el proveedor rechaza la solicitud, el directorio conserva los filtros y muestra las indicaciones al seleccionar una sucursal.

[Informe de entrega](docs/entrega-final.md) · [Autenticación de Stadia Maps](https://docs.stadiamaps.com/authentication/)
