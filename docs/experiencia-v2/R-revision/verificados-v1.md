# Verificación adversarial · V1 (texto, UI y producto)

**26-oct-2026 · V1.** Fase 3 de `PROMPT-REVISION-UX.md`. Lo que entró:
- de R2: `hallazgos-ui.md`, `hallazgos-producto.md` y `roles/*.md`;
- de R1: `hallazgos-texto.md`, `glosario.md` y `medicion.md`.

No se tocó `src/`, `e2e/` ni `scripts/`.

## Cómo se verificó

- **El entorno.** Vite propio en 5185 (`main`, 5aaa7f2) y Playwright de `node_modules`, con la introducción saltada. Los guiones quedaron en el scratchpad de la sesión; no son entregables. Las capturas propias que sirven de evidencia están en `capturas/v1/`.
- **Por cada hallazgo, cuatro preguntas:**
  1. ¿Se reproduce? En pantalla, con medición en el DOM, o en el código.
  2. ¿Choca con lo que manda? Las palabras del dueño, las imágenes (con su HTML y CSS en `imagenes/fuente/`), X5, X4 y X2.
  3. ¿Arreglarlo rompe una función o una prueba?
  4. ¿Pide un dato que el motor no tiene?
- **Las imágenes mandan sobre X5.** Es el orden de §1 del prompt. Donde X5 y la imagen no coinciden, gana la imagen. Pasa con el radio de 18 px de las tarjetas del teléfono (imágenes 2 y 3b) y con la separación de 14 px en Hoy (imagen 3a).
- **Las decisiones del coordinador, aplicadas:**
  - D-1: la meta de palabras se mide a 390 px, y lo que pide salirse de la imagen se refuta;
  - D-2: «Si falla hoy» va en bbl/d;
  - D-3: las e2e de títulos en MAYÚSCULAS las ajusta F4;
  - los datos que faltan para reg y adm se derivan en el motor.
- **Quién verificó qué.** Los 46 hallazgos de R2 los verificó V1 directamente. Los 79 de R1, una segunda instancia de V1, con el mismo método y el mismo Vite (su método va en la sección «Texto»). Los choques entre R1 y R2 los resolvió V1 (§3).

## Resumen

| Entrada | Revisados | S1 | S2 | S3 | Refutados | Duplicados |
|---|---|---|---|---|---|---|
| R2 · UI y producto | 46 | 5 | 19 | 21 | 1 | — |
| R1 · texto | 79 | 4 | 20 | 27 | 13 | 15 (cuentan en R2) |
| **Total** | **125** | **9** | **39** | **48** | **14** | 15 |

- **Los S1 finales:**
  - P-01: producción abre en la vista del gerente;
  - P-02: confiabilidad abre en filtros;
  - P-03: regulatorio no ve qué falta;
  - P-04: el administrador abre en un formulario;
  - P-05: en Turno, lo proyectado es la cifra grande;
  - T-8 (con G-1): lo diferido dicho como pérdida;
  - G-15: «Avisan 3» contra «Equipos que avisan 1»;
  - G-16: «Si falla hoy» en dos unidades.
- **Lo que se refutó entero:**
  - UI-24: con el almacenamiento bloqueado, el tema oscuro sí se respeta;
  - 13 de R1, casi todos porque piden quitar texto que trae la imagen aprobada (D-1).
- **Lo que se refutó en parte** (y quedó «con otro arreglo»):
  - UI-08: Planta y Agua leen el período; el nivel 3 es «la ficha»;
  - UI-11: la separación de Hoy y el radio del teléfono son los de las imágenes;
  - UI-13: plegar el panel solo en el nivel 3;
  - P-07: las combinaciones «parte + lo que vio», que el motor no tiene;
  - P-08: cambiar «Registrado», que es el texto de la imagen 5;
  - P-12: el contorno discontinuo, que la imagen 1 no dibuja.

**Cómo se leen las tablas:**
- la severidad va como «R → V1»;
- «dueño» sigue la fase 4 de `PLAN.md`;
- **`src/app/*` (`pantallas.tsx`, `url.ts`, `grupos.ts`, `store.ts`) y `entities/roles.ts` no tienen dueño en esa tabla.** Fueron de C1, el armazón: aquí se le asignan a F1, y los demás le piden el cambio.

---

## 1. UI y producto (R2)

### S1

| id | veredicto | sev. | evidencia propia | porqué | arreglo final · archivo | dueño |
|---|---|---|---|---|---|---|
| P-01 | CONFIRMADO | S1→S1 | `#/prod/planta-viva/ceiba/curso`, a 1440 y 390: la cifra 1.966, la frase y los botones del gerente. «limita» es solo un rótulo del dibujo. Las cifras de producción (9.394, 11.857 y «le sobran 1.143») ya existen en el motor: las pinta la tubería de antes de Producción | X4 §2 y §3.4: la cifra de prod es «9.394 bbl/d pasan hoy». Prompt §6.1. **No inventa:** las cifras existen. **No choca con las imágenes:** la 1, la 2 y la 6 son del gerente | **Motor** (`entities/planta-viva.ts`): una lente técnica, al menos para prod, con:<br>• «pasan hoy» y su par;<br>• la frase de X4 §3.4;<br>• la capacidad y «le sobran» de cada tramo;<br>• los 3 primeros de «Si falla hoy» (`criticidad`).<br>**Pantalla** (`plantaviva/Heroe.tsx`, `Tuberia.tsx`): la acción de prod («Confirmar las N» o «Ver Hoy») en lugar de «Compartir el informe».<br>**Prueba** (verificar-contrato, C2): la cifra da 9.394 para prod y 1.966 para ger | F2 |
| P-02 | CONFIRMADO CON OTRO ARREGLO | S1→S1 | `#/conf/equipos/ceiba`: ninguna cifra de 32 px o más. P-201A, el primero de «Si falla hoy», está a 1.025 px a 1440 y a 1.874 px a 390, debajo de 15 controles de filtro | X4 §2 y §3.4: la frase «Ataque primero P-201A y P-201C…» y la cifra de 3.059 bbl/d. **No hace falta cambiar el orden de la lista:** X4 §3.6.1 lo da para todos los roles. Con la cabeza basta | **Motor** (`entities/equipos-tecnico.ts`): `inicio` para conf, con:<br>• la cifra (3.059 bbl/d, por D-2);<br>• la frase de `criticidad.ts:373`;<br>• los 3 primeros de «Si falla hoy»;<br>• «¿Dónde va el próximo instrumento?» (P-10).<br>**Pantalla** (`equipos/Lista.tsx`):<br>• la cifra y su frase arriba;<br>• los 3 primeros, en filas con «›»;<br>• el vigía, en su línea;<br>• los filtros, plegados en un desplegable «Filtrar ▾» (no son pestañas).<br>**Prueba e2e:** a 390, la cifra y P-201A se ven sin desplazarse | F3 |
| P-03 | CONFIRMADO | S1→S1 | `#/reg/regulatorio/ceiba/curso`: «No se puede publicar todavía · El período incluye días sin cierre publicado», sin cifra. Lo que falta está dentro del árbol (captura) | X4 §2 y §3.4: «2 paradas sin causa (355 bbl)», con quién y la hora límite. Los códigos de la ANH sí van en Regulatorio (prompt §4.4), pero no en el inicio | **Motor** (decisión del coordinador): derivar de `anh-calidad.ts` y `anh-paradas.ts`:<br>• las paradas del período sin N1/N2 confirmado;<br>• sus bbl;<br>• el rol del paso que falta;<br>• la hora límite, de `limiteReporte` (`entities/hoy.ts`).<br>**Pantalla** (`pages/Regulatorio.tsx`): la cifra y su frase, una fila por parada con «›» y el árbol debajo.<br>**Prueba:** La Ceiba da 2 paradas y 355 bbl | F2 |
| P-04 | CONFIRMADO | S1→S1 | `#/adm/configuracion/ceiba/curso`: el título, el período, Exportar, 4 pestañas y «PERFIL DEL CAMPO» con un `<select>`. No hay «N de M», ni el siguiente paso | X4 §2, §3.2 («abre en Estado») y §3.6.8 | **Motor** (decisión del coordinador): `estadoConfiguracion(campo)`, derivado de `choke-config.ts` (`pendientesDe`, `faltanParaFirmar`) y de la configuración firmada.<br>**Pantalla:** «Estado», la primera subpantalla de Configurar (`pantallas.tsx` y el `inicio` de `roles.ts`), con «N de M pasos», la frase y una fila por paso con «›» a su editor.<br>**Prueba:** el motor da «N de M» para La Ceiba, y la cuenta cambia al firmar | F3 (motor y vista) y F1 (registro) |
| P-05 | CONFIRMADO | S1→S1 | `#/sup/turno/ceiba/curso`, a 1440 y 390: la única cifra grande (36 px) es «983 bbl se dejarían de producir · turno que entra si nada cambia». Va arriba y antes de lo medido (1.966), sin «proyectado» ni trazo discontinuo (captura) | Regla 5 del prompt, que no se rompe; X5 §2.5; X4 §3.7 (las 4 cifras de Turno desaparecen como bloque). **Quitarlas no pierde nada:**<br>• 1.966 está en Hoy;<br>• los 3 por identificar, en sus tarjetas;<br>• los 723, en «Diferido de su turno» | **Pantalla** (`pages/Turno.tsx`): quitar el bloque de 4 cifras. Si la proyección se queda, va en una línea chica y discontinua, debajo de lo medido: «≈ 983 bbl en el turno que entra si nada cambia · proyectado».<br>**Prueba e2e:** en Turno, ninguna cifra proyectada es la más grande | F1 |

### S2

| id | veredicto | sev. | evidencia propia | porqué | arreglo final · archivo | dueño |
|---|---|---|---|---|---|---|
| UI-01 | CONFIRMADO | S2→S2 (es regla del dueño: no admite porqué) | `role="tablist"` en `Configuracion.tsx:106`: 4 pestañas al adm, 3 a prod y conf, 2 al ger | El dueño: «ninguna barra de pestañas horizontal». X5 §4.1 | **Cada parte, una subpantalla** con su dirección: `configuracion` (la técnica), `filosofia`, `metas`, `accesos`, `conectores` y el «Estado» de P-04. Se listan en el panel, debajo de Configurar.<br>**Quien la abre desde el menú de la persona** ve una entrada por parte. El gerente, por ejemplo, «Metas de los campos» y «Usuarios y accesos».<br>**Un título por parte** (I-adm-3).<br>**Se quita el `tablist`.** La regla del auditor: ningún `[role=tablist]` | F3 (`Configuracion.tsx`), F1 (`pantallas.tsx`, `MenuPerfil`, `url.ts`) y F4 |
| UI-02 | CONFIRMADO | S2→S2 | **A 390:** se abre ☰ y se toca en (375, 500): el panel sigue abierto. `elementFromPoint` da el contenedor; el velo está `inert`.<br>**A 1440:** con la hoja del tramo abierta, un clic en (300, 450) no la cierra.<br>Con Escape sí se cierran (capturas) | `foco.ts` (`aislar`) marca `inert` al velo, que es hermano del diálogo. X5 §4.2 pide cerrar tocando afuera | `shared/ui/foco.ts`: no marcar inerte al hermano que lleve `data-velo`. Ponerle `data-velo` al velo de:<br>• `App.tsx` (`PanelTelefono`);<br>• `HojaInferior.tsx`;<br>• `plantaviva/HojaTramo.tsx`.<br>**Prueba e2e:** a 390, tocar afuera cierra el panel; a 1440, un clic afuera cierra la hoja | F1 (F2 pone el atributo en `HojaTramo`) |
| UI-03 | CONFIRMADO | S2→S2 | `#/conf/equipos/ceiba/P-201B/diagnostico` a 390, en claro y en oscuro: `.vista` se sale 27 px. «18,2 psi» y «0 bbl/d» quedan cortados (captura) | Un valor cortado es un dato que no se lee | `widgets/PanelEquipo.tsx` (`Instrumentos`), por debajo de 640 px:<br>• la minitendencia en su renglón;<br>• `min-w-0`;<br>• el tag y el nombre en un renglón (P-nivel4-1: MPP-301 se sale 107 px).<br>**Prueba e2e:** a 390 y 320, `scrollWidth <= clientWidth` | F3 |
| UI-04 | CONFIRMADO | S2→S2 | Medido en 14 rutas:<br>• **10 px entre tarjetas** en Riesgo, Producción, Agua, Configuración, Turno y Diferidos;<br>• **MAYÚSCULAS** en Configuración (12 títulos), Planta, Mantenimiento, Bombas y Regulatorio;<br>• **`font-mono`** en los tags de Agua, Planta y Configuración;<br>• **`Panel`** a 13 px en `--tinta2` (`primitivas.tsx:31`) | El dueño: «todo se ve como B». X5 §3.4, §3.5 y §5.2 | Como R2:<br>• **`Panel`** a 15–16 px Semibold, en tinta. Con eso cambian sus 125 usos;<br>• **cada pantalla:** `Tarjeta`, la rejilla `gap-3 sm:gap-4`, sin `font-mono`, `Chip` y los títulos en frase;<br>• **F4** cambia las aserciones en MAYÚSCULAS de `rutas.ts` (D-3) | F1 (`primitivas`), F2 y F3 (sus pantallas) y F4 |
| UI-05 | CONFIRMADO | S2→S2 | **Las opciones** (`OPCION`, `arbol/Preguntas.tsx:11`) son `rounded-sm` y `sm:min-h-8`, a 13 px.<br>**«No arrancar» de Causa** (`Causa.tsx:160`) va sin el borde de 2 px y sin ⊘ | La misma acción, con dos formas (prompt §6.7). X5 §5.6 y §5.8 | En Causa:<br>• las opciones de `widgets/hoy/Pregunta.tsx`;<br>• el `Bloqueo` de `widgets/hoy/piezas.tsx` | F1 |
| UI-06 | CONFIRMADO | S2→S2 | En `pantallas.tsx`:<br>• `diferidos` y `confiabilidad` llevan el mismo ícono, `Activity`;<br>• `configuracion` y `filosofia`, `SlidersHorizontal`.<br>Plegado, las subpantallas van sin palabra | Prompt §5: en la navegación, el ícono va siempre con su palabra | **Íconos distintos** (`pantallas.tsx`).<br>**Plegado** (`Riel.tsx`): el nombre corto bajo cada ícono, a 12 px, en hasta 2 renglones | F1 |
| UI-07 | CONFIRMADO | S2→S2 | **En el nivel 4** de P-201B, FI-2011, II-2011 y PDI-2011 llevan «Prioridad 1 · alarma» y su minitendencia acaba en una punta naranja.<br>**En el nivel 3**, las 8 señales van en gris y sin marca | X2 E3 y B9; X5 §6.4; la imagen 4 | `PanelEquipo.tsx` (`Instrumentos`) y `Sparkline.tsx`: con el equipo parado, ni marca por señal ni punto de color. Es la condición que ya usa `equipos/Senales.tsx`.<br>Pasa a V2 para la tabla de las 44 | F3 |
| UI-20 | CONFIRMADO CON OTRO ARREGLO (junto con P-11 e I-sup-4) | S3→**S2** | Después de «Confirmar las 2», a 390, en claro y en oscuro, el bloqueo dice «Plan simulado: volver antes de 39 h (2.072 bbl), y 2 planes más ›» (`hoy/piezas.tsx:39`). Ni la imagen 3a ni la 3b llevan esa línea | Lo simulado, dentro de una advertencia (regla 5; X5 §5.6). **Sube a S2:** es la regla de lo simulado, no un pulido | **Motor** (`entities/hoy.ts:674`): los planes nunca van en el bloqueo ni en una tarjeta de confirmar. Van en su propia tarjeta, «Decidir N planes · simulado ›» (la variante que C3 ya tiene), que abre la ficha de P-201B. Eso arregla también P-11.<br>**Pantalla** (`piezas.tsx`): deja de pintar `b.planes`.<br>**Prueba** (verificar-contrato, C3): el bloqueo no trae planes | F1 |
| P-06 | CONFIRMADO CON OTRO ARREGLO | S2→S2 | «Entregar turno», a 390 y 1440, abre `#/sup/turno/…`. No arma el resumen ni entrega nada | La imagen 3a; X4 §3.6.3 y §5.5. **La escritura con firma** (`POST /api/turnos/entrega`) es backend nuevo: no se crea sin un contrato | **Ya:**<br>• un motor `entregaDeTurno(rol, campo)` en `entities/hoy.ts`, con lo que paró, lo pendiente, lo confirmado y el WhatsApp de 12 h (todo eso existe);<br>• una hoja (`HojaInferior`) con el resumen y «Compartir en PDF» (`useExportar`).<br>**Después:** la firma y la escritura, cuando el coordinador apruebe el contrato.<br>Hasta entonces, Turno conserva su Exportar (UI-08) | F1 |
| P-07 | CONFIRMADO CON OTRO ARREGLO | S2→S2 | El operador, a 390: «Sello mecánico» abre «¿qué vio?», y el registro sale al segundo toque (captura). En la imagen 5, la opción lleva un círculo, no «›» | **La imagen 5 manda** («contestar es un toque») sobre la decisión de C3.<br>**Se refuta lo que propone R2:** combinaciones «parte + lo que se vio» sacadas del historial. El historial guarda la primera alarma, no el modo: serían inventadas | **Motor** (`entities/hoy.ts`): la parte se registra con un toque, y «¿Qué vio en el sello?» entra como la pregunta siguiente, con «Todavía no sé». El libro sigue recibiendo la parte y el modo (ISO 14224).<br>**Los nombres:**<br>• «Responder yo» se queda para quien contesta por otro (X4 §6.1.13);<br>• para la pregunta propia, el título «Diga qué se dañó» (imagen 4) y el verbo «Contestar»;<br>• salen «Registrar respuesta» y «Registrar qué encontré».<br>**Prueba e2e:** a 390, un toque da «Registrado…» y «Pregunta 2 de N» | F1 (F3, el botón de `Nivel3`) |
| P-08 | CONFIRMADO CON OTRO ARREGLO | S2→S2 | `widgets/hoy/envio.ts:51,69`: escribe a los 5 s, en `pagehide` o al desmontar. No hay ni un `keepalive` ni un `sendBeacon` en `src/` | **El riesgo es real** con la fuente http.<br>**«Registrado: … · Deshacer» se queda:** es el texto de la imagen 5.<br>**La hora** (5 s después) no cambia nada | En `envio.ts` y `shared/api/escrituras.ts`:<br>• `fetch(…, { keepalive: true })`;<br>• lo pendiente, en `localStorage`, y se reintenta al volver;<br>• el error, en una región `status` que no se va sola.<br>**La escritura inmediata**, con «Deshacer» como `retirado` (la opción b de R2), queda para cuando el motor sepa reabrir una pregunta | F1 |
| P-09 | CONFIRMADO | S2→S2 | P-201B tiene cuatro familias:<br>• «bomba de reinyección», en Turno, el «Por equipo» del gerente y Riesgo;<br>• «bomba de la línea», en Identificar;<br>• «bomba multietapa…», en la ficha ejecutiva;<br>• «bomba de agua», en lo demás | Prompt §6.7. **El subtítulo largo del nivel 3 se queda:** es el de la imagen 4 | **Motor:** un solo `familiaDe(equipo)`, que da «bomba de agua».<br>**Se usa en** `diferidos/Paretos.tsx`, `pages/Riesgo.tsx`, `pages/Turno.tsx`, `pages/Causa.tsx` y `equipo/FichaEjecutiva.tsx`.<br>**Prueba:** el glosario de `verificar-libro` | F2, F1 y F3 (cada uno, sus pantallas) y F4 |
| P-10 | CONFIRMADO | S2→S2 | **«Ver los equipos ›»** del jefe termina en `#/jefe/planta-viva/ceiba/curso`.<br>**«¿Dónde va el próximo instrumento?»** solo está en Riesgo | X4 §3.6.2 y §3.7 | Como R2:<br>• el próximo instrumento va arriba de Equipos de conf (con P-02);<br>• el enlace pasa a «Ver P-201A y P-201C ›», a Equipos con el tren de agua (`palabras.ts`);<br>• después, `riesgo` sale de jefe y conf (`roles.ts`), y `FUSIONADA_EN.riesgo` lleva a `equipos` a los técnicos (`url.ts`);<br>• F4 ajusta `rutas.ts` | F1 (`palabras`, `roles`, `url`), F3 (Equipos) y F4 |
| P-11 | CONFIRMADO | S2→S2 | «…y 2 planes más ›» abre `#/sup/causa/ceiba/curso`, donde no hay planes | Nada sorprende (§6.6) | Con UI-20: en `palabras.ts`, `planes` abre la ficha del equipo del plan | F1 |
| P-12 | CONFIRMADO CON OTRO ARREGLO | S2→S2 | «Pozos · ◄ limita» con doble contorno continuo y sin ⓘ. En el demo, todas las capacidades son «sin firmar» (`choke-reparto.ts:582`) | **X4 §4.10** pide el contorno discontinuo y la ⓘ, pero **la imagen 1, que manda, lo dibuja continuo.**<br>Aun así, el dato tiene que decir su calidad | **Solo la ⓘ** junto a «limita»: «con una capacidad sin firmar». El contorno se queda como en la imagen.<br>**Motor** (`planta-viva.ts`): `tramo.capacidad`, «firmada» o «sin firmar».<br>**Pantalla:** `plantaviva/Tuberia.tsx` | F2 |
| P-13 | CONFIRMADO | S2→S2 | `#/ger/planta-viva/zarza/curso`: «0 barriles por día se dejan de producir. La Zarza produce sin paradas ahora.» Debajo: «La Zarza es un campo de gas: su tubería todavía no está.» | El 0 es de crudo: sus pozos sí se miden. Pero «produce sin paradas» se lee como de todo el campo. X4 §4.10 | `entities/planta-viva.ts`, en un campo de gas:<br>• la cifra dice «de crudo»;<br>• la frase es la de X4 §4.10 («…La tubería del gas todavía no está.»);<br>• nunca dice «produce sin paradas».<br>**Prueba:** la de C2 | F2 |
| P-14 | CONFIRMADO CON OTRO ARREGLO | S2→S2 | A 390: «el agua da para 236 bbl/d más de crudo» (`planta-viva.ts:574`) | Se lee como que sobra. **«El agua no da para más crudo»** (la imagen 2) solo es verdad cuando da 0, y el código ya la usa en ese caso | «el agua solo deja pasar 236 bbl/d más de crudo», la misma redacción de P-planta-2.<br>**Prueba:** la de C2 | F2 |
| P-15 | CONFIRMADO | S2→S2 | Sin `trim.intro.*`, sale un modal con «Lo que usted decide», el párrafo del foco y «Antes · Durante · Después». **De tú:** al operador, «vas»; al supervisor, «cierras» (captura) | X4 §6.2 lo quita. Prompt §2.10: de usted | `widgets/Onboarding.tsx`:<br>• tres señas de una línea sobre el inicio (la tabla de X4 §6.2);<br>• «Siguiente» y «Ya entendí»;<br>• el `foco` de `roles.ts` no se muestra;<br>• de usted | F1 |
| P-16 | CONFIRMADO (resuelve P-planta-1 de R1) | S2→S2 | La tubería de antes está en Producción y en Identificar, con 4 botones y «se pierden 1.966» | X4 §3.6.6 y §3.7: una sola tubería, en el nivel 1 | **Después de P-01:** quitar `widgets/choke/Tuberia.tsx` de `Produccion.tsx`, `Causa.tsx` y `Planta.tsx`. Planta se queda con su esquema (el nivel 2).<br>**«Ver como tabla» y el punto de medición oficial** van a la hoja del tramo y al papel (X4 §3.6) | F2 (F1, en Causa; F3, en Planta) |

### S3

| id | veredicto | sev. | evidencia propia | porqué | arreglo final · archivo | dueño |
|---|---|---|---|---|---|---|
| UI-08 | CONFIRMADO CON OTRO ARREGLO | S3→S3 | **Exportar** en Equipos, Riesgo, Turno, Conectores, Perfil y el nivel 3.<br>**El período**, en Configuración, Filosofía, Planta, Agua y otras | **Se refuta en parte:**<br>• Planta y Agua leen el período (`useRango` en `Planta.tsx:114` y `Agua.tsx:15`); quitarlo rompe lo que muestran del período;<br>• el nivel 3 es «la ficha» (X4 §3.5);<br>• Turno es hoy la única forma de sacar la entrega en PDF (P-06) | `pantallas.tsx`:<br>• `sinExportar` en `equipos`, `riesgo`, `conectores` y `perfil`;<br>• `ahora` en `configuracion` y `filosofia`.<br>**Turno** conserva Exportar hasta P-06; **Planta y Agua**, el período hasta fundirse.<br>**Exportar** con su palabra también en el teléfono (`informe/Exportar.tsx` y el de `equipos/Nivel3.tsx`) | F1 (F3, en `Nivel3`) |
| UI-09 | CONFIRMADO CON OTRO ARREGLO | S3→S3 | `piezas.tsx:72`: `bg-[#15171a]` sobre el suelo de noche, `#1a1d21` | Paridad de tema | **Tokens** en `index.css`: `--aviso: var(--tinta)` y `--aviso-sobre: var(--suelo)`. En noche queda claro sobre oscuro, como el botón principal de la imagen 6.<br>**«Deshacer»:** `--marca-tenue` en papel y `--marca` en noche | F1 |
| UI-10 | CONFIRMADO | S3→S3 | **Hex sueltos** en `Momentos.tsx:32` y `equipos/piezas.tsx:37`.<br>**El avatar**, en `bg-marca-1` (`Perfil.tsx:73`).<br>**Las casillas**, nativas y sin `accent-color`.<br>**Tres velos:** `bg-black/35` (`PanelEquipo.tsx:109,384`), `/.40` y `/.45` (`Onboarding.tsx:69`) | Prompt §5: tokens | Como R2:<br>• `accent-color: var(--primario)`;<br>• el token `--velo`;<br>• el lema activo, con su token;<br>• el avatar, en `--marca` | F1 (F2, en `Momentos`; F3, en `piezas`, `Perfil` y `PanelEquipo`) |
| UI-11 | CONFIRMADO CON OTRO ARREGLO (refutado en parte) | S3→S3 | Medido:<br>• Hoy: 14 entre tarjetas y 18/24 de relleno;<br>• el héroe del teléfono: radio 18;<br>• el nivel 3 a 390: 16 entre tarjetas;<br>• la lista de Equipos: 12/24/8/24;<br>• Resultados: 16 y 20 (no 17) | **Se refuta lo que trae la imagen:**<br>• la 3a usa `gap:14px` y `.tarea{padding:18px 24px}`;<br>• la 2 y la 3b usan `.t-heroe{border-radius:18px}`.<br>**Resultados no se reproduce:** 20 entre columnas es el valor de la 3a | **Solo:**<br>• el nivel 3, a 390, con 12 entre tarjetas (`equipos/Nivel3.tsx`);<br>• la lista de Equipos, con `pt-5 pb-4` (`equipos/Lista.tsx`) | F3 |
| UI-12 | CONFIRMADO | S3→S3 | A 1440 × 900, «Aviso · producción por día…» y «¿Está bajando?» quedan cortados abajo. La imagen 1 cabe entera (captura) | X5 §8.1 N1 | **La pérdida, a la leyenda** de la tubería (I-ger-3, `plantaviva/Tuberia.tsx`; X5 §5.10).<br>**La marca DEMO**, sin agrandar el renglón de las migas (`Cabecera.tsx`, UI-22) | F2 y F1 |
| UI-13 | CONFIRMADO CON OTRO ARREGLO | S3→S3 | **A 1440:** DEMO en un renglón propio; la descripción y los nombres de señal en dos renglones; «normal 66.800 – / 89.250» partido.<br>**A 390:** el ◆1 solo en su renglón, y «Crear aviso en SAP» antes de «Diga qué se dañó» (capturas) | **Se refuta plegar el panel solo en el nivel 3:** X5 §4.1 lo recuerda por persona, y nada sorprende | `equipos/Nivel3.tsx`:<br>• la marca y su palabra, en `inline-flex` sin salto;<br>• en el teléfono, el botón principal primero;<br>• DEMO al lado de las migas;<br>• los rangos sin partir | F3 |
| UI-14 | CONFIRMADO | S3→S3 | `Gerente.tsx` usa `Paretos`, el widget de antes | La imagen 1 dibuja «Diferido por equipo», sin punto en SE-2 | En `equipos/Gerente.tsx`:<br>• las filas de `plantaviva/Lateral.tsx`;<br>• el párrafo suelto, a la ⓘ | F3 |
| UI-15 | CONFIRMADO | S3→S3 | **Letra condensada** en «SIN INSTRUMENTO», «2 bombas», «PARADA», «casi iguales», «bbl · el diferido del libro» y «de lo que más le quita…».<br>**Cifras** de 36 px (Turno y Mantenimiento) y de 40 px (Diferidos) | X5 §3.4 | Como R2 | F1 (Turno), F2 (Diferidos, Mantenimiento, Riesgo y Agua) y F3 (Bombas, nivel 4 y Configuración) |
| UI-16 | CONFIRMADO CON OTRO ARREGLO | S3→S3 | `configuracion/marcas.tsx:33`: un `<text fontSize=8.4>` dentro de una marca de 12 px. Sale a ≈ 7,2 px | Es parte de un símbolo, pero la excepción de X5 §3.4 vale solo para los números de prioridad, y el auditor nuevo la va a marcar | Dibujar el «?» con un trazo (`<path>`), no con `<text>`. La palabra «propuesta de TRIM» se queda | F3 |
| UI-17 | CONFIRMADO CON OTRO ARREGLO | S3→S3 | **Regulatorio:** la calibración va con `truncate` (`Regulatorio.tsx:87`).<br>**Configuración, a 390:** «Morichal Norte», cortado | X4 §3.6 y §3.7: las calibraciones van detrás de «ver más» (Medición oficial) y al papel | **Regulatorio:** «Medición oficial» detrás de «ver más», y ahí en dos renglones.<br>**Configuración:** el nombre del campo, sin cortar | F2 y F3 |
| UI-18 | CONFIRMADO CON OTRO ARREGLO | S3→S3 | A 390: la franja, 30 px; ☰, 40 px (`size-10`); y lo demás que lista R2 | Subirlos a `min-h-11` cambia el dibujo de las imágenes 2, 3b y 5 | **Un área de toque invisible** de 44 × 44 (`::after`), sin cambiar el tamaño que se ve.<br>En `Franja.tsx`, `Riel.tsx`, `App.tsx`, `Cabecera.tsx` y `plantaviva/Momentos.tsx`.<br>Cruza con V2 (WCAG 2.5.8) | F1 (F2, en `Momentos`) |
| UI-19 | CONFIRMADO | S3→S3 | En la captura de R2:<br>• 4 botones en «La tubería del campo»;<br>• 6 «Ubicar» en Planta;<br>• «Aplicar las 3» y 3 «Asociar» en Conectores | Prompt §4; X5 §5.2 (filas con «›») | **La tubería de antes** sale con P-16.<br>**Planta y Conectores:** filas `Fila` con «›» y una sola acción principal por tarjeta | F2 y F3 |
| UI-21 | CONFIRMADO | S3→S3 | A 390, la banda lleva el campo y la persona, y «Pregunta 1 de 4» va en otro renglón. La imagen 5 lo pone en la banda (captura) | La imagen 5; X5 §5.8 | Como R2:<br>• `App.tsx` (`BandaTelefono`) muestra el paso cuando la vista es `[data-operador="pregunta"]`;<br>• `hoy/Operador.tsx` deja de pintar `[data-paso]` | F1 |
| UI-22 | CONFIRMADO | S3→S3 | «DATOS DE DEMOSTRACIÓN», en MAYÚSCULAS espaciadas (`Cabecera.tsx:120`) | X5 §3.4. **Se queda en la cabecera**, contra T-3: la pide la e2e, y una captura suelta tiene que decir que es demo | **«Datos de demostración»**, a 13 px, sin tracking y en la línea de las migas.<br>**F4** ajusta `carril.spec.ts:35`. `interfaz.spec.ts:244` es el papel: no cambia | F1 y F4 |
| UI-23 | CONFIRMADO (= T-5) | S3→S3 | «Hoy › Hoy», «La planta viva › La planta viva»… | Prompt §4.8 | `Riel.tsx`: la lista empieza en la segunda subpantalla, y la puerta abre la primera | F1 |
| P-17 | CONFIRMADO | S3→S3 | `#/plan/hoy/ceiba/curso` abre `#/prod/hoy/…`, sin `[data-aviso-campo]` | Prompt §6.9 | `url.ts` (`leerHash`): un aviso como el del campo ajeno | F1 |
| P-18 | CONFIRMADO | S3→S3 | `#/ger/planta/ceiba~portafolio/antes` abre en Durante. Al tocar «Antes», la dirección no cambia | X4 §3.8 | **`url.ts`:** lee y escribe `antes`, `ahora` o `despues`.<br>**`Momentos.tsx`:** lo toma del estado | F1 y F2 |
| P-19 | CONFIRMADO | S3→S3 | En la hoja de «Planta»: «└ proceso / facilidades · parada estación/bombeo afecta pozos · 573 bbl» | X4 §4.5, punto 3 | `planta-viva.ts` (`arbolDelChoke`): una tabla de palabras de campo para el gerente, con su prueba | F2 |
| P-20 | CONFIRMADO | S3→S3 | No hay ninguna cadena «planes en marcha» en `src/` | X4 §3.7 | **Motor:** lee `sesion.planes`.<br>**Pantalla:** una línea en `plantaviva/Lateral.tsx`.<br>**Prueba:** aceptar un plan sube la cuenta | F2 |
| P-21 | CONFIRMADO | S3→S3 | Con grep:<br>• `pages/Resumen.tsx` solo aparece en `pantallas.tsx`;<br>• `Portafolio`, `riesgo/Ahora` y `resumen/enAlarma` solo se usan entre ellos;<br>• `ResumenDirectivo`, en Resumen y en Diferidos;<br>• `palabras.ts:27` usa `'resumen'` | — | **Borrar, con cuidado.** Primero F4, porque `verificar-libro.mjs` lee esos archivos (líneas 2188 a 2191 y 3622). Después, el código y las ramas `decision` | F2, F1 (`pantallas` y `palabras`) y F4 |
| P-22 | CONFIRMADO | S3→S3 | `scripts/pantallazos.mjs:21-34`: las rutas viejas del gerente, sin `reg` y sin las pantallas nuevas | — | Como R2 | F4 |

### Refutados

| id | veredicto | sev. R2 | evidencia propia | porqué |
|---|---|---|---|---|
| UI-24 | REFUTADO | S3 | Con un `localStorage` que lanza error y el sistema en oscuro, la página queda con `data-theme="dark"` y el fondo `#1a1d21` (captura `ui-24-sin-storage-oscuro-1440.png`) | **El tema sí se respeta:** `store.ts` (`leerTema` da `'system'`; `iniciarApp` llama `aplicarTema`) estampa el tema del sistema al arrancar.<br>**Queda solo un destello claro** antes de que cargue el JS. Si se quiere quitar: en `index.html`, `matchMedia` antes del `try` (opcional, F1) |

---

## 2. Texto (R1)

**Cómo se verificó.** Vite propio en 5185 (`main`, 5aaa7f2), Playwright de `node_modules`, introducción saltada. Se volcó el texto visible de 37 rutas (1440 y 390) y se comparó palabra por palabra con el texto de las imágenes aprobadas (`imagenes/fuente/*.html` y `tuberia.js`), con X4 §3.4, §4.4, §4.10 y §6.1, con X5 §5 y con el código que arma cada frase. Guiones y textos en el scratchpad (`v1t/dump.cjs`, `v1t/txt/`, `v1t/num.cjs`, `v1t/lineas.cjs`).

**Decisiones del coordinador que se aplicaron:**
- D-1: manda la imagen. Todo lo que pide quitar o cambiar texto que está en la imagen 1, 2, 3a, 3b o 5 para bajar palabras se refuta. La franja y la fecha y hora no cuentan en las 5 cifras del teléfono.
- D-2: «Si falla hoy», siempre en bbl/d. El costo por falla, en bbl y con otro nombre.
- D-3: los títulos en MAYÚSCULAS pasan a frase. F4 ajusta las e2e sin probar menos.
- Los datos que faltan para reg y adm se derivan en el motor, con su prueba (F2 y F3).

**`medicion.md` se reproduce.** Mi cuenta de palabras sin desplazarse:
- sup a 390: 122 (R1: 117);
- ger a 1440: 318 (309);
- ger a 390: 102 (97);
- conf a 390: 112 (108).

La diferencia es siempre el número de las marcas de prioridad, que R1 no cuenta a propósito. El claro y el oscuro miden igual. **`glosario.md`**: lo que se probó (G-1, G-5 a G-8, G-13, G-15 y G-16) está en pantalla tal como lo dice.

**Dueños** (los mismos de §1; además, para esta sección):
- **F1:** además de lo suyo, `src/app/*`, `roles.ts`, `url.ts`, `pantallas.tsx` y `shared/ui/costoHoy.ts`. Turno, Trabajo, Causa y `widgets/arbol` también son de F1.
- **F2:** `widgets/choke/*` (la tubería de antes, Agua y AguaHoy), `entities/choke-agua.ts` y las frases de `entities/criticidad.ts`, que pinta Riesgo. F3 vuelve a correr sus e2e de Equipos, porque las usa.
- **F3:** la página Agua y la página Planta solo montan los widgets de F2.

---

### Texto · S1

| id | veredicto | sev. final (R1→V1) | evidencia propia | porqué | arreglo final · archivo | dueño |
|---|---|---|---|---|---|---|
| T-8 | CONFIRMADO | S1→S1 | En el código y en pantalla están todas las líneas que cita (`criticidad.ts:176,177,212,221,259,261,293`; `choke-agua.ts:344,347`; `Agua.tsx:319,338`; `AguaHoy.tsx:71`; `Tuberia.tsx:505`; `Placa.tsx:169,172`; `FichaEjecutiva.tsx:113`; `Detalle.tsx:293`). **R1 dejó por fuera cinco:**<br>• `plantaviva/HojaTramo.tsx:43`, «Ningún equipo de este tramo **pierde**…», en la hoja del gerente;<br>• `bombas/Detalle.tsx:265`, en una ⓘ: «Se pierden N bbl/d mientras siga parada»;<br>• `QUE_ES_EL_CHOKE` (`ArbolCircular.tsx:17`) y `EXPLICA_MODELO_CHOKE` (`Filosofia.tsx:16`): «dónde se pierde producción»;<br>• `AYUDA_ACUATOSOS` (`Agua.tsx:27` y `AguaHoy.tsx:11`): «los que menos crudo pierden» | Rompe la regla 3, que no se rompe, y X4 §6.1.5. Llama pérdida a lo diferido: dice lo que no es | Cada frase, a «se deja(n) de producir», «deja de producir» o «no pasa», con la cuenta y las palabras de R1, más las cinco que faltaban. La prueba cambia con la frase en `verificar-libro` (sin probar menos), y `choke-gerente-riesgo` se ajusta | F2 (criticidad, choke-agua, `choke/*`, HojaTramo, ArbolCircular), F3 (Placa, Detalle, FichaEjecutiva, Filosofía) y F4 (e2e) |
| G-1 | CONFIRMADO (es parte de T-8) | S1→S1 | En Planta y en Producción, a 1440: «Se deja de producir ahora 1.966 bbl/d» y, en la línea de abajo, «…se pierden 1.966…» | La misma cifra con dos verbos, y uno es el de la pérdida | Va con T-8, en `choke/Tuberia.tsx:505`. Si P-16 saca la tubería de antes, la línea se va con ella | F2 |
| G-15 | CONFIRMADO CON OTRO ARREGLO | S1→S1 | En La Ceiba, el filtro «Avisan · 3» de Equipos (K-101, TK-102, H-302) y «Equipos que avisan · 1» de Riesgo (K-101). Mantenimiento dice «1 equipo avisando» | La misma palabra cuenta otra cosa: una cifra que no cuadra. **X4 §3.7 manda «En riesgo» de Riesgo al filtro «avisan»**: el que se sale es el filtro | El filtro «Avisan» cuenta lo mismo que `NOMBRE_CIFRA` («Equipos que avisan»): 1 en La Ceiba. TK-102 y H-302 se siguen alcanzando desde la franja. No hace falta otro nombre. Mantenimiento dice «1 equipo avisa». La prueba en el glosario: el filtro es igual a `cifrasDeUnNombre` | F3 (`equipos-tecnico.ts:70` y el conteo), F2 (Mantenimiento) y F4 (glosario) |
| G-16 | CONFIRMADO CON OTRO ARREGLO (D-2) | S1→S1 | Hoy conviven:<br>• `shared/ui/costoHoy.ts:16`, «≈ N bbl si falla hoy»;<br>• Riesgo y Mantenimiento en todos los campos (`rutas.ts:133,145` lo buscan así);<br>• Equipos, Bombas y el nivel 3: «Si falla hoy: 783 bbl/d»;<br>• Bombas: «si se para: … luego se pierden 783 bbl/d», al lado de «Si falla hoy: 783 bbl/d» | El mismo nombre en dos unidades | Por D-2: `costoHoy` dice «≈ N bbl le costaría la falla». «si se para» (Placa) y «SI SE PARA AHORA» (el nivel 3 de conf) pasan a «Si falla hoy». **«Si para, hasta 9.394 bbl/d» de Hoy se queda**: es el texto de las imágenes 3a y 3b. F4 ajusta `rutas.ts` (`'bbl si falla hoy'` y `'bbl/d en juego'`) | F1 (costoHoy), F2 (Riesgo, Mantenimiento), F3 (Placa, Nivel3) y F4 |

### Texto · S2

| id | veredicto | sev. final (R1→V1) | evidencia propia | porqué | arreglo final · archivo | dueño |
|---|---|---|---|---|---|---|
| T-9 | CONFIRMADO, salvo un ejemplo | S2→S2 | Los párrafos de cálculo de Planta, Producción y Agua están en la primera capa (ver P-planta-2 y P-agua-1). **El ejemplo del rango «calculado, entre 889 y 1.203» en La planta viva se refuta**: está en la imagen 1, y X5 §8.1 D1 lo agregó a propósito | X4 §6.1.11; prompt §4 («párrafos, cero») | Es paraguas: el arreglo va en cada P-*. El rango de la cifra se queda donde lo pone la imagen | F2 y F3 |
| G-1b | CONFIRMADO CON OTRO ARREGLO | S2→S2 | En Equipos, «se deja de producir» va en P-201B (1.665) **y también** en LC-16 (869) y LC-07 (796), «cerrado por P-201B». 869 + 796 = 1.665: la lista cuenta dos veces lo mismo. Sumando la columna da 3.631, contra 1.966 del campo | Un nombre, una cifra (`NOMBRE_CIFRA`: lo de un equipo es «por P-201B se dejan de producir»). Además, el reparto no suma su total | En el motor (`equipos-tecnico.ts:278`), la fila de un equipo dice «por ella se dejan de producir». Un pozo cerrado por otro equipo no trae cifra propia: «dentro de los 1.665 de P-201B», en gris. **Prueba:** las cifras propias de la lista suman 1.966 | F3 |
| G-2 | CONFIRMADO (las dos que dicen «se pierden» son T-8) | S2→S2 | `criticidad.ts:221` y `choke-agua.ts:344`, en pantalla | Igual que T-8. Los otros tres nombres valen | Con T-8 | F2 |
| G-5 | CONFIRMADO | S2→S2 | Pozos: «Potencial ahora · 11.360» (`Pozos.tsx:127-128`). Regulatorio: «Potencial (pruebas × factor)». Diferidos: «Potencial 17.987» | Dos nombres para el «Potencial del libro» | «Potencial del libro» en todas, y en el período «Potencial del libro · octubre» | F3 (Pozos) y F2 (Diferidos, Regulatorio, Producción) |
| G-7 | CONFIRMADO CON OTRO ARREGLO | S2→S2 | La planta viva: «producción por día · 10.700» y, en el mismo dibujo, «Sale hoy 9.394». En todos los campos: «Producción por día 40.514» | Dos cifras «por día» contra la misma meta, y una es el promedio. Cambia una palabra de la imagen 1, pero no para bajar palabras: para el glosario | Usar el nombre que ya tiene Resultados: «**Promedio por día**, bajo la meta · 10.700 de 10.900 bbl/d» (`planta-viva.ts:884`) | F2 |
| G-13 | CONFIRMADO CON OTRO ARREGLO | S1→**S2** | La misma cifra con dos nombres: 2.133 se llama «Retorno posible del ciclo» en Resultados (`Tarjetas.tsx:88`) y «Lo que todavía se puede mover · bbl en el ciclo» en La planta viva. En todos los campos, en la **misma vista**, «Lo que todavía se puede mover» nombra 45.233 (la tarjeta) y «…ahora: ≈ 2.102» (la línea) | Dos nombres para lo mismo: es S2 por definición (§3). Es simulado, lleva su chip y no es la cifra que decide | El título de la tarjeta se queda como la imagen 1 («Lo que todavía se puede mover»). El total, «bbl · retorno posible del ciclo» en vez de «bbl en el ciclo» (`Lateral.tsx:32`). La línea «…ahora: ≈ 2.102» se queda: es la imagen 2 y X4 §6.1 | F2 |
| I-sup-4 | CONFIRMADO CON OTRO ARREGLO | S2→S2 | «Plan simulado: volver antes de 39 h (2.072 bbl), y 2 planes más ›» va en «Confirmar 2 paradas iguales» del sup y en «Conseguir la causa» del jefe. No está en las imágenes 3a ni 3b | Lo simulado, metido en una tarjeta que pide confirmar. Se cruza con P-11 (el enlace va mal) y UI-20 (la línea queda dentro del bloqueo) | Se saca de la tarjeta (`hoy.ts:674`). Los planes de P-201B van en su propia tarjeta «Decidir 3 planes · simulado ›», la variante que C3 ya tiene, después de las de barriles, y abren la ficha de P-201B (arregla también P-11 y UI-20). Ninguna función se pierde | F1 |
| I-oper-4 | CONFIRMADO | S2→S2 | A 1440, cada tarjeta del operador dice «Sigue parada: no se arranca hasta decir qué se dañó.» debajo de la franja, que dice lo mismo | Lo repetido (§4, regla 8) | «Sigue parada.» / «Sigue parado.» (`hoy.ts:407-408`) | F1 |
| I-tec-1 | CONFIRMADO (es la misma línea de I-oper-4) | S2→S2 | La misma línea en el Hoy del técnico | Igual | El mismo cambio, una sola vez | F1 |
| I-tec-2 | CONFIRMADO | S2→S2 | La tarjeta de K-101 del técnico tiene 3 oraciones (44 palabras). La imagen 3a pone una línea | X5 §5.7: «por qué importa, en una línea» | «Verificar que las tres unidades estén en servicio: hoy hay dos.» y «Ver la orden ›», que ya está. La autonomía y «se notifica y se cierra en SAP» van a la orden (`hoy.ts:600`) | F1 |
| I-conf-2 | CONFIRMADO (va dentro de P-02) | S2→S2 | Encima de la lista: «28 equipos · por estado y, dentro de cada uno, por lo que costaría si falla hoy · ¿Lo vigila TRIM? · ahora o si falla hoy» | Un párrafo de método en el inicio | «28 equipos · ordenados por estado ⓘ» (`equipos/Lista.tsx:119,125`) | F3 |
| P-planta-2 | CONFIRMADO CON OTRO ARREGLO | S2→S2 | Las tres frases de cálculo bajo la tubería de antes, en Planta y Producción | X4 §6.1.11 | Una línea: «Limitan los pozos. Con P-201B parada, **el agua solo deja pasar 236 bbl/d más de crudo**.» Se usa la redacción de P-14: «le caben 236 más» se lee como que sobra. La cuenta, detrás de «Ver la cuenta» (`choke/Tuberia.tsx:495-510`) | F2 |
| P-agua-1 | CONFIRMADO | S2→S2 | A 1440 son 558 palabras sin desplazarse, con cinco renglones de cuentas | X4 §6.1, tabla «Antes y después», fila de Agua (la trae casi palabra por palabra) | La frase de X4 y cada cifra a su ⓘ. «Por qué es crítica», en tres líneas cortas (`choke-agua.ts:330-350`, `choke/Agua.tsx`) | F2 |
| P-causa-1 | CONFIRMADO | S2→S2 | Identificar a 1440 tiene 1.164 palabras: cada parada abierta con su señal, la lista de partes y el WhatsApp | X4 §3.6, «se esconde» (la señal y el WhatsApp de cada parada); X4 §1.3.7 | Una parada abierta a la vez, y las demás en una fila con «›». La señal y el chat, detrás de «Ver…» (`pages/Causa.tsx`, `widgets/arbol/*`) | F1 |
| P-trabajo-1 | CONFIRMADO CON OTRO ARREGLO | S2→S2 | Mi trabajo repite las tarjetas de Hoy: P-201B, «por identificar», K-101 y su orden | X4 §3.6.3 y §3.7 (Mi trabajo → Hoy) | Antes de quitarla del panel, Hoy del técnico tiene que traer lo único propio: la lista de «Órdenes en SAP» (una tarjeta o un «Ver sus órdenes ›») y «Paradas programadas» (el programa de X4 §3.7). Después: `FUSIONADA_EN.trabajo = 'hoy'` y fuera de `roles.ts`, con el mapa antes → ahora | F1 |
| P-bombas-1 | CONFIRMADO | S2→S2 | «1 bomba detenida · 2 pozos cerrados · 69 bbl/h · 2 de oct, 14:00» y, en la placa, «573 bbl · 487 – 659 · calculado · 69 bbl/h · 2 pozos cerrados», más «Hora de referencia 2 de oct, 14:00» | La misma cifra en dos lugares de la vista (§4, regla 8) | Lo de R1: la placa queda «573 bbl · calculado ⓘ», con el rango y el ritmo en la ⓘ. Sin la segunda hora | F3 |
| P-diferidos-1 | CONFIRMADO | S2→S2 | Diferidos repite el bloque de la cifra de Resultados con otros nombres («barriles diferidos», «889–1.203», «+80 % frente a jul a sep») | X4 §3.6.5; G-8 | El bloque de Resultados, igual. Diferidos se queda como el libro: el cuadre y la custodia | F2 |
| P-produccion-1 | CONFIRMADO | S2→S2 | 12 cifras en la cabecera de Producción, más la tubería entera | X4 §3.6.5 y §3.6.6 | La cabecera, en dos líneas («Producción medida…», «Potencial del libro… ⓘ»). La tubería, con P-16 | F2 |
| P-mant-1 | CONFIRMADO | S2→S2 | «del diferido, programado · 0,0 % · 0 bbl · 1.046 bbl no programado (libro)» | Es el ejemplo literal de X4 §6.1 | «Ninguna parada de este mes estaba programada: los 1.046 bbl fueron fallas o siguen sin identificar.» (`pages/Mantenimiento.tsx`) | F2 |
| P-reg-1 | CONFIRMADO | S2→S2 | «Diferida · `dif_perd` · DIFERIDA», «En la planta o estación · `choke_mod` · PLANTA»…: cada rama dice su nombre tres veces | X4 §3.4 (reg): el árbol completo va detrás de un toque | En la primera capa, el nombre y su cifra. Los códigos, detrás de «Ver los códigos ANH» y en el CSV. Va con P-03 (`pages/Regulatorio.tsx`, `choke/ArbolCircular.tsx`) | F2 |

### Texto · S3

| id | veredicto | sev. final (R1→V1) | evidencia propia | porqué | arreglo final · archivo | dueño |
|---|---|---|---|---|---|---|
| T-1 | CONFIRMADO CON OTRO ARREGLO | S2→S3 | A 390, la cabecera del sup dice «La Ceiba · DEMO · Hoy · hoy, 2 de oct · datos de las 14:00 · franja». La imagen 3b: «Hoy · su turno · datos de las 14:00 · franja», sin migas. La imagen 2 (un campo): solo «‹ Todos mis campos» | Por D-1, la franja y la hora no cuentan en las 5 cifras: se cae el argumento principal de R1. Queda que el campo se repite (píldora y migas) | Solo en el teléfono:<br>• sin migas si el rol tiene un campo; con varios, «‹ Todos mis campos» (imagen 2);<br>• la fecha, como la imagen de cada pantalla (3b no la lleva; 2 sí);<br>• **la cuenta en cero y «atención» se quedan** (X5 §5.6 y las imágenes).<br>`Cabecera.tsx` | F1 |
| T-10 | CONFIRMADO CON OTRO ARREGLO | S3→S3 | Los números de verdad: «1. Quién … 6. Detalle» (Regulatorio), «1 · Parte de la bomba» y los pasos 1–6 de la cadena (Identificar), la columna de puesto de Riesgo (1, 1, 3, 4…). **«1 · P-201B» y «2 · LC-21» de Riesgo, y «HOY · 1» de Agua, son marcas de prioridad**, no números (comprobado en el DOM) | X4 §6.1.12 | Sin número en Regulatorio, Identificar y el puesto de Riesgo. Las marcas no se tocan | F2 (Regulatorio, Riesgo) y F1 (Causa, `arbol/*`) |
| T-11 | CONFIRMADO CON OTRO ARREGLO | S2→S3 | «modelo choke ⓘ» en Regulatorio (`ArbolCircular.tsx:36`), Riesgo de conf (`SiFallaHoy.tsx:58`), Identificar (`arbol/Calidad.tsx:105`) y, **además**, en Filosofía | X4 §6.1.4: «choke», solo en la ⓘ. Son dos palabras al lado de su ⓘ | Se quita el rótulo y la ⓘ queda pegada al título, como «¿Qué es este árbol?». El texto es el mismo | F2 (Regulatorio, Riesgo), F1 (Calidad) y F3 (Filosofía) |
| G-6 | CONFIRMADO | S3→S3 | «Pasa hoy» en la tubería de antes; «Sale hoy» en La planta viva (imagen 1) | Dos nombres para 9.394 | «Sale hoy». No hace falta si P-16 saca la tubería de antes | F2 |
| G-8 | CONFIRMADO CON OTRO ARREGLO | S2→S3 | «barriles diferidos» (La planta viva, imagen 1), «no se produjeron» (la frase de Resultados), «= No producido» (el cuadre de Diferidos), «el diferido del libro» | Las frases que acompañan la cifra pueden variar; el rótulo de una cuenta, no | Solo el cuadre: «= No producido» pasa a «= Diferido» (`diferidos/Cuadre.tsx:40`). Las frases de la imagen y de Resultados se quedan | F2 |
| G-10 | CONFIRMADO | S3→S3 | «máx. 800» (BarraMeta en Resultados y Mantenimiento) frente a «máximo 800» y «máximo firmado» | Una abreviatura de sobra | «máximo», sin abreviar (`shared/ui/BarraMeta.tsx` y quien le pasa el rótulo) | F1 (BarraMeta) y F2 |
| I-ger-3 | CONFIRMADO CON OTRO ARREGLO | S2→S3 | «Pérdida (lo que salió y no se vendió): sin eventos registrados en octubre.» va en un renglón aparte bajo la tubería. No está en la imagen 1 | X5 §5.10: «Pérdida: nada registrado en octubre» **en la leyenda**. Se cruza con UI-12 (la vista no cabe en 1440 × 900) | El texto de X5, en la leyenda de la tubería, y la definición en la ⓘ (`planta-viva.ts:893`, `plantaviva/Tuberia.tsx`) | F2 |
| I-ger-7 | CONFIRMADO | S2→S3 | «¿Está bajando? Desde que entró TRIM · en la planta 268 → 51 bbl/d…» no dice de qué es la cifra | Es el texto de X4 §4.4, regla 5 («lo no planeado por día bajó…»). Suma tres palabras a la imagen; no las quita | «Lo no planeado, por día» en la línea del título (`plantaviva/Lateral.tsx`) | F2 |
| I-reg-2 | CONFIRMADO CON OTRO ARREGLO | S2→S3 | «solo lectura» y el botón principal «Exportar CSV» van en la tarjeta que dice «No se puede publicar todavía», y además está «Exportar» en la cabecera | El CSV no es el mismo archivo que el PDF; lo que sobra es tenerlo como acción principal mientras el reporte no se puede publicar | Un solo «Exportar» en la cabecera, con la opción «CSV para la ANH». «solo lectura», a la ⓘ (`Regulatorio.tsx`, `informe/Exportar.tsx`) | F2 |
| I-sup-1 | CONFIRMADO CON OTRO ARREGLO | S2→S3 | A 390 dice «se dejan de producir en La Ceiba.». La imagen 3b dice «se dejan de producir.» y la 3a, «…en La Ceiba.». «Le faltan 4 paradas por confirmar: el reporte sale mañana antes de las 07:00.» está **igual en las dos imágenes** | D-1: la segunda frase es la de la imagen | Solo en el teléfono, sin «en La Ceiba» (`hoy.ts:731`). La segunda frase no se toca | F1 |
| I-sup-2 | CONFIRMADO CON OTRO ARREGLO | S2→S3 | «Si arranca antes, queda como no conformidad.» va en el bloqueo. La imagen 3b no lo lleva; **la 3a y la 5 (operador) sí** | D-1 | Solo en el teléfono del supervisor (y del jefe y el técnico), a la ⓘ. En el operador y en el escritorio se queda (`hoy.ts:338`, `hoy/piezas.tsx`) | F1 |
| I-sup-3 | CONFIRMADO CON OTRO ARREGLO | S2→S3 | «Falta su confirmación.» está en la imagen 3a; en la 3b, no | D-1 | Solo en el teléfono (`hoy.ts:480`; el motor la da como parte aparte) | F1 |
| I-sup-5 | CONFIRMADO CON OTRO ARREGLO | S2→S3 | «Lo más frágil… dejan de producirse 3.059 bbl/d después de 2 min.» La imagen 3a lleva la cifra; la 3b, no | D-1 | Solo en el teléfono, sin la cifra («Ver ›» la lleva) (`hoy.ts:649`) | F1 |
| I-jefe-1 | CONFIRMADO CON OTRO ARREGLO (al revés de R1) | S2→S3 | A 1440, «el repuesto, los permisos o la cuadrilla: no la reparación.» ocupa 1 renglón y el vigía, otro. A 390 son 3 renglones | **La frase de X4 §3.4 del jefe es la cifra y «El vigía anunció 3 de 3 fallas»**: el vigía contesta la mitad de su pregunta («¿estoy anticipando?») y no se va | Lo que sobra es «el repuesto, los permisos o la cuadrilla…», que no está en X4: va a la ⓘ de «espera». El vigía se queda (`hoy.ts:751-753`) | F1 |
| I-jefe-2 | CONFIRMADO | S2→S3 | El jefe: «LC-08 arrancó… · 219 bbl hoy, **928** desde que pararon» (suma 3 paradas, P-201B incluida). El sup: «…355…» | Se lee como de LC-08. La 3a del sup tiene la misma forma, y por eso baja a S3 | La suma, en su propio trozo: «Entre las 3: 219 bbl hoy · 928 desde que pararon» (`hoy.ts:435-436`) | F1 |
| I-adm-3 | CONFIRMADO CON OTRO ARREGLO | S2→S3 | El título es «Metas, accesos y configuración»; el panel dice «Configuración» y la puerta, «Configurar». **Es falso que el adm no vea metas**: tiene «Metas de los campos» y «Usuarios y accesos» (`Configuracion.tsx:58`) | Tres nombres para la misma pantalla | Con UI-01 (las partes como subpantallas), cada una lleva su título («Configuración técnica», «Metas de los campos»…). El gerente sigue con «Metas y accesos» | F3 y F1 (`pantallas.tsx`) |
| P-planta-3 | CONFIRMADO | S3→S3 | «Pasa hoy» y la línea de 22 palabras del medidor oficial | G-6; ⓘ para el tag | Lo de R1. No hace falta si P-16 saca la tubería de antes | F2 |
| P-agua-2 | CONFIRMADO | S3→S3 | «casi iguales» dos veces y «┄ dato del demo, sin firmar» tres | Lo repetido | Una vez cada uno. «sin firmar» con su ⓘ | F2 |
| P-riesgo-1 | CONFIRMADO CON OTRO ARREGLO | S2→S3 | «Se deja de producir ahora, por causa» y la nota «También parados… van en “Se deja de producir ahora”, no en la lista». «1 · P-201B» es una marca, no un número (T-10) | Una nota de método en la pantalla. No hace falta si P-10 disuelve Riesgo | El título «Por qué» y la nota corta. Las marcas se quedan (`pages/Riesgo.tsx`, `riesgo/*`) | F2 |
| P-turno-2 | CONFIRMADO | S2→S3 | «Cierre de hoy · paradas por confirmar · 4 · 0 completas» y «4 paradas hoy · 0 completas · faltan 4 · …» | La cuenta, dos veces. Turno se funde en Hoy (X4 §3.7) | «Cierre de hoy · faltan 4 de 4 · antes de las 07:00» (`pages/Turno.tsx`) | F1 |
| P-turno-3 | CONFIRMADO | S2→S3 | La cadena de la ANH entera en Turno («No planeada · No planeada - Proceso / Facilidades…») | Palabras del catálogo fuera de Regulatorio; en Hoy ya dice «TRIM las dedujo: en la planta, no planeada» | La frase de Hoy (`pages/Turno.tsx`) | F1 |
| P-equipos-ger | CONFIRMADO | S2→S3 | En el Equipos del gerente: «sí · 8 señales», «no: solo su controlador» | X4 §2: lo gerencial, sin variables de equipo | Para el gerente, «sí» o «no» (`equipos/Gerente.tsx` y el motor de la fila) | F3 |
| P-esp-1 | CONFIRMADO CON OTRO ARREGLO | S3→S3 | «En falla ahora 0 de 15 · las paradas, por otra causa» y «Diferido de sus electrosumergibles 0 bbl» | El vacío que enseña. Pero lo de R1 junta «ahora» con el período, y eso no se hace | Solo la de «ahora»: «Ninguna en falla: LC-16 y LC-07, cerradas por P-201B». La del período queda aparte (`pages/Esp.tsx`) | F3 |
| P-resultados-1 | CONFIRMADO CON OTRO ARREGLO | S2→S3 | La explicación ocupa **2 renglones** a 1440 (medido) | Cumple el tope. «Septiembre cerró en 7.716» es la regla de comienzo de mes (X4 §4.4, regla 4) y no sale: la gráfica no da el total del mes en bbl | Solo el orden, con la conclusión primero: «Va 221 bbl por debajo del máximo firmado (1.267). P-201B, más de la mitad · 355 sin causa. Septiembre cerró en 7.716 bbl.» (`resultados.ts:329-331`) | F2 |
| P-conf-1 | CONFIRMADO | S3→S3 | «¿Acierta el vigía?» con 5 cifras; Resultados dice «¿Le creo al vigía?» | X4 §3.7 lo pone con ese nombre | Lo de R1. F4 ajusta «¿ACIERTA EL VIGÍA?» en `rutas.ts` (D-3) | F2 y F4 |
| P-conectores-1 | CONFIRMADO | S3→S3 | «TRIM → SAP · avisos · 5 en total», «SAP → TRIM · órdenes…» | Pulido | «Avisos a SAP · 5», «Órdenes de SAP · 18 · 1 abierta» (`pages/Conectores.tsx`) | F3 |
| P-filosofia-1 | CONFIRMADO | S3→S3 | Los títulos con su cuenta en mayúsculas, y «LO QUE TRIM DEDUJO DEL REGISTRO» abierto | X4 §3.6, «se esconde» | En frase (T-6) y «Lo que dedujo TRIM» plegado (`configuracion/Filosofia.tsx`) | F3 |

### Texto · duplicados de R2 (no se cuentan aparte; la severidad la fija UI o producto)

| id de R1 | = R2 | veredicto | lo que añade R1 | dueño |
|---|---|---|---|---|
| T-3 | UI-22 | CONFIRMADO CON OTRO ARREGLO | Lo bueno: dentro de las pantallas, «dato del demo, sin firmar» → «sin firmar» con ⓘ. **Lo que se refuta:**<br>• llevar DEMO al menú de la persona: la marca va en la cabecera de cada vista (la e2e `interfaz` lo pide, y una captura suelta tiene que decir que es demo);<br>• quitar la marca del papel: cada hoja tiene que llevarla, aunque se separe del membrete. | F1 (cabecera) y F2/F3 (las capacidades) |
| T-5 | UI-23 | CONFIRMADO | Lo mismo. La lista empieza en la segunda subpantalla y la puerta abre la primera | F1 |
| T-6 | UI-04 | CONFIRMADO (D-3) | El inventario completo: 72 rótulos en 52 rutas, con su archivo, y la lista de aserciones de `rutas.ts` | F2, F3 y F4 |
| T-7 | UI-04 | CONFIRMADO | 125 usos de `Panel`/`Metrica`. Arreglarlo en `primitivas.tsx:31` arregla todo | F1 |
| P-conf-cfg-1 | UI-04 (T-6) | CONFIRMADO | Solo el inventario | F3 |
| I-ger-2 | P-14 | CONFIRMADO CON OTRO ARREGLO | Solo vale «el agua da para 236 bbl/d más de crudo», a 390, que es P-14. Pasa a «el agua solo deja pasar 236 bbl/d más de crudo» (ver P-14: «no da para más crudo», de la imagen 2, solo es cierto con 0). **Lo demás se refuta** («la roca», «el oleoducto recibe», «agua que entra: 174.033», «inyectores: el agua vuelve…», «15 de 18 en marcha»): está en las imágenes 1 y 2 (`tuberia.js:64-92,137-145`) | F2 |
| I-prod-1 | P-01 | CONFIRMADO | El motor ya tiene «le sobran 1.143» y «limita» (`tuberiaCampo`) | F2 |
| I-reg-1 | P-03 | CONFIRMADO | La cuenta de paradas sin causa sale de `anh-calidad.ts` y `anh-paradas.ts` (decisión del coordinador). La hora límite, de `limiteReporte` (`hoy.ts`), que ya da «mañana antes de las 07:00» | F2 |
| I-conf-1 | P-02 | CONFIRMADO | El motor ya tiene la frase: `criticidad.ts:373` («Cambió hoy: P-201A y P-201C subieron al puesto 1… TRIM no verá venir su falla»). Hoy va debajo de los filtros | F3 |
| I-adm-1 | P-04 | CONFIRMADO | Mientras tanto, el texto que sale de lo que ya hay. «N de M pasos», de `pendientesDe`, `faltanParaFirmar` y la configuración firmada (decisión del coordinador) | F3 |
| I-adm-2 | UI-08 | CONFIRMADO | R1 lo pone en S2 y R2 en S3. **Va S3**: no confunde | F1 |
| I-tec-3 | P-07 | CONFIRMADO CON OTRO ARREGLO (resuelto en P-07) | «Responder yo» se queda para quien contesta por otro (X4 §6.1.13). Para la pregunta propia, un solo verbo: el título «Diga qué se dañó» (imagen 4) y el botón «Contestar». Salen «Registrar respuesta» y «Registrar qué encontré» | F1 |
| P-turno-1 | P-05 | CONFIRMADO | La redacción: «≈ 983 bbl en el turno que entra si nada cambia · proyectado», en gris y discontinuo, debajo de 1.966 | F1 |
| P-planta-1 | P-16 | CONFIRMADO CON OTRO ARREGLO | **Choca con R2**:<br>• R1 deja la tubería de antes en Planta;<br>• R2 la saca de Producción e Identificar;<br>• X4 §3.6.6 dice «una sola, en el nivel 1»: La planta viva, con la lente técnica de P-01.<br>Mientras P-01 no esté, queda solo en Planta. Cuando esté, sale también de Planta, y la pantalla Planta se queda con el esquema (nivel 2) | F2 y F3 |
| P-nivel4-1 | UI-03 y UI-04 | CONFIRMADO | En MPP-301 se sale 107 px a 390 y 177 px a 320. Propuesta de texto para el teléfono: el tag y el nombre en un renglón, «hace 47 s» en otro | F3 |

### Texto · refutados

| id | veredicto | sev. R1 | evidencia propia | porqué |
|---|---|---|---|---|
| T-2 | REFUTADO | S2 | La imagen 1 trae «La planta viva hoy, 2 de oct · datos de las 14:00» y «0 sin comunicación» | D-1: es la imagen. Lo de «DATOS DE DEMOSTRACIÓN» es T-3 = UI-22 |
| T-4 | REFUTADO | S2 | Las imágenes 1, 2, 3b y 5 pintan el «0» de «sin comunicación» | X5 §5.6: «En el teléfono la palabra se acorta («atención») y «sin comunicación» queda solo con su forma y su número cuando es 0». Es lo que hace hoy |
| G-14 | REFUTADO | S2 | La imagen 1: «Antes 0 · Durante 2.102 · Después 30» bajo «Lo que todavía se puede mover · simulado» | X5 §5.4: las tres columnas se ligan al momento escogido (la del momento, en índigo). Con otros verbos se pierde ese lazo. El chip «simulado» ya separa |
| G-vigía | REFUTADO | S3 | «acertó 3 de 3 avisos» (Equipos de conf) y «El vigía anunció 3 de 3 fallas» (Hoy del jefe) | Son dos medidas con dos nombres, que es lo que pide «un nombre, una cifra». La segunda es la frase literal de X4 §3.4 |
| I-ger-1 | REFUTADO | S2 | Medido: 2 renglones a 1440 y a 1280 (17 px, 660 px de ancho). A 390 va **después** del dibujo, como la imagen 2, que no la pone arriba | Es el texto literal de la imagen 1 y no pasa el tope de 2 renglones bajo la cifra |
| I-ger-4 | REFUTADO | S2 | La imagen 1: «Este mes 1.046 barriles diferidos · 50 mil USD · calculado, entre 889 y 1.203 · P-201B, más de la mitad · 355 sin causa» | D-1. X5 §8.1 D1 agregó el rango a propósito |
| I-ger-8 | REFUTADO | S2 | La imagen 1 trae «Diferido por día, mes a mes», las lemas de la píldora y los porcentajes | D-1, y R1 mismo lo condiciona a D-1. Es el «por qué equipos» y el «¿está bajando?» de la pregunta |
| I-sup-6 | REFUTADO | S3 | La imagen 3a lleva esa frase en «Diferido de su turno» («“Entregar turno” arma el resumen…») | D-1. El texto de hoy no coincide porque la función no existe: eso es P-06 |
| I-oper-1 | REFUTADO | S3 | La imagen 5: «P-201B · bomba de agua · paró hoy a las 03:52, hace 10,1 h» | D-1. X4 §6.1.9 da «hace 10 h» como tiempo de campo |
| I-oper-2 | REFUTADO | S3 | La imagen 5: «Lo que más le ha fallado a esta bomba:» y «se la vuelven a preguntar en la próxima ronda» | D-1 |
| I-oper-3 | REFUTADO | S2 | La imagen 5 y X5 §5.8: el operador en el teléfono no tiene cifra grande; «Pregunta 1 de 4» va en la banda | Es el diseño aprobado. Que vaya en la banda es UI-21 |
| P-pv-todos | REFUTADO | S2 | La imagen 2: «Lo que más pesa: la bomba de agua P-201B, en La Ceiba. Hay 4 de 87 pozos parados.» y «Lo que todavía se puede mover ahora: ≈ 2.102 bbl simulado · Ver el plan ›» | D-1. El texto de 9,5 px a 320 px es de V2 (R3) |
| P-resultados-2 | REFUTADO | S2 | La planta viva muestra el rango al gerente (imagen 1) | Esconderlo solo en Resultados haría que la misma cifra se viera distinto en dos lugares. X4 §6.1.7 deja «Provisional» en Resultados |

---

## 3. Choques entre R1, R2 y los documentos (resueltos)

1. **Una sola tubería (P-16 contra P-planta-1).** Gana X4 §3.6.6 y §3.7: una sola tubería, en el nivel 1.
   - **El orden:** primero P-01. Después, la tubería de antes sale de Producción, de Identificar y de Planta. Planta se queda con su esquema.
   - **Si P-01 no se cierra en la fase 4:** sale de Producción y de Identificar, y se queda solo en Planta, para que producción no pierda la lente técnica.
2. **La marca de demostración (UI-22 contra T-3).** Se queda en la cabecera de cada vista, en frase y no en MAYÚSCULAS. La e2e la busca ahí, y una captura suelta tiene que decir que es demo. La marca del papel también se queda.
3. **La línea del plan simulado (UI-20, P-11 e I-sup-4).** Los tres tienen el mismo arreglo: una tarjeta «Decidir N planes · simulado ›» que abre la ficha del equipo. Nunca va dentro del bloqueo ni de una tarjeta de confirmar.
4. **Contestar (P-07, I-tec-3 y la decisión de C3).** Manda la imagen 5: un toque.
   - «¿Qué vio?» pasa a ser la pregunta siguiente; así el libro sigue recibiendo la parte y el modo.
   - Los nombres: «Responder yo» para quien contesta por otro (X4 §6.1.13); para la pregunta propia, «Contestar» y el título «Diga qué se dañó».
5. **La frase del agua (P-14, I-ger-2 y P-planta-2).** Pasa a «el agua solo deja pasar 236 bbl/d más de crudo». La de la imagen 2 («no da para más crudo») ya sale cuando da 0.
6. **La separación de Hoy y el radio del teléfono (UI-11 contra las imágenes).** Ganan las imágenes 2, 3a y 3b sobre los números de X5 §3.5.
7. **«Limita» con una capacidad sin firmar (P-12).** La imagen 1 dibuja el contorno continuo y X4 §4.10 pide discontinuo. Se queda el contorno de la imagen y se agrega solo la ⓘ.
8. **El período y Exportar (UI-08, I-adm-2).** Va en S3 y con el arreglo de UI-08. Planta y Agua conservan el período, y Turno su Exportar, hasta P-06.
9. **Los dueños sin asignar.** `src/app/*` y `entities/roles.ts` van a F1. `widgets/choke/*` va a F2. Las páginas Planta y Agua son de F3, pero montan widgets de F2.

---

## 4. Arreglos por dueño (las dos secciones juntas, por severidad)

**El orden entre dueños:**
- P-01 (F2) va antes de P-16;
- F4 cambia primero las listas de `verificar-libro` que leen archivos (P-21) y las aserciones en MAYÚSCULAS (D-3). Recién entonces F2 y F3 borran y pasan los títulos a frase;
- los registros de `pantallas.tsx` y `roles.ts` (F1) van antes de las vistas nuevas de F3 (Estado; Metas y Accesos como subpantallas).

### F1 · Armazón, Hoy y lo común (y `src/app/*`, `roles.ts`)

**S1:**
- P-05 · `pages/Turno.tsx` · se quita el bloque de 4 cifras. Si la proyección queda, va chica, discontinua y con «proyectado», debajo de lo medido.
- G-16 · `shared/ui/costoHoy.ts:16` · «≈ N bbl le costaría la falla» (D-2).
- P-04 (el registro) · `app/pantallas.tsx` y `entities/roles.ts` · «Estado» es la primera subpantalla de Configurar y el inicio del adm.

**S2:**
- UI-01 (el registro) · `pantallas.tsx`, `MenuPerfil.tsx` y `url.ts` · `metas` y `accesos` como subpantallas, y una entrada por parte en el menú de la persona.
- UI-02 · `shared/ui/foco.ts`, `App.tsx` y `HojaInferior.tsx` · `data-velo`: el velo no queda inerte.
- UI-04 · `shared/ui/primitivas.tsx:31` · el título de `Panel`, a 15–16 px Semibold y en tinta.
- UI-05 · `pages/Causa.tsx` y `arbol/Preguntas.tsx` · las opciones de `hoy/Pregunta` y el `Bloqueo` de Hoy.
- UI-06 · `pantallas.tsx` y `widgets/Riel.tsx` · íconos distintos, y el nombre bajo el ícono cuando el panel está plegado.
- UI-20, P-11 e I-sup-4 · `entities/hoy.ts:674`, `hoy/piezas.tsx` y `hoy/palabras.ts` · la tarjeta «Decidir N planes», que abre la ficha.
- P-06 · `entities/hoy.ts` y `widgets/hoy/*` · `entregaDeTurno`, la hoja y el PDF. La firma, pendiente de contrato.
- P-07 · `entities/hoy.ts`, `widgets/hoy/*` y `pages/Causa.tsx` · un toque, con «¿qué vio?» como pregunta siguiente; un solo verbo.
- P-08 · `hoy/envio.ts` y `shared/api/escrituras.ts` · `keepalive`, lo pendiente guardado y reintentado, y el error fijo en un `status`.
- P-09 · `pages/Turno.tsx` y `pages/Causa.tsx` · `familiaDe`.
- P-10 · `hoy/palabras.ts`, `roles.ts` y `url.ts` · «Ver P-201A y P-201C ›» lleva a Equipos; Riesgo se funde para jefe y conf.
- P-15 · `widgets/Onboarding.tsx` · tres señas de una línea, de usted.
- P-16 · `pages/Causa.tsx` · sin la tubería de antes, después de P-01.
- I-oper-4 e I-tec-1 · `hoy.ts:407-408` · «Sigue parada.» o «Sigue parado.».
- I-tec-2 · `hoy.ts:600` · una línea; lo demás va a la orden.
- P-causa-1 · `pages/Causa.tsx`, `arbol/*` y `whatsapp/*` · una parada abierta a la vez; la señal y el chat, detrás de «Ver…».
- P-trabajo-1 · `hoy.ts`, `roles.ts` y `url.ts` · primero Hoy trae las órdenes de SAP y el programa; después, `FUSIONADA_EN.trabajo`.

**S3:**
- UI-08 · `pantallas.tsx` y `informe/Exportar.tsx` · `sinExportar` en Equipos, Riesgo, Conectores y Perfil; `ahora` en Configuración y Filosofía; Exportar con su palabra en el teléfono.
- UI-09 · `index.css` y `hoy/piezas.tsx` · `--aviso` y `--aviso-sobre`.
- UI-10 · `index.css` y `Onboarding.tsx` · `accent-color` y `--velo`.
- UI-12 y UI-22 · `widgets/Cabecera.tsx` · «Datos de demostración», en frase y sin agrandar el renglón.
- UI-15 · `pages/Turno.tsx` · sin la letra condensada; las cifras, en la escala.
- UI-18 · `Franja.tsx`, `Riel.tsx`, `App.tsx` y `Cabecera.tsx` · el área de toque invisible de 44 px.
- UI-21 · `App.tsx` y `hoy/Operador.tsx` · el paso, dentro de la banda.
- UI-23 y T-5 · `Riel.tsx` · la lista de subpantallas empieza en la segunda.
- P-17, P-18 · `app/url.ts` · el aviso del rol de v2; el momento en la dirección.
- P-21 · `pantallas.tsx` y `hoy/palabras.ts` · sin `resumen`, después de F4.
- T-1 · `Cabecera.tsx` · en el teléfono, sin migas cuando hay un solo campo.
- T-10 y T-11 · `Causa.tsx`, `arbol/*` y `arbol/Calidad.tsx:105` · sin los números de paso y sin el rótulo «modelo choke».
- G-10 · `shared/ui/BarraMeta.tsx` · «máximo».
- I-sup-1, I-sup-2, I-sup-3 e I-sup-5 · `hoy.ts` · lo que la imagen 3b no lleva, escondido solo en el teléfono.
- I-jefe-1 e I-jefe-2 · `hoy.ts:751-753` y `hoy.ts:435-436` · «el repuesto, los permisos…» va a la ⓘ; «Entre las N: …».
- I-adm-3 · `pantallas.tsx` · un título por parte.
- P-turno-2 y P-turno-3 · `pages/Turno.tsx` · la cuenta, una sola vez; la frase de Hoy en vez de la cadena.

### F2 · La planta viva y Resultados (con Riesgo, Regulatorio, Diferidos, Producción, Mantenimiento, Confiabilidad y `widgets/choke/*`)

**S1:**
- P-01 · `entities/planta-viva.ts`, `plantaviva/Heroe.tsx` y `Tuberia.tsx` · la lente técnica de prod (9.394 pasan hoy, 1.143 que le sobran, los 3 primeros de «Si falla hoy»), con su prueba de C2.
- P-03 · el motor sobre `anh-calidad.ts` y `anh-paradas.ts`, más `pages/Regulatorio.tsx` · las paradas sin causa, sus bbl, quién y la hora límite; el árbol, debajo.
- T-8, G-1 y G-2 · `criticidad.ts`, `choke-agua.ts:344,347`, `choke/Agua.tsx`, `choke/AguaHoy.tsx`, `choke/Tuberia.tsx:505`, `choke/ArbolCircular.tsx:17`, `riesgo/SiFallaHoy.tsx:249` y `plantaviva/HojaTramo.tsx:43` · lo diferido «se deja de producir».
- G-15 y G-16 · `pages/Mantenimiento.tsx` y `pages/Riesgo.tsx` · «1 equipo avisa»; el costo de la falla, con su nombre nuevo.

**S2:**
- UI-02 · `plantaviva/HojaTramo.tsx` · `data-velo`.
- UI-04 · sus pantallas · `Tarjeta`, la rejilla, sin `font-mono` y los títulos en frase.
- P-09 · `diferidos/Paretos.tsx` y `pages/Riesgo.tsx` · `familiaDe`.
- P-12 · `planta-viva.ts` y `plantaviva/Tuberia.tsx` · `capacidad`, y la ⓘ junto a «limita».
- P-13 · `planta-viva.ts` · el campo de gas.
- P-14 · `planta-viva.ts:574` · «el agua solo deja pasar 236 bbl/d más de crudo».
- P-16 · `pages/Produccion.tsx` y `widgets/choke/Tuberia.tsx` · una sola tubería, después de P-01; «Ver como tabla» y el medidor oficial, a la hoja y al papel.
- G-5 · `diferidos/*`, `Produccion.tsx`, `Regulatorio.tsx` y `produccion/Diaria.tsx` · «Potencial del libro».
- G-7 · `planta-viva.ts:884` · «Promedio por día».
- G-13 · `plantaviva/Lateral.tsx:32` · «bbl · retorno posible del ciclo».
- T-9, P-planta-2 y P-agua-1 · `choke/Tuberia.tsx:495-510`, `choke-agua.ts:330-350` y `choke/Agua.tsx` · una frase; la cuenta, detrás de «ver» o en la ⓘ.
- P-diferidos-1, P-produccion-1 y P-mant-1 · sus páginas · el bloque de Resultados, la cabecera en dos líneas y la frase de X4 §6.1.
- P-reg-1 · `Regulatorio.tsx` y `ArbolCircular.tsx` · en la primera capa, el nombre y la cifra; los códigos, detrás de «Ver los códigos ANH».

**S3:**
- UI-12 e I-ger-3 · `plantaviva/Tuberia.tsx` y `planta-viva.ts:893` · «Pérdida: nada registrado en octubre», en la leyenda.
- UI-10, UI-18 y P-18 · `plantaviva/Momentos.tsx` · el token del lema, el área de toque y el momento tomado del estado.
- UI-15 · Diferidos, Mantenimiento, Riesgo y Agua · sin la letra condensada; las cifras, en la escala.
- UI-17 · `Regulatorio.tsx` · «Medición oficial», detrás de «ver más».
- UI-19 · se resuelve con P-16.
- P-19 · `planta-viva.ts` (`arbolDelChoke`) · el porqué en palabras de campo.
- P-20 · `planta-viva.ts` y `plantaviva/Lateral.tsx` · «N de M planes en marcha».
- P-21 · `pages/Resumen.tsx`, `Portafolio.tsx`, `riesgo/Ahora.tsx`, `resumen/*` y las ramas `decision` · se borran, después de F4.
- G-6 y P-planta-3 (solo si la tubería de antes se queda), G-8, I-ger-7, I-reg-2, P-agua-2, P-riesgo-1, P-resultados-1, P-conf-1, y T-10 y T-11 en Regulatorio y Riesgo · los cambios de la sección «Texto».

### F3 · Equipos, niveles técnicos y Configuración

**S1:**
- P-02 · `entities/equipos-tecnico.ts` y `equipos/Lista.tsx` · la cabeza de conf (3.059 bbl/d, la frase y los 3 primeros); los filtros, plegados.
- P-04 · `estadoConfiguracion` (de `choke-config.ts` y la configuración firmada) y la vista Estado · «N de M pasos».
- T-8 · `bombas/Placa.tsx:169,172`, `bombas/Detalle.tsx:265,293`, `equipo/FichaEjecutiva.tsx:113` y `configuracion/Filosofia.tsx:16`.
- G-15 · `equipos-tecnico.ts:70` · el filtro «Avisan» cuenta lo mismo que «Equipos que avisan».
- G-16 · `bombas/Placa.tsx` y `equipos/Nivel3.tsx` · «Si falla hoy», en bbl/d.

**S2:**
- UI-01 · `pages/Configuracion.tsx` · sin el `tablist`; cada parte, su vista y su título.
- UI-03 y P-nivel4-1 · `widgets/PanelEquipo.tsx` · el renglón de los instrumentos, partido en el teléfono.
- UI-04 · sus pantallas · como las de F2.
- UI-07 · `PanelEquipo.tsx` y `Sparkline.tsx` · con el equipo parado, sin marca ni punta de color.
- P-07 · `equipos/Nivel3.tsx` · el verbo del botón.
- P-09 · `equipo/FichaEjecutiva.tsx` · «bomba de agua».
- P-10 · Equipos de conf · «¿Dónde va el próximo instrumento?».
- P-16 · `pages/Planta.tsx` · sin la tubería de antes, después de P-01.
- G-1b · `equipos-tecnico.ts:278` · un pozo cerrado por otro equipo va sin cifra propia. Prueba: la lista suma 1.966.
- G-5 · `pages/Pozos.tsx:127-128` · «Potencial del libro».
- I-conf-2 · `equipos/Lista.tsx:119,125` · el rótulo, corto.

**S3:**
- UI-08 · `equipos/Nivel3.tsx` · Exportar con su palabra.
- UI-10 · `equipos/piezas.tsx:37`, el avatar de `Perfil.tsx:73` y los velos de `PanelEquipo.tsx` · los tokens.
- UI-11 · `equipos/Nivel3.tsx` y `equipos/Lista.tsx` · 12 px de separación a 390; `pt-5 pb-4`.
- UI-13 · `equipos/Nivel3.tsx` · la marca con su palabra, el principal primero, DEMO en las migas y los rangos sin partir.
- UI-14 · `equipos/Gerente.tsx` · las filas de B.
- UI-15 · Bombas, el nivel 4 y Configuración · sin la letra condensada ni la monoespaciada.
- UI-16 · `configuracion/marcas.tsx:33` · el «?» con un trazo.
- UI-17 · Configuración · el nombre del campo, sin cortar.
- UI-19 · Planta y Conectores · filas con «›».
- I-adm-3 · `Configuracion.tsx` · un título por parte.
- P-equipos-ger, P-bombas-1, P-esp-1, P-conectores-1, P-filosofia-1 y T-11 en Filosofía · los cambios de la sección «Texto».

### F4 · Pruebas y auditor

- **Lo primero, porque los demás dependen de esto:**
  - D-3 · `e2e/auditoria/rutas.ts` · las aserciones en MAYÚSCULAS («VIGÍA», «SALUD POR PARTE», «HORAS EN SAP», «TANQUES DE AGUA», «¿ACIERTA EL VIGÍA?»…) pasan a frase, sin probar menos;
  - P-21 · `scripts/verificar-libro.mjs:2188-2191,3622` · que no lean los archivos que se van a borrar.
- **Reglas nuevas del auditor (§11):**
  - ningún `[role=tablist]` (UI-01);
  - ningún texto visible con «se pierde(n)» o «pierde N bbl» para lo diferido (T-8);
  - texto de SVG por debajo de 12 px, salvo el número de una marca de prioridad (UI-16);
  - ninguna cifra proyectada o simulada más grande que la medida (P-05).
- **Lo que cambia por diseño:**
  - `carril.spec.ts:35` («Datos de demostración», UI-22);
  - `rutas.ts:133,145` (G-16);
  - `#/jefe/riesgo/…` (P-10);
  - `choke-gerente-riesgo.spec.ts` (T-8).
- **El glosario como prueba** (`verificar-libro`):
  - P-09: una familia por equipo;
  - G-13: un nombre por cifra;
  - G-15: el filtro «Avisan» es igual a `cifrasDeUnNombre`;
  - G-1b: la lista de Equipos suma 1.966.
- **Las e2e nuevas de comportamiento:**
  - UI-02: tocar afuera cierra el panel y la hoja;
  - UI-03: el nivel 4 no se sale a 390 ni a 320;
  - P-02: a 390, la cifra y P-201A se ven sin desplazarse;
  - P-07: un toque registra y pasa a la siguiente pregunta;
  - UI-20: el bloqueo no trae planes;
  - P-17: el aviso del rol de v2.
- P-22 · `scripts/pantallazos.mjs` · las rutas nuevas, más `reg`.

---

## 5. Para V2 (ISA-101, gráficos y accesibilidad)

- UI-07: las señales con marca, con el equipo parado (X2 E3 y B9).
- UI-16: un texto de SVG de 7,2 px que no es un número de prioridad.
- UI-18: blancos táctiles de menos de 44 px (WCAG 2.5.8).
- El texto de 9,5 px del gráfico de «Todos mis campos» a 320 px (de P-pv-todos, de R1).
