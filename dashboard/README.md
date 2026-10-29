# Dashboard

Dashboard administrativo en español para crear enlaces cortos y administrar usuarios y API keys.

## Cómo correrlo en Ubuntu/WSL

1. Abre una terminal de Ubuntu y entra al proyecto:

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

El archivo local `.env.local` activa los datos de prueba (`VITE_USE_MOCKS=true`). Así puedes navegar y probar sin configurar una base de datos ni iniciar el backend. La pantalla de acceso viene rellenada con datos de ejemplo; con mocks puedes entrar sin una cuenta real.

Para conectar un backend local en el puerto 3000, cambia `VITE_USE_MOCKS=false` en `.env.local`. El proxy de Vite reenvía `/api` a `VITE_API_TARGET` (por defecto `http://localhost:3000`). Si Carlos te da un dominio de producción, puedes usarlo como `VITE_API_TARGET=https://dominio`.

## Atajos de teclado

- `Ctrl+K` en Windows/Linux o `⌘K` en macOS: abrir la paleta de comandos.
- `/`: enfocar el buscador.
- `N`: crear una URL.
- `G` y luego `H`: Inicio; `G` y `U`: URLs; `G` y `K`: API keys; `G` y `P`: Personas.
- `?`: mostrar la lista de atajos.
- `Esc`: cerrar el diálogo abierto.

Los atajos de una letra se desactivan al escribir en campos de texto.

## Verificación y capturas

```bash
npm run build
npm run lint
npm run check:responsive
```

`check:responsive` inicia Vite con mocks, revisa Inicio, Login, URLs, API keys, Personas y Mi perfil a 320, 375, 768, 1024 y 1440 px. Falla si aparece scroll horizontal y comprueba los atajos principales, incluido `⌘K` simulando macOS. Guarda capturas en `screenshots/`; esa carpeta se ignora en Git.

Las tarjetas están en cuadrículas responsivas. La capa de red está centralizada en `src/api/`; `src/pages.tsx` contiene las pantallas de gestión y las estadísticas; `src/components/ui/` contiene los componentes shadcn/ui.
