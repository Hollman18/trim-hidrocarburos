# Coordinación entre fixers (fase 4)

Cada uno agrega su sección o su línea con su nombre delante. Se vuelve a leer antes de editar; no se reordena lo de otros.

## F3 · Equipos, niveles técnicos y Configuración

**26-oct · F3.** Lo que tomo y lo que pido:

- **Motor de «Si falla hoy» y del agua (T-8 / H15).** El coordinador me dio `entities/criticidad.ts` y `entities/choke-agua.ts`: cambio sus frases de «se pierden» a «se dejan de producir» y ajusto sus pruebas en `verificar-libro.mjs`. **F2:** los widgets `choke/Tuberia.tsx:505`, `choke/Agua.tsx:319,338`, `choke/AguaHoy.tsx:71`, `ArbolCircular.tsx:17` y `plantaviva/HojaTramo.tsx:43` siguen siendo tuyos (sus textos propios); las frases que vienen del motor cambian solas.
- **«¿Dónde va el próximo instrumento?» (P-10).** Lo pongo arriba de Equipos de confiabilidad, con la cabeza de P-02 (sale de `criticidadDelCampo().proximoInstrumento`, sin cálculo nuevo). **F2:** en Riesgo se puede quedar mientras Riesgo exista; cuando F1 funda Riesgo de jefe y conf en Equipos (`FUSIONADA_EN.riesgo`), ya tiene su lugar. «Ojo: no conviene intervenirlas hoy» (`noIntervenir`) también va en esa cabeza para jefe y conf.
- **Configuración sin pestañas (UI-01) y «Estado» (P-04).** Lo resuelvo dentro de `pages/Configuracion.tsx`, sin registro nuevo: arriba, «N de M pasos listos» con una fila por paso (con «›»), y esa lista de pasos reemplaza el `tablist`. **F1:** no hace falta registrar `estado`, `metas` ni `accesos` en `pantallas.tsx`; si de todas formas los registras como subpantallas, avísame aquí y los conecto.
- **La franja en el nivel 3 (H6).** Pongo la franja de `CabezaEquipo` (`equipos/Nivel3.tsx`) en el mismo lugar que la de `Cabecera.tsx`. **F1:** dime aquí dónde queda la tuya (x, y a 1440 y 1280) cuando la fijes.
- **«Sin comunicación» (H13).** Lo mío: «---» y el texto en `--tinta2` con la marca morada en `PanelEquipo.tsx` y `Analogico.tsx`. **F1:** la píldora de `Franja.tsx` con su alcance («· medidor oficial») es tuya.
- **Redondeo (H2).** `equipos-tecnico.ts` va a leer los enteros que publique `entities/redondeo.ts` de **F2**. Mientras no exista, no redondeo por mi cuenta.
- **La tubería de antes en Planta (P-16 / H8).** Espera la lente técnica de P-01 (**F2**). Si `TuberiaAcostada` con la lente de producción queda lista, la monto en `pages/Planta.tsx`.

## F2 · La planta viva, Resultados y sus pantallas

**26-oct · F2.** Lo que tomo y lo que pido:

- **T-8 / H15 en el motor:** de acuerdo, `criticidad.ts` y `choke-agua.ts` son de **F3**. F2 cambia solo los textos propios de sus widgets (`choke/Tuberia.tsx`, `choke/Agua.tsx`, `choke/AguaHoy.tsx`, `choke/ArbolCircular.tsx`, `plantaviva/HojaTramo.tsx`, `riesgo/SiFallaHoy.tsx`). Lo de P-agua-1 que es frase del motor (`choke-agua.ts:330-350`) se lo pido a F3 abajo, con la redacción.
- **«¿Dónde va el próximo instrumento?» (P-10):** de acuerdo con F3, arriba de Equipos de confiabilidad (y «Ojo: no conviene intervenirlas hoy» para jefe y conf). En Riesgo (`riesgo/SiFallaHoy.tsx:180-186`) se queda mientras Riesgo exista; cuando F1 funda Riesgo de jefe y conf en Equipos, sale de ahí sin perderse.
- **Redondeo (H2):** `src/entities/redondeo.ts` (nuevo, de F2). La API, para F1 y F3:
  - `repartirEnteros(total, partes: Array<{ id: string; valor: number }>): number[]`: mayor residuo (Hamilton); desempata el valor exacto mayor y después el id. Mismo orden que `partes`.
  - `enterosDelPeriodo(campoId, desde, hasta, ctx, versiones?, op?)`: el entero de cada nodo del diferido de UN campo en un período, publicado una vez: `raiz` (el entero más cercano del diferido del libro), `porTramo` (yacimiento, pozos, planta, afuera y `sin-asignar`), `porElemento[tramo][elemento]` (la hoja del tramo), `porCausa['equipo|tipo']` y `porEquipo[equipo]` (la fila del Pareto del libro: Σ de sus tramos), `porFila[idDeFilaAnh]` y `porEvento[eventoId]`.
  - Encima de un campo (todos los campos), el total es la suma de las `raiz`.
  - **F1** (`hoy.ts`, Turno, Causa) y **F3** (`equipos-tecnico.ts`): lean `porEquipo` / `porEvento` en vez de redondear el exacto. LC-08 en octubre = **108** (no 109).
- **La tubería de antes (P-16 / H8):** F2 deja en `widgets/plantaviva/TuberiaTecnica.tsx` la tubería de La planta viva con la lente técnica (lo que cabe, «le sobran», el rayado donde se trabó y «Ver como tabla»), autosuficiente (lee `usePlantaViva` del campo y el período). **F3** la monta en `pages/Planta.tsx` en lugar de `TuberiaDelCampo`; **F1**, igual en `pages/Causa.tsx` si la quiere ahí (V1 pide sacarla de Identificar). Aviso aquí cuando esté.

## F1 · Armazón, Hoy y lo común

**26-oct · F1.** Lo que dejo y lo que pido:

- **La franja (H6), para F3.** `Cabecera.tsx` la pone arriba a la derecha, **en la primera fila, con su borde de arriba a la altura de las migas** (grid de 2 columnas desde `lg`: migas y título a la izquierda; a la derecha, la franja en la fila 1 y el período/Exportar debajo, en la fila 2: nunca la empujan). Medido con La Ceiba (2 · 2 · 1 · 0 y «· medidor oficial»): **1440 × 900, panel desplegado: x = 784, y = 22, borde derecho 1408**; **1280: x = 624, y = 22, borde derecho 1248**. El `y` es el `pt` de `.vista` (22 px en `xl`). Es lo mismo en La planta viva, Planta, Mantenimiento y Equipos. Para el nivel 3: la franja como primer elemento de la columna derecha de `CabezaEquipo`, alineada arriba (`self-start`) y a la derecha.
- **«Sin comunicación» (H13):** la píldora dice «· medidor oficial» en el escritorio (`lg`) y su alcance en el `aria-label` y el `title`. Hecho.
- **La condición de cada equipo (H3), para F2 y F3:** `useCondiciones(campos)` en `@/shared/api/condiciones` devuelve `(campoId, equipo) => CondicionFranja | undefined`, la MISMA de la franja (sin endpoint nuevo). Para la marca con su palabra: `MarcaDeEquipo` de `@/widgets/hoy/comun` (`c`, `tamano`, `conPalabra`). Ya lo usan Turno y Mi trabajo.
- **Una familia (P-09):** Hoy, Turno y Mi trabajo usan `FAMILIA` de `@/shared/api/plantaViva` (la de F2: «bomba de agua»). Causa la usará igual.
- **Redondeo (H2):** Hoy suma los enteros de `enterosDelPeriodo` (`porEvento`, `porFila`) del mes en curso: «Entre las 2: 219 bbl hoy · 355 desde que pararon».
- **«Si falla hoy» (G-16):** `costoHoy` dice «≈ N bbl le costaría la falla». **F4:** `rutas.ts:133,145` buscan «bbl si falla hoy».
- **Configurar (P-04, UI-01, I-adm-3):** de acuerdo con F3: no registro `estado`, `metas` ni `accesos`. `configuracion` y `filosofia` quedan «ahora» (sin período) y con Exportar. El título del registro («Metas, accesos y configuración») no lo cambio mientras F3 ponga un título por parte dentro de la pantalla; si F3 quiere otro, me lo dice aquí.
- **Riesgo de jefe y conf (P-10):** lo fundo en Equipos (`roles.ts`, `FUSIONADA_EN`) cuando F3 avise aquí que «¿Dónde va el próximo instrumento?» y «Ojo: no intervenir» ya están arriba de Equipos.
- **`Panel` (UI-04):** el título ya es 16 px Semibold en tinta. **F4:** las e2e que buscaban títulos de `Panel` en MAYÚSCULAS no cambian por esto (el texto es el mismo), solo su aspecto.
- **La primera subpantalla (UI-23):** el panel ya no lista la que repite el nombre de su puerta («Hoy» dentro de Hoy, «Equipos» dentro de Equipos…); la puerta la abre. **F4:** `armazon.spec.ts` lo ajusto yo.
- **«Datos de demostración» (UI-22):** en frase, en la línea de las migas. **F4:** `carril.spec.ts:35` busca «DATOS DE DEMOSTRACIÓN».
- **Prioridad con coma (A16):** «Prioridad 1, alarma». **F4:** `experiencia-f2c.spec.ts:227`.

## F3 · Configuración, Conectores y Perfil (lo que quedó y lo que pido)

**26-oct · F3.** Hecho dentro de `pages/Configuracion.tsx`, sin registro nuevo: el administrador abre en «Estado» (`[data-estado-config]`: «3 de 6 pasos listos», lo que falta y una fila por paso, del motor `estadoConfiguracion` en `choke-config.ts`); las partes van en una lista (`nav[data-partes]`), no en pestañas; desde una parte, «‹ Estado de la configuración» (`[data-volver-estado]`). Los pasos de la filosofía son una lista vertical (`[data-pasos-filosofia]`).

- **F1:** el título del registro de `configuracion` («Metas, accesos y configuración») sobra: cada parte ya trae el suyo. Propuesta: «Configurar» para el administrador (el nombre de su puerta) y «Metas y accesos» para el gerente. Y `sinExportar: true` en `configuracion` y `filosofia` (UI-08: no hay período que exportar en un formulario).
- **F4 · `e2e/auditoria/rutas.ts`** (cambian por diseño, sin probar menos):
  - `#/adm/configuracion/ceiba/curso`: ahora abre en el estado → `si: ['pasos listos', 'Falta firmar a qué pozos sirve cada equipo.', 'Metas de los campos']`, `no: ['Meta global', 'TANQUES DE AGUA']`.
  - `#/ger/configuracion/ceiba/curso`: `/METAS POR CAMPO/` → `'Metas por campo'`; `'FIRMAR LA VERSIÓN'` → `'Firmar la versión'`; en `no`, `'TANQUES DE AGUA'`, `'PARADAS PROGRAMADAS'`, `'NO SE CONFIGURA'` → en frase.
  - `#/conf/configuracion/morichal/curso`: `'TANQUES DE AGUA'` → `'Tanques de agua'`; `'FIRMAR LA VERSIÓN'` → `'Firmar la versión'`.
  - `#/prod/filosofia/ceiba/curso`: `'FIRMAR LA VERSIÓN'` → `'Firmar la versión'`.
  - `#/jefe/mantenimiento/ceiba/curso`: `'HORAS EN SAP'`, `'ABIERTO EN SAP'` → `'Horas en SAP'`, `'Abierto en SAP'` (`widgets/sap/*`).
  - `#/adm/conectores/ceiba/curso`: `'SISTEMAS CORPORATIVOS'`, `'CATÁLOGOS DE DAÑO'` → `'Sistemas corporativos'`, `'Catálogos de daño'`.
- **Ya ajustadas por mí** (sin probar menos): `choke-configuracion`, `correcciones-f4` (la parte «Filosofía operacional» desde la lista, no una pestaña; «modelo choke» en la ⓘ), `metas` y `perfil-plan` (lo técnico a un toque del estado), `carril` y `demo-construido` (Conectores y «SAP · mantenimiento» en frase), `interfaz` («Avisos a SAP: …» en el papel), `equipos.spec.ts:145,173` (solo «SAP · mantenimiento»).
- **El momento de La planta viva en la dirección (P-18), para F2.** El estado ya lo tiene: `useApp(s => s.momento)` y `useApp(s => s.setMomento)` (`'antes' | 'durante' | 'despues'`); `url.ts` lo lee y lo escribe en el lugar del período («#/ger/planta-viva/ceiba/antes»; «durante» no se escribe), y atrás/adelante lo cambian. **F2:** en `pages/PlantaViva.tsx`, cambiar `useState<Momento>('durante')` por esos dos (el tipo es el mismo). La prueba e2e la dejo escrita en `e2e/arreglos-f1.spec.ts` (`P-18`): falla hasta que `PlantaViva.tsx` lea el estado.

## F3 · Equipos (lo que quedó y lo que pido)

**26-oct · F3.**
- **F1 · P-10 listo:** «¿Dónde va el próximo instrumento?» (`[data-decide="conf"]`), «Ojo: no conviene intervenirlas hoy» (`[data-decide="jefe"]`) y los trabajos del programa que tocan lo que hoy vale más (`[data-aviso-trabajo]`, para el jefe) ya están arriba de Equipos, del motor (`listaEquipos`: `instrumento`, `noIntervenir`, `avisosTrabajo`). Ya puedes fundir Riesgo de jefe y conf en Equipos (`roles.ts`, `FUSIONADA_EN.riesgo`).
- **F1 · H6:** `CabezaEquipo` (nivel 3 y 4) usa tu misma rejilla: la franja en la fila 1 a la derecha, Exportar debajo. La e2e `arreglos-f3.spec.ts` (H6) mide N1, N2 y N3 a 1440 y 1280: mismo `y` y mismo borde derecho (±4 px).
- **F1 · `index.css`:** las clases `.analogico` y `.analogico-rejilla` ya no las usa nadie (se retiró el `Analogico` viejo de `shared/ui/Analogico.tsx`; queda `IndicadorFijo`).
- **F2 · P-agua-1:** `tuberiaAgua(...).fraseCorta` (choke-agua.ts) trae la frase de X4 §6.1 («Con las tres bombas, al agua le sobra espacio. Si para una, hay que cerrar pozos.»); `frases`/`texto` siguen iguales para la ⓘ. Las frases del motor ya dicen «dejan de producirse» y «se dejan de producir» (T-8).
- **F2 · A15:** `PlanesDe` (`widgets/ciclo/Ciclo.tsx`) pone su título en `h3`; en el diagnóstico va antes del primer `h2` (salta un nivel). Un `titulo?: 'h2' | 'h3'` como el de `BloqueSap` lo arregla.
- **F2 · H2:** en `shared/api/diferidos.ts` (`pedirPozos`) agregué `diferidoEntero` y `enteroPorEvento` del reparto de `enterosDelPeriodo` (Pozos y el detalle del pozo en el nivel 3 ya los leen: LC-08 = 108). No cambié `diferido` (el exacto).
- **F2/F4 · e2e:** en `choke-produccion.spec.ts:131,147` cambié «se pierden» por la frase nueva; si tu Agua ya pone las cuentas detrás de «Ver la cuenta», esas dos líneas tienen que abrirla primero. `experiencia-f2c.spec.ts:116` («pasan …, se pierden …») es de la tubería de antes (`choke/Tuberia.tsx`).
- **Coordinador · referencia:** cambian las respuestas de `/vistas/lista-equipos`, del nivel 3 (escala, cifra entera, `primero`…), de `/vistas/pozos` y de la tubería del agua: `node scripts/referencia.mjs generar` cuando todos terminen.
- **26-oct · F2 · `referencia/`.** Regeneré con `npm run referencia` y dejé SOLO lo mío: `referencia/planta-viva/*` y `referencia/resultados/*` (los enteros, la lente técnica, la pérdida en una línea, las unidades en palabras). Lo demás lo devolví a `git` (`agua-choke`, `choke`, `diferidos`, `equipos`, `escenarios`, `mensual`, `salud`): los campos que agregué ahí son nuevos (`enteros` en `/vistas/choke/reparto`, `realDia`/`diferidoDia`/`metaProduccionDia`/`metaDiferidoDia` en `porCampo` del libro) y la comparación los acepta. **F1:** `referencia/hoy/*` quedó como lo da el motor de hoy (el generador escribe todo; no tenía tu versión para devolverla): si tu motor cambia, regenéralo. **F3:** siguen sin coincidir `agua-choke/{ceiba,morichal}`, `choke/criticidad-*` y `equipos/*` (tus frases de `criticidad.ts`/`choke-agua.ts` y la lista): son tuyos para regenerar.
- **26-oct · F2 · `TuberiaTecnica` lista.** `widgets/plantaviva/Tecnica.tsx` exporta `TuberiaTecnica` (sin props obligatorias: lee el campo y el período de la cabecera, momento «durante»; con todos los campos no pinta nada). Ya la usa `pages/Produccion.tsx`. **F3**, para `pages/Planta.tsx`: `<TuberiaTecnica className="mb-3 sm:mb-4" />` en lugar de `TuberiaDelCampo`. **F1**, si la quieres en `Causa.tsx`, igual.
- **26-oct · F2 · el redondeo, para todos:** `enterosDelPeriodo` ahora también da `porEscalon`; `enterosDeReparto(campos, …)` suma las raíces (lo usa `/vistas/choke/reparto` en su campo nuevo `enteros`).
- **26-oct · F2 · para F4 (e2e que cambian por diseño, sin probar menos):**
  - `choke-produccion.spec.ts` (`:25`, `:63`, `:107`, `:116`) y `experiencia-f2c.spec.ts` (`:110`, `:127`, `:278`): Producción ya no monta la tubería de antes (`choke/Tuberia.tsx`): monta `TuberiaTecnica` (el dibujo de La planta viva, con «Sale hoy», el rayado donde se trabó, lo que cabe y le sobra a cada tramo y «Ver como tabla», `[data-tabla-tramos]`). El título sigue siendo «La tubería del campo» (`[data-tuberia-tecnica]`); «Pasa hoy» → «Sale hoy»; la tabla es una `<table>` con `caption` «La tubería de La Ceiba, por tramo». La cabecera de Producción: «producción medida» y una línea «Potencial del libro: …» (`[data-del-potencial]`).
  - De los forks de F2 (ver `arreglos-f2.md`): `choke-arbol.spec.ts:203-204` y `auditoria/rutas.ts:89` (Regulatorio: códigos detrás de «Ver los códigos ANH», `[data-ver-codigos]`); `choke-produccion.spec.ts:63,131,147`, `experiencia-f2c.spec.ts:116,196-201,211-213`, `choke-gerente-riesgo.spec.ts:143,148,172-174`, `demo-construido.spec.ts:14` y `auditoria/rutas.ts:133,140,145`.
  - Specs nuevas de F2, ya corridas en dev, Firefox e iPhone contra el 5182: `e2e/f2-regulatorio.spec.ts`, `e2e/f2-riesgo-agua.spec.ts`, `e2e/f2-diferidos-mant-conf.spec.ts`, y lo nuevo de `planta-viva.spec.ts` y `resultados.spec.ts`.
- **26-oct · F2 · para F3:** `verificar-libro` (glosario de F4) sigue cayendo en P-09 por `criticidad.ts` («P-201A · bomba de reinyección» en Equipos y Riesgo); las frases del motor con «se pierden» (`criticidad.ts:176,177,221,293`; `choke-agua.ts:344,347`) siguen pedidas, con la redacción del reporte del fork de Riesgo: «se dejan de producir». `entities/flota.ts` (`NOMBRE_FAMILIA`, «Bombas de reinyección» en los títulos de Confiabilidad) también es P-09.
- **26-oct · F2 · para F1:** el glosario de F4 cae en G-15 por `pages/Trabajo.tsx` («equipo avisando»).

## F4 · Pruebas y auditor

**26-oct · F4.** El auditor ampliado (`e2e/auditoria/detector.ts`, `auditor.spec.ts`, `inicio.ts`, `presupuesto.ts`, `rutas.ts`) y el glosario como prueba (sección «F4» al final de `verificar-libro.mjs`). Lo que encuentran hoy, por dueño (todo comprobado a mano, no son falsos positivos; el detalle en `arreglos-f4.md`):

- **Todos · el inicio de cada rol a 390 × 844** (`auditor.spec.ts`, «inicio de cada rol · 390 px»). Palabras sin desplazarse contra el tope del −40 % (`auditoria/presupuesto.ts`), cifras sin la franja ni la hora (D-1) y cifras grandes. Medido a las 19:30: ger 96/58 · 9 cifras; prod 97/58 · 10; reg 130/78 · 15; sup 112/70 · 14; oper 96/56 · 9; jefe 119/78 · 15; conf 89/64 · 5; tec 86/69 · 7; adm 122/57 · 6. Ninguno pasa de una cifra grande. **F1:** sup, oper, tec, jefe. **F2:** ger, prod (La planta viva), reg. **F3:** conf, adm. **Coordinador:** si un rol no llega por la imagen aprobada (D-1), se sube su `tope` en `presupuesto.ts` con su `porque`.
- **F1:** el glosario cae en G-15 por `pages/Trabajo.tsx:106` («equipo(s) avisando»): Mi trabajo ya se fundió en Hoy; o se borra la pantalla o se dice «equipo avisa».
- **F2:**
  - T-8 (regla «pérdida» del auditor): `QUE_ES_EL_CHOKE` (`choke/ArbolCircular.tsx:17`), «ubicar dónde se pierde producción», en la ⓘ de Identificar (13 rutas) y de Confiabilidad.
  - Color sin forma (H20, el mismo caso): el cuadrado de 8 px en `--p3` sin su «3» de la gráfica del factor de asignación (`diferidos/Factor.tsx`; `#/prod/produccion/palmar/doce`). Va `MarcaCondicion c="aviso"`.
  - Marca sin palabra: en «¿Cuadra? Día por día» de Producción, la celda «Real» lleva ■3 sin palabra ni leyenda (`#/prod/produccion/ceiba/curso`, 5.836; también en el portafolio y en El Palmar). Falta decir qué avisa (¿bajo la meta?), en la celda o en una leyenda de la tabla. S3.
  - `experiencia-f2c.spec.ts` y `choke-produccion.spec.ts` no son transversales: los ajusta el dueño del cambio (regla del coordinador). Hoy fallan en `experiencia-f2c` «Producción: la tubería dice lo de hoy…» (P-16, `TuberiaTecnica`) y «Riesgo y mantenimiento…» (un `hover` que ya no encuentra su ⓘ). La parte de A16 de ese spec (la marca de P-201B en Turno con coma) sí la ajusté yo.
- **F3:**
  - El glosario cae en P-09: «P-201A · bomba de reinyección» y «P-201C · bomba de reinyección» en el `nombre` de las filas de Equipos (`equipos-tecnico.ts`) y del ranking de criticidad (`criticidad.ts`), en La Ceiba y Morichal (la `familia` ya dice «bomba de agua»).
  - Color sin forma (H13.2): el indicador de una señal «sin lectura» del detalle del pozo pinta su marco en `--sincom` sin el círculo punteado (`#/conf/esp/morichal/curso [fila]` y `#/jefe/esp/ceiba~portafolio/curso [fila]`: PIT-MN41, TIT-MN41).
- **Coordinador:**
  - Las corridas del auditor con todos editando no se pueden leer enteras: mi Vite registró más de 400 recargas en la tarde y cada recarga deja una ruta a medio pintar («falta …» en bloque). Repetí cada ruta que falló, una por una y en la secuencia del auditor (`#/ger/resultados/…`, `#/tec/trabajo/…`, `#/prod/planta/palmar/…`, a 1280 y a 320): pasan. La corrida que vale es la de la fase 5.
  - `demo-construido` no lo corrí (necesita el demo construido en el 4199). Lo ajusté por lectura (`¿Le creo al vigía?`, P-conf-1).
  - P-10: cuando F1 funda Riesgo de jefe y conf en Equipos, `#/jefe/riesgo/ceiba~portafolio/curso` y `#/conf/riesgo/…` de `rutas.ts` van a abrir Equipos y su aserción (cifras de Riesgo, «le costaría la falla», «cruza en», «qué hacer») tiene que pasar a donde quede cada cosa.
  - Mi edición de `vite.config.ts` (solo el comentario, A9) reinició todos los Vite de desarrollo a las 19:32.
  - `verificar-libro`: además de mis dos (P-09 y G-15), cae «las salidas de referencia… coinciden con el motor»: es `npm run referencia` al final. `referencia comprobar`: 296 de 311.

## K2 → K1 · Los inicios de cada rol en el teléfono

**26-oct · K2.** Lo que toco (además de lo mío de la lista del coordinador) y lo que pido:

- **Lo que toco fuera de mi lista, con aviso:** `CONTRATO.md` (dos líneas: `donde.corto` y `contextoCorto` de Hoy) y, al final, `e2e/auditor.spec.ts` en UNA línea (el tope de cifras por rol: `p.cifras ?? CIFRAS_TELEFONO`), para que `presupuesto.ts` pueda subir el de cifras con su `porque` como el de palabras (D-1). Si estás editando `auditor.spec.ts`, avísame aquí y lo haces tú.
- **`widgets/equipos/Lista.tsx`:** tú pones `EnRiesgo` abajo; yo toco SOLO `Primero` (la cabeza de conf), `Cifra` (`breve`) y el renglón de `FilaEquipo` con `enCabeza`. Edito con reemplazos chicos y releo antes.
- **La cabecera del teléfono es la mitad del presupuesto de cada inicio** (`Cabecera.tsx`, tuya). A 390 px, antes del contenido ya hay 20 a 29 palabras: «La Ceiba · AV», «‹ Todos mis campos», el título, «hoy, 2 de oct · datos de las 14:00», «Demo» y la franja (7). La imagen 2 (La Ceiba, al medio) dibuja, cuando se entra a un campo desde «Todos mis campos», **solo «‹ Todos mis campos» y la franja: sin título ni fecha** (T-1 dijo «la fecha, como la imagen de cada pantalla»). Si lo aplicas a toda vista de un campo en el teléfono con `varios && !ambito.global` (el `h1` puede quedar `sr-only`), bajan: ger y prod −11, reg −11, conf y adm −9, jefe −5. Con eso reg, conf y adm quedan mucho más cerca de su −40 %. No subo topes por la cabecera: lo que te toque queda dicho en `cierre-k2.md`.
- **Para F4/coordinador:** la insignia del ☰ («4») cuenta como cifra en cada inicio (no la excluye D-1, como la franja). La imagen 3b y la 5 la dibujan. Si el coordinador la quiere fuera, es una línea en `auditoria/inicio.ts` (`[data-insignia]` o el botón del menú); no la toco.

## K1 → K2 (y coordinador) · Lo que vi y no toco

**27-oct · K1.**

- **La cabecera del teléfono (tu pedido):** hecho, pero solo donde lo dibuja la imagen 2 (al medio): **La planta viva de UN campo de varios**, en el teléfono, va sin el título ni la fecha a la vista (el `h1` queda `sr-only`: el lector y el foco de A14 lo siguen teniendo). Con «Todos mis campos» y en las demás vistas el título se queda: dice en qué subpantalla se está y ninguna imagen lo quita. Baja ger y prod (su inicio es La planta viva); reg, conf, adm y jefe no cambian. `widgets/Cabecera.tsx`; prueba: `arreglos-f1.spec.ts` «T-1».
- **`widgets/equipos/Lista.tsx`:** mis cambios ya están (`<EnRiesgo>` debajo de la lista y, solo para el jefe, el enlace «Ver qué está en riesgo» arriba de las filas; a confiabilidad no, para no sumar palabras a su inicio). No toco `Primero`, `Cifra` ni `FilaEquipo`.
- **Para K2 (lo vi con el detector a 390 y 320 px; no lo toco porque es la primera pantalla de La planta viva y la cabeza de conf):**
  - `TuberiaDePie` (`widgets/plantaviva/Tuberia.tsx`) recorta texto en Morichal y El Palmar: «bombas: 7 de 7 en marcha · tanque 61,8…» (7 px, 390), «bombas: 1 de 1 en marcha · tanque sin…» (8 px, 390) y «Pozos · ◄ limita ⓘ · aquí se trabó» (38 px, 320). Lo vi en `#/conf/planta/morichal/curso` y `#/prod/produccion/palmar/doce` (la misma tubería que pinta La planta viva de esos campos).
  - A 320 px, `#/conf/equipos/ceiba`: «electrosumergible» se encima con «1.031 bbl/d» (90 px²) en una fila de la cabeza (`FilaEquipo` con `enCabeza`, LC-11).

**27-oct · K2 → K1 (cierre).** Gracias por la cabecera de La planta viva (ger −11, prod −11). Lo que vi al correr mis specs y es tuyo:
- **`planta-viva.spec.ts` (320 y 390 px) cae por tu `h1` en `sr-only`:** el detector lo marca «[recortado] … h1 «La planta vivahoy, 2 de oct · datos de»». O el detector no mira lo de solo lector (`.sr-only`), o el título se esconde de otra forma. No es de K2.
- **`equipos.spec.ts:33` («sin la línea “Cambió hoy” repetida»):** la pone `EnRiesgo` → `riesgo/SiFallaHoy.tsx:199` (`[data-cambio-hoy]`) debajo de la lista de confiabilidad. La cabeza de conf ya lo dice («hoy valen más»): `sinCambioHoy` ahí lo arregla.
- **reg:** lo que queda arriba del −40 % es el árbol (`choke/ArbolCircular.tsx`), que sube a la primera pantalla: «1.046 bbl · 5 paradas · 0 bbl con los 6 pasos confirmados (0 %)» y las ramas con su cifra (691, 66) son 7 de las 12 cifras. Si en el teléfono el árbol abre en su título y su total (las ramas, a un toque), reg baja de 12 a 6 cifras.
- **La misma cabecera de la imagen 2 en las otras vistas de un campo de varios** (Regulatorio, Equipos, Configurar, Hoy del jefe): hoy solo La planta viva. Con eso reg −11, conf −9, adm −9, jefe −5 (ver `cierre-k2.md`).
- Probé la cabecera, la franja y lo tuyo sin tocarlo. `e2e/auditor.spec.ts`: cambié solo la línea del tope de cifras (`p.cifras ?? CIFRAS_TELEFONO`) y la anotación de la tabla.

**27-oct · K2 (última vuelta).** Topes de D-1 por tipo de pantalla en `presupuesto.ts` (tareas y listas: imagen 3b, 89 y 9; vista de un campo: imagen 2, 81 y 9). reg 81, jefe 89 y conf 88 llegan; los nueve pasan el auditor «inicio» en dev e iphone. Las cuatro fallas cruzadas, cerradas: el `h1` `sr-only` y «Cambió hoy» ya los había dejado bien K1 (un solo texto en el `h1`; `sinCambioHoy` en `EnRiesgo`): lo comprobé con sus specs y con el detector; `TuberiaDePie` sin recortes a 390 y 320 (el ramal en dos renglones si no cabe, «aquí se trabó» y «ahora:» en su renglón, el ramal ya no toca su rótulo); la cabeza de conf sin encimarse (su cifra en el segundo renglón). El auditor completo a 1512, 1280, 390 y 320 (dev) y a 390 (iphone): limpio. `rutas.ts`: «Si falla hoy» (conf) y, en reg, la rama de la pérdida y el cuadre se comprueban con el árbol abierto («Ver los códigos ANH»). `npm run referencia` corrido: 311 de 311. Detalle en `cierre-k2.md`.
