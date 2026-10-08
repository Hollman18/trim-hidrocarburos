# 5C.6 · Catálogo de daños: parte, modo, mecanismo y causa raíz (ISO 14224 ↔ SAP PM)

El catálogo de daños dice **con qué palabras se registra una falla**, por clase de equipo. Es lo que
le enseña al vigía: una falla sin parte no le enseña nada (`CALIDAD DEL REGISTRO`, 5C.4). Es
librería del producto, no se escribe por cliente; los códigos del cliente en SAP se asocian a estos en
la implementación (`src/entities/catalogo.ts`, `src/entities/iso14224.ts`).

ISO 14224 encadena **causa → mecanismo → modo**: la causa raíz produjo un mecanismo de falla que se
manifestó como un modo. Quien abrió el equipo solo declara lo que **vio** (la parte y el modo), en dos
toques; el mecanismo y la causa raíz los completa confiabilidad en el análisis.

---

### Los cuatro niveles y su lugar en SAP PM

| Nivel | ISO 14224:2016 | SAP PM (perfil de catálogo de la clase de equipo) | Quién lo dice | Campo |
|---|---|---|---|---|
| Parte | ítem mantenible (nivel 8 de la taxonomía) | parte del objeto · **catálogo B** | quien abrió el equipo (operación, técnico) | `respuesta.parte` (`ParteId`) |
| Modo | modo de falla, Annex B, **Table B.6** (B.6–B.15) | daño · **catálogo C** | quien abrió el equipo | `respuesta.modo` (código de 3 letras) |
| Mecanismo | mecanismo de falla, **Table B.2** | daño o causa, según el perfil | confiabilidad / jefe de mantenimiento | `analisis.mecanismo` («1.1», «2.4»…) |
| Causa raíz | causa de la falla, **Table B.3** (primer nivel) | causa · **catálogo 5** | confiabilidad / jefe de mantenimiento | `analisis.causaRaiz` («1» a «5») |

---

### Clase del catálogo (`claseDeCatalogo`)

**Qué es.** La clase del catálogo de daños no es la clase ISO 14224 del registro de ingeniería: esa
dice cómo es la máquina; esta, qué partes y modos se ofrecen.

**Fórmula** (`catalogo.ts:60-65`):

| Clase ISO 14224 del registro (`claseEquipo`) | Papel de la bomba | Clase del catálogo |
|---|---|---|
| `bomba-electrosumergible` | – | `bomba-electrosumergible` («Electrosumergible») |
| `bomba-tornillo` o `bomba-multifasica` | cualquiera | `bomba-multifasica` («Bomba multifásica») |
| `bomba-centrifuga` | `transporte` | `bomba-multifasica` |
| `bomba-centrifuga` | `disposicion` o `recobro` | `bomba-inyeccion` («Bomba de reinyección») |
| otra (`bomba-reciprocante`…) | – | **sin catálogo** (la parada queda sin parte o se explica con causas de pozo) |

La clase ISO sale de la tecnología de la máquina (`CLASE_ISO`, `bombas.ts:255-261`):
doble tornillo y hélico-axial → `bomba-multifasica`; centrífuga HPS y API 610 → `bomba-centrifuga`;
reciprocante → `bomba-reciprocante`. Un pozo **sin** electrosumergible no tiene partes.

**Ejemplo.** P-201B (centrífuga HPS, disposición en La Ceiba y Morichal, recobro en Guacamayo) →
`bomba-inyeccion` con las 5 partes de inyección. MPP-301 (doble tornillo, transporte) →
`bomba-multifasica`, 6 partes. MN-07 → `bomba-electrosumergible`, 5 partes.

**Quién lo calcula.** Servidor: `GET /api/catalogo` → `campos[campo].catalogosDanos[equipo] =
{ clase, partes }`; también `catalogo` en `GET /api/vistas/paradas/:evento/opciones`.

---

### «Qué vio»: los modos de cada parte, en palabras de campo

**Qué es.** Las opciones del segundo toque: los modos de falla ISO 14224 que produce la parte
(`Parte.modos`) más «Otro» (`OTH`) siempre al final (`modosDeParte`, `catalogo.ts:71-73`), cada uno
dicho como lo diría quien lo vio (`nombreModo`, `catalogo.ts:76-90`).

**Palabras de campo** (`MODO_EN_CAMPO`):

| Código | ISO 14224 (B.6) | En pantalla y WhatsApp |
|---|---|---|
| UST | Se paró sola (*spurious stop*) | Se disparó sin daño a la vista |
| FTS | No arrancó cuando se pidió | No arrancó |
| ELP | Fuga externa de producto | Fuga hacia afuera |
| ELU | Fuga externa de servicio | Fuga de aceite o agua de servicio |
| INL | Fuga interna | Fuga interna |
| VIB | Vibración | Vibración |
| OHE | Sobrecalentamiento | Recalentada |
| LOO | Entregó de menos | Bajó el caudal |
| HIO | Entregó de más | Entregó de más |
| NOI | Ruido | Ruido |
| PDE | Parámetro fuera de rango | Presión o corriente fuera de rango |
| PLU | Taponado | Tapada |
| BRD | Rotura | Algo se rompió — **en «aislamiento»: «Se quemó o dio a tierra»** |
| AIR | Lectura anormal del instrumento | Un instrumento leía mal |
| ERO | Salida errática | Salida errática |
| SER | Problema menor en servicio | Problema menor |
| STD | Deficiencia estructural | Daño en la estructura |
| STP | No paró cuando se pidió | No paró cuando se pidió |
| OTH | Otro | **Otra cosa** |

**Opciones por parte** (en el orden en que se ofrecen):

| Familia | Parte | Opciones de «qué vio» |
|---|---|---|
| Inyección | Sello mecánico | Fuga hacia afuera · Fuga interna · Otra cosa |
| Inyección | Succión y filtro de entrada | Se disparó sin daño a la vista · Tapada · Bajó el caudal · Otra cosa |
| Inyección | Rodamientos y cámara de empuje | Recalentada · Vibración · Ruido · Otra cosa |
| Inyección | Impulsores y desgaste interno | Bajó el caudal · Presión o corriente fuera de rango · Otra cosa |
| Inyección y multifásica | Motor eléctrico | Recalentada · Se disparó sin daño a la vista · No arrancó · Vibración · Otra cosa |
| Multifásica | Sellos mecánicos (cuatro) | Fuga hacia afuera · Fuga de aceite o agua de servicio · Fuga interna · Otra cosa |
| Multifásica | Tornillos y holguras | Bajó el caudal · Fuga interna · Presión o corriente fuera de rango · Otra cosa |
| Multifásica | Filtro de entrada | Tapada · Bajó el caudal · Otra cosa |
| Multifásica | Rodamientos | Recalentada · Vibración · Ruido · Otra cosa |
| Multifásica | Lubricación | Recalentada · Presión o corriente fuera de rango · Otra cosa |
| Electrosumergible | Aislamiento del motor y del cable | Se disparó sin daño a la vista · **Se quemó o dio a tierra** · Otra cosa |
| Electrosumergible | Protector (sello del motor) | Fuga interna · Recalentada · Otra cosa |
| Electrosumergible | Bomba de fondo (eje y etapas) | Se disparó sin daño a la vista · Bajó el caudal · Tapada · Otra cosa |
| Electrosumergible | Admisión y separador de gas | Se disparó sin daño a la vista · Bajó el caudal · Otra cosa |
| Electrosumergible | Motor de fondo | Recalentada · Se disparó sin daño a la vista · Otra cosa |

**Dónde se ve.**
- Pantalla **Identificar** (`#/…/causa/…`, `src/pages/Causa.tsx:290-345`): paso «1 · Qué parte» (lista
  de partes del catálogo, o las sugeridas por la señal con «O escoja cualquier parte…»), paso
  «2 · Qué vio» (chips con las opciones de la parte), ⓘ «ISO 14224»: «Se registra en el catálogo como
  ítem «\<ítem ISO\>» · daño \<código\> (\<nombre ISO en minúscula\>).», y el texto «Qué encontró
  (opcional)» / «Qué vio (obligatorio)» si escogió «Otra cosa». En un pozo con electrosumergible hay
  además el botón **«No fue la electrosumergible»**, que cambia a las causas de pozo (chips: «Cierre
  para prueba o intervención del pozo», «Fuga o daño en la línea de flujo», «Orden de producción:
  nominación o restricción del comprador», «Falla del controlador o de un instrumento del pozo») y
  texto libre.
- **WhatsApp** (el teléfono del demo; en producción, el webhook): «TRIM · ¿Qué vio en \<parte\>?
  Responda con un número.» y la lista numerada «1) …»; la opción «Otra cosa» pide «TRIM · Escriba qué
  vio.»; en el primer paso, «0» es «Otra cosa: escríbala» (`OTRA`, `mensajes.ts:171`).
- Aviso SAP (`BloqueSap`): selector «código · nombre» con los modos de la parte.

**Validaciones (las del servidor, `POST /api/paradas/:evento/respuesta`, `escrituras.ts:350-372`).**

| Regla | Error (422) |
|---|---|
| La parte no es del catálogo del equipo | «Esa parte no es de este equipo.» |
| Bomba de la línea sin parte (en pantalla, la parte es obligatoria; en la ESP no: «no fue ella» es causa de pozo) | «Diga qué parte de la bomba se dañó.» |
| Con parte, el modo no es de esa parte | «Diga qué vio en esa parte.» |
| Sin parte, o con modo «Otra cosa», el texto libre tiene menos de **8** caracteres sin los espacios de los bordes (`TEXTO_LIBRE_MINIMO = 8`, `src/entities/reglas.ts:15-18`) | «Escriba qué encontró, con al menos una frase corta.» (pantalla: «Escribió «Otra cosa»: diga qué vio, con al menos una frase corta.»; WhatsApp con «0»: «Con «0» hay que escribir qué encontró, con al menos una frase corta.») |
| Ya respondió alguien (409) | «Ya respondió \<persona\>.» |

**Texto que queda registrado.** Pantalla: el texto libre si lo hay; si no, «\<Parte\>: \<modo en
palabras de campo, minúscula\>» («Sello mecánico: fuga hacia afuera»). WhatsApp: con «0», el texto;
con parte y «Otra cosa», «\<opción\>: \<texto\>»; con parte y modo, «\<opción\>: \<modo en
minúscula\>». Se guarda `{ texto, por, porId, parte?, modo?, canal, hora }`.

**Quién lo calcula.** Servidor (validación y registro); el front solo arma las opciones con el
catálogo que recibe. El flujo completo de identificación está en el capítulo de paradas.

---

### Mecanismos (Table B.2) y el mecanismo sugerido

**Qué es.** Los mecanismos de falla de ISO 14224:2016, Table B.2, en seis familias con su «general»
(x.0), cada uno con su familia del vigía (`degradacion` o `choque`, 5C.2) (`iso14224.ts:72-115`).

| Familia B.2 | Códigos (degradación en **negrita**, choque en normal) |
|---|---|
| 1 Mecánico | **1.0 general, 1.1 Fuga, 1.2 Vibración, 1.3 Holgura o desalineación, 1.4 Deformación, 1.5 Aflojamiento, 1.6 Agarrotamiento** |
| 2 Material | **2.0 general, 2.1 Cavitación, 2.2 Corrosión, 2.3 Erosión, 2.4 Desgaste**, 2.5 Rotura, **2.6 Fatiga, 2.7 Sobrecalentamiento**, 2.8 Estallido |
| 3 Instrumento | 3.0 general, 3.1 Falla de control, 3.2 Sin señal/indicación/alarma, 3.3 Señal falsa, **3.4 Fuera de ajuste**, 3.5 Software, 3.6 Causa o modo común |
| 4 Eléctrico | 4.0 general, 4.1 Cortocircuito, 4.2 Circuito abierto, 4.3 Sin energía, 4.4 Energía anormal, **4.5 Falla de tierra o aislamiento** |
| 5 Influencia externa | 5.0 general, **5.1 Bloqueo o taponamiento, 5.2 Contaminación**, 5.3 Otra influencia externa |
| 6 Misceláneo | 6.0 general, 6.1 Sin causa encontrada, 6.2 Causas combinadas, 6.3 Otro, 6.4 Desconocido |

**Estado de la tabla.** «Transcrita de ISO 14224:2016 Table B.2 · pendiente de cotejo con la norma
comprada» (`MECANISMOS_ESTADO`; sale en el ⓘ «mecanismos» del detalle de bomba). Antes de exportar
estos códigos al CMMS de un cliente hay que cotejarlos con su copia de la norma.

**Mecanismo sugerido** (`MECANISMO_SUGERIDO`, `catalogo.ts:97-99`): el punto de partida del formulario
de análisis según lo que se vio; confiabilidad lo cambia.

| Modo visto | ELP, ELU, INL | VIB | NOI | OHE | LOO | BRD | PLU | PDE | AIR | STD | UST, FTS, OTH… |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Mecanismo sugerido | 1.1 | 1.2 | 1.3 | 2.7 | 2.4 | 2.5 | 5.1 | 3.4 | 3.3 | 1.4 | ninguno (vacío) |

### Causas raíz (Table B.3, primer nivel)

| Código | Nombre |
|---|---|
| 1 | Diseño |
| 2 | Fabricación o instalación |
| 3 | Operación o mantenimiento |
| 4 | Gestión |
| 5 | Misceláneo · causa combinada o común |

### El análisis (`POST /api/analisis/:evento`)

Cuerpo `{ mecanismo, causaRaiz, nota? }` → `{ analisis: { mecanismo, causaRaiz, nota?, por, hora } }`.
Capacidad `causa:completar` (confiabilidad, jefe de mantenimiento). `422` si la parada no tiene una
respuesta declarada con parte, si el mecanismo no es un código de la Table B.2 o la causa raíz no es
de la B.3. Un segundo `POST` es una **versión nueva**: la anterior pasa a la historia (`anteriores`),
no se borra. En pantalla: «Análisis: 1.1 fuga · causa raíz: operación o mantenimiento · «nota» · \<por\>»
con «Corregir»; las anteriores, «Antes: …». Sin la capacidad: chip «análisis pendiente».

### Modos por clase (B.2.6)

`MODOS_POR_CLASE` (`iso14224.ts:37-53`) lista qué modos aplican a cada clase de equipo (bomba
centrífuga, multifásica, inyección, electrosumergible, compresores, tratador, separador, tanque, LACT,
switchgear). **Hoy no lo usa ninguna pantalla**: las opciones salen de `Parte.modos`. Ver «Huecos».
