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
- `G` y luego `H`, `L`, `K` o `U`: Inicio, URLs, API keys o Usuarios.
- `?`: mostrar los atajos.
- `Esc`: cerrar el diálogo abierto.

Los atajos de una letra se desactivan al escribir en un campo. La paleta busca URLs, usuarios y keys en vivo.

## Estructura del código

- `src/api/`: cliente único con cookies y respuestas simuladas de desarrollo.
- `src/components/layout/`: menú, tema, paleta, atajos, sesión y protección de rutas.
- `src/components/layout/account-panel.tsx`: cuenta, perfil, tema y cierre de sesión.
- `src/components/shared/`: skeletons y confirmación reutilizable.
- `src/components/ui/`: componentes de shadcn/ui.
- `src/pages/urls/`: tarjetas de URL, formularios y códigos QR.
- `src/pages/keys/`: tarjetas y diálogos de API keys.
- `src/pages/users/`: tarjetas y formulario de usuarios.
- `src/pages/admin/`: resumen administrativo y pestaña de usuarios.
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

`check:responsive` inicia Vite con mocks en un puerto separado, revisa las páginas a 320, 375, 768, 1024 y 1440 px, y prueba el desbordamiento, los atajos, QR, la tecla `⌘` simulando macOS y que menú lateral, paleta y cuenta nunca aparezcan abiertos a la vez. Al final corre `scripts/qr-csp.mjs` (QR con la CSP de producción) y `scripts/live.mjs` (actualización en vivo). Crea capturas locales en `screenshots/`, carpeta ignorada por Git.

## Actualización en vivo

El dashboard se actualiza solo, sin recargar la página.

### Cómo funciona

Cada página vuelve a pedir sus datos cada pocos segundos con `refetchInterval` de TanStack Query. Los intervalos están en `src/lib/live.ts` (`LIVE_INTERVALS`):

| Qué | Cada |
|---|---|
| Inicio: clics por día, más populares, recientes y top creadores | 10 s |
| Resumen (tarjetas de Inicio y contadores de la barra lateral) | 10 s en Inicio, 15 s en el resto |
| URLs, API keys y Usuarios | 15 s |

- **Sin peticiones duplicadas.** La barra lateral es la única que lleva el ciclo del resumen (`["stats", "summary"]`). Inicio y Administración leen esa misma consulta con `liveRead`, sin pedirla otra vez. El panel lateral móvil (`poll={false}`) tampoco consulta.
- **Pausa con la pestaña oculta.** `refetchIntervalInBackground: false` detiene los ciclos mientras la pestaña no se ve. Al volver (`refetchOnWindowFocus`) o al recuperar internet (`refetchOnReconnect`), se consulta de inmediato.
- **Sin parpadeos.**
  - `placeholderData: keepPreviousData` mantiene los datos anteriores mientras llegan los nuevos, también al cambiar de página o búsqueda.
  - Los skeletons solo salen en la primera carga.
  - Las páginas muestran el error solo si nunca hubo datos (`isLoadingError`), así que un fallo no borra la pantalla ni cierra diálogos.
  - Los filtros viven en la URL o en el estado local y no se tocan.
- **Errores sin avisos repetidos.** Una actualización automática que falla no muestra notificaciones: se reintenta en el siguiente ciclo. El `QueryCache` de `main.tsx` cuenta los fallos seguidos para el indicador.
- **Indicador.** `LiveIndicator`, junto al título de cada página que se actualiza sola, puede mostrar tres estados:
  - "En vivo · actualizado hace X s", con un punto verde que late.
  - "Pausado" en gris, con la pestaña oculta.
  - "Sin conexión" en rojo, desde 2 fallos seguidos o sin internet.
  - Al lado tiene el botón **Actualizar ahora** (`RefreshCw`).
- **Cambios visibles.** `LiveNumber` hace destellar en rojo claro durante 1 s un número que cambia (clics y totales). Las tarjetas que aparecen solas entran con `.live-enter` (`useNewIds`); al cambiar de página o búsqueda no se animan. Con `prefers-reduced-motion: reduce` no hay animaciones.
- **Varias pestañas.** Después de crear, editar o borrar algo, `refreshEverywhere` actualiza esta pestaña y avisa a las demás del mismo navegador por `BroadcastChannel`. Si el navegador no lo soporta, usa el evento `storage` de `localStorage`. Las otras pestañas vuelven a pedir los datos al instante.

### Peticiones por minuto (una pestaña visible)

| Página | Peticiones/min |
|---|---|
| Inicio | 30 (4 consultas × 6 + resumen × 6) |
| URLs, API keys o Usuarios | 8 (lista × 4 + resumen × 4) |
| Administración | 4 (solo el resumen); 8 en la pestaña Usuarios |
| Pestaña oculta | 0 |

Además se hace una consulta extra al volver a la pestaña, al recuperar la conexión, al pulsar "Actualizar ahora" o cuando otra pestaña avisa de un cambio. Los endpoints `/api/admin/*` y `/api/auth/me` no tienen límite de uso en el backend (los límites solo aplican al login y a `/api/urls/*`), así que el dashboard nunca recibe un 429 por esto.

### Por qué consultas periódicas y no WebSockets

El backend corre en funciones sin servidor de Vercel: cada petición vive unos segundos y no hay un proceso que mantenga conexiones abiertas. Con WebSockets o Server-Sent Events de larga duración habría que agregar un servicio aparte (Pusher, Ably o un servidor propio), con su costo, su configuración y otro lugar que pueda fallar. Consultar cada 10 a 15 segundos da una sensación de "casi tiempo real" suficiente para un panel de estadísticas. Reutiliza los mismos endpoints, la misma sesión y el mismo caché de TanStack Query, se pausa sola cuando nadie mira la pestaña y no exige cambios en el backend.

### Prueba

`scripts/live.mjs` (parte de `check:responsive`) acorta los ciclos a 1 s con `localStorage["au-live-interval-ms"]`. Esa opción solo funciona con datos simulados. La prueba cambia los datos del servidor simulado con `window.__mockServer` y comprueba:

- que los clics se actualizan y destellan sin recargar;
- que una URL nueva entra con animación;
- que un diálogo abierto, lo escrito y la búsqueda se conservan;
- que con la pestaña oculta no hay peticiones e indica "Pausado", y al volver se actualiza de inmediato;
- que varios fallos muestran "Sin conexión" sin avisos de error;
- que "Actualizar ahora" funciona;
- que otra pestaña se actualiza al instante al borrar una URL;
- que con movimiento reducido no hay animaciones.

## Diseño

La interfaz usa tonos beige, blanco, negro y rojo. Las fuentes Bricolage Grotesque y Figtree se sirven desde paquetes locales de Fontsource, sin depender de Google Fonts.
