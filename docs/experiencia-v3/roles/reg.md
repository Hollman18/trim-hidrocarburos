# reg · Cumplimiento regulatorio · ficha de valor

**Lo necesario** de este rol está en `../necesario-por-rol.md` §10, y los códigos de los elementos en `_elementos.md`. **El reporte a la ANH es obligatorio y no se borra** (§3.4 del encargo).

## 1. Su trabajo, en una frase

Que el reporte de paradas a la ANH salga completo antes de las 07:00, y corregirlo dentro de 1 hora si lo rechazan.
- [C24]: el IDP del día anterior, antes de las 07:00, con corrección en 1 h.
- Edinson: el árbol de la circular «va a estar exigiéndose en el nuevo IDP… para determinar… la producción del día inmediatamente anterior» [T 26:48].

## 2. Su pregunta y su decisión

- **Pregunta:** ¿el reporte pasa? Si no, ¿qué falta, quién lo debe y cuánto tiempo queda? [X4 §2]
- **Decisión:** publicar o esperar, y a quién apurar.

## 3. Lo que ve hoy, elemento por elemento

**Pantallas (3 puertas):**
- Reporte, que es su inicio;
- La planta viva;
- Resultados.

Medido:
- el inicio a 390 px tiene **81 palabras sin desplazarse y 84 en la página, con 12 cifras**;
- sus puertas suman **802 palabras** a 1440 px.

| Elemento | Dónde | Quién lo pidió | Qué decisión habilita | Frecuencia | Si se borra… | Veredicto |
|---|---|---|---|---|---|---|
| CA-4: 4 conteos | Cabecera | Adair | Ninguna suya | — | — | **F**: la marca del campo |
| CA-5: período y «Exportar» | Cabecera | X4 §3.5 | Entregar | Cada día | — | **Q**, una sola vez |
| RG-1: «2 paradas sin causa · No se puede publicar todavía…» | Reporte | X4 §3.4; P-03 | Publicar o no | Cada día | Incumple | **Q** (principal) |
| RG-1: «Las contesta el operador de campo mañana antes de las 07:00» | Reporte | X4 §3.4 | A quién apurar | Cada día | — | **F** (con RG-2) |
| RG-2: una fila por parada (qué falta, quién lo debe, la hora y los bbl) | Reporte | X4 §3.4 | A quién apurar | Cada día | No sabe a quién apurar | **Q** |
| RG-3: el árbol como la circular, con «Ver los códigos ANH» | Reporte | Edinson [T 26:48]; C24 | El contenido del reporte | Cada día | — | **Q**, plegado a la primera rama que falta; el resto, **T** |
| RG-4: «Pérdida: TRIM todavía no tiene registro de pérdidas» (×3) | Reporte | Edinson [T 26:48] | Dice que falta | — | — | **F**: una sola vez, no en cada rama |
| RG-5: «= el diferido del libro · 1.046 bbl» | Reporte | U1 §1.0 | Que cuadre | Mensual | — | **T** |
| RG-6: medición oficial | Reporte | X4 §3.7 | Cuadre | Mensual | — | **T** |
| RG-7: «Exportar» en la cabecera | Reporte | C24 | Entregar | Cada día | — | **Q** (acción principal); el segundo «Exportar CSV» que señaló la revisión, **B** |
| PV-1 a PV-17: Planta viva | Planta viva | X4 §3.2 | Ninguna suya | Casi nunca | — | **B** como puerta |
| RE-1 a RE-6 y RE-14: Resultados, con «¿Se puede publicar?» | Resultados | C24 | El mes | Mensual | Repite el Reporte | **B** como puerta; el mes cerrado se escoge en el período de Reporte |
| — : la respuesta de la ANH y la hora de corrección | No existe | C24; U1 §6.3 | ¿Cumplí? | Cada día | No sabe si cumplió | **Se agrega** (falta en el motor) |
| — : las pérdidas del período | No existe | Edinson; C24 p.4 | El balance | Mensual | — | **Se agrega** (falta en el motor) |

## 4. Su pantalla necesaria («tipo número»)

- **Principal:** **2** · «paradas sin causa».
- **Apoyo:**
  - 355 bbl sin causa;
  - el límite (mañana, 07:00);
  - la respuesta de la ANH (dice «sin respuesta registrada» hasta que el motor la tenga).
- **Lo que lo explica:** una fila por parada, con quién la debe.
- **Acción principal:** «Exportar el reporte» (C024-2026 o DICC-V3.2).
- **A un toque:** el árbol completo, la medición oficial y las pérdidas.
- **Sin menú.**

## 5. Sus 3 tareas más frecuentes

| Tarea | Hoy | Después |
|---|---|---|
| ¿Se puede publicar? | La cifra y su frase. **0 toques** | Igual. **0 toques** |
| ¿Quién debe qué? | Las filas, debajo. **0 toques** | Igual. **0 toques** |
| Entregar el reporte | «Exportar». **1 toque** | Igual. **1 toque** |

Los segundos no se midieron aquí: los mide §9. Este rol ya estaba cerca de lo necesario. Lo que le falta **no está en la pantalla, está en el motor**: la respuesta de la ANH y las pérdidas.

## 6. Lo que se le borra

| Qué | Por qué |
|---|---|
| La Planta viva y Resultados como puertas | No cambian su decisión; el mes se escoge en el período |
| La pérdida repetida en cada rama (RG-4 ×3) | Se dice una vez |
| El segundo «Exportar» | Hay dos para lo mismo (UI-08) |

## 7. Hoy contra lo necesario

| | Hoy | Necesario |
|---|---|---|
| Elementos en la primera capa | 7 | 6 |
| Cifras del inicio (página, 390) | 12 | 4 |
| Palabras del inicio (vista / página, 390) | 81 / 84 | 34 |
| Pantallas | 3 | 1 |
| Toques para entregar | 1 | 1 |
