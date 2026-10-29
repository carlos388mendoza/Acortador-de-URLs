# Dashboard

Dashboard administrativo en español para crear enlaces cortos y administrar usuarios y API keys.

## Cómo correrlo en Ubuntu/WSL

1. Abre Ubuntu y entra al proyecto:

   ```bash
   cd ~/proyectos/Acortador-de-URLs/dashboard
   ```

2. Instala las dependencias (solo la primera vez):

   ```bash
   npm install
   ```

3. Inicia el dashboard:

   ```bash
   npm run dev
   ```

4. En el navegador de Windows abre <http://localhost:5173/dashboard/>. Para detenerlo, vuelve a la terminal y presiona `Ctrl+C`.

## Modo de prueba y backend real

`.env.local` no se sube a Git. Para probar sin backend, configura:

```env
VITE_USE_MOCKS=true
VITE_API_TARGET=http://localhost:3000
```

Para conectar el backend real que se está ejecutando en local o desplegado, usa `VITE_USE_MOCKS=false` y configura `VITE_API_TARGET` con su dominio. Vite carga estas variables para el proxy `/api`. En producción los mocks siempre quedan desactivados, aunque `VITE_USE_MOCKS` esté configurado por error.

## Atajos de teclado

- `Ctrl+K` en Windows/Linux o `⌘K` en macOS: abrir la paleta de comandos.
- `/`: enfocar el buscador.
- `N`: crear una URL.
- `G` y luego `H`, `U`, `K` o `P`: Inicio, URLs, API keys o Personas.
- `?`: mostrar los atajos.
- `Esc`: cerrar el diálogo abierto.

Los atajos de una letra se desactivan al escribir en un campo. La paleta busca URLs, usuarios y keys en vivo.

## Estructura del código

- `src/api/`: cliente único con cookies y respuestas simuladas de desarrollo.
- `src/components/layout/`: menú, tema, paleta, atajos, sesión y protección de rutas.
- `src/components/shared/`: skeletons y confirmación reutilizable.
- `src/components/ui/`: componentes de shadcn/ui.
- `src/pages/urls/`: tarjetas de URL, formularios y códigos QR.
- `src/pages/keys/`: tarjetas y diálogos de API keys.
- `src/pages/users/`: tarjetas y formulario de usuarios.
- `src/pages/stats/`: resumen, gráficas y tarjetas de estadísticas.
- `src/pages/profile/`: consulta y formulario del perfil.
- `src/pages/login/`: pantalla de acceso.
- `src/pages/not-found/`: página 404.

## Formato y verificación

```bash
npm run format
npm run format:check
npm run build
npm run lint
npm run check:responsive
```

`check:responsive` inicia Vite con mocks en un puerto separado, revisa seis páginas a 320, 375, 768, 1024 y 1440 px, y prueba el desbordamiento, los atajos, la búsqueda, QR y la tecla `⌘` simulando macOS. Crea capturas locales en `screenshots/`, carpeta ignorada por Git.
