# sup · Supervisor de operaciones · ficha de valor

**Lo necesario** de este rol está en `../necesario-por-rol.md` §3, y los códigos de los elementos en `_elementos.md`.

## 1. Su trabajo, en una frase

Que su turno quede confirmado para el reporte antes de las 07:00 y que, si para una bomba de agua, se cierre en el orden que menos cuesta.
- `roles.ts` (foco): «Si una para, cierras en el orden que menos cuesta».
- [U1 §1.1]: «Confirmar en lote las paradas del turno antes del cierre; en qué orden cerrar pozos si la planta se traba».

## 2. Su pregunta y su decisión

- **Pregunta:** ¿qué paró en mi turno y qué me falta confirmar antes de entregar? [X4 §2]
- **Decisión:** confirmar o corregir lo que TRIM dedujo, y quién contesta lo que nadie contestó.

## 3. Lo que ve hoy, elemento por elemento

**Pantallas (8 en 3 puertas):**
- Hoy, Identificar, Turno;
- La planta viva;
- Equipos, Bombas, Electrosumergibles, Pozos.

Medido:
- el inicio (`#/sup/hoy/…`) tiene **104 palabras sin desplazarse y 172 en la página, con 18 cifras**, a 390 px;
- sus puertas suman **2.923 palabras** a 1440 px.

| Elemento | Dónde | Quién lo pidió | Qué decisión habilita | Frecuencia | Si se borra… | Veredicto |
|---|---|---|---|---|---|---|
| CA-4: 4 conteos | Cabecera | Adair [T 33:45]; X2 | Ver lo anormal | Cada turno | — | **F**: la marca del campo; los conteos, **T** |
| CA-6: 3 puertas | Panel | X4 §3.2 | — | — | — | **B**: necesita una sola pantalla |
| HO-1: «1.966 barriles por día se dejan de producir» (la cifra grande) | Hoy | X4 §3.4 | Si hay que actuar ya | Cada turno | — | **Q**, pero **de apoyo**: el principal pasa a ser las paradas por confirmar |
| HO-1: «Le faltan 4 paradas por confirmar: el reporte sale mañana antes de las 07:00» (en la frase) | Hoy | U1 §1.1; C24 | Confirmar | Cada turno | El reporte no sale | **Q** (principal: sale de la frase y pasa a ser el número) |
| HO-14: «Entregar turno» | Hoy | X4 §3.6; P-06 | Entregar | Cada turno | Entrega con Hoy mismo | **B** de la primera capa (escalón 1: Hoy como PDF) |
| HO-2: «No arrancar P-201B ni LC-21» | Hoy | X4 §3.3 (seguridad) | No arrancar | Cada turno | Riesgo de no conformidad | **Q** (apoyo, con número) |
| HO-3: «Confirmar 2 paradas iguales» | Hoy | U1 §2; C24 | Confirmar | Cada turno | — | **Q** (acción principal) |
| HO-4: «Conseguir la causa de 2 paradas» con «Responder yo» | Hoy | X4 §3.3 | Quién contesta | Cada turno | Nadie contesta | **Q** (apoyo y acción) |
| HO-4: «se escaló a las 20:20», «Ver el chat» | Hoy | — | — | — | — | **W** |
| HO-5: «Seguir la orden de K-101» | Hoy | X4 §3.3 | Ninguna suya: la orden es del jefe y del técnico | — | — | **B** para sup |
| HO-6: «Decidir 3 planes · simulado» | Hoy | X4 §3.3 | Aceptar un plan simulado | Casi nunca | — | **T** (escalón 3) |
| HO-7: «Lo más frágil: el agua… cierre primero…» | Hoy | U2 §6; CHOKE §9 | Cerrar en orden | Solo cuando para una bomba | Barril evitable (30 bbl en octubre) | **Q solo en la alarma**; el resto del tiempo, **B** |
| HO-11: «Su campo, ahora» | Hoy | X4 §3.3 | Repite la tubería | — | — | **B** |
| HO-12: «El turno en WhatsApp» | Hoy | — | — | — | — | **W** |
| HO-13: «Diferido de su turno · 723» | Hoy | X4 §5.5 | Ninguna | — | — | **B** |
| HO-16: «“Entregar turno” abre…» | Hoy | — | — | — | — | **B** |
| HO-15: «Hecho hoy (n)» | Hoy | X4 §3.3 | Deshacer | Cada turno | — | **Q** (plegado) |
| TU-1 a TU-9: la pantalla Turno | Turno | Turno v1; X4 | Repite Hoy | — | — | **B** (la pantalla) |
| TU-2: «≈ 983 bbl en el turno que entra · proyectado» | Turno | Turno v1 | Ninguna | — | — | **B** |
| TU-3: «Qué limita hoy al campo» (47 palabras) | Turno | Turno v1 | De producción | — | — | **B** |
| TU-10: WhatsApp del turno | Turno | — | — | — | — | **W** |
| ID-2: la tarjeta para contestar | Identificar | U1 §2 | Declarar | Cada turno | — | **F** (con HO-4, «Responder yo») |
| ID-6: la cadena de 6 pasos | Identificar | Edinson [T 26:48] | Corregir | Cuando TRIM se equivoca | — | **T** («Ver una por una») |
| ID-4 y ID-5: porcentajes y el histórico | Identificar | U1 | De conf y prod | — | — | **B** para sup |
| ID-3: WhatsApp por parada | Identificar | — | — | — | — | **W** |
| PV-1 a PV-17: la Planta viva | Planta viva | X4 | La del gerente | — | — | **B** como puerta; la tubería, **T** desde la parada |
| EQ-4 a EQ-6: la lista de equipos | Equipos | X4 | Abrir un equipo | Semanal | — | **T** (desde la tarjeta: «Ver P-201B») |
| BO-1 a BO-3, ES-1 y PZ-1 | Bombas, Electrosumergibles, Pozos | v1 | Repiten la lista | — | — | **B** como pantallas |
| N3-1 a N3-8: la ficha de P-201B | Nivel 3 | X4 §5; Adair | Ver la salud; orden de cierre; aviso | Cuando para | — | **T** |
| N3-2: «Crear aviso en SAP» | Nivel 3 | Hollman [T 04:00] | Aviso | — | — | **T** (escalón 2) |

## 4. Su pantalla necesaria («tipo número»)

- **Principal:** **4** · «paradas por confirmar», con «antes de las 07:00».
- **Apoyo:**
  - 1.966 bbl/d se dejan de producir;
  - 2 equipos que no se arrancan;
  - 2 paradas sin causa.
- **Acción principal:** «Confirmar las 2». **Secundaria:** «Responder yo».
- **En la alarma, y solo entonces:** el orden de cierre.
- **A un toque:** «Ver una por una» (la cadena) y la ficha del equipo.
- **Sin menú.**

## 5. Sus 3 tareas más frecuentes

| Tarea | Hoy | Después |
|---|---|---|
| Confirmar 2 paradas iguales | Hoy → «Confirmar las 2». **1 toque** | Igual. **1 toque** |
| Contestar una causa que nadie contestó | Hoy → «Responder yo» → la parte → lo que vio. **3 toques** | «Responder yo» → la parte. **2 toques** (la condición del motor de `../necesario-por-rol.md` §4) |
| Entregar el turno | «Entregar turno» → la pantalla Turno (4 cifras, sin cierre) [P-05, P-06]. **1 toque, y no termina** | Su Hoy **es** la entrega. El PDF es el escalón 1 |

Los segundos no se midieron aquí: los mide §9.

## 6. Lo que se le borra

| Qué | Por qué |
|---|---|
| La pantalla Turno entera (TU-1 a TU-9) | Repite Hoy con otros nombres y una cifra proyectada [P-05, P-06] |
| «Diferido de su turno» y «≈ 983 bbl proyectado» (HO-13, TU-2) | No cambian lo que hace |
| «Su campo, ahora» (HO-11) | Repite la tubería |
| «Seguir la orden de K-101» (HO-5) | No es suya |
| «Lo más frágil» fijo (HO-7) | Sale solo cuando para una bomba |
| La Planta viva, Bombas, Electrosumergibles y Pozos como puertas | Son la vista del gerente y pantallas de antes; la ficha queda a un toque |
| El texto que explica «Entregar turno» (HO-16) | Explica un botón |

## 7. Hoy contra lo necesario

| | Hoy | Necesario |
|---|---|---|
| Elementos en la primera capa del inicio | 13 (HO-1 a HO-16 que le salen) | 7 (principal, 3 de apoyo y 2 acciones; el orden de cierre, solo en la alarma) |
| Cifras del inicio (página, 390) | 18 | 4 |
| Palabras del inicio (vista / página, 390) | 104 / 172 | 29 |
| Pantallas | 8 | 1 |
| Toques: confirmar / responder | 1 / 3 | 1 / 2 |
