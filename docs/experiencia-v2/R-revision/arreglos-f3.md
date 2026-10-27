# Arreglos · F3 (Equipos, niveles técnicos y Configuración)

**26-oct-2026 · F3.** Fase 4 de `PLAN.md`. La lista de trabajo son los hallazgos confirmados de F3 en `verificados-v1.md` (§4) y `verificados-v2.md` («Los arreglos, por dueño»), más los que el coordinador asignó (P-02, P-04, H3, T-8/H15, G-16, I1, las marcas del nivel 4, la franja, «Potencial del libro», las pestañas de Configuración, «sin comunicación», el próximo instrumento y el texto).

**Pruebas nuevas:**
- `e2e/arreglos-f3.spec.ts` (Equipos y niveles): 9 casos en dev, 14 con Firefox e iPhone.
- `e2e/arreglos-f3-config.spec.ts` (Configuración, Conectores y Perfil): 6 de 6 en dev y Firefox.
- `e2e/arreglos-f3-bombas.spec.ts` (Bombas, pozos, Planta y la ficha): 22 de 22 en dev, Firefox e iPhone.
- `scripts/verificar-libro.mjs`, tres secciones al final: «F3 · Configuración» (8), «F3 · Bombas y pozos» (2) y «F3 · Equipos» (10).

Cada prueba falla con el código de antes.

**Cierre:**
- `npx tsc -b`: sin errores.
- `npx oxlint src`: sin avisos.
- `verificar-libro`: 531 de 532. Solo falla la comparación con `referencia/`, que cambia por los arreglos de todos.
- `verificar-arbol`: 128 de 128.
- `verificar-contrato`: 199 de 199, y la http 17 de 17.
- `referencia comprobar`: 272 de 311. Falta regenerar, ver «Para el coordinador».

## S1

| Id | Estado | Qué quedó | Archivos | Prueba |
|---|---|---|---|---|
| **P-02** | hecho | Confiabilidad abre en su respuesta: «Si falla hoy, lo primero · **3.059** barriles por día · Ataque primero P-201A y P-201C: hoy valen más y TRIM no las vigila. Ahí va el próximo instrumento.», con los tres primeros (P-201A, P-201C, LC-11) en filas con «›».<br>Debajo, el vigía. El tipo, el tren y la búsqueda van detrás de «Más filtros» (no son pestañas); los filtros de estado quedan a la vista.<br>Morichal: «Ataque primero MPP-301: ya avisa.» | motor `equipos-tecnico.ts` (`primero`), `equipos/Lista.tsx` | libro F3 (P-02); e2e P-02 a 1440 y 390: la cifra y P-201A se ven sin desplazarse |
| **P-04** | hecho | El administrador abre en «3 de 6 pasos listos», con lo que falta y una fila por paso que lleva a donde se hace. El motor `estadoConfiguracion` deriva los pasos de lo firmado y del borrador (`pendientesDe`), sin inventar nada | `choke-config.ts`, `shared/api/choke.ts`, `pages/Configuracion.tsx` | libro «F3 · Configuración»: firmar sube la cuenta a 4 y a 5 de 6; e2e config |
| **T-8 / H15** | hecho | En el motor, «se dejan de producir», «deja de producir» y «dejan de producirse» en todas las frases de `criticidad.ts` (7) y de `choke-agua.ts` (2).<br>También en Placa, Detalle, la ficha ejecutiva, Bombas, Filosofía y `AYUDA_ACUATOSOS` | `criticidad.ts`, `choke-agua.ts`, `bombas/*`, `equipo/FichaEjecutiva.tsx`, `configuracion/Filosofia.tsx` | libro F3: nada «se pierde» en 270 frases de «Si falla hoy» y 14 del agua.<br>Ajustadas sin probar menos: libro §agua (2688, 2694, 2940), `choke-produccion.spec.ts:131,147` y `verificar-contrato` |
| **G-15** | hecho | «Avisan» cuenta lo que está en riesgo (`riesgoAhora`), el mismo conteo de «Equipos que avisan»: 1 en La Ceiba, 8 en todos. TK-102 y H-302 siguen con su marca | `equipos-tecnico.ts` | libro F3 (los 5 campos y todos); e2e G-15; ajustados por diseño `equipos.spec.ts` y libro C4 |
| **G-16** | hecho | «Si falla hoy» siempre en bbl/d. El panel «Si se para ahora» pasa a llamarse «Si falla hoy». El costo de la falla, en bbl y con otro nombre | `bombas/Placa.tsx`, `bombas/Detalle.tsx`, `FichaEjecutiva.tsx` | `arreglos-f3-bombas.spec.ts` |
| **H3** | hecho | Una marca por equipo, la de la franja (`useCondiciones`), con su palabra. Vale para la placa, la cabecera de Bombas, Pozos, Esp, el detalle del pozo, la ficha, Planta y la cabecera de la ficha flotante. MPP-301 lleva ▲ atención en todas partes | `bombas/*`, `pozos/*`, `pages/*`, `PanelEquipo.tsx` | `arreglos-f3-bombas.spec.ts`; libro «F3 · Bombas y pozos» |
| **H2** | hecho (lo de F3) | Lo de ahora va en enteros del reparto del campo (`redondeo.ts` de F2): 1.665 + 301 = 1.966; P-201B dice 1.665 en la lista y en el nivel 3; LC-16 y LC-07 suman 869 + 796.<br>El diferido del período de cada pozo sale de `enterosDelPeriodo`: LC-08 = 108 en Pozos y en su nivel 3, y las filas suman la raíz | `equipos-tecnico.ts`, `shared/api/diferidos.ts` (`diferidoEntero`, `enteroPorEvento`), `pozos/DetallePozo.tsx`, `pages/Pozos.tsx` | libro F3 (dos comprobaciones de H2) |

## S2

| Id | Estado | Qué quedó | Archivos | Prueba |
|---|---|---|---|---|
| **UI-01 / I-adm-3** | hecho | Sin `tablist` en Configuración: las partes van en una lista vertical, cada una con su título; también los pasos de la filosofía. Ninguna función se pierde por rol | `pages/Configuracion.tsx`, `configuracion/*` | e2e config (ningún `[role=tab]`) |
| **UI-03 / A7 / P-nivel4-1** | hecho | «Sus instrumentos» del nivel 4 en una rejilla. En el teléfono, el nombre va arriba y la minitendencia y el valor debajo; sin la minitendencia por debajo de 400 px. Ya no se sale a 390 ni a 320 (P-201B y MPP-301) | `PanelEquipo.tsx` (`FilaDispositivo`) | e2e UI-03 a 390 y 320 (dev e iPhone) |
| **UI-07 / H4** | hecho | Con la bomba parada, sus instrumentos van en gris y sin marca, y la minitendencia sin punta de color. `Sparkline` ya no deduce una prioridad | `PanelEquipo.tsx`, `shared/ui/Sparkline.tsx` | e2e: 0 marcas y 0 colores en `[data-instrumentos=P-201B]` |
| **H5 / I1** | hecho | `escalaDe` sale SOLO de los límites firmados: la banda en el tercio del medio; de un solo lado, [0, 2 × límite]; sin límites, `null`, y no se dibuja.<br>La pantalla dice «escala provisional ⓘ» (falta el rango de cada instrumento); ya no dice «fija» | `equipos-tecnico.ts`, `equipos/Senales.tsx`, `bombas/SenalFija.tsx`, `pages/Bombas.tsx` | libro F3 y C4. La prueba vieja exigía que la escala se moviera con las lecturas; se invirtió por diseño. e2e H5 |
| **H6** | hecho | La franja del nivel 3 y del 4 en el mismo lugar que la de la cabecera de F1: fila 1 a la derecha, con Exportar debajo | `equipos/Nivel3.tsx` (`CabezaEquipo`) | e2e H6: N1, N2 y N3 a 1440 y 1280, ±4 px |
| **H7** | hecho | La ficha flotante del gerente:<br>• **en el escritorio:** diálogo no modal, sin velo y debajo de la cabecera (la franja a la vista). El foco entra, Escape la cierra y el foco vuelve a la fila;<br>• **en el teléfono:** la hoja modal con `--velo` | `PanelEquipo.tsx` | e2e H7. `interfaz.spec.ts` pasa sin cambios |
| **H8 / P-16** | **no hecho** | La lente técnica de F2 (`plantaviva/TuberiaTecnica.tsx`) todavía no existe. Cuando esté, es cambiar `<TuberiaDelCampo>` por ella en `pages/Planta.tsx` | — | — |
| **H12** | hecho | La placa usa el indicador de alto desempeño y la minitendencia con la escala del motor (`SenalFija`), la misma para las gemelas. Se retiró el `Analogico` viejo | `bombas/SenalFija.tsx`, `Placa.tsx`, `Detalle.tsx`, `DetallePozo.tsx`, `shared/ui/Analogico.tsx` | e2e bombas; libro (ningún `<Analogico`) |
| **H13** | hecho (lo de F3) | Sin lectura: «---» y el texto en `--tinta2`, con la marca morada al lado (nunca el texto pintado). La píldora de la franja con «· medidor oficial» es de F1 y ya está | `PanelEquipo.tsx` | e2e y revisión del DOM |
| **A5** | hecho | 44 px en el teléfono: las migas y los vecinos del nivel 3, y Planta | `Nivel3.tsx`, `Planta.tsx` | e2e UI-13 (vecinos ≥ 44); bombas |
| **P-07** | hecho por la imagen | El botón del nivel 3 se queda «Diga qué se dañó», el texto de la imagen 4, que manda (D-1). El «Contestar» de la pregunta propia es de F1 (Hoy) | — | `equipos.spec.ts` |
| **P-09** | hecho | «bomba de agua» en la ficha ejecutiva y en la cabecera de la ficha flotante: es la familia del motor | `FichaEjecutiva.tsx`, `PanelEquipo.tsx` | e2e bombas |
| **P-10** | hecho | Arriba de Equipos van:<br>• «¿Dónde va el próximo instrumento?» para conf, cuando la frase no lo dice ya;<br>• «Ojo: … no conviene intervenirlas hoy» y los trabajos del programa, para el jefe.<br>Avisado a F1 para fundir Riesgo | `equipos-tecnico.ts`, `Lista.tsx` | libro F3; e2e P-10 |
| **G-1b** | hecho | Un pozo cerrado por otro no lleva cifra propia: «dentro de los 1.665 de P-201B», en gris. La columna suma 1.966 (y 2.650 en todos) | `equipos-tecnico.ts`, `Lista.tsx` | libro F3; e2e G-1b |
| **G-5** | hecho | «Potencial del libro» en Pozos | `pages/Pozos.tsx` | e2e bombas |
| **I-conf-2** | hecho | «28 equipos · ordenados por estado ⓘ»; el método, en la ⓘ | `Lista.tsx` | revisión |
| **UI-04 / UI-15** | hecho | En todas mis pantallas:<br>• títulos en frase;<br>• `gap-3 sm:gap-4`;<br>• sin `font-mono` ni letra condensada fuera del tag.<br>Son Configuración, Conectores, Perfil, SAP, Bombas, Pozos, Esp, Planta, el nivel 4 y la ficha. Por ejemplo, «Historia del PLC», «Fuera de banda · …» y «Dispositivos · …» | varios | libro F3 config y bombas; e2e |

## S3

| Id | Estado | Qué quedó |
|---|---|---|
| UI-08 | hecho | Exportar con su palabra en el nivel 3, también en el teléfono (`ExportarFichaN3`). e2e UI-13 |
| UI-10 | hecho | Ninguno de estos va ya en un color escrito a mano; usan el token:<br>• la cuenta de la píldora activa (`--primario-sobre`);<br>• los velos de la ficha (`--velo`);<br>• el avatar del perfil (`--marca`) |
| UI-11 | hecho | Nivel 3 y 4 a 12 px entre tarjetas en el teléfono; la lista con `pt-5 pb-4` |
| UI-13 | hecho | En el nivel 3:<br>• la marca del previo, pegada a su primera palabra;<br>• en el teléfono, «Diga qué se dañó» primero;<br>• «Datos de demostración» junto a las migas;<br>• los rangos de límite sin partir.<br>e2e |
| UI-14 | hecho | El «Por equipo» del gerente usa las filas de B de La planta viva (`PorEquipo`), sin el párrafo suelto. e2e |
| UI-16, UI-17, UI-19 | hecho | El «?» dibujado y el nombre del campo sin cortar (e2e config). Filas con «›» y una sola acción principal en Planta y Conectores |
| H16, H17 | hecho | La palabra de la condición junto a la marca. Sin prioridad del motor, sin marca: `Sparkline` y `pozos/estado.ts` |
| H23 | hecho | `Proyeccion` con la banda normal y el piso rotulado |
| H34 | hecho | La ficha ejecutiva lleva el bloqueo en tinta con ⊘, no el chip |
| A6 | hecho | El héroe del nivel 3 y la cabeza de conf: la cifra y su frase se anuncian juntas (`role=group`) |
| A15 | hecho (lo de F3) | En el diagnóstico:<br>• «Cómo está y por qué», «Historia del PLC» y «SAP» en `h2`;<br>• los subtítulos de las paradas del PLC en `h3`, no en `h5`.<br>Falta el `h3` de `PlanesDe` (F2), pedido en `coordinacion.md` |
| A18 | hecho | Planta no anima el desplazamiento con `prefers-reduced-motion` |
| A24 | hecho | En el demo, Conectores dice que el registro lo sirve el backend, con enlace a Configuración |
| P-equipos-ger | hecho | El gerente ve «sí» o «no» en «¿Lo vigila TRIM?». e2e |
| P-bombas-1, P-esp-1, P-conectores-1, P-filosofia-1, T-11 | hecho | Los textos de `hallazgos-texto.md` |
| P-agua-1 (para F2) | hecho en el motor | `tuberiaAgua().fraseCorta` («Con las tres bombas, al agua le sobra espacio. Si para una, hay que cerrar pozos.»); las cuentas quedan en `frases` para la ⓘ. Pintarla es de F2 |

## Para el coordinador

- `referencia/`: falta `node scripts/referencia.mjs generar`. Cambian la lista y el nivel 3 (la escala, la cifra entera, `primero`, `dentroDe`), `/vistas/pozos` (`diferidoEntero`) y la tubería del agua; también lo de F1 y F2.
- e2e que no son de F3 y fallaron en mi corrida:
  - de F2: `planta-viva`, `choke-gerente-riesgo:104` (Riesgo de conf, por T-11) y `choke-produccion` (Agua, la cuenta detrás de «Ver la cuenta»);
  - de F2: `experiencia-f2c:107,190` y `interfaz:165` (Riesgo);
  - de F1: `carril` (Identificar del operador).
  Ninguna toca lo que cambié. Detalle en `coordinacion.md`.
- `.analogico*` de `index.css` (de F1) quedó sin uso.
- Mi Vite de 5183, apagado por su PID (73179 y 73158; la segunda vez, 15842 y 15824).
