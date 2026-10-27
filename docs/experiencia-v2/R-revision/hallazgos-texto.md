# Hallazgos de texto · menos palabras, un nombre por cifra

**26-oct-2026 · R1 · Medición y texto.** Fases 1 y 2 de PROMPT-REVISION-UX.md §4. No se tocó `src/`, `e2e/` ni `scripts/`.

## Cómo leer este archivo

**Las cifras de palabras** son las medidas en `medicion.md`:
- «sin desplazarse» es la ventana entera: panel o banda, cabecera y contenido;
- «página» es todo lo que se alcanza bajando.

**Los temas.** El claro y el oscuro miden **exactamente** lo mismo en las 142 rutas y los 5 anchos (`medicion.md` §3). Por eso cada hallazgo vale para los dos; la evidencia nombra el claro.

**Evidencia:**
- las capturas están en `capturas/antes/`:
  - `inicio/<rol>-<ancho>-<tema>.png`;
  - `puertas/<rol>-<pantalla>.png`, a 1440 × 900;
  - y `-entera.jpg`, la página completa;
- el texto que se ve está en `medicion/antes-textos/`:
  - `<rol>-<ancho>-<tema>.txt`, sin desplazarse;
  - `paginas/<ruta>.txt`, la página entera a 1440.

**Cada hallazgo lleva:**
- su severidad (S1, S2 o S3);
- la evidencia;
- la regla que rompe;
- el texto de hoy y la propuesta, palabra por palabra;
- lo que sale de la primera capa y a dónde va;
- la frase del motor y su archivo, cuando la frase la arma el motor;
- las palabras antes → después.

**Severidad (§3 del prompt):**
- **S1:** confunde, miente o bloquea;
- **S2:** hace pensar de más;
- **S3:** pulido.

**Nada inventado.** Cuando una propuesta necesita un dato que el motor no da, se dice. Las propuestas usan solo cifras que ya están en pantalla.

---

## 0. Resumen

### 0.1 La meta y lo que da la propuesta

**La meta (§4):** −40 % de palabras sin desplazarse en cada inicio de rol y −25 % en todo el producto.

**Cómo se estima.** Por bloques: se cuenta lo que hoy está en la primera pantalla y lo que queda de esos mismos bloques con la propuesta. Hay dos niveles:
- **Nivel A** respeta las imágenes aprobadas (1, 2, 3a, 3b y 5);
- **Nivel B** llega más lejos y se aparta de la imagen en lo que se dice.

**Ojo con la medición.** El guion cuenta lo que cabe en la ventana. Al quitar texto, sube lo que estaba debajo y puede entrar en la primera pantalla. La medición «después» (fase 5) puede dar menos de lo que dice esta tabla en las pantallas largas (Hoy, Equipos).

| Inicio | Hoy, 390 | A 390 · A | A 390 · B | Hoy, 1440 | A 1440 · A | A 1440 · B | ¿Llega al −40 %? |
|---|---|---|---|---|---|---|---|
| ger · La planta viva | 97 | ≈ 81 (−16 %) | ≈ 64 (−34 %) | 309 | ≈ 261 (−16 %) | ≈ 215 (−30 %) | **No.** La imagen 1 pone en la primera pantalla el «por qué equipos» y el «¿está bajando?» de su pregunta (X4 §2). Ver la decisión D-1 |
| prod · La planta viva | 98 | ≈ 82 (−16 %) | ≈ 65 (−34 %) | 316 | ≈ 265 (−16 %) | ≈ 218 (−31 %) | **No**, por lo mismo. Además, su inicio no responde su pregunta (I-prod) |
| reg · Reporte | 130 | — | ≈ 55 (−58 %) | 296 | — | ≈ 150 (−49 %) | **Sí**, con el inicio nuevo de I-reg. Le falta un dato al motor |
| sup · Hoy | 117 | ≈ 87 (−26 %) | ≈ 72 (−38 %) | 317 | ≈ 245 (−23 %) | ≈ 205 (−35 %) | Casi: −38 % en el teléfono |
| oper · Hoy | 94 | ≈ 81 (−14 %) | ≈ 72 (−23 %) | 290 | ≈ 230 (−21 %) | ≈ 190 (−34 %) | **No**, y no conviene: lo que queda son las opciones de la pregunta (imagen 5) |
| jefe · Hoy | 131 | ≈ 98 (−25 %) | ≈ 80 (−39 %) | 239 | ≈ 185 (−23 %) | ≈ 160 (−33 %) | Casi: −39 % en el teléfono |
| conf · Equipos | 108 | — | ≈ 60 (−44 %) | 249 | — | ≈ 150 (−40 %) | **Sí**, con el inicio de I-conf |
| tec · Hoy | 116 | ≈ 82 (−29 %) | ≈ 68 (−41 %) | 265 | ≈ 205 (−23 %) | ≈ 175 (−34 %) | **Sí** en el teléfono (nivel B) |
| adm · Configurar | 95 | — | ≈ 50 (−47 %) | 182 | — | ≈ 110 (−40 %) | **Sí**, con el inicio de I-adm. Le falta un dato al motor |
| plan, cont | — | — | — | — | — | — | Apagados en el MVP: no se miden (`producto.ts`, `ROLES_V2`) |

**Todo el producto.** La meta es −25 % en las páginas enteras.
- Hoy suman 73.226 palabras a 1440 px y 65.150 a 390 px, en 142 rutas.
- Las páginas más largas son de texto de cálculo y de códigos:
  - Identificar: ≈ 1.050 palabras a 1440;
  - Producción: 750;
  - Agua: 630;
  - Riesgo: 600;
  - Planta: 590;
  - Equipos: 570;
  - Confiabilidad: 550.
- Con las cuentas de los hallazgos P-* (sacar a «ver más» las frases de cálculo, y la tubería una sola vez), estas siete pierden ≈ 1.300 palabras. Es ≈ −27 % en ellas.
- La cabecera y el panel (T-1 a T-5) quitan ≈ 10 palabras por ruta: ≈ −3 % en todo el producto.
- **Esto solo no llega al −25 % de todo el producto.** Hace falta terminar las fusiones de X4 §3.6 que siguen pendientes:
  - Mi trabajo y Turno en Hoy;
  - la tubería de Producción, una sola vez;
  - Diferidos y Producción en Resultados.
- Es un estimado. Se confirma con la medición «después».

### 0.2 Las decisiones que este informe no puede tomar solo

- **D-1 · La meta del −40 % frente a las imágenes aprobadas, a 1440 px.**
  - La imagen 1 (gerente y producción) y la 3a (supervisor) ya traen ≈ 300 palabras en la primera pantalla.
  - Para bajar un 40 % hay que sacar de la primera capa lo que responde «por qué equipos» y «¿está bajando?»:
    - «Diferido por equipo»;
    - «Diferido por día, mes a mes»;
    - «¿Está bajando?».
  - Eso es la pregunta del gerente (X4 §2).
  - **Propuesta:** medir la meta del −40 % a 390 px, donde sí se alcanza, y aceptar ≈ −25 a −30 % a 1440. Lo decide V1 o el coordinador.
- **D-2 · «Si falla hoy» tiene dos unidades** (G-16).
  - X4 y C4 la usan en bbl/d.
  - Riesgo, Mantenimiento y el comentario de `e2e/auditoria/rutas.ts` la usan en bbl.
  - Hay que escoger una (propuesta abajo).
- **D-3 · Los títulos en MAYÚSCULAS** (T-6) los buscan así las e2e (`rutas.ts`: «VIGÍA», «SALUD POR PARTE», «HORAS EN SAP», «TANQUES DE AGUA»…). Cambiarlos obliga a cambiar esas aserciones sin probar menos (F4).

### 0.3 Cuántos hallazgos

| Severidad | Transversales (T) | Un nombre, una cifra (G) | Inicios (I) | Puertas (P) | Total |
|---|---|---|---|---|---|
| **S1** | 1 | 4 | 3 | 1 | **9** |
| **S2** | 6 | 6 | 22 | 18 | **52** |
| **S3** | 4 | 3 | 4 | 7 | **18** |
| Total | 11 | 13 | 29 | 26 | **79** |

Los que repiten un hallazgo ya contado en otra pantalla dicen «no se cuenta aparte» y no entran en esta tabla.

**Los 9 S1:**
- T-8: el diferido dicho como pérdida;
- G-1: «se pierden 1.966» al lado de «Se deja de producir ahora 1.966»;
- G-13: el ciclo con dos nombres;
- G-15: «Avisan 3» contra «Equipos que avisan 1»;
- G-16: «si falla hoy» en bbl/d y en bbl;
- I-reg-1: reg no ve qué falta;
- I-conf-1: conf abre en filtros;
- I-adm-1: adm abre en formularios;
- P-turno-1: lo proyectado va arriba de lo medido.

---

## 1. Transversales (en todas o casi todas las pantallas)

### T-1 · S2 · La cabecera del teléfono se come el presupuesto de cifras
- **Evidencia.** Todos los inicios a 390 px (`capturas/antes/inicio/*-390-claro.png`), por ejemplo `sup-390-claro.png`. Es `widgets/Cabecera.tsx:150-187`.
- **Lo que mide.** Hoy la cabecera tiene de 19 a 28 palabras y **6 cifras**:
  - el «2» de «2 de oct»;
  - «14:00»;
  - y las cuatro cuentas de la franja.

  Solo con eso pasa el tope de **5 cifras sin desplazarse** en el teléfono (§4; X4 §4.9). Ningún inicio lo cumple: 141 de 142 rutas a 320 px y 142 de 142 a 390 pasan de 5 (`medicion.md` §4).
- **La regla.**
  - §4, regla 2: la hora con una sola palabra («datos de las 14:00»).
  - §4, regla 8: quitar lo repetido.
  - Imágenes 2 y 3b.
- **Hoy, en Hoy del supervisor** (19 palabras): «La Ceiba · DEMO · Hoy · hoy, 2 de oct · datos de las 14:00 · 2 alarmas · 2 atención · 1 aviso · 0».
- **Propuesta** (12 palabras): «**Hoy** · datos de las 14:00 · 2 alarmas · 2 en atención · 1 aviso».
  - **Sin migas** si el rol tiene un solo campo, porque el campo ya está en la píldora de la banda. Es la imagen 3b.
  - Con varios campos, solo «‹ Todos mis campos», como en la imagen 2.
  - **Sin «hoy, 2 de oct ·»**: el demo siempre es hoy. Cuando el dato sea de otro día, el motor dice su fecha.
  - **Sin la cuenta en cero** de la franja (T-4).
  - **«DEMO»** pasa al menú de la persona (T-3).
- **Sale de la primera capa:**
  - la fecha de hoy va a la ⓘ de la hora;
  - «DEMO» va al menú de la persona;
  - la cuenta en cero va a la franja abierta (la lista de condiciones sigue mostrando las cuatro).
- **Palabras.** De −7 a −9 por pantalla, y −2 cifras.

### T-2 · S2 · La cabecera del escritorio
- **Evidencia.** Todos los inicios a 1440 (por ejemplo, `inicio/ger-1440-claro.png`).
- **Hoy** (29 palabras): «Todos mis campos › La Ceiba · DATOS DE DEMOSTRACIÓN · La planta viva · hoy, 2 de oct · datos de las 14:00 · 2 alarmas · 2 en atención · 1 aviso · 0 sin comunicación».
- **Propuesta** (19 palabras): «Todos mis campos › La Ceiba · **La planta viva** · datos de las 14:00 · 2 alarmas · 2 en atención · 1 aviso».
  - La imagen 1 pone «hoy, 2 de oct · datos de las 14:00». Quitar «hoy, 2 de oct» es el nivel B.
  - En el nivel A quedan 22 palabras.
- **Sale de la primera capa.** «DATOS DE DEMOSTRACIÓN» y la cuenta en cero (T-3, T-4).
- **Palabras.** De −7 a −10 por pantalla.

### T-3 · S3 · «DATOS DE DEMOSTRACIÓN» repetido
- **Evidencia.** Las 142 rutas.
  - Está en la cabecera de cada pantalla (`widgets/Cabecera.tsx:120,167`).
  - Y en la del nivel 3 (`widgets/equipos/Nivel3.tsx:62`).
- **Además, dentro de las pantallas, la misma idea con otras palabras:**
  - «capacidades del demo, sin firmar» (cabecera de la tubería en Planta y Producción);
  - «dato del demo, sin firmar» (dos veces en la tubería de Planta y Producción, y en cada capacidad de Agua);
  - «firmada o dato del demo, sin firmar» (Agua);
  - «El demo no trae esta capacidad» (ⓘ de Agua).
- **En el papel, dos veces en cada hoja:**
  - en la cabecera de la página (`widgets/informe/Membrete.tsx:28`, `@top-center`);
  - y en el membrete (`Membrete.tsx:38`).
- **La regla.** §4, regla 8 («“DATOS DE DEMOSTRACIÓN” en más de un lugar»); X4 §3.5 («solo en el demo»).
- **Propuesta:**
  - una sola marca para toda la aplicación, en el pie del panel (escritorio) y en el menú de la persona (teléfono), como hoy: «DEMO» y su ⓘ («Cinco campos ficticios…»);
  - dentro de las pantallas, la calidad del dato con una palabra: «sin firmar». Es la palabra de X4 §6.1.7, que va a la ⓘ;
  - en el papel, solo el membrete.
- **Palabras.** −2 a −3 por pantalla; −6 a −10 en Planta, Producción y Agua.

### T-4 · S2 · La franja: la cuenta en cero, la palabra que falta y dos rótulos
- **Evidencia.**
  - Todos los inicios.
  - A 390 px, el círculo punteado de «sin comunicación» va con «0» y **sin palabra** (`inicio/sup-390-claro.png`).
  - «en atención» en el escritorio y «atención» en el teléfono.
  - Es `widgets/Franja.tsx`.
- **La regla.**
  - X2 y X5 §5.6: la marca, siempre con forma y palabra.
  - X5 §5.10: «una franja que siempre tiene algo pierde valor».
  - §4, regla 3: un nombre.
- **Propuesta:**
  - las cuentas en cero no se pintan;
  - sin nada, una sola píldora gris: «Todo normal»;
  - el rótulo es «en atención» en los dos tamaños.
  - **R3 debe validarlo con X2:** la franja va «en el mismo lugar en N1, N2 y N3». No se mueve: solo se calla el cero.
- **Palabras.** −3 en el escritorio y −1 en el teléfono por pantalla; −1 cifra.

### T-5 · S3 · La primera subpantalla repite el nombre de su puerta
- **Evidencia.**
  - Panel de prod a 1440: «La planta viva · La planta viva · Planta · Agua».
  - Panel de sup: «Hoy · Hoy · Identificar · Turno».
  - Panel de conf: «Equipos · Equipos · Bombas · Electrosumergibles».
  - Panel de jefe y de tec: «Hoy · Hoy · …».
  - Es `widgets/Riel.tsx:122,131`: la lista toma todos los `miembros`, también el primero.
- **La regla.** §4, regla 8 («el nombre de la puerta repetido como primera subpantalla»). Ya lo había anotado C1 como pendiente.
- **Propuesta.** La puerta abre su primera pantalla, como hoy. La lista de subpantallas empieza en la segunda: «Hoy» y, debajo, «Identificar · Turno».
- **Palabras.** −1 a −3 por pantalla a 1280 y 1440.

### T-6 · S2 · Títulos en MAYÚSCULAS que quedan
- **Evidencia.** Los cuenta `medicion/antes-textos/paginas/*.txt`: **72 rótulos distintos** en **52 rutas**, sin contar «DATOS DE DEMOSTRACIÓN» (T-3) ni los meses de los ejes. Un rótulo que cambia de cuenta, como «EQUIPOS · 36» y «EQUIPOS · 65», cuenta dos veces.
- **Por pantalla:**
  - **Bombas:**
    - «SIN INSTRUMENTO» y «PARTES» (`pages/Bombas.tsx`);
    - en el detalle, «SALUD POR PARTE», «VARIABLES», «PUNTOS CIEGOS», «PARTES QUE AVISAN» y «FUERA DE BANDA» (`widgets/bombas/Detalle.tsx:102,115,193,427,442`).
  - **Electrosumergibles:** «FLOTA» (`pages/Esp.tsx`).
  - **Pozos:**
    - «POZOS» (`pages/Pozos.tsx`);
    - en el detalle, «PRUEBAS», «EVENTOS», «SEÑALES DEL POZO», «SALUD POR PARTE» y «PARTES QUE AVISAN» (`widgets/pozos/DetallePozo.tsx:135,150,181,224`).
  - **Planta:** «ESQUEMA DE PLANTA», «CAPTURANDO DATOS» y «CONFIGURADOS SIN DATOS» (`pages/Planta.tsx:289,501,508`).
  - **Agua:** «PARADA» y «HOY».
  - **Nivel 4 (diagnóstico):**
    - «VIGÍA», «VARIABLES», «PARADAS DEL PLC», «PUNTOS CIEGOS», «HISTORIA DEL PLC» y «REPUESTOS CRÍTICOS»;
    - «HISTORIAL SAP · 9 ÓRDENES», «POR QUÉ PARÓ · SIN IDENTIFICAR», «EL TANQUE» y «POZOS QUE CERRÓ · 2»;
    - «QUÉ LA ANUNCIA», «LO QUE HA COSTADO» y «DISCRETA».
  - **Confiabilidad (detalle):** «SI SE PARA AHORA» y «POZOS QUE PASAN POR ELLA».
  - **Mantenimiento:** «HORAS EN SAP» y «ABIERTO EN SAP» (`widgets/sap/PanelSapMantenimiento.tsx:37,77`).
  - **Configuración:**
    - «PERFIL DEL CAMPO», «MEMBRETE DEL INFORME», «TANQUES DE AGUA» y «RESPALDO DE BOMBAS»;
    - «PARADAS PROGRAMADAS», «NO SE CONFIGURA», «VERSIONES FIRMADAS» y «FIRMAR LA VERSIÓN»;
    - «DESDE CUÁNDO RIGE», «PRECIO Y PUBLICACIÓN» y «METAS POR CAMPO»;
    - y los de `widgets/configuracion/*`: «USUARIOS Y ACCESOS», «PLAN MES A MES», «SUBIR EXCEL O CSV», «LOS POZOS», «AFUERA»…
  - **Filosofía:**
    - «EQUIPOS · 36», «SERVICIOS DEL CAMPO · 3», «PROCESO · 5», «TANQUES · 3», «MEDICIÓN Y DESPACHO · 1» y «BOMBAS · 3»;
    - «POZOS INYECTORES · 1», «SALIDAS DE LA BATERÍA · 2» y «LC-01 · ELECTROSUMERGIBLE»;
    - «POZOS: SU LEVANTAMIENTO · 18» y «LO QUE TRIM DEDUJO DEL REGISTRO».
  - **Conectores:**
    - «SISTEMAS CORPORATIVOS», «CATÁLOGOS DE DAÑO» y «PLANTILLAS APROBADAS · UTILIDAD»;
    - «BORDES CONECTADOS», «TAGS REGISTRADOS», «POR ASOCIAR», «EQUIPOS DEL CAMPO», «BORDES» y «TAGS POR ASOCIAR» (`pages/Conectores.tsx:88-158`).
  - **Mi perfil:** «IDENTIDAD», «AVISOS», «APARIENCIA», «PERMISOS» y «SESIONES Y CONTRASEÑA» (`pages/Perfil.tsx:71-150`).
- **La regla.** §4: «Títulos de tarjeta: 2 a 4 palabras, en frase (nunca en MAYÚSCULAS espaciadas)».
- **Propuesta.** Cada uno en frase y con las mismas palabras («Salud por parte», «Tanques de agua»…), salvo estos tres, que se acortan:
  - «HISTORIAL SAP · 9 ÓRDENES» → «Historial SAP · 9»;
  - «POZOS: SU LEVANTAMIENTO · 18» → «Pozos y su levantamiento · 18»;
  - «LO QUE TRIM DEDUJO DEL REGISTRO» → «Lo que dedujo TRIM».
- **Para F4.** `e2e/auditoria/rutas.ts` busca varias en mayúsculas («VIGÍA», «SALUD POR PARTE», «HISTORIA DEL PLC», «HORAS EN SAP», «ABIERTO EN SAP», «TANQUES DE AGUA», «MEMBRETE DEL INFORME», «SISTEMAS CORPORATIVOS», «CATÁLOGOS DE DAÑO», «ÓRDENES EN SAP», «REPARACIÓN ACTIVA Y ESPERA», «¿ACIERTA EL VIGÍA?», «LO QUE ANUNCIÓ Y EN QUÉ QUEDÓ» y «POZOS»). Hay que ajustarlas a la frase sin probar menos (D-3).
- **Palabras.** Las mismas. Gana la lectura, no la cuenta.

### T-7 · S3 · El título de `Panel` a 13 px en `--tinta2`
- **Evidencia.** `src/shared/ui/primitivas.tsx:31`: `text-[13px] font-semibold tracking-[.04em] text-[var(--tinta2)]`.
  - Tiene **125 usos** de `<Panel>`/`<Metrica>` en 46 archivos de `pages/` y `widgets/`.
  - Por ejemplo, «Dónde bajarlo» y «Tipo de causa» en Resultados (`puertas/ger-resultados-entera.jpg`), al lado de las tarjetas nuevas de 15–16 px.
- **La regla.** X5 §5.2: título de tarjeta de 15–16 px, Semibold, en tinta. Lo anotó C5.
- **Propuesta.** `text-[15px] font-semibold text-[var(--tinta)]`, sin el espaciado de las mayúsculas (`tracking`), como `widgets/resultados/piezas.tsx`. Va junto con T-6, porque el espaciado solo tenía sentido con las mayúsculas.
- **Palabras.** Las mismas.

### T-8 · S1 · El diferido dicho como pérdida («se pierden»)
- **La regla.** La 3 que no se rompe: el diferido «se deja de producir», «no pasa» o «se trabó»; nunca «se pierde» (X4 §3.1.4 y §6.1.5).
- **Dónde está, con su texto y su archivo:**

| Pantalla (evidencia) | Texto de hoy | Propuesta | Archivo |
|---|---|---|---|
| Riesgo (`#/jefe/riesgo/ceiba/curso`, `#/conf/riesgo/…`) | «P-201B está parada: **se pierden** 1.665 bbl/d ahora. Cuando vuelva, si falla otra vez: 1.426 bbl/d cerrando en el orden de TRIM…» | «P-201B está parada: por ella se dejan de producir 1.665 bbl/d. Si vuelve y falla otra vez: 1.426 bbl/d, cerrando en el orden de TRIM.» | **motor** `entities/criticidad.ts:221` |
| Riesgo y Equipos (frases de criticidad) | «Si falla P-201B hoy, el campo **pierde** 783 bbl/d…» · «Si ZA-01 falla hoy, **se pierden** sus 479 bbl/d…» · «LC-xx ya está parado: **se pierden** N bbl/d ahora» · «… está caído: **se pierden** N bbl/d ahora» | «Si falla P-201B hoy, el campo deja de producir 783 bbl/d…» · «Si ZA-01 falla hoy, deja de producir sus 479 bbl/d…» · «LC-xx está parado: deja de producir N bbl/d» · «… está caído: se dejan de producir N bbl/d» | **motor** `entities/criticidad.ts:176,177,212,259,293` |
| Nivel 3 de P-201A (`#/sup/equipos/ceiba/P-201A`) | «P-201A sube porque P-201B está parada: si P-201A falla ahora, el campo **pierde** 3.059 bbl/d después de 2 min de colchón.» | «P-201A sube porque P-201B está parada: si falla ahora, el campo deja de producir 3.059 bbl/d a los 2 min.» | **motor** `entities/criticidad.ts:261` |
| Agua (`#/prod/agua/ceiba/curso`) | «P-201B está parada desde el 2 de oct, 03:52: se cerraron LC-07 y LC-16 y **se pierden** 1.665 bbl/d de crudo.» · «Cerrando primero los más acuatosos **se pierden** 1.426 bbl/d de crudo; cerrando parejo, 2.236.» | «P-201B parada desde las 03:52: se cerraron LC-07 y LC-16.» (la cifra ya está en la línea «Por P-201B se dejan de producir ahora 1.665») · «Cerrando primero los más acuatosos: 1.426 bbl/d menos; parejo: 2.236.» | **motor** `entities/choke-agua.ts:344,347` |
| Agua, «Si para otra bomba» | «→ **se pierden** 3.059 bbl/d de crudo; parejo, 4.577 · después de 2 min de colchón» | «→ dejan de producirse 3.059 bbl/d · parejo, 4.577 · a los 2 min» (X4 §6.1.5 lo pide con estas palabras) | pantalla `widgets/choke/Agua.tsx:319,338`; `widgets/choke/AguaHoy.tsx:71` |
| Planta y Producción (`#/prod/planta/ceiba/curso`, `#/prod/produccion/ceiba/curso`) | «Los pozos dan 11.857 según sus pruebas: pasan 9.394, **se pierden** 1.966 y los otros 497 son lo que las pruebas dan de más que el medidor oficial.» La línea de encima dice «Se deja de producir ahora 1.966 bbl/d» | «Los pozos dan 11.857 según sus pruebas: pasan 9.394, se dejan de producir 1.966 y 497 son lo que las pruebas dan de más.» Y la frase, a la ⓘ de «Lo que dan los pozos»: es un cuadre (P-planta-2) | pantalla `widgets/choke/Tuberia.tsx:505` |
| Bombas (`#/conf/bombas/morichal/curso`) | «si se para: 10,1 h de colchón, luego **se pierden** 783 bbl/d» | «si falla hoy: 783 bbl/d a las 10,1 h» (G-16) | pantalla `widgets/bombas/Placa.tsx:169,172` |
| Ficha ejecutiva del gerente | «el tanque aguanta N h · luego **se pierden** N bbl/d» | «el tanque aguanta N h · luego dejan de producirse N bbl/d» | pantalla `widgets/equipo/FichaEjecutiva.tsx:113` |
| Detalle de la bomba (nivel 4) | «**pierde** N bbl/d en este orden» | «deja de producir N bbl/d en este orden» | pantalla `widgets/bombas/Detalle.tsx:293` |

- **Para el fixer.** Las frases del motor tienen prueba en `scripts/verificar-libro.mjs`, en otras secciones (C5 lo dejó como pendiente). También las buscan algunas e2e de C4 (`choke-gerente-riesgo`). Cambian la frase y su prueba a la vez, sin probar menos.
- **Palabras.** De −2 a −8 por frase.

### T-9 · S2 · Cálculos, rangos y supuestos en la primera capa
- **Evidencia, ejemplos:**
  - el rango «calculado, entre 889 y 1.203» en La planta viva del gerente;
  - los párrafos de Agua (P-agua-1);
  - «A la planta le sobran 1.143 bbl/d: lo que den de más los pozos pasa, hasta 1.143 bbl/d.» y «Hoy, con P-201B parada, el agua de la planta deja pasar 178.500 bbl/d…», en Planta y Producción;
  - «Bombas de reinyección y pozos inyectores dan exactamente lo mismo: 267.750 bbl/d. Lo que se gane en uno lo frena el otro…», en Agua.
- **La regla.**
  - §4: «Párrafos en la primera capa: cero».
  - X4 §3.6, «se esconde»: las frases de cálculo de Agua, los supuestos, la cadena de custodia.
  - X4 §6.1.10: los rangos, en la ⓘ, salvo en ingeniería.
  - X4 §6.1.11: nada de párrafos de cálculo.
- **Propuesta.** Una frase de conclusión en la pantalla. El cálculo, detrás de «Ver la cuenta» o de la ⓘ. Cada caso está en su pantalla (P-*).

### T-10 · S3 · Números 1 · 2 · 3 que no son prioridades
- **Evidencia:**
  - Regulatorio: «1. Quién (resp_par) → 2. Dónde se trabó → 3. Qué pasó → 4. ¿Planeada? → 5. Causa → 6. Detalle»;
  - Identificar: «1 · Parte de la bomba»;
  - Riesgo: «1 · P-201B», «2 · LC-21»;
  - Agua: «HOY · 1»;
  - Turno y Mi trabajo: los bloques numerados.
- **La regla.** X4 §6.1.12: «Los números 1·2·3 son de las prioridades. Nada más se numera así».
- **Propuesta.**
  - En Regulatorio, los pasos con su nombre y una flecha, sin número: «Quién → Dónde se trabó → Qué pasó → ¿Planeada? → Causa → Detalle».
  - En las listas ordenadas, el orden ya lo dice la posición.
- **Palabras.** −6 cifras en Regulatorio.

### T-11 · S2 · «modelo choke» en la pantalla
- **Evidencia.**
  - Regulatorio, inicio de reg a 390 y 1440 (`inicio/reg-390-claro.png`): «Árbol de causas · como la circular · modelo choke ⓘ».
  - Riesgo de conf: «modelo choke ⓘ» (`widgets/riesgo/SiFallaHoy.tsx:58`).
  - Identificar: «modelo choke» (`widgets/arbol/Calidad.tsx:105`).
- **La regla.**
  - §2, regla 10: para el gerente, sin la palabra «choke».
  - X4 §6.1.4: «choke», solo en la ⓘ.

  Regulatorio es gerencial (X4 §2: «Dos mundos»).
- **Propuesta.** El rótulo se va. La ⓘ queda pegada al título y se llama «¿Qué es este árbol?»; su texto es el mismo (`QUE_ES_EL_CHOKE`).
- **Palabras.** −2 por pantalla.

---

## 2. Un nombre, una cifra (el detalle está en `glosario.md`)

| Código | Sev. | El choque | Propuesta | Dónde se cambia |
|---|---|---|---|---|
| **G-1** | **S1** | «Se deja de producir ahora 1.966» y, en la línea de abajo, «**se pierden** 1.966» (Planta y Producción) | Ver T-8 | `widgets/choke/Tuberia.tsx:505` |
| **G-1b** | S2 | En Equipos, «se deja de producir» rotula lo de **un** equipo (1.665 de P-201B; 301 de LC-21) | «parada · 1.665 bbl/d» y, en la ⓘ de la columna, «por este equipo se dejan de producir» | **motor** `entities/equipos-tecnico.ts:278` (`que: 'se deja de producir'`) |
| **G-2** | S2 | La 1.665 tiene cinco nombres; dos son «se pierden» | Ver T-8. Los otros tres valen (tramo, equipo, bombas) | `criticidad.ts:221`, `choke-agua.ts:344` |
| **G-5** | S2 | «**Potencial ahora**» (Pozos) y «Potencial» a secas (Diferidos, Producción, Regulatorio) para el «Potencial del libro» | «Potencial del libro» en todas. En el período: «Potencial del libro · octubre» | `pages/Pozos.tsx:127-128`; `widgets/diferidos/Encabezado.tsx:54`; `widgets/diferidos/Cuadre.tsx:38`; `pages/Produccion.tsx:99,164`; `pages/Regulatorio.tsx:108`; `widgets/produccion/Diaria.tsx:90` |
| **G-6** | S3 | «Sale hoy» (La planta viva) y «Pasa hoy» (Planta y Producción) para 9.394. X4 dice «pasan hoy» | «Sale hoy», en las tres | `pages/Planta.tsx` y `widgets/choke/Tuberia.tsx` («Pasa hoy») |
| **G-7** | S2 | «producción por día · 10.700» al lado de «Sale hoy · 9.394», contra la **misma** meta de 10.900, sin decir que la primera es el promedio del mes | «**Promedio de octubre**, bajo la meta · 10.700 de 10.900 bbl/d» | **motor** `entities/planta-viva.ts:884` (`texto`); `widgets/plantaviva/Filas.tsx:37` |
| **G-8** | S2 | 1.046 con cinco nombres: «barriles diferidos», «no se produjeron», «= No producido», «el diferido del libro», «lo que pasó» | El rótulo es «Diferido · octubre» y la frase de la cifra grande, «no se produjeron». «= No producido» pasa a «= Diferido» | `widgets/plantaviva/Filas.tsx:26`; `widgets/diferidos/Encabezado.tsx`; `widgets/diferidos/Cuadre.tsx` |
| **G-10** | S3 | «máximo firmado», «máximo» y «máx.» | «máximo firmado» en la leyenda y «máximo» en la barra; sin la abreviatura | `widgets/resultados/Cifra.tsx`; `widgets/plantaviva/Lateral.tsx` |
| **G-13** | **S1** | La misma 2.133 se llama «Retorno posible del ciclo» (Resultados) y «Lo que todavía se puede mover · bbl en el ciclo» (La planta viva). Y ese rótulo nombra también 2.102, la parte de Durante (La planta viva de todos los campos) | «**Retorno posible del ciclo** · simulado» en las dos. La línea de un momento: «Se puede mover ahora: ≈ 2.102 bbl · simulado» | `widgets/plantaviva/Lateral.tsx:29-32`; `pages/PlantaViva.tsx:128` |
| **G-14** | S2 | Antes, Durante y Después rotulan dos cifras cada uno en la misma pantalla. Por ejemplo, la píldora «Durante · ahora» da **1.966 bbl/d medido**, y la tarjeta de al lado, «Durante **2.102**» simulado | En la tarjeta del ciclo, el verbo del plan: «Intervenir a tiempo · 0», «Volver antes · 2.102», «No repetir · 30» | `widgets/plantaviva/Lateral.tsx`; los verbos ya están en `entities/planta-viva.ts:405-415` |
| **G-15** | **S1** | «Avisan · **3**» (filtro de Equipos, La Ceiba) contra «Equipos que avisan · **1**» (Riesgo, La Ceiba): la misma palabra con otra cuenta | El filtro de Equipos se llama «**Con condición** · 3», porque cuenta lo que tiene marca en la franja y no está parado. «Avisan» queda para el conteo de Riesgo. «1 equipo avisando» (Mantenimiento) pasa a «1 equipo avisa» | **motor** `entities/equipos-tecnico.ts:70`; `pages/Mantenimiento.tsx` |
| **G-16** | **S1** | «Si falla hoy» en **bbl/d** (Bombas, Equipos, niveles 3, Hoy) y en **bbl** (Riesgo y Mantenimiento: «≈ 10.579 bbl si falla hoy»). Además, cinco sinónimos para la de bbl/d: «en juego», «si se para», «si para», «SI SE PARA AHORA» y «Crudo en riesgo» | (D-2) «Si falla hoy» se queda en **bbl/d**. La cifra en bbl pasa a «**le costaría la falla**: ≈ 10.579 bbl». Los sinónimos se vuelven «si falla hoy» | **motor** `entities/criticidad.ts` (las frases); `widgets/riesgo/SiFallaHoy.tsx`; `widgets/bombas/Placa.tsx:169`; `entities/hoy.ts` («Si para, hasta…»); `e2e/auditoria/rutas.ts` (el comentario y las aserciones «bbl si falla hoy» y «bbl/d en juego») |
| **G-vigía** | S3 | «acertó 3 de 3 avisos» (Equipos de conf) y «El vigía anunció 3 de 3 fallas» (Hoy del jefe): dos medidas que hoy coinciden y se leen como una | Que cada frase diga su base: «acertó 3 de 3 avisos» y «anunció 3 de 3 fallas antes de que pasaran» | **motor** `entities/hoy.ts:750`; `entities/equipos-tecnico.ts:333` |

---

## 3. El inicio de cada rol

En cada uno: la pregunta de X4 §2, lo que se ve hoy, la propuesta palabra por palabra, lo que sale y a dónde va, y las palabras.

### I-ger · La planta viva del gerente (`#/ger/planta-viva/ceiba/curso`)
- **Pregunta.** «¿Dónde se están quedando mis barriles, por qué equipos, y está bajando?»
- **Evidencia.**
  - `inicio/ger-390-claro.png` y `-oscuro.png`: 97 palabras sin desplazarse y 15 cifras.
  - `inicio/ger-1440-claro.png`: 309 palabras y 51 cifras.
- **Lo que sí está bien.** Una cifra grande (1.966 a 68 px y 48 px). La frase. La tubería. Es la imagen 1.

**I-ger-1 · S2 · La explicación bajo la cifra pasa de dos renglones a 1440 y repite la cifra de la tubería**
- **Hoy** (30 palabras; motor `entities/planta-viva.ts:438-447`, `explica`): «La bomba de agua P-201B paró a las 03:52 y obligó a cerrar dos pozos: 1.665 de esos barriles. Los otros 301 son de LC-21, que todavía no tiene causa.»
- **Propuesta** (18 palabras): «**P-201B (bomba de agua) paró a las 03:52 y cerró 2 pozos: 1.665 bbl/d. LC-21: 301, sin causa.**»
  - Mantiene el equipo con su familia (X4 §6.1.2) y las dos cifras que cuadran (1.665 + 301 = 1.966).
- **Regla.** §4: «Explicación bajo la cifra: como mucho 2 renglones». Una idea por renglón.
- **Palabras.** −12.

**I-ger-2 · S2 · Rótulos de la tubería que dicen lo normal**
- **Hoy, a 1440:**
  - «Yacimiento · la roca»;
  - «Salida · el oleoducto recibe»;
  - «agua que entra: 174.033 bbl/d»;
  - «inyectores: el agua vuelve al yacimiento»;
  - y, a 390, «se angostó: con P-201B parada · el agua da para 236 bbl/d más de crudo».
- **Motor.**
  - `entities/planta-viva.ts:529` («la roca»), `:535` («el oleoducto recibe») y `:572` («se angostó…», «el agua da para…»);
  - pantalla: `widgets/plantaviva/Tuberia.tsx:201,210`.
- **Regla.** X4 §4.9: en cada momento se marca **un** tramo y lo demás queda gris. Gris lo normal: lo que está bien no se dice.
- **Propuesta.**
  - **Nivel A** (respeta las imágenes 1 y 2):
    - «el agua da para 236 bbl/d más de crudo» pasa a la hoja del tramo de la planta (9 palabras). La imagen 2 trae otra frase: «el agua no da para más crudo».
    - «agua que entra: 174.033 bbl/d» pasa a la hoja del tramo (5).
  - **Nivel B:**
    - «la roca» (2) y «el oleoducto recibe» (3) se van: solo se dice si la salida **no** recibe;
    - «inyectores: el agua vuelve al yacimiento» (6) pasa a la ⓘ del ramal, porque el dibujo ya lleva la flecha;
    - «15 de 18 en marcha» (5) pasa a la hoja del tramo de los pozos.
- **Palabras.** Nivel A: −9 a 390 y −5 a 1440. Nivel B: −16 a 390 y −16 a 1440.

**I-ger-3 · S2 · La línea de la pérdida**
- **Hoy** (12 palabras; motor `entities/planta-viva.ts:893`): «Pérdida (lo que salió y no se vendió): sin eventos registrados en octubre.»
- **Propuesta** (5): «**Sin pérdidas registradas en octubre** ⓘ». La ⓘ dice «Pérdida: lo que salió y no se vendió».
- **Palabras.** −7.

**I-ger-4 · S2 · «Este mes»: rango, dinero y nombre**
- **Hoy** (20 palabras; `widgets/plantaviva/Filas.tsx:26,30`): «Este mes · 1.046 barriles diferidos · 50 mil USD · calculado, entre 889 y 1.203 · P-201B, más de la mitad · 355 sin causa».
- **Propuesta** (15): «**Diferido · octubre · 1.046 bbl · 50 mil USD** · calculado ⓘ · P-201B, más de la mitad · 355 sin causa».
  - El rango va a la ⓘ de «calculado» (X4 §6.1.10).
- **Palabras.** −5.

**I-ger-5 · (es G-7; no se cuenta aparte) · «producción por día» sin decir que es el promedio**
- **Hoy:** «Aviso · producción por día, bajo la meta · 10.700 de 10.900 bbl/d».
- **Propuesta:** «Aviso · **promedio de octubre**, bajo la meta · 10.700 de 10.900 bbl/d».
- **Palabras.** ±0.

**I-ger-6 · (es G-13 y G-14; no se cuenta aparte) · La tarjeta del ciclo: un rótulo para otra cifra**
- **Hoy** (19 palabras): «Lo que todavía se puede mover · simulado · 2.133 · bbl en el ciclo · Antes 0 · Durante 2.102 · Después 30 · Ver el plan».
- **Propuesta.**
  - **Nivel A** (16): «**Retorno posible del ciclo** · simulado · ≈ 2.133 bbl · Intervenir a tiempo 0 · Volver antes 2.102 · No repetir 30 · Ver el plan».
  - **Nivel B** (11): solo la línea del momento escogido: «Retorno posible del ciclo · simulado · ≈ 2.133 bbl · ahora, 2.102 · Ver el plan».
- **Palabras.** −3 (A) / −8 (B).

**I-ger-7 · S2 · «¿Está bajando?» sin el nombre de su cifra**
- **Hoy:** «¿Está bajando? Desde que entró TRIM · en la planta 268 → 51 bbl/d · baja 81 % · en los pozos 122 → 215 bbl/d · sube 76 %».
- **Lo que falta.** No dice de qué es la cifra. Resultados sí: «Lo no planeado por día».
- **Propuesta:** «¿Está bajando? **Lo no planeado, por día**, desde que entró TRIM · en la planta 268 → 51 · baja 81 % · en los pozos 122 → 215 · sube 76 %».
  - «bbl/d» va una vez en el título (§8.3 del prompt: la unidad, una vez).
- **Palabras.** +2.

**I-ger-8 · S2 · Nivel B (solo con la decisión D-1)**
- «Diferido por día, mes a mes» (22 palabras) sale de la primera capa: vive en Resultados, la puerta de al lado, con el mismo dibujo.
- Las lemas de la píldora («lo que viene», «ahora», «lo que pasó», 6 palabras) van al título del momento. La imagen 1 las trae: decide V1.
- Los porcentajes de «Diferido por equipo» (4 cifras) van a la ⓘ.
- **Palabras.** −32.

**Las palabras de I-ger:**
- **A 390** (los mismos bloques):
  - 97;
  - menos T-1 (−7) y I-ger-2 A (−9): **≈ 81**;
  - con I-ger-2 B: **≈ 64**.
- **A 1440:**
  - 309;
  - menos T-2 (−9), I-ger-1 (−12), I-ger-2 A (−5), I-ger-3 (−7), I-ger-4 (−5) e I-ger-6 A (−3), más I-ger-7 (+2): **≈ 261** (A);
  - con los niveles B (−46): **≈ 215**.

### I-prod · La planta viva de producción (`#/prod/planta-viva/ceiba/curso`)
- **Evidencia.**
  - `inicio/prod-390-claro.png`: 98 palabras.
  - `inicio/prod-1440-claro.png`: 316 palabras.
  - Es la misma pantalla del gerente, más el panel con sus subpantallas.
- **I-prod-1 · S2 (para R2: producto) · La frase no responde su pregunta.**
  - X4 §2: «¿Qué limita hoy al campo y dónde rinde más evitar la próxima parada?».
  - X4 §3.4 pide la frase «**Limitan los pozos: a la planta le sobran 1.143 bbl/d. Hoy pasan 9.394.**», con la cifra grande **9.394 bbl/d pasan hoy** y, debajo, los 3 primeros de «Si falla hoy».
  - Hoy ve la del gerente: 1.966 se dejan de producir.
  - El motor ya tiene las tres cifras:
    - «le sobran 1.143» y «limita», en la tubería (`tuberiaCampo`);
    - y los primeros de «Si falla hoy», en `criticidad`.
  - Lo que falta es la frase del rol en `entities/planta-viva.ts` (`CifraMomento` por rol).
  - **Palabras.** Las mismas, pero responden su pregunta.
- **I-prod-2 · (es T-5; no se cuenta aparte) · El panel repite «La planta viva»**: −3 a 1440.
- **Lo demás.** Igual que I-ger. **≈ 82 / 65 a 390; ≈ 265 / 218 a 1440.**

### I-reg · Reporte al regulador (`#/reg/regulatorio/ceiba/curso`)
- **Pregunta.** «¿El reporte pasa? Si no, ¿qué falta, quién lo debe y cuánto tiempo queda?»
- **Evidencia.**
  - `inicio/reg-390-claro.png`: 130 palabras y 28 cifras.
  - `inicio/reg-1440-claro.png`: 296 palabras y 54 cifras.
  - No tiene cifra grande.

**I-reg-1 · S1 · El inicio no dice qué falta ni quién lo debe**
- **Hoy:** «No se puede publicar todavía · **El período incluye días sin cierre publicado.**» (motor `entities/libro.ts:845`).
- Debajo va el árbol con códigos: 7 filas de `paradas_pozo`, los 6 pasos numerados y cada rama con su código y su valor.
- **X4 §3.4 pide:** «No se puede publicar todavía: octubre sigue abierto y 2 paradas no tienen causa (355 bbl).», con la cifra grande **2** paradas sin causa.
- **El motor ya tiene** lo que va en la pantalla de hoy:
  - «Falta quién · 355», «Falta qué pasó · 355»…;
  - las paradas LC-21 y LC-08, sin causa, en el árbol (`choke-arbol.ts`).
- **No tiene:**
  - la **cuenta de paradas sin causa** como cifra del inicio;
  - **quién la debe** (el rol que tiene la pregunta);
  - **la hora límite** del reporte.
- **Propuesta de texto** (con lo que ya hay; ≈ 40 palabras):
  - «**No se puede publicar todavía**»;
  - «**2** paradas sin causa · 355 bbl»;
  - «Octubre sigue abierto. Faltan quién, qué pasó y la causa de LC-21 y LC-08.»;
  - «Ver qué falta ›».
- **Sale de la primera capa.** El árbol con sus códigos va debajo, plegado por rama; el detalle de cada código, detrás de «Ver los códigos ANH» (P-reg-1).
- **Pedido al motor.** `paradasSinCausa` (cuenta y lista) y `debe` (el rol), con su prueba, en la vista de Regulatorio.

**I-reg-2 · S2 · «solo lectura» y «Exportar CSV» compiten con la respuesta**
- **Hoy.** En la tarjeta de la respuesta van el candado «solo lectura» y el botón principal «Exportar CSV». Exportar ya está en la cabecera.
- **Propuesta.** Un solo «Exportar», en la cabecera. «solo lectura» va a la ⓘ del título.
- **Palabras.** −4.

**I-reg-3 · (es T-11 y T-10; no se cuenta aparte).** «modelo choke» y los pasos numerados.

**Las palabras de I-reg:**
- **A 390:** 130 → **≈ 55**: cabecera 27 → 15 (T-1 y título «Reporte»), más la respuesta (≈ 40).
- **A 1440:** 296 → **≈ 150**: la respuesta, el árbol plegado y «Puntos de medición oficial» en una línea.

### I-sup · Hoy del supervisor (`#/sup/hoy/ceiba/curso`)
- **Evidencia.**
  - `inicio/sup-390-claro.png`: 117 palabras y 17 cifras.
  - `inicio/sup-1440-claro.png`: 317 palabras y 38 cifras.
  - Imágenes 3a y 3b.

**I-sup-1 · S2 · La frase de la cifra repite el campo y alarga el renglón**
- **Hoy:** «se dejan de producir **en La Ceiba**.» y «Le faltan 4 paradas por confirmar: el reporte sale mañana antes de las 07:00.»
- **Motor.** `entities/hoy.ts:731` (`explica`) y `:736` (`remate`).
- **Propuesta.**
  - A 390, «se dejan de producir.» (la imagen 3b), porque el campo está en la píldora de la banda.
  - Las dos: «**Faltan 4 paradas por confirmar antes de las 07:00.**» (9 palabras; hoy son 13).
- **Palabras.** −3 (390) y −4.

**I-sup-2 · S2 · La franja de bloqueo trae la consecuencia en un segundo renglón**
- **Hoy:** «No arrancar P-201B ni LC-21 hasta identificar qué se dañó · **Si arranca antes, queda como no conformidad.**»
- **Motor.** `entities/hoy.ts:338` (`sub`).
- **Regla.** Imagen 3b: la franja sin el segundo renglón.
- **Propuesta.** «No arrancar P-201B ni LC-21 hasta identificar qué se dañó» y la ⓘ «Si arranca antes, queda como no conformidad».
- **Palabras.** −7.

**I-sup-3 · S2 · La tarjeta «Confirmar 2 paradas iguales» dice dos veces que falta confirmar**
- **Hoy:** «TRIM las dedujo: en la planta, no planeada. **Falta su confirmación.**», y el botón dice «Confirmar las 2».
- **Motor.** `entities/hoy.ts:480`.
- **Propuesta.** «TRIM las dedujo: en la planta, no planeada.» Es la imagen 3b.
- **Palabras.** −3.

**I-sup-4 · S2 · La línea del plan simulado en la tarjeta**
- **Hoy** (12 palabras): «Plan simulado: volver antes de 39 h (2.072 bbl), y 2 planes más ›».
- **Motor.** `entities/hoy.ts:674`; `widgets/hoy/palabras.ts:13`.
- **Regla.** La imagen 3b no la trae. Lo simulado acompaña, pero no en la tarjeta que pide confirmar.
- **Propuesta.**
  - **Nivel A:** «3 planes simulados ›» (3).
  - **Nivel B:** que salga de la tarjeta y viva en la ficha de P-201B, a donde lleva «Ver una por una».
- **Palabras.** −9 / −12.

**I-sup-5 · S2 · «Lo más frágil: el agua» trae la orden de cierre completa**
- **Hoy** (1440): «Lo más frágil: el agua. Si para otra bomba, cierre primero LC-02, LC-10 y LC-01: dejan de producirse 3.059 bbl/d después de 2 min.»
- **Motor.** `entities/hoy.ts:649`.
- **Propuesta:** «**Lo más frágil: el agua.** Si para otra bomba, cierre primero LC-02, LC-10 y LC-01.» Es la imagen 3b.
  - La cifra va en «Ver el orden».
- **Palabras.** −8.

**I-sup-6 · S3 · «Diferido de su turno» explica el botón con una frase de 21 palabras**
- **Hoy:** «“Entregar turno” abre la entrega del turno: lo que paró, lo que quedó pendiente y el WhatsApp del turno.»
- **Fuente.** Pantalla, `widgets/hoy/Lateral.tsx:88`.
- **Regla.** §4: «Botones: verbo + objeto». El botón ya lo dice.
- **Propuesta.** Se va. Si hace falta, ⓘ en el botón.
- **Palabras.** −19.

**Las palabras de I-sup:**
- **A 390:** 117 → menos T-1 (−7), I-sup-1 (−7), I-sup-2 (−7), I-sup-3 (−3) e I-sup-4 A (−9) → **≈ 84**. Entra parte de la tarjeta siguiente: **≈ 87**.
- **Nivel B** (I-sup-4 B y sin «Ahora mismo»): **≈ 72**.
- **A 1440:** 317 → **≈ 245** (A) y **≈ 205** (B).

### I-oper · Hoy del operador (`#/oper/hoy/ceiba/curso`)
- **Evidencia.**
  - `inicio/oper-390-claro.png`: 94 palabras y 13 cifras.
  - `inicio/oper-1440-claro.png`: 290 palabras y 28 cifras.
  - Imagen 5.
- **Lo que sí está bien.** A 390 es la imagen 5: la pregunta en la banda y las opciones de 64 px. **No conviene llegar al −40 %:** lo que queda son las opciones, que son la función.

**I-oper-1 · S3 · La banda repite el tiempo**
- **Hoy:** «P-201B · bomba de agua · paró hoy a las 03:52, **hace 10,1 h**».
- **Propuesta:** «P-201B · bomba de agua · paró a las 03:52». El «hace» va en la franja de bloqueo, si hace falta.
- **Palabras.** −3.

**I-oper-2 · S3 · Los rótulos de las opciones**
- **Hoy:**
  - «Lo que más le ha fallado a esta bomba:» (8);
  - «se la vuelven a preguntar en la próxima ronda» (9).
- **Propuesta:**
  - «**Lo que más le falla:**» (4);
  - «**se la preguntan en la próxima ronda**» (7).
- **Palabras.** −6.

**I-oper-3 · S2 · A 390 no hay cifra grande**
- El «1 de 4» va en la banda, a 15 px («Pregunta 1 de 4», `widgets/hoy/Operador.tsx`), porque la cabecera se esconde (CONSTRUCCION C1).
- X4 §3.4 pone **1 de 4** como la cifra del operador.
- **Propuesta.** La pondría R2 (UI). Para el texto: «Pregunta 1 de 4» sigue siendo la cifra, y ya está.
- **Palabras.** ±0.

**I-oper-4 · S2 · A 1440, las tarjetas repiten el «no arrancar» de la franja**
- **Hoy:** «Sigue parada: no se arranca hasta decir qué se dañó.» (10 palabras) en cada tarjeta, debajo de la franja que dice lo mismo.
- **Motor.** `entities/hoy.ts:407-408`.
- **Propuesta.** «Sigue parada.» (2).
- **Palabras.** −8 por tarjeta (−16 a −24).

**Las palabras de I-oper.** A 390, 94 → **≈ 81** (A) / **≈ 72** (B: sin «La Ceiba» en la banda, que la imagen 5 no trae). A 1440, 290 → **≈ 230 / 190**.

### I-jefe · Hoy del jefe de mantenimiento (`#/jefe/hoy/ceiba/curso`)
- **Evidencia.**
  - `inicio/jefe-390-claro.png`: 131 palabras y 21 cifras.
  - `inicio/jefe-1440-claro.png`: 239 palabras.
- **Lo que sí está bien.** La cifra (7,7 de 8,1 días son espera) y la frase de X4.

**I-jefe-1 · S2 · Tres renglones bajo la cifra**
- **Hoy:** «De lo que dura una falla · 7,7 de 8,1 · días son espera · el repuesto, los permisos o la cuadrilla: no la reparación. · El vigía anunció 3 de 3 fallas.»
- **Motor.** `entities/hoy.ts:751-753`.
- **Propuesta.** «7,7 de 8,1 días son espera · **la espera es el repuesto, los permisos o la cuadrilla.**»
  - El vigía, en Resultados, que ya lo trae; o en una sola línea gris.
- **Palabras.** −6.

**I-jefe-2 · S2 · «desde que pararon» sin sujeto, y una cifra que cambia con quién la mira**
- **Hoy (jefe):** «LC-08 arrancó a la 01:10 sin identificar · 219 bbl hoy · **928** desde que pararon».
- **Hoy (supervisor), la misma línea:** «… · 219 bbl hoy, **355** desde que pararon».
- **Por qué.** La línea suma las paradas de su tarjeta: el jefe tiene 3 (con P-201B) y el supervisor 2. Pero va pegada a LC-08 y se lee como de LC-08.
- **Motor.** `entities/hoy.ts:435-436`.
- **Propuesta.** «**Entre las 3: 219 bbl hoy · 928 desde que pararon.**» (y «Entre las 2» para el supervisor).
- **Palabras.** +2. Es S2 porque hace pensar.

**I-jefe-3 · (es I-sup-2 e I-sup-4; no se cuenta aparte).** La franja y el plan simulado: −16.

**Las palabras de I-jefe.** A 390, 131 → **≈ 98** (A) / **≈ 80** (B). A 1440, 239 → **≈ 185 / 160**.

### I-conf · Equipos de confiabilidad (`#/conf/equipos/ceiba`)
- **Pregunta.** «¿Qué equipo y qué modo de falla ataco primero, y cuánto le creo al número?»
- **Evidencia.**
  - `inicio/conf-390-claro.png`: 108 palabras y 25 cifras.
  - `inicio/conf-1440-claro.png`: 249 palabras y 38 cifras.
  - **Sin cifra grande.**

**I-conf-1 · S1 · El inicio abre en filtros y no en su respuesta**
- **Hoy, a 390**, en la primera pantalla:
  - «¿Le creo al vigía? Desde el 1 de sept: acertó 3 de 3 avisos y 1 intervenida sin calificar. Ver el detalle»;
  - y **15 píldoras de filtro** con su cuenta (Parados 4, Avisan 3, Sin instrumento 5, Todos 28, Todos los tipos, Bombas 3, Electrosumergibles 15, Pozos 18, Servicios y proceso 7, Todos los trenes, Pozos 18, Crudo 4, Agua 3, Gas 1, Servicios 2).
  - La lista empieza debajo.
- **X4 §3.4 pide:** «Ataque primero P-201A y P-201C: hoy valen más y TRIM no las vigila.» con **3.059 bbl/d** («el primero de “Si falla hoy”»).
- **El motor ya tiene la frase, casi palabra por palabra:** «Cambió hoy: P-201A y P-201C subieron al puesto 1 porque P-201B está parada. Ninguna de las dos tiene instrumento: TRIM no verá venir su falla.» (`entities/criticidad.ts:373`). Hoy va **debajo** de los filtros.
- **Propuesta de texto:**
  - frase (12 palabras): «**Ataque primero P-201A y P-201C: valen más hoy y TRIM no las vigila.**»;
  - cifra: «**3.059** bbl/d · si una falla hoy, a los 2 min»;
  - vigía en una línea: «Vigía: acertó 3 de 3 avisos ›»;
  - los filtros, plegados en una píldora: «Filtrar · 28 equipos ▾».
- **Sale de la primera capa.**
  - Los 15 filtros van a «Filtrar ▾», en la misma tarjeta.
  - «1 intervenida sin calificar» va al detalle del vigía.
- **Pedido al motor.** La frase de inicio de confiabilidad en `equipos-tecnico.ts` (hoy está como `cambio`). Es la misma cuenta.
- **Palabras.** 108 → **≈ 60** a 390; 249 → **≈ 150** a 1440.

**I-conf-2 · S2 · El rótulo de la lista es un párrafo de método**
- **Hoy:** «28 equipos · por estado y, dentro de cada uno, por lo que costaría si falla hoy · ¿Lo vigila TRIM? · ahora o si falla hoy».
- **Fuente.** `widgets/equipos/Lista.tsx:119,125`.
- **Propuesta.** «28 equipos · ordenados por estado ⓘ». Las columnas: «¿Lo vigila?» y «bbl/d».
- **Palabras.** −12.

**I-conf-3 · (es G-15; no se cuenta aparte).** «Avisan 3» contra «Equipos que avisan 1».

### I-tec · Hoy del técnico (`#/tec/hoy/ceiba/curso`)
- **Evidencia.**
  - `inicio/tec-390-claro.png`: 116 palabras y 13 cifras.
  - `inicio/tec-1440-claro.png`: 265 palabras.
- **Lo que sí está bien.** «5 · cosas le tocan hoy · Primero P-201B: diga qué encontró.»

**I-tec-1 · S2 · Cada tarjeta repite la franja**
- **Hoy:** «Sigue parada: no se arranca hasta decir qué se dañó.» y «Sigue parado: no se arranca hasta decir qué pasó.» (I-oper-4).
- **Propuesta.** «Sigue parada.» / «Sigue parado.»
- **Palabras.** −8 por tarjeta.

**I-tec-2 · S2 · La tarjeta de K-101 trae dos párrafos**
- **Hoy:** «Verificar que las tres unidades estén en servicio: hoy hay dos. Con el recibidor en 11 min de autonomía, una parada deja las válvulas en posición segura.» y «Orden 40012056, liberada a su nombre a las 09:10; se notifica y se cierra en SAP.» (44 palabras).
- **Motor.** `entities/equipos.ts:121` (`accionInmediata`); `entities/hoy.ts:600`.
- **Propuesta:** «**Verifique que las tres unidades estén en servicio: hoy hay dos.** · Orden 40012056 ›» (14).
  - La autonomía del recibidor y «se notifica y se cierra en SAP» van a la orden.
- **Palabras.** −30.

**I-tec-3 · S3 · La misma tarea, con dos nombres de botón**
- «Registrar qué encontré» (tec) y «Contestar» (oper) abren la misma pregunta.
- Está bien que cada rol tenga su verbo. Solo se anota.

**I-tec-4 · (es P-trabajo-1; no se cuenta aparte).** «Mi trabajo» repite Hoy.

**Las palabras de I-tec.** A 390, 116 → **≈ 82** (A) / **≈ 68** (B: sin la consecuencia de la franja y sin «Ahora mismo»). A 1440, 265 → **≈ 205 / 175**.

### I-adm · Configurar del administrador (`#/adm/configuracion/ceiba/curso`)
- **Pregunta.** «¿Está completo y bien armado cada campo, y qué falta para firmar?»
- **Evidencia.**
  - `inicio/adm-390-claro.png`: 95 palabras.
  - `inicio/adm-1440-claro.png`: 182 palabras.
  - Sin cifra grande.

**I-adm-1 · S1 · El inicio abre en formularios**
- **Hoy:**
  - «Metas, accesos y configuración» (título);
  - el selector de período y Exportar;
  - cuatro botones de sección;
  - «PERFIL DEL CAMPO · Destino principal del gas · 4 elementos en el tren de gas · Bombas de la línea · 1 bomba registrada…»;
  - «MEMBRETE DEL INFORME»;
  - «TANQUES DE AGUA».
- **X4 §3.4 pide:** «La Ceiba: 5 de 7 pasos listos. Falta firmar las capacidades de afuera.», con **5 de 7**.
- **Lo que el motor no da.** La cuenta de pasos listos por campo no existe. Hay piezas: `capacidadesQueBloquean`, «Ninguna está firmada todavía», `porSaberDelCampo` y los tags sin equipo. **No se inventa: se pide.**
- **Propuesta de texto**, cuando el motor la dé:
  - «**La Ceiba: N de M pasos listos.** Falta {el paso}.»;
  - y la lista de pasos con su estado («firmado», «sin firmar», «falta»).
- **Mientras tanto,** con lo que ya hay, el título y lo que pide la firma:
  - «**Configurar**»;
  - «Capacidades: ninguna firmada · rigen las del demo»;
  - «Firmar la versión ›».
- **Palabras.** 95 → **≈ 50** a 390; 182 → **≈ 110** a 1440.

**I-adm-2 · S2 · El período y Exportar en Configuración**
- **Evidencia.** «Octubre, en curso» y «Exportar», en la cabecera de Configuración.
- **Regla.** X4 §3.5: el selector de período, **solo** en Resultados, Reporte y Evidencia.
- **Propuesta.** `ahora: true` y `sinExportar: true` en `PANTALLAS.configuracion`, `filosofia` y `conectores` (`app/pantallas.tsx:85-89`).
- **Palabras.** −4.

**I-adm-3 · S2 · El título «Metas, accesos y configuración»**
- **Hoy.** Dice tres cosas y el adm no ve metas (las da el gerente).
- **Propuesta.** «Configurar», el nombre de la puerta. Para el gerente, «Metas y accesos» (su entrada del menú).
- **Palabras.** −3.

### plan y cont
- **No se miden.** Están apagados en el MVP (`src/shared/config/producto.ts`, `ROLES_V2`). `#/plan` y `#/cont` abren como producción.
- **Sus inicios de X4 §3.4** son ejemplos: «2 repuestos…» y «3 paradas…». No hay pantalla que medir. Si se encienden, se mide con el mismo guion (`--solo 'plan|cont'`).

---

## 4. Cada pantalla de cada puerta

La evidencia de cada pantalla está en `capturas/antes/puertas/<rol>-<pantalla>.png` y en `-entera.jpg`, a 1440 en claro. Las palabras son de la página entera a 1440 y a 390.

### La planta viva (puerta)

**P-pv-todos · S2 · Todos mis campos** (`#/ger/planta-viva/ceiba~portafolio/curso`; 276 palabras a 1440)
- **Hoy:**
  - «Lo que más pesa: la bomba de agua P-201B, en La Ceiba. Hay 4 de 87 pozos parados.» (motor `entities/planta-viva.ts:747`);
  - y, en la columna, «Lo que todavía se puede mover ahora: ≈ 2.102 bbl simulado · Ver el plan ›» (G-13).
- **Propuesta.**
  - «Lo que más pesa: P-201B (bomba de agua), en La Ceiba. 4 de 87 pozos parados.» (−3).
  - La línea del ciclo: «Se puede mover ahora: ≈ 2.102 bbl · simulado · Ver el plan ›».
- **A 320 px**, la gráfica de la columna rotula a **9,5 px** («1.150», «2.300», «OCT 2025», «ENE 2026»; `medicion.md` §4). Va a R3.

**P-planta-1 · S2 · Planta repite la tubería de Producción** (`#/prod/planta/ceiba/curso`; 590 palabras a 1440)
- **Hoy.** «La tubería del campo · qué limita hoy al campo», con todos sus rótulos, está **igual** en Planta y en Producción: ≈ 170 palabras dos veces.
- **Regla.**
  - X4 §3.6.6: «La tubería del campo (Producción y Planta) → una sola».
  - §4, regla 8: la misma cifra en dos tarjetas.
- **Propuesta.** Se queda en Planta, el nivel 2. En Producción, una línea: «Qué limita hoy: los pozos · Ver la tubería ›».
- **Palabras.** −165 en Producción.

**P-planta-2 · S2 · Tres frases de cálculo debajo de la tubería**
- **Hoy:**
  - «A la planta le sobran 1.143 bbl/d: lo que den de más los pozos pasa, hasta 1.143 bbl/d.»: repite el rótulo «le sobran 1.143»;
  - «Hoy, con P-201B parada, el agua de la planta deja pasar 178.500 bbl/d y ya entran 174.033: lo que den de más los pozos pasa solo hasta unos 236 bbl/d de crudo, hasta que vuelva.»;
  - «Los pozos dan 11.857 según sus pruebas: pasan 9.394, se pierden 1.966 y los otros 497…» (T-8).
- **Fuente.** Pantalla, `widgets/choke/Tuberia.tsx` (≈ 495-510).
- **Propuesta.** Una línea: «**Limitan los pozos.** Con P-201B parada, a la planta le caben 236 bbl/d más.» La cuenta va detrás de «Ver la cuenta».
- **Palabras.** −60.

**P-planta-3 · S3.** «Pasa hoy 9.394» → «Sale hoy 9.394» (G-6).
- Y la línea del medidor: «Punto de medición oficial (FQI-0101 · computador de flujo de la unidad LACT-01): en línea; el último día completo dio 11.105 bbl» (22 palabras) → «Medidor oficial en línea · ayer 11.105 bbl ⓘ» (7). El tag y la unidad van a la ⓘ.

**P-agua-1 · S2 · Agua: cinco renglones de cuentas en la primera pantalla** (`#/prod/agua/ceiba/curso`; **528 palabras sin desplazarse** a 1440, la más alta del producto)
- **Hoy, en la primera capa:**
  - «Con las tres bombas, cabe más agua: 43.675 bbl/d (sin contar la capacidad del tratamiento de agua: no tiene dato).»;
  - «Bombas de reinyección y pozos inyectores dan exactamente lo mismo: 267.750 bbl/d. Lo que se gane en uno lo frena el otro; la admisión de los inyectores no está firmada: el demo la deduce del mismo límite del cabezal…»;
  - «Si para una con todos los pozos produciendo, faltan 44.100 bbl/d de salida: el tanque se llena en 1,8 h y hay que cerrar pozos.»;
  - y los dos de T-8.
  - Abajo, «Por qué es crítica» trae otros tres párrafos.
- **Regla.** X4 §6.1, tabla «Antes y después», fila de Agua: «**Con las tres bombas, al agua le sobra espacio. Si para una, hay que cerrar pozos.** Las cifras, en la ⓘ».
- **Motor.** `entities/choke-agua.ts:330-350` (`frases`).
- **Propuesta.**
  - Esa frase de X4 (16 palabras), palabra por palabra.
  - Cada cifra va a la ⓘ de su caja.
  - «Por qué es crítica» se queda en tres líneas cortas:
    - «No hay bomba de sobra.»;
    - «El tanque aguanta horas; la reparación, días.»;
    - «Para seguido: una falla cada 41 días.»
- **Sale de la primera capa** («ver más»):
  - la igualdad de bombas e inyectores;
  - la admisión sin firmar;
  - los 44.100 de salida;
  - los 37.315 bbl de las 9 fallas;
  - «Mediana de FI-2011…».
- **Palabras.** −250 a 1440 (≈ −40 % de la página).

**P-agua-2 · S3.** «casi iguales» se repite dos veces y «┄ dato del demo, sin firmar», tres (T-3).

**P-riesgo-1 · S2 · Riesgo (jefe y conf)** (`#/jefe/riesgo/ceiba/curso`; 584 palabras)
- **Hoy:**
  - «Se deja de producir ahora, por causa» repite el rótulo de la cifra de encima (G-1);
  - «También parados: LC-16, LC-07 y LC-21 · van en “Se deja de producir ahora”, no en la lista.»: es una nota de método;
  - y «1 · P-201B», «2 · LC-21» (T-10).
- **Propuesta.**
  - El reparto se titula «**Por qué**».
  - La nota: «LC-16, LC-07 y LC-21, parados: van arriba».
  - Sin los números de orden.
- **Palabras.** −14.
- **Además, T-8:** «P-201B está parada: se pierden 1.665 bbl/d ahora…».

**P-riesgo-2 · (es G-16; no se cuenta aparte).** «≈ 10.579 bbl si falla hoy», en bbl, al lado de la columna «si para» en bbl/d.

### Hoy (puerta)

**P-causa-1 · S2 · Identificar** (`#/sup/causa/ceiba/curso`; **1.049 palabras** a 1440)
- En todos los campos llega a **2.409** (`#/jefe/causa/ceiba~portafolio/curso`): es la página más larga del producto.
- **Hoy.** Cada parada está abierta con:
  - su señal («Señal · no alcanzó · ZS-2011 · marcha → paro…»);
  - la pista;
  - la lista completa de partes;
  - «Queda declarado por Nelson Ortiz · hora del sistema»;
  - y el hilo de WhatsApp.
- **Regla.**
  - X4 §3.6, «se esconde»: la señal de cada parada y el historial de WhatsApp de cada parada.
  - X4 §1.3.7: «muestra abiertas las 4 paradas a la vez».
- **Propuesta.**
  - Una parada abierta a la vez.
  - De las demás, una fila: «P-201B · bomba de la línea · paró 03:52 · 573 bbl · no arrancar ›».
  - La señal y el WhatsApp, detrás de «Ver la señal» y «Ver el chat».
  - «Queda declarado por Nelson Ortiz · hora del sistema» va al aviso de «Registrado».
- **Palabras.** ≈ −600 a 1440.

**P-causa-2 · (es T-10; no se cuenta aparte).** «1 · Parte de la bomba» → «Parte de la bomba».

**P-turno-1 · S1 · Turno: lo proyectado va arriba de lo medido y sin su palabra** (`#/sup/turno/ceiba/curso`)
- **Hoy:** «**983 bbl** · se dejarían de producir · turno que entra · si nada cambia», y **debajo**, «1.966 bbl/d · se deja de producir ahora».
- **Regla.**
  - La 5 que no se rompe: «Ninguna cifra simulada o proyectada es la grande ni va más arriba que la medida. Siempre lleva su palabra («proyectado»)».
  - «si nada cambia» no es la palabra.
- **Propuesta.**
  - Primero «**1.966 bbl/d** se dejan de producir ahora».
  - Debajo, en gris y discontinuo: «≈ 983 bbl en el turno que entra si nada cambia · **proyectado**».
- **Palabras.** +1.

**P-turno-2 · S2.**
- **Hoy:** «4 paradas hoy · 0 completas · faltan 4 · el reporte sale mañana antes de las 07:00», debajo del rótulo «Cierre de hoy · paradas por confirmar · 4 · 0 completas»: la cuenta dos veces.
- **Propuesta.** «Cierre de hoy · faltan 4 de 4 · antes de las 07:00».
- **Palabras.** −14.

**P-turno-3 · S2.**
- **Hoy:** «Operador · Mantenimiento · En la planta o estación · Diferida · No planeada · No planeada - Proceso / Facilidades · Parada estación/bombeo afecta pozos» (los 6 pasos de la ANH, con «No planeada» dos veces).
- **Regla.** Nada de códigos de la ANH fuera de Regulatorio.
- **Propuesta.** «TRIM las dedujo: en la planta, no planeada», como en Hoy (I-sup-3).
- **Palabras.** −14.

**P-trabajo-1 · S2 · «Mi trabajo» repite Hoy del técnico** (`#/tec/trabajo/ceiba/curso`; 203 palabras)
- **Hoy.** «Parados · Paradas por identificar · Avisando · qué revisar · Registrar qué encontré · Orden 40012056…» son las mismas tareas que las tarjetas de Hoy.
- **Regla.**
  - X4 §3.6.3: «Turno, Mi trabajo… → Hoy».
  - §4, regla 8: lo repetido.
- **Propuesta.** Que Mi trabajo deje de ofrecerse en el panel cuando Hoy tiene sus tarjetas. Su dirección abre Hoy (`FUSIONADA_EN`). Lo propio de Mi trabajo, «Órdenes en SAP», va a una tarjeta de Hoy: «Ver sus órdenes en SAP ›».
- **Palabras.** −203 en el producto. Lo decide R2 o V1: es una fusión de pantallas.

### Equipos (puerta)

**P-equipos-ger · S2 · Equipos del gerente** (`#/ger/equipos/ceiba/curso`; 216 palabras)
- **Hoy.** Cada fila trae «sí · 8 señales», «sí · 4 señales» o «no: solo su controlador» («¿Lo vigila TRIM?»).
- **Regla.** X4 §2: lo gerencial, sin variables de equipo.
- **Propuesta.** Para el gerente, la columna dice solo «sí» o «no»; las señales van a la ficha.
- **Palabras.** −14.
- **Además**, G-1b y G-16 en la columna de la cifra.

**P-equipos-1 · (es I-conf-2; no se cuenta aparte).** El rótulo-párrafo de la lista. Vale para la lista de todos los roles técnicos.

**P-bombas-1 · S2 · Bombas** (`#/sup/bombas/ceiba/curso`; 208 palabras)
- **Hoy:** «1 bomba detenida · 2 pozos cerrados · 69 bbl/h · 2 de oct, 14:00» y, en la placa, «573 bbl · 487 – 659 · calculado · 69 bbl/h · 2 pozos cerrados»: el ritmo y los pozos, dos veces en la misma vista.
- **Propuesta.**
  - Debajo de la cifra: «1 bomba detenida · 2 pozos cerrados».
  - La placa: «573 bbl · calculado ⓘ». El rango y el ritmo van a la ⓘ.
- **Palabras.** −12.
- **Además:** «SIN INSTRUMENTO» y «PARTES» (T-6); «si se para: … luego se pierden 783 bbl/d» (T-8, G-16).

**P-esp-1 · S3 · Electrosumergibles** (`#/prod/esp/ceiba/curso`; 150 palabras)
- **Hoy:** «En falla ahora · 0 de 15 · las paradas, por otra causa» y «Diferido de sus electrosumergibles · 0 bbl · ninguna parada propia».
  - Dos cifras en cero, cada una con su frase.
- **Propuesta.** Juntarlas en una línea: «**Ninguna electrosumergible en falla: LC-16 y LC-07 están cerrados por P-201B.**»
  - Son las dos que la tabla de esa misma pantalla marca «cerrado por P-201B».
  - Es el vacío que enseña (§4, regla 6).
- **Palabras.** −8.
- **Además:** «FLOTA» (T-6).

**P-pozos-1 · (es G-5 y T-6; no se cuenta aparte) · Pozos** (`#/prod/pozos/ceiba/curso`)
- «**Potencial ahora** · 11.360 bbl/d» → «**Potencial del libro** · 11.360 bbl/d» (G-5; pendiente de C5). Es `pages/Pozos.tsx:127-128`: el rótulo y la ⓘ.
- «POZOS» → «Pozos» (T-6).

**P-nivel4-1 · S2 · Nivel 4 (diagnóstico)** (`#/conf/equipos/ceiba/P-201B/diagnostico`)
- 15 títulos en MAYÚSCULAS (T-6).
- **Desbordes.** A 390 px, las filas de «Sus instrumentos» se salen **27 px** de la vista en P-201B y **107 px** en MPP-301; a 320, **97** y **177 px** (`medicion.md` §4). Son `button.flex.w-full` con el tag, el nombre y «PLC · …» en un renglón. Va a R2, pero es texto: el renglón trae «PI-2010 Presión de succión PI · 47 s · límite…» sin cortar.
- **Propuesta de texto.** En el teléfono, el tag y el nombre en un renglón y la hora del dato en otro: «PI-2010 · Presión de succión» / «hace 47 s».

### Resultados (puerta)

**P-resultados-1 · S2 · La explicación de la cifra: tres ideas en tres frases** (`#/ger/resultados/ceiba/curso`)
- **Hoy** (27 palabras): «El máximo firmado para lo que va de octubre es 1.267 bbl: va 221 por debajo. P-201B, más de la mitad · 355 sin causa. Septiembre cerró en 7.716 bbl.»
- **Motor.** `entities/resultados.ts:329-331`.
- **Propuesta** (17 palabras): «**221 bbl por debajo del máximo firmado (1.267). P-201B, más de la mitad · 355 sin causa.**»
  - «Septiembre cerró en 7.716» va a la gráfica mes a mes, que ya lo dibuja.
- **Palabras.** −10.

**P-resultados-2 · S2 · La fila de calidad**
- **Hoy:** «calculado · entre 889 y 1.203 bbl ⓘ · 50 mil USD · Provisional ⓘ».
- **Regla.** X4 §6.1.7: tres palabras de origen; «Provisional» va a la ⓘ, salvo en Resultados. Aquí puede quedar.
- **Propuesta.** «calculado ⓘ · 50 mil USD · provisional ⓘ». El rango va a la ⓘ de «calculado» para el gerente; para producción, se queda.
- **Palabras.** −5.

**P-resultados-3 · (es T-7; no se cuenta aparte).** «Dónde bajarlo» y «Tipo de causa» siguen en `Panel`, con el título de 13 px (C5).

**P-diferidos-1 · S2 · Diferidos** (`#/prod/diferidos/ceiba/curso`; 467 palabras)
- **Hoy:** «1.046 · barriles diferidos · 889–1.203 bbl · calculado · 355 sin identificar · valor 50 mil USD · diferido por día 661 bbl/d · máx. 800 · +80 % frente a jul a sep».
  - Es la cifra de Resultados, con otro nombre (G-8) y otro orden.
- **Propuesta.** El mismo bloque de Resultados («Diferido · octubre · 1.046 bbl…»). Diferidos queda como el libro: el cuadre y la custodia.
- **Palabras.** −20.

**P-produccion-1 · S2 · Producción** (`#/prod/produccion/ceiba/curso`; 750 palabras)
- **Hoy:** «provisional · producción real · 16.941 bbl · meta a la fecha 17.258 · 10.700 bbl/d · 94,2 % del potencial · potencial del libro · 17.987 bbl · 11.360 bbl/d · real · 1 de oct · 11.105 bbl»: 12 cifras en la cabecera.
  - Y la tubería entera (P-planta-1).
- **Propuesta.**
  - La cabecera: «Producción medida · 16.941 bbl · meta a la fecha 17.258» y «Potencial del libro · 11.360 bbl/d ⓘ».
  - El resto, a la ⓘ.
  - La tubería, una línea (P-planta-1).
- **Palabras.** −180.

**P-mant-1 · S2 · Mantenimiento** (`#/jefe/mantenimiento/ceiba/curso`)
- **Hoy:** «del diferido, programado · 0,0 % · 0 bbl · 1.046 bbl no programado (libro)».
- **Regla.** Es el ejemplo de X4 §6.1. Pasa a: «**Ninguna parada de este mes estaba programada: los 1.046 bbl fueron fallas o siguen sin identificar.**»
- **Fuente.** `pages/Mantenimiento.tsx`.
- **Palabras.** +4, pero se entiende.
- **Además:** «1 equipo avisando» (G-15); «HORAS EN SAP» y «ABIERTO EN SAP» (T-6).

**P-conf-1 · S3 · Confiabilidad** (`#/jefe/confiabilidad/ceiba/curso`; 550 palabras)
- **Hoy:** «¿Acierta el vigía? · desde el 1 de sept · Acertó · 3 de 3 · 100 % · 0 falsas alarmas · 1 intervenida, sin calificar · Fallas anticipadas · 3 de 3 · en partes con instrumento · Anticipación · 4,7 d · promedio · de 2,0 a 8,0 d · En seguimiento · 0 · nada en seguimiento».
  - Son cinco cifras de vigía.
  - Resultados ya pregunta «¿Le creo al vigía?» (otro título para lo mismo).
- **Propuesta.**
  - Un título: «¿Le creo al vigía?».
  - Las dos que contestan: «Acertó 3 de 3 · anticipó 4,7 días en promedio».
  - Lo demás, en «Ver lo que anunció».
- **Palabras.** −20.

### Reporte, Configurar y lo demás

**P-reg-1 · S2 · Regulatorio: cada rama dice su nombre tres veces** (`inicio/reg-390-claro.png`)
- **Hoy:** «Diferida · `dif_perd` · **DIFERIDA**», «No planeada · `pla_no_plan` · **NO PLANEADA**», «En la planta o estación · `choke_mod` · **PLANTA**»: el nombre en español, el código del campo y el valor del código.
- **Regla.** §4, regla 8: rótulos que repiten el título. La ANH pide el valor; el nombre ya lo dice.
- **Propuesta.**
  - En la primera capa, el nombre en español y su cifra: «Diferida · 573 · 55 %».
  - El código del campo y su valor, detrás de «Ver los códigos ANH», o en la columna del papel (`Exportar CSV` ya los lleva).
- **Palabras.** ≈ −120 a 1440.
- **Además:** T-10 y T-11.

**P-conf-cfg-1 · S3 · Configuración** (adm; conf y prod en solo lectura)
- 12 títulos en mayúsculas (T-6).
- «Solo lectura: lo prepara y lo firma el administrador» sale **una** vez: está bien.
- **Nada más que T-6.** Se anota solo para que el inventario de pantallas quede completo.
- **No se cuenta aparte.**

**P-conectores-1 · S3 · Conectores** (`#/adm/conectores/ceiba/curso`)
- 11 títulos en mayúsculas (T-6).
- **Hoy:** «TRIM → SAP · avisos · 5 en total», «SAP → TRIM · órdenes · 18 órdenes · 1 abierta»…: las flechas de dirección repiten el nombre del sistema.
- **Propuesta.** «Avisos a SAP · 5», «Órdenes de SAP · 18 · 1 abierta».
- **Palabras.** −10.

**P-filosofia-1 · S3 · Filosofía operacional** (`#/adm/filosofia/ceiba/curso`; 860 a 1.310 palabras)
- **Hoy.** Los títulos llevan la cuenta en mayúsculas: «SERVICIOS DEL CAMPO · 3», «POZOS INYECTORES · 1», «SALIDAS DE LA BATERÍA · 2»; y «LO QUE TRIM DEDUJO DEL REGISTRO» está abierto (X4 §3.6 lo pone en «se esconde»).
- **Propuesta.** T-6, y «Lo que dedujo TRIM» plegado.
- **Palabras.** ≈ −150.

**P-perfil-1 · (es T-6; no se cuenta aparte) · Mi perfil.** Cinco títulos en mayúsculas.

---

## 5. Mapa «antes → ahora» de lo que sale de la primera capa

Nada se borra. Cada cosa tiene su lugar nuevo y queda a un toque.

| Lo que sale | De dónde | A dónde |
|---|---|---|
| «hoy, 2 de oct» | Cabecera de todas | ⓘ de la hora |
| «DATOS DE DEMOSTRACIÓN» / «DEMO» | Cabecera de todas, nivel 3, membrete repetido | Pie del panel (escritorio), menú de la persona (teléfono) y membrete del papel, una vez |
| La cuenta en cero de la franja | Cabecera | La lista de la franja (sigue con las cuatro condiciones) |
| La primera subpantalla repetida | Panel | La puerta misma |
| El rango «entre 889 y 1.203» | La planta viva y Resultados del gerente | ⓘ de «calculado» |
| «la roca», «el oleoducto recibe», «agua que entra…», «inyectores…», «15 de 18 en marcha», «el agua da para 236 bbl/d más…» | Tubería de La planta viva | La hoja del tramo o la ⓘ del ramal |
| «Pérdida (lo que salió y no se vendió)…» | La planta viva | «Sin pérdidas registradas en octubre» y su ⓘ |
| «Si arranca antes, queda como no conformidad.» | Franja de bloqueo de Hoy | ⓘ de la franja |
| «Falta su confirmación.» | Tarjeta de Hoy | El botón «Confirmar las 2», que ya lo dice |
| «Plan simulado: volver antes de 39 h…» | Tarjeta de Hoy | «3 planes simulados ›», o la ficha del equipo |
| La orden de cierre con su cifra | «Lo más frágil» de Hoy | «Ver el orden» |
| «“Entregar turno” abre…» | «Diferido de su turno» | El botón y su ⓘ |
| La autonomía del recibidor y «se notifica y se cierra en SAP» | Tarjeta de K-101 (tec) | La orden SAP |
| Los 15 filtros de Equipos | Inicio de confiabilidad | «Filtrar ▾», en la misma tarjeta |
| «por estado y, dentro de cada uno…» | Lista de Equipos | ⓘ de «ordenados por estado» |
| El árbol con códigos ANH | Inicio de regulatorio | Debajo de la respuesta, plegado por rama, y «Ver los códigos ANH» o el CSV |
| Las cuentas de Agua (5 párrafos) | Agua | La ⓘ de cada caja y «Ver la cuenta» |
| Las tres frases bajo la tubería | Planta, Producción | «Ver la cuenta» |
| La tubería entera | Producción | Planta (nivel 2), con «Ver la tubería ›» |
| La señal y el WhatsApp de cada parada | Identificar | «Ver la señal» y «Ver el chat» |
| «Septiembre cerró en 7.716 bbl» | Explicación de Resultados | La gráfica mes a mes |
| Las cifras de vigía de Confiabilidad | Confiabilidad | «Ver lo que anunció» |
| `dif_perd`, `DIFERIDA`… | Cada rama de Regulatorio | «Ver los códigos ANH» y el CSV |
| «Solo lectura…» en cada panel | Configuración (conf, prod) | Una vez, en la cabecera |
| «Mi trabajo» | Panel del técnico | Hoy, y su dirección abre Hoy |
