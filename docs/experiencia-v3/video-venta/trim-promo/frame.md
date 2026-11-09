# frame.md · TRIM Hidrocarburos — video de venta

Sistema visual único del video. Todo frame lo respeta; nada fuera de esta paleta ni de estas fuentes.

## Lienzo
- 1920×1080, 30 fps. Fondo base `--suelo` (lo pinta el index). Cada frame pinta su propio fondo en una capa `class="clip"` a pantalla completa (nunca en `#root`).
- **Banda de subtítulos reservada:** los 190 px de abajo (y > 890) son de los subtítulos del index. Ningún texto ni dato importante del frame va ahí; solo fondo o línea decorativa.
- Márgenes seguros: 120 px a los lados, 96 px arriba.

## Color (tokens)
| token | hex | uso |
|---|---|---|
| `--suelo` | `#101418` | fondo de la noche/planta |
| `--grafito` | `#1d2125` | fondo de pantallas y tarjetas |
| `--borde` | `#343b42` | bordes finos, rejilla |
| `--tinta` | `#f4f3f0` | texto principal |
| `--tinta2` | `#c9cbcd` | texto secundario |
| `--tinta3` | `#7f878e` | etiquetas apagadas |
| `--petroleo` | `#2c7371` | acento de marca (rellenos, botones) |
| `--petroleo-claro` | `#a9dad6` | líneas del esquema, brillos, cifras de marca |
| `--frenado` | `#e0897c` | parado / alarma (línea y brillo sobre oscuro) |
| `--frenado-palido` | `#f5e1de` | relleno pálido de lo parado (solo sobre claro) |
| `--riesgo` | `#d9bd6a` | en riesgo / degradándose |
| `--bien` | `#8fbf95` | resultado bueno — **solo** en el cierre (F9) |

Reglas: rojo = parado o urgente; amarillo = en riesgo; verde solo cuando es un resultado. Lo normal va en petróleo claro o gris, nunca en verde.

## Tipografía (archivos en `assets/fonts/`, `@font-face` dentro de cada frame)
- **IBM Plex Sans** — `IBMPlexSans-Regular-Latin1.woff2` (400), `-Medium-` (500), `-SemiBold-` (600), `-Bold-` (700). Titulares 600–700, `letter-spacing: -0.02em`.
- **IBM Plex Mono** — `IBMPlexMono-Regular-Latin1.woff2` (400), `-Medium-` (500). Etiquetas de equipo (P-201B, MPP-301), cifras, chips, en MAYÚSCULAS con `letter-spacing: 0.12em` cuando son rótulos.
- Escala: titular 96 / subtítulo 56 / cuerpo 36 / rótulo mono 22–26.

## Lenguaje gráfico
- **Esquema de línea (estilo SCADA/P&ID):** trazos de 2–3 px en `--petroleo-claro`, extremos redondeados, sin rellenos sólidos (salvo el estado). Rejilla de puntos tenue (`--borde`, 40 px). El flujo se muestra con trazos discontinuos que avanzan (`stroke-dashoffset`) por las tuberías. Bombas: círculo con rodete de 3–5 aspas que gira; motor = rectángulo redondeado con aletas; válvula = dos triángulos enfrentados; tanque = rectángulo alto con nivel.
- **Brillo:** `filter: drop-shadow(0 0 12px currentColor)` suave sobre lo que está vivo o en alarma. Una sola fuente de brillo protagonista por plano.
- **Pantallas del producto** (capturas reales de `assets/pantallas/`): dentro de un "monitor" = marco `--grafito` con radio 18 px, borde 1 px `--borde`, sombra `0 40px 120px rgba(0,0,0,.55)`, leve inclinación 3D (`rotateY` ≤ 8°, `perspective` 2400 px) que se endereza al entrar. Teléfono: radio 56 px, bisel 14 px `#0b0e11`. Nunca recortar el texto de una captura de forma que se lea a medias en un borde visible.
- **Chip «Datos de demostración»:** frames F5–F8, arriba a la derecha (x≈1800 alineado a la derecha, y≈96), Plex Mono 18 px, `--tinta3`, borde 1 px `--borde`, radio 999 px, padding 8×16.
- **Rótulos en pantalla** (texto del guion): Plex Sans 600, `--tinta`, con una raya de 4 px de `--petroleo-claro` (o del estado) a la izquierda.

## Movimiento
- Entradas: `power3.out` / `expo.out`, 0,5–0,9 s; salidas más cortas (0,3–0,4 s) `power2.in`.
- Cámara: empujes lentos (`scale` 1 → 1,06) dentro del plano; nunca quietud total más de 1,5 s.
- Nada de transiciones de plantilla. Los cortes entre frames son secos o con barrido de luz; cada frame entra ya con algo en movimiento.
- Todo determinista: sin `Math.random()` sin semilla, sin relojes.
