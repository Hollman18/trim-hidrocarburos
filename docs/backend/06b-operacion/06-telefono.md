# 6B.6 En el teléfono (390 px) — supervisor y operador

El supervisor y el operador miran sobre todo desde el teléfono, en campo. Las cifras y los textos son **los mismos** que en el escritorio (mismos endpoints, mismas reglas): lo que cambia es la disposición, lo que se pliega y lo que se esconde. Las capturas son de un iPhone 13 (390 × 844, `telefono: true`). «Mi trabajo» del técnico lo documenta otra parte del capítulo 6.

Reglas generales del teléfono (ancho < 640 px, `sm` de Tailwind; < 1024 px, `lg`):

| Qué | En el teléfono | Código |
|---|---|---|
| Riel de navegación | escondido; botón ☰ en la cabecera abre un cajón | `src/App.tsx` (`escritorio`, `nav`) |
| Cabecera de la pantalla | título, «Demo · <período>», «<campo> · N bbl producidos ayer»; botones solo con ícono (período, exportar si el rol puede, «¿cómo se lee?») | `src/widgets/Cabecera.tsx` |
| Cifras de cabecera | rejilla `auto-fit` con mínimos de 150–190 px: en 390 px quedan **una o dos por renglón** | `Bombas.tsx:49`, `Turno.tsx:221` |
| Indicador analógico | en un contenedor < 460 px pasa a **dos renglones**: nombre y valor arriba, barra a todo el ancho abajo (en el escritorio, una fila: nombre · barra · valor) | `src/index.css:156-165` |
| Ficha de un equipo | ocupa **todo el ancho** (en el escritorio, 560 px a la derecha) | `PanelEquipo.tsx:131-134` |
| Tablas largas | Pozos y Electrosumergibles pasan a **una tarjeta por fila** | `Pozos.tsx:166-184`, `Esp.tsx:148-170` |
| Blancos de toque | 24 px mínimo en ⓘ y globos (`min-h-6`) | `Placa.tsx:110` y otros |

## Bombas

![Bombas · supervisor · teléfono](../img/sup-bombas-telefono.png)

| # | Lo que se ve | Qué cambia |
|---|---|---|
| 1 | «1 bomba detenida · 2 pozos cerrados · 69 bbl/h · 2 de oct, 14:00» y debajo ◆ «P-201B» | la cabecera se apila: «Perdiéndose ahora» (con su línea de la bomba que lo causa), «Diferido que causaron» y «Próxima en fallar» (con «de las que tienen instrumento») uno debajo de otro; el conteo («1 bomba con instrumento») queda solo, a la derecha |
| 2 | «ninguna» | igual que en el escritorio |
| 3 | Indicador de la presión de descarga | dos renglones (nombre y ◆ 0 psi arriba, la barra abajo) |
| 4 | «No arrancar hasta identificar» | igual; la ⓘ con blanco de 24 px |
| 5 | «SIN INSTRUMENTO» · «2 bombas» | el panel va a todo el ancho, debajo de la placa; cada bomba parte su texto en renglones (la línea «Si falla hoy: 3.059 bbl/d después de 2 min de colchón · sube porque P-201B está parada» ocupa dos) y el chip «┄ sin instrumento» queda junto al nombre (6B.1, filas 17-19) |
| 6 | «Abrir» | a la derecha de cada bomba, con **48 px de alto** (`min-h-12 sm:min-h-0`, `Bombas.tsx:168`): abre la ficha mínima (6B.4) |

![Bombas · operador · teléfono](../img/oper-bombas-telefono.png)

| # | Lo que se ve | Qué cambia |
|---|---|---|
| 1 | **1.665** bbl/d | igual que el supervisor (en tinta y sin marca; la marca va en «◆ P-201B», debajo); la cabecera no trae el botón de exportar (el operador no tiene `evidencia:exportar`) |
| 2 | «No arrancar» | — |

### El detalle de la bomba

![Bombas · operador · teléfono · detalle de P-201B](../img/oper-bombas-detalle-telefono.png)

| # | Lo que se ve | Qué cambia |
|---|---|---|
| 1 | Chips «Disposición de agua», «respaldo 30.100 bbl/d» | quedan a la derecha del nombre, que se parte en varios renglones con el id y la tecnología |
| 2 | «No arrancar hasta identificar el daño» + «Identificar» | igual |
| 3 | Fila de una parada: «2 de oct, 03:52» / «abierta · bomba parada 10,1 h» | **la columna del medio desaparece** (`hidden sm:block`, `Detalle.tsx:432`): en el teléfono la fila no dice la parte ni cómo se identificó, ni «colchón X h · aguantó Y h», ni la marca ▲ «por identificar» / ■ «arrancó sin identificar». Eso se ve solo **al abrir la parada** («POR QUÉ PARÓ», «EL TANQUE») |
| 4 | «2 pozos cerrados» | a la derecha, con los barriles |
| 5 | «Primer pozo cerrado a las 1,8 h» | dentro de la parada abierta; «EL TANQUE» y «POZOS QUE CERRÓ» se apilan (rejilla `auto-fit` de 260 px) |
| 6 | «LA TUBERÍA DEL AGUA, HOY» | el bloque va a todo el ancho, debajo de la cabecera y antes de «Ver planes de acción» y de la franja «No arrancar»; las frases del colchón y la lista del orden de cierre se parten en dos renglones, y «ENTRA / CABEN / TANQUE» siguen en filas de rótulo y cifra (6B.1, fila 33; 6D.2) |

Otros pliegues del detalle en el teléfono: en «SALUD POR PARTE» (ingeniería) la historia de cada parte («5 fallas · 26.344 bbl») no se ve (`hidden sm:block`, `BloqueParte.tsx:43`); «ORDEN DE CIERRE» se desplaza a lo ancho dentro de su caja (`desplazable`, ancho mínimo 360 px); los paneles «PARTES QUE AVISAN» y «FUERA DE BANDA» se apilan.

## Turno

![Turno · supervisor · teléfono](../img/sup-turno-telefono.png)

| # | Lo que se ve | Qué cambia |
|---|---|---|
| 1 | **983** bbl · «se pierden · turno que entra» | las cuatro cifras en una rejilla de **2 × 2**; debajo de «3 por identificar», «2 sin arrancar ·» y «1 arrancó sin identificar» se parten en dos renglones (6B.5, filas 5-6 y 30); «3 pozos parados · ◆ P-201B» queda en un renglón (fila 36) |
| 2 | **723** bbl · «diferidos · 12 h» | — |
| 3 | «2 · Pasando ahora» | los tres paneles («2 · Pasando ahora», «2 · Identificar», «1 · Vigilar») se **apilan** en vez de ir lado a lado; en «Pasando ahora» el chip «en la planta» y «dónde: sin identificar todavía» caben junto al de la causa |
| 4 | «03:53 parado → 03:53 pregunta → 04:22 recordatorio → 05:44 pozos cerrándose → 05:52 escalado» | el hilo de WhatsApp parte la cadena en dos renglones; el chip «parte por identificar» de «PARADAS NUEVAS» baja debajo de «2 pozos cerrados por P-201B · 05:43–05:46» |
| 5 | «◄ limita · los pozos · 11.857 bbl/d» | «Qué limita hoy al campo» y «Lo más frágil» pasan a **un bloque por pregunta**: el rótulo arriba y la respuesta debajo, en vez de dos columnas (`sm:grid-cols-[10.5rem_minmax(0,1fr)]`, `HoyLimita.tsx:45`); la frase de hoy y su ⓘ bajan del chip (6B.5, filas 31-32) |
| 6 | «CIERRE DE HOY · PARADAS POR CONFIRMAR» | un solo bloque a todo el ancho: la línea «4 paradas hoy · 0 completas · faltan 4…», el lote («Confirmar las 2», «Ver una por una») y las paradas sin causa («Responder en Identificar»), cada cosa en su renglón (6B.5, fila 33; 6D.6) |

![Turno · operador · teléfono](../img/oper-turno-telefono.png)

| # | Lo que se ve | Qué cambia |
|---|---|---|
| 1 | **983** bbl | idéntico al supervisor, sin el botón de exportar |
| 2 | «CIERRE DE HOY · PARADAS POR CONFIRMAR» | arriba, justo después de las cuatro cifras: el operador no ve «Qué limita hoy al campo» ni «Lo más frágil» (6B.5, «Operador») |
| 3 | «Lo confirma supervisión o producción, que firman el día.» | donde el supervisor tiene «Confirmar las 2»; el botón «Ver una por una» sigue debajo |

## La ficha de P-201B

![Ficha de P-201B · supervisor · teléfono](../img/sup-bombas-ficha-P-201B-telefono.png)

| # | Lo que se ve | Qué cambia |
|---|---|---|
| 1 | «No arrancar hasta identificar qué se dañó.» + «Identificar» | primera cosa de la ficha, a todo el ancho |
| 2 | «SAP · MANTENIMIENTO · equipo 10759915 · CO-CEI-BAT1-AGU-P-201B» | el título se parte y su ⓘ queda **sola en el renglón siguiente** (`BloqueSap.tsx:68-71`; está al lado del título, nunca dentro) |
| 3 | «Sin aviso ni orden abiertos» + chip «parado, SAP no lo sabe» | el chip baja debajo de la frase; «Enviar aviso a SAP» a la derecha |
| 4 | «FUERA DE BANDA · 3 DE 8» | igual; las filas de dispositivos sin minigráfica (en operación no se dibuja en ningún ancho) |
| 5 | «LA TUBERÍA DEL AGUA, HOY» | el bloque ocupa todo el ancho de la ficha, entre los chips y «Diferido · octubre, en curso»; es el que reemplaza a la `lectura` fija de la bomba parada (6B.4, fila 7). En la ficha del operador es el mismo |

![Ficha de P-201B · operador · teléfono](../img/oper-bombas-ficha-P-201B-telefono.png)

| # | Lo que se ve | Qué cambia |
|---|---|---|
| 1 | «P1 · ALARMA» | la cabecera de la ficha **no tiene el botón de exportar** (el operador no puede); quedan expandir y cerrar, y el nombre del equipo cabe en un renglón |
| 2 | «No arrancar hasta identificar qué se dañó.» | igual que el supervisor |

## Lo que no cambia

Las mismas cifras, los mismos textos según el valor, las mismas marcas ISA-101 y las mismas reglas de «ver N más» (ninguna fila de prioridad 1 se esconde). Lo que en el teléfono se esconde por espacio (la columna del medio de las paradas, la historia de cada parte) sigue en el detalle abierto o en el papel.
