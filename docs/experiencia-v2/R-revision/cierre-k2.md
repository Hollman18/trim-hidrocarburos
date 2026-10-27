# Cierre K2 · Los inicios de cada rol en el teléfono

27-oct, última vuelta. Todo se midió a 390 × 844, en Chrome, con la cuenta del auditor (`e2e/auditoria/inicio.ts`): las palabras sin desplazarse en toda la ventana, y las cifras sin la franja ni la hora de los datos (D-1). En Safari de teléfono da lo mismo.

**Los nueve inicios pasan el auditor «inicio de cada rol · 390 px»**, en dev y en iphone.

## 1. Antes y después

«Antes» es la medición de F4 a las 19:30 (`coordinacion.md`). «Después» es la de hoy. Los topes son los de D-1:
- con imagen propia (ger, prod, sup y oper), su imagen;
- sin imagen propia, la imagen de su mismo tipo de pantalla (decisión del coordinador):
  - tareas y listas toman la imagen 3b al abrir: 89 palabras y 9 cifras;
  - una vista de un campo toma la imagen 2: 81 palabras y 9 cifras.

| Rol | Palabras antes → después | Tope (de dónde) | Cifras antes → después | Tope de cifras |
|---|---|---|---|---|
| ger | 96 → **85** | 85 (imagen 2) | 9 → **9** | 9 |
| prod | 97 → **82** | 82 (imagen 2) | 10 → **9** | 9 |
| reg | 130 → **81** | 81 (imagen 2 · vista de un campo) | 15 → **6** | 9 |
| sup | 112 → **104** | 104 (imagen 3b) | 14 → **10** | 10 |
| oper | 96 → **93** | 93 (imagen 5) | 9 → **7** | 7 |
| jefe | 119 → **89** | 89 (imagen 3b · tareas) | 15 → **9** | 9 |
| conf | 89 → **88** | 89 (imagen 3b · lista) | 5 → **6** | 9 |
| tec | 86 → **88** | 89 (imagen 3b · tareas) | 7 → **2** | 9 |
| adm | 122 → **79** | 81 (imagen 2 · vista de un campo) | 6 → **2** | 9 |

En conf y tec las palabras casi no bajan. No es texto nuevo: al quitar renglones arriba, sube lo de abajo (en conf, el vigía y «28 equipos»; en tec, la tercera tarjeta). Las cifras de tec bajaron de 7 a 2, y conf quedó en 6 cifras, bajo su tope de 9.

**A 1440 no empeora.** Hoy mide ger 299, prod 305, reg 213, sup 297, oper 276, jefe 244, conf 221, tec 224 y adm 171. Todo es igual o menos que en la vuelta anterior y que en R1. Lo de K2 en el teléfono va con `max-sm:`, `sm:hidden` o `useTelefono`. En el escritorio solo se quitó texto: la frase y la explicación de reg, su fila, el vigía y la ⓘ del colchón.

**Hallazgo para el coordinador.** Las imágenes aprobadas, contadas con la misma regla, traen 81 palabras (la 2), 89 (la 3b al abrir) y 112 (la 5). El −40 % del «antes» (56 a 78) quedaba por debajo de ellas.

## 2. La prueba de los 10 segundos (después)

| Rol | Lo que se entiende en 10 segundos |
|---|---|
| ger | En La Ceiba se dejan de producir 1.966 bbl/d. Se trabó en la planta: P-201B, la bomba de agua, está parada. 301 son de LC-21, sin identificar. |
| prod | Hoy salen 9.394 bbl/d de La Ceiba, contra una meta de 10.900. Limitan los pozos y la planta se angostó por P-201B. |
| reg | No se puede publicar todavía: octubre sigue abierto y a 2 paradas les falta la causa (355 bbl). Las contesta el operador de campo mañana antes de las 07:00. Son LC-21 (247) y LC-08 (108). |
| sup | Se dejan de producir 1.966 bbl/d y faltan 4 paradas por confirmar antes de las 07:00. No arrancar P-201B ni LC-21. Primero, confirmar las 2 de P-201B. |
| oper | P-201B, la bomba de agua, paró en la madrugada. ¿Qué parte se dañó? No la arranque hasta decirlo: un toque en la opción. |
| jefe | De cada falla, 7,7 de 8,1 días son espera, y el vigía anunció 3 de 3. No arrancar P-201B ni LC-21. Falta la causa de 3 paradas, y K-101 ya pasó el límite. |
| conf | Ataque primero P-201A y P-201C. Si una falla hoy se dejan de producir 3.059 bbl/d, y TRIM no las vigila: ahí va el próximo instrumento. El vigía acertó 3 de 3. |
| tec | Le tocan 5 cosas. Primero diga qué se dañó en P-201B. No arrancar P-201B ni LC-21. |
| adm | La Ceiba tiene 3 de 6 pasos listos. Falta firmar a qué pozos sirve cada equipo, lo que deja pasar cada tramo y el factor de medición. |

## 3. Los topes, con su porqué

Los textos exactos están en `e2e/auditoria/presupuesto.ts`. El tope de cifras por rol se lee en `auditor.spec.ts`, en una línea: `p.cifras ?? CIFRAS_TELEFONO`.

**ger: 85 palabras y 9 cifras.**
- La imagen 2 (La Ceiba) trae 81 palabras.
- A eso se suman «Demo» (UI-22) y la redacción de P-14 de V1: «el agua solo deja pasar 236 bbl/d más de crudo» (+3).
- Cifras: la imagen rotula cada tramo con la suya (8), y se suma 236.

**prod: 82 palabras y 9 cifras.** Es la misma tubería de la imagen 2, con la cifra de producción, que el dibujo ya no repite («Sale hoy · meta 10.900»). Se suman «Demo», P-14 y la insignia del ☰.

**sup: 104 palabras y 10 cifras.**
- La imagen 3b, al abrir, trae 89 palabras.
- La tarjeta «Conseguir la causa» entera, como en la 3b después de confirmar, suma 15.
- Se suman «Demo» y «ni LC-21», que es un dato.
- Se restan «su turno» y la hora de la tarjeta (−3).

**oper: 93 palabras y 7 cifras.** La imagen 5 trae 112 palabras y 9 cifras.

**jefe y tec: 89 palabras y 9 cifras.** Son del tipo tareas: imagen 3b al abrir.

**conf: 89 palabras y 9 cifras.** Su cabeza es una lista de filas: tipo lista, imagen 3b al abrir.

**reg y adm: 81 palabras y 9 cifras.** Son vistas de un campo: imagen 2.

## 4. Lo que salió de la primera capa (antes → ahora)

**Hoy, en el teléfono.** En el escritorio todo queda igual: el motor da la versión corta aparte (`donde.corto`, `porqueCorto`, `contextoCorto`, `tituloCorto`, `textoCorto` y `subCorto` de la franja).
- «cerró LC-07 y LC-16 · 05:43» → «cerró LC-07 y LC-16». La hora está en «Ver una por una».
- «lleva 19,7 h sin causa; se escaló a las 20:20» → «lleva 19,7 h sin causa». El escalamiento está en «Ver el chat».
- «LC-08 arrancó a la 01:10 sin identificar · Entre las 2: 219 bbl hoy · 355 desde que pararon» → «LC-08 arrancó sin identificar · Entre las 2: 219 bbl hoy».
- Al jefe:
  - la tarjeta queda «lleva 10,1 h sin causa · Entre todas: 219 bbl hoy». Los nombres de las otras están en «Ver el chat» y el título ya dice «3 paradas».
  - la franja queda «No arrancar P-201B ni LC-21». «Hasta identificar qué se dañó» y la salvedad van en su ⓘ.
- «Si para, hasta 9.394 bbl/d. Orden 40012056, liberada a Óscar Daza a las 09:10.» → «Si para, hasta 9.394 bbl/d.». El número, a quién y la hora están en «Ver la orden ›». Si la orden no está liberada, se dice.
- «Decidir 3 planes de P-201B · simulado» → «Decidir planes · simulado». El equipo está en su renglón y la cuenta, en «Ver los planes».
- El previo del jefe, «De lo que dura una falla» → «De cada falla». La frase de X4 sigue entera.
- «Sigue parada.» repetía la franja de arriba. Sale en el teléfono.
- En la banda del operador y en las tarjetas del técnico, «paró hoy a las 03:52, hace 10,1 h» → «paró hoy en la madrugada». La hora exacta está en la ficha y en el escritorio.
- La orden del técnico sigue entera, porque si le llegó por WhatsApp no está en otro lugar (P-trabajo-1).

**La planta viva de producción.** «Sale hoy 9.394 bbl/d» repetía la cifra grande → «Sale hoy · meta 10.900».

**Regulatorio.**
- La frase ya no repite la cifra: «…octubre sigue abierto y les falta la causa (355 bbl).»
- La explicación queda «Las contesta el operador de campo mañana antes de las 07:00.» La pregunta que le llegó está en cada parada, a un toque.
- La fila no repite quién lo debe ni qué falta cuando es igual en todas. Ya lo dicen la explicación y la cifra, y lo oye el lector de pantalla.
- En el teléfono, «Reporte a la ANH · octubre» repetía el título y el período: va al lector, y la ⓘ queda junto a la cifra.
- **El árbol abre plegado en el teléfono:** su título, «Ver los códigos ANH» y su total («1.046 bbl ›», que lo abre). Las ramas, «5 paradas · 0 bbl con los 6 pasos confirmados», el orden de la circular y el cuadre con el libro quedan a un toque. En el escritorio y en el papel va entero.
- La cuenta de puntos de «Medición oficial» pasa adentro.

**Equipos de confiabilidad.**
- «después de 2 min de colchón» → la ⓘ de «calculado».
- La cabeza en el teléfono: cada fila lleva en su segundo renglón solo lo anormal («sin instrumento») y su cifra si no es la grande. P-201A y P-201C no la repiten. «Lo vigila TRIM» es lo normal y no se dice.
- «se supone en marcha · sube porque…» está en la fila entera de la lista.
- «Si falla hoy, lo primero» → «Si falla hoy».
- El vigía: «Desde que entró TRIM, acertó 3 de 3 avisos». Las intervenidas están en «Ver el detalle».
- En el teléfono, los filtros de estado van detrás de «Filtrar ▾».

**Configurar del administrador.**
- Cada paso, en una o dos palabras (`corto` del motor). El detalle sigue en su nombre accesible, en su editor y en el escritorio.
- «La Ceiba» va al lector, porque está en la píldora.
- «Sus otros campos: … N de M» → «Sus otros campos ▾».

## 5. Las cuatro fallas cruzadas

1. **El título `sr-only` de La planta viva, marcado «recortado».** K1 ya lo había dejado en un solo texto. Lo comprobé con `planta-viva.spec` a 320 y 390, y con el detector: limpio.
2. **«Cambió hoy» repetido** (`equipos.spec:33`). `EnRiesgo` ya pasa `sinCambioHoy`. Pasa en dev e iphone.
3. **`TuberiaDePie` recortaba texto** en Morichal y El Palmar, a 390 y 320:
   - el ramal va en dos renglones cuando no cabe en uno (se mide lo largo contra el ancho);
   - a 320, «aquí se trabó» de los pozos baja a su renglón;
   - en Después, si «ahora: bombas…» no cabe, «ahora:» sube a su renglón;
   - además, el ramal ya no toca su rótulo.
4. **La fila de LC-11 en la cabeza de conf se encimaba a 320.** En el teléfono la cifra va en su segundo renglón y el nombre tiene todo el ancho.

**El auditor completo, sin hallazgos:** a 1512, 1280, 390 y 320 en dev, y a 390 en iphone.

## 6. Archivos y pruebas

**Motor**, con su prueba:
- `entities/hoy.ts`: `momento()`; lo corto de cada tarjeta; la franja corta del jefe y de conf; `tituloCorto`; el previo del jefe.
- `entities/regulatorio.ts`: la frase, «faltan todos los pasos» y la explicación.
- `entities/equipos-tecnico.ts`: el vigía.
- `entities/choke-config.ts`: `corto` de cada paso.
- `CONTRATO.md`: los campos nuevos de Hoy.

**Pantalla:**
- `widgets/hoy/Tarjeta.tsx`, `piezas.tsx` y `Operador.tsx`;
- `widgets/plantaviva/Tuberia.tsx` y `pages/PlantaViva.tsx`;
- `pages/Regulatorio.tsx` y `widgets/choke/ArbolCircular.tsx` (`plegadoEnTelefono`);
- `widgets/equipos/Lista.tsx` (la cabeza, «Filtrar»);
- `pages/Configuracion.tsx` (el «Estado»).

**Pruebas:**
- `scripts/verificar-contrato.mjs`: lo corto de sup, oper, jefe y tec, y la franja del jefe.
- `scripts/verificar-libro.mjs`: reg, vigía y `corto` del estado.
- `e2e/inicios-k2.spec.ts`, nuevo: 6 pruebas en dev e iphone, con lo que se ve en el teléfono y lo entero en el escritorio.
- `e2e/hoy.spec.ts` (la banda del operador; los títulos, por lo que se ve), `e2e/arreglos-f1.spec.ts` (el título de planes, por lo que se ve) y `e2e/f2-regulatorio.spec.ts` (la frase).
- `e2e/auditoria/presupuesto.ts`, una línea de `e2e/auditor.spec.ts` y `e2e/auditoria/rutas.ts`:
  - conf busca «Si falla hoy»;
  - en reg, la rama de la pérdida y el cuadre se comprueban con el árbol abierto.

**Herramientas** (en `docs/experiencia-v2/R-revision/herramientas/`):

```sh
# Mide cada inicio con la cuenta del auditor.
node docs/experiencia-v2/R-revision/herramientas/k2-inicios.mjs --url http://localhost:5182 --palabras
# Corre el detector en unas rutas y unos anchos.
node docs/experiencia-v2/R-revision/herramientas/k2-detector.mjs --url http://localhost:5182 --anchos 390,320 '#/conf/equipos/ceiba'
```

**Verificación:**
- `npx tsc -b` y `npx oxlint src` sin errores.
- `npm run referencia`, y después `npm test` en verde: verificar-libro 563 de 563, árbol 128 de 128, contrato 203 de 203 y referencia 311 de 311.
- En dev e iphone pasan:
  - `inicios-k2`, `hoy`, `f2-regulatorio`, `arreglos-f1`, `arreglos-f3`, `arreglos-f3-config`, `planta-viva` y `equipos`;
  - el auditor «inicio»;
  - el auditor completo en los anchos dichos.
