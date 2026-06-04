# ImproDashboard

Prototipo navegable de un tablero de formación corporativa para Gympro. La
interfaz abre con datos ficticios de demostración, presenta indicadores
ejecutivos, progreso por contenido, alertas y detalle por participante, y
permite cargar archivos `.xlsx` con el formato esperado.

## Ejecutar

La aplicación no requiere dependencias. Puede abrirse directamente desde
`index.html` o servirse con cualquier servidor estático:

```bash
python3 -m http.server 8000
```

Luego visitar `http://localhost:8000`.

## Archivos principales

- `index.html`: estructura de las vistas.
- `styles.css`: diseño responsive.
- `data.js`: datos ficticios de muestra.
- `app.js`: carga de `.xlsx`, parser local, métricas, filtros, navegación y panel de detalle.

## Formato esperado

El archivo cargado debe tener esta estructura:

- Una columna con nombre del participante.
- Una columna con dirección de correo.
- Columnas de hitos o módulos con valores como `Finalizado`, `No finalizado` o
  `En progreso`.
- Columnas de fecha intercaladas después de cada hito.
