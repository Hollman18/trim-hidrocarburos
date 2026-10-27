# F4 · Pruebas y auditor (fase 4)

**26-oct-2026 · F4.** El auditor con las reglas de §11 de `PROMPT-REVISION-UX.md`, las e2e transversales en frase (D-3), el glosario como prueba, los pantallazos y el comentario del simulador (A9). No se tocó `src/`.

Corrido contra mi Vite en el 5184 (apagado por su PID al terminar), con el demo de Playwright apuntado a un servidor nulo propio en `127.0.0.1:5188` para no construir ni tocar el 4199: `TRIM_URL=http://localhost:5184 TRIM_PUERTO_DEMO=5188 npx playwright test … --project=dev --output=<scratchpad>`.

## 1. Las reglas nuevas del auditor

En `e2e/auditoria/detector.ts` (corre dentro de la página). Cada una tiene su caso bueno y su caso malo en la autoprueba nueva (`auditor.spec.ts`, «autoprueba F4»), y **cada caso malo falla con el detector de antes**: con el `detector.ts` de `HEAD` fallan 16 comprobaciones, los 13 casos malos y 3 casos buenos que el viejo marcaba mal (el desplazable a propósito, el corte con puntos suspensivos y el diálogo que flota).

| Tipo | Qué marca | De dónde | Lo que NO marca (para no dar falsos positivos) |
|---|---|---|---|
| `desborde` | Un contenedor que se desplaza de lado sin ser un desplazable a propósito, con cuánto y quién lo ensancha. Cubre `.vista` (R1: el detector no lo veía) | §11, R1 (medicion.md), A7 | El desplazable a propósito: `overflow-x-auto` en su clase o `desplazable()` («se desplaza de lado»); lo que vive en otro desplazable o en un `fixed` |
| `sale` (ampliado) | Lo que se sale de su tarjeta, y la tarjeta se reconoce también por su **fondo y su radio** (≥ 8 px), no solo por su borde | §11, R1 | El corte con puntos suspensivos en el contenedor que corta (`truncate`) |
| `recortado` (ampliado) | El texto de un SVG que corta un contenedor con `overflow: hidden` | §11, R3 | Lo que corta un desplazable (se alcanza desplazando), y lo de debajo del borde de `.vista` |
| `chico` (afinado) | Texto de SVG de menos de 12 px **en pantalla**, en los seis anchos (320 es nuevo) | §11, H9, UI-16 | Solo el número 1, 2 o 3 dentro de una marca de prioridad (14 × 14). El «?» de la configuración sí cuenta (UI-16) |
| `grande` | Más de una cifra de 40 px o más por vista (toda la vista, no solo la primera pantalla) | §11, X5 §2.1, H11 | — |
| `simulado` | Una cifra cuyo renglón dice «simulado» o «proyectado» tan grande como la mayor medida (desde 20 px) | V1 §4 (P-05), regla 5 | Las tablas donde todo va del mismo tamaño |
| `color` | Un color de estado (`--p1`, `--p2`/`--p3`, `--interlock`, `--sincom` y sus fondos, leídos del tema puesto) pintado fuera de una marca; una marca sin nombre accesible; una marca sin palabra en su renglón o control | §11, X2 §4 | La etiqueta pintada que lleva adentro su forma y su palabra («P1 · alarma»); el borde y el anillo de un equipo del esquema con su marca y su nombre en el nodo (X2 §5.4.3, isa-101 C2); la punta de una minitendencia en el renglón que ya tiene su marca (isa-101 C2); la marca sobre una barra de un dibujo con su frase (así la imagen 1 dibuja el ■3 del mes que pasó el máximo); la cuenta en cero de la franja en el teléfono (X5 §5.6, T-4 refutado) |
| `pestañas` | `role=tablist` acostado, `role=tab` suelto, o una fila de dos o más controles donde uno tiene `aria-current` | §11, el dueño, UI-01 | El panel azul; el asistente por pasos (`aria-current="step"`, «Configurar por pasos» de X4 §3.7); los grupos de radios (los momentos) |
| `mayúsculas` | Un título (encabezado o texto espaciado ≥ 0,5 px) con una palabra de cinco letras o más en MAYÚSCULAS | D-3, X5 §3.4, T-6 | Las siglas y los códigos con guion o cifra («PRODML», «EPIC-CEIBA-02», «P-201B») |
| `pérdida` | Lo diferido dicho como pérdida: «se pierde(n)», «pierde N bbl», «perdiéndose», también dentro de las ⓘ | V1 §4 (T-8), regla 3 | «Pérdida: lo que salió y no se vendió» |
| `encimado` (afinado) | Dos textos que se pisan, **dentro de la misma capa** | — | Un diálogo que no es modal (la ficha sin velo de H7, las señas de la introducción de P-15) flota sobre la página a propósito |

**En `auditor.spec.ts`:**
- **320 px** en `ANCHOS` (`rutas.ts`) y en `OTROS_ANCHOS` de `playwright.config.ts` (Safari y Firefox no lo repiten: Firefox no tiene `isMobile`).
- **El inicio de cada rol a 390 × 844** (prueba aparte, «inicio de cada rol · 390 px»), con la introducción vista y una página por rol:
  - **el presupuesto de palabras** sin desplazarse, en toda la ventana: `e2e/auditoria/presupuesto.ts`, un archivo de datos con `antes` (la medición de R1, `medicion/antes.json`, `palVista` a 390) y `tope` = el −40 % (`Math.floor(antes × 0,6)`). El coordinador sube un `tope` y escribe su `porque` si un rol no llega por la imagen aprobada (D-1);
  - **como mucho 5 cifras** sin desplazarse; no cuentan las cuentas de la franja (`[data-franja]`) ni la fecha y la hora de los datos (D-1);
  - **una sola cifra grande**.
  - La cuenta (`e2e/auditoria/inicio.ts`) es la del guion de R1 (`herramientas/medir.mjs`), portada: en los 9 inicios dio **las mismas palabras** que su función, corrida en la misma página.
- **`ASERCIONES`:** el `no` acepta expresiones regulares; `atras` (lo que salió de la primera capa está en la página y no a la vista: ninguna función se pierde); y `ABRIR_BOTON` (rutas donde se toca un botón por su nombre y se audita lo que abre, con su aserción en «ruta [botón]»).
- **La introducción** (F1, P-15) ya no es modal: se audita con la ruta y se cierra con «Ya entendí» antes de tocar una fila, una placa o un botón (en el teléfono tapaba lo que se toca).

## 2. Las aserciones de `rutas.ts`

- **D-3 · títulos en frase, sin probar menos.** `titulo('Tanques de agua')` busca el título en su renglón, en frase o en MAYÚSCULAS; en los `no`, las dos formas siguen prohibidas (antes `'TANQUES DE AGUA'` tal cual no habría visto «Tanques de agua»). `NO_DECISION`: el vigía en cualquier forma (`/\bvigía\b/i`, más fuerte que `'VIGÍA'`).
- **D-2 · «Si falla hoy» en bbl/d:** Riesgo y Mantenimiento de todos los campos buscan «bbl le costaría la falla» y prohíben «bbl si falla hoy»; el panel «SI SE PARA AHORA» de la placa de confiabilidad es «Si falla hoy: N bbl/d» y «Si se para ahora» queda prohibido.
- **Lo que F1–F3 movieron, en su lugar nuevo:**
  - Resultados del gerente: «máximo firmado a la fecha» y «diferido máximo …» (G-10: «máx.», prohibido);
  - Regulatorio (F2, P-03 y P-reg-1): las paradas sin causa y quién las debe, primero; los códigos detrás de «Ver los códigos ANH» y PRODML detrás de «Ver más» (`atras` y `ABRIR_BOTON`);
  - Configuración del administrador (F3, P-04): abre en el estado («N de M pasos listos»); lo técnico, a un toque («[Configuración técnica]»);
  - Confiabilidad (F2, P-conf-1): «¿Le creo al vigía?»; lo que anunció, a un toque («[Ver lo que anunció]»), y «¿Acierta el vigía?», prohibido;
  - Identificar del operador (F1, P-causa-1): «Si arranca antes, queda como no conformidad»; LC-08 se abre con un toque («[LC-08]»);
  - Equipos de confiabilidad (F3, P-02): la cifra y «Ataque primero…»; «Cambió hoy» se prueba en la ruta nueva `#/jefe/equipos/ceiba` (confiabilidad lo dice con su frase);
  - Mi trabajo del técnico (F1, P-trabajo-1): abre Hoy, con la tarjeta de la orden de K-101 y su aviso de WhatsApp;
  - Turno (F1, P-05): «1.966 bbl/d se dejan de producir ahora»;
  - Pozos (F3, G-5): «Potencial del libro», y «Potencial ahora» prohibido.

## 3. Las e2e transversales ajustadas (sin probar menos)

F1 y F3 ajustaron las suyas en estos specs (ver `coordinacion.md`); lo mío:
- `carril.spec.ts`: «Historia del PLC» como título, en frase o como estaba (D-3); Confiabilidad (P-conf-1): la línea «¿Le creo al vigía?» a la vista, «Lo que anunció y en qué quedó» no, y con un toque, el historial con las mismas comprobaciones de antes.
- `interfaz.spec.ts`: en el papel de Riesgo, «Le costaría la falla · …» (D-2) y no «Si falla hoy · …»; en el teléfono, la marca «Demo» **de la cabecera de la vista** (antes buscaba `/DEMO/` en el primer `header`, que es el membrete del papel: pasaba por «DATOS DE DEMOSTRACIÓN» del papel, no por la cabecera).
- `demo-construido.spec.ts`: Confiabilidad carga con «¿Le creo al vigía?» (P-conf-1; lo de antes quedó detrás de un toque). No se corrió: necesita el demo construido en el 4199.
- `experiencia-f2c.spec.ts` (A16, de V2): la marca de P-201B en Turno, con coma («Prioridad 1, alarma»), leída por su nombre accesible o por la palabra de la marca decorativa («Alarma ·», H3/H16 de F1). Sigue exigiendo una sola condición.
- `qa2`, `metas`, `perfil-plan`: nada que cambiar de lo mío (F3 ya ajustó lo de la configuración).

**Corridos en dev contra el 5184:** `carril`, `interfaz`, `qa2`, `metas` y `perfil-plan` en verde; `experiencia-f2c`, 10 de 12 (las dos que caen son de cambios de F2: abajo). El auditor: las dos autopruebas y «cada aserción cae en una ruta» en verde; los anchos de 1280 y 320 y los inicios a 390, con los hallazgos de abajo.

## 4. El glosario como prueba (`verificar-libro.mjs`, sección «F4», al final)

Las vistas se piden por la costura (`@/shared/api/*`), los nombres salen de `NOMBRE_CIFRA` (`@/shared/api/resultados`) y la cifra de referencia de `cifrasDeUnNombre` (`@/entities/resultados`: la costura publica el gancho, no la función). Cinco comprobaciones:
1. **Una cifra por nombre, en cada vista que la trae** (La Ceiba, Morichal y todos): «Se deja de producir ahora» (la referencia, La planta viva, la tubería y Hoy del supervisor: 1.966 · 684 · 2.650 bbl/d, en «barriles por día»), «Equipos que avisan» (la referencia, La planta viva y el filtro de Equipos: 1 · 8) y «Retorno posible del ciclo» (La planta viva y Resultados: 2.133). ✓
2. **«Si falla hoy» de cada equipo**: la misma cifra en criticidad, Equipos y La planta viva (73 equipos; P-201A 3.059). ✓
3. **Una unidad por nombre** en todo lo que dicen las vistas del motor y lo que escriben las pantallas (`pages`, `widgets`, `shared/ui`, `shared/lib`, sin comentarios): «si falla hoy» en bbl/d (D-2), «le costaría la falla» y «Exposición si fallan hoy» en bbl. ✓ (con el `costoHoy` de `HEAD`, «≈ N bbl si falla hoy», falla).
4. **Los sinónimos que retiró el glosario no vuelven**: «Potencial ahora» (G-5), «producción por día, bajo la meta» (G-7), «= No producido» (G-8), «bbl en el ciclo» (G-13), «equipo(s) avisando» (G-15), «si se para» (G-16). ✗ hoy por G-15 en `pages/Trabajo.tsx` (F1).
5. **P-09 · una familia por equipo**: las bombas del tren de agua de La Ceiba y de Morichal son «bomba de agua» en cada vista que las nombra. ✗ hoy por «P-201A/C · bomba de reinyección» en el `nombre` de Equipos y de criticidad (F3).

**P-21:** las listas de `verificar-libro` que leían `widgets/riesgo/Ahora.tsx`, `pages/Resumen.tsx`, `widgets/resumen/*` y `PorCampo.tsx` leen lo que exista (y `PorCampo` donde quede): F2 ya puede borrar.

## 5. Lo demás

- `scripts/pantallazos.mjs` (P-22): las direcciones viejas del gerente pasan a La planta viva y a Resultados; la ficha de la bomba, al nivel 3; las órdenes del técnico, a su Hoy; y suman Hoy del supervisor, Equipos de confiabilidad y el reporte de regulatorio (con `reg` en sus roles). Los nombres de archivo que muestra el README se quedan; las capturas nuevas, para el README, son del coordinador. No se corrió (escribe `docs/pantallas/`).
- `vite.config.ts` (A9): el comentario ya no llama al simulador «el contrato ejecutable»: dice que implementa solo el registro de la cadena de datos, que no sirve las vistas calculadas (con `VITE_FUENTE=http` contra él la app no arranca) y dónde está la referencia para un backend. **A9 queda fuera de esta tanda** (decisión del coordinador): el servidor de vistas único, `verificar-contrato --http` contra él y el proyecto `http` de Playwright siguen pendientes, como trabajo de backend.

## 6. Lo que encontró el auditor y a quién se le pasó

Todo revisado a mano: ninguno es falso positivo. Los avisos, en `coordinacion.md` («F4»).

| Regla | Qué | Dónde | Dueño |
|---|---|---|---|
| Presupuesto | Ningún inicio llega al −40 % a 390 px (ger 96/58, prod 97/58, reg 130/78, sup 112/70, oper 96/56, jefe 119/78, conf 89/64, tec 86/69, adm 122/57) | inicios | F1 (sup, oper, tec, jefe), F2 (ger, prod, reg), F3 (conf, adm); el coordinador fija los topes por D-1 |
| 5 cifras | 6 a 15 cifras sin desplazarse en 8 de 9 inicios (conf ya cumple) | inicios | los mismos |
| `pérdida` | «ubicar dónde se pierde producción» (`QUE_ES_EL_CHOKE`) | ⓘ de Identificar y Confiabilidad | F2 |
| `color` | El cuadrado de «fuera de banda» de la gráfica del factor, sin su «3» (como H20) | `#/prod/produccion/palmar/doce` | F2 |
| `color` | ■3 en la celda «Real» de «¿Cuadra? Día por día», sin palabra ni leyenda | Producción | F2 |
| `color` | El marco del indicador de una señal «sin lectura», en morado sin el círculo punteado (H13.2) | detalle del pozo (Electrosumergibles) | F3 |
| glosario | G-15 «equipo(s) avisando» | `pages/Trabajo.tsx:106` | F1 |
| glosario | P-09 «bomba de reinyección» en el `nombre` de las filas | `equipos-tecnico.ts`, `criticidad.ts` | F3 |

**Lo que el auditor encontró y ya arreglaron F1–F3 mientras se corría** (por eso no está en la tabla): el `tablist` de Configuración (UI-01), los títulos en MAYÚSCULAS de Identificar, Planta, Mantenimiento y el nivel 4 (D-3), el desborde de 100 y 180 px de `.vista` en los diagnósticos a 320 px (A7, que el detector de antes no veía) con sus filas fuera de su tarjeta, el texto de SVG de 9,5 a 11,6 px de La planta viva a 320 px (H9) y el rectángulo sin «3» del mes a mes de Diferidos (H20).

**Las e2e que no son transversales y caen por un cambio de otro** (las ajusta el dueño del cambio): `experiencia-f2c` «Producción: la tubería dice lo de hoy…» (F2, P-16) y «Riesgo y mantenimiento…» (F2, un `hover` sobre una ⓘ que ya no está).

## 7. Verificación

- `npx tsc -b` (con `tsconfig.e2e.json`): en verde.
- `npx oxlint src`: en verde.
- `npm test`: `verificar-libro` 552 de 555. Caen mis dos comprobaciones del glosario (G-15, P-09: hallazgos reales para F1 y F3) y «las salidas de referencia coinciden con el motor» (`npm run referencia`, del coordinador). Como `verificar-libro` corta la cadena, corrí aparte el resto: `verificar-arbol` 128 de 128, `verificar-contrato` 199 de 199, `referencia comprobar` 296 de 311 (los motores que cambiaron F1–F3).
- **Las corridas largas del auditor salieron ruidosas**: mientras corrían, F1–F3 guardaban archivos y mi Vite registró más de 400 recargas; cada recarga deja una ruta a medio pintar y salen «falta …» en bloque. Repetí cada ruta que falló, sola y en la secuencia del auditor, a 1280 y a 320: pasan todas. La corrida que vale es la de la fase 5, con nadie editando.

## 8. Pendiente

- La fase 5: el auditor entero (seis anchos) en dev, Safari, Firefox e iPhone, con nadie editando; y `demo-construido` en `demo` y `demo-iphone`.
- Los topes del presupuesto de palabras, por D-1, cuando F1–F3 terminen (`presupuesto.ts`).
- P-10: cuando F1 funda Riesgo de jefe y conf en Equipos, mover la aserción de `#/jefe/riesgo/ceiba~portafolio/curso` a donde quede cada cosa.
- A9, fuera de esta tanda.
