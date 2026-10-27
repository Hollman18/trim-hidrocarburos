# jefe · Jefe de mantenimiento · ficha de valor

**Lo necesario** de este rol está en `../necesario-por-rol.md` §5, y los códigos de los elementos en `_elementos.md`.

## 1. Su trabajo, en una frase

Intervenir antes de que el equipo falle y acortar lo que dura una falla.
- `roles.ts` (foco): «Antes: intervenir a tiempo».
- Hollman: «anticiparnos a su daño… para que ellos puedan tomar acción inmediata» [T 04:00].

## 2. Su pregunta y su decisión

- **Pregunta:** ¿qué hay que intervenir ya, y estoy anticipando las fallas o corriendo detrás de ellas? [X4 §2]
- **Decisión:** a qué equipo manda la cuadrilla hoy, y a cuál no.

## 3. Lo que ve hoy, elemento por elemento

**Pantallas (10 en 4 puertas):**
- Hoy, Identificar;
- La planta viva;
- Equipos, Bombas, Electrosumergibles;
- Resultados, Diferidos, Confiabilidad, Mantenimiento;
- además, la ficha del equipo.

Medido:
- el inicio (Hoy) a 390 px tiene **89 palabras sin desplazarse y 133 en la página, con 16 cifras**;
- sus puertas suman **4.534 palabras** a 1440 px;
- Equipos con todos sus campos llega a **3.850 palabras**.

| Elemento | Dónde | Quién lo pidió | Qué decisión habilita | Frecuencia | Si se borra… | Veredicto |
|---|---|---|---|---|---|---|
| CA-4: 4 conteos | Cabecera | Adair | Ver lo anormal | Cada día | — | **F**: la marca del campo |
| HO-1: «7,7 de 8,1 días son espera» (la cifra grande) | Hoy | X4 §3.4 | Tiempo fuera | Semanal | — | **Q** de apoyo, no principal: promedia 14 fallas de toda la historia y Edinson pidió que sea modular [T 22:34] |
| HO-1: «El vigía anunció 3 de 3 fallas» | Hoy | X4 §3.4 | Cuánto creerle | Mensual | Está en Resultados | **T** |
| HO-2: «No arrancar P-201B ni LC-21» | Hoy | Seguridad | — | — | — | **F** (con «por identificar»): no opera |
| HO-4: «Conseguir la causa de 3 paradas» | Hoy | X4 §3.3 | Completar el análisis | Cada día | No hay código de fallo | **Q** (apoyo y acción) |
| HO-4: «se escaló», «Ver el chat» | Hoy | — | — | — | — | **W** |
| HO-5: «Seguir la orden de K-101 · ya pasó el límite» | Hoy | X4 §3.3 | Intervenir | Cada día | Pierde su decisión | **Q** (principal: «avisan 1») |
| HO-6: «Decidir 3 planes · simulado» | Hoy | X4 §3.3 | Aceptar un plan | Semanal | — | **T** (escalón 2) |
| HO-8: «Ojo: no intervenir hoy» | Hoy | U2 §6.4 | No intervenir | Cuando aplica | Para lo que hoy vale más | **Q** cuando aplica |
| HO-11: «Su campo, ahora» | Hoy | X4 §3.3 | — | — | — | **B** |
| EQ-3: «Ojo…» arriba de Equipos | Equipos | P-10 | No intervenir | — | — | **F** (con HO-8) |
| EQ-4: «Cambió hoy…» | Equipos | U2 §6 | Repite EQ-3 | — | — | **B** |
| EQ-5 y EQ-6: filtros y la lista de 28 | Equipos | X4 §3.6 | Abrir un equipo | Semanal | — | **T** (su segunda pantalla, abierta en «Avisan») |
| EQ-7: «Qué está en riesgo» | Equipos | K1 · P-10 | Repite HO-5 y la lista | — | — | **B** |
| EQ-8: la tabla de «Si falla hoy» | Equipos | PM F2 | De confiabilidad | — | — | **T** |
| BO-1 a BO-3 y ES-1 | Bombas, Electrosumergibles | v1 | Repiten la lista | — | — | **B** como pantallas |
| MA-1: «Fallas de alto impacto · 573», 661 contra 800 | Mantenimiento | v1 | Repite RE-3 | — | — | **B** |
| MA-2 y MA-9: por identificar | Mantenimiento | v1 | Repite HO-4 | — | — | **B** |
| MA-3: «Intervenir ya» | Mantenimiento | X4 §3.7 | Repite HO-5 | — | — | **F** (con el principal) |
| MA-4: «Dónde bajarlo» | Mantenimiento | Sin dueño con nombre | — | — | — | **B** |
| MA-5: «Por parte» | Mantenimiento | R3 | El modo | Mensual | — | **T** (Resultados) |
| MA-6: «Programa de paradas» | Mantenimiento | Edinson [T 22:34] | Planear | Semanal | No ve qué viene | **T** |
| MA-7: «Horas en SAP» | Mantenimiento | Hollman (SAP) | Ninguna: «Sin órdenes cerradas en el período» | — | — | **B** (vuelve con los 5 tramos) |
| MA-8: «Abierto en SAP» | Mantenimiento | Hollman (SAP) | Seguir la orden | — | — | **F** (con HO-5) |
| CO-1: entre fallas por familia | Confiabilidad | Edinson [T 22:34] | Qué familia | Mensual | — | **T** |
| CO-3 y RE-16: ¿le creo al vigía? | Confiabilidad, Resultados | PM F2 | Cuánto creerle | Mensual | — | **T** |
| CO-4: reparación activa y espera | Confiabilidad | X4 §3.4 | Tiempo fuera | Semanal | — | **F** (con su apoyo «espera») |
| CO-5 a CO-7: costosos, de qué fallan, por mes | Confiabilidad | Edinson; PM §1 | Qué atacar | Mensual | — | **T**; CO-7 (fallas de este mes) sube a apoyo |
| CO-8 a CO-12: calidad del registro y de la clasificación | Confiabilidad | U1 §1.1 | De confiabilidad | — | — | **B** para jefe (son de conf) |
| DI-1 a DI-9: Diferidos | Diferidos | v1 | Repiten Resultados | — | — | **B** como pantalla |
| RE-1 a RE-16: Resultados | Resultados | Hollman | El mes | Mensual | — | **T**; RE-8, RE-9 y RE-12: **B** |
| PV-1 a PV-17: Planta viva | Planta viva | X4 | La del gerente | Casi nunca | — | **B** como puerta |
| N3 y N4: ficha y diagnóstico | Nivel 3 y 4 | X4 §5; Adair | Ver la salud; aviso SAP | Cuando avisa | — | **T** |
| N4-2: planes con «Aceptar» | Nivel 4 | X4 §3.3 | Decidir un plan | Semanal | — | **T** (escalón 2) |

## 4. Su pantalla necesaria («tipo número»)

- **Principal:** **1** · «equipo avisa» (K-101, ya pasó el límite), con «Ver la orden».
- **Apoyo:**
  - 3 paradas por identificar;
  - 1 falla de un equipo crítico en octubre;
  - 7,7 de 8,1 días son espera.
- **Cuando aplica:** «Ojo: hoy no intervenga P-201A ni P-201C».
- **Acción principal:** «Ver la orden» o crear el aviso. **Secundaria:** completar el análisis.
- **A un toque:** Equipos (abierta en «Avisan»), Resultados y la ficha.

## 5. Sus 3 tareas más frecuentes

| Tarea | Hoy | Después |
|---|---|---|
| Intervenir lo que avisa | Hoy → «Ver la orden». **1 toque** | Inicio → «Ver la orden». **1 toque** |
| Conseguir una causa que falta | Hoy → «Responder yo» → la parte → el modo. **3 toques** | «Responder yo» → la parte → el modo (el análisis sí necesita el modo). **3 toques** |
| No intervenir lo que hoy vale más | «Ojo» → «Ver P-201A y P-201C», que abría La planta viva [P-10]. **1 toque** | La línea sale en el inicio cuando aplica. **0 toques** |

Los segundos no se midieron aquí: los mide §9.

## 6. Lo que se le borra

| Qué | Por qué |
|---|---|
| La pantalla Mantenimiento como está (MA-1, MA-2, MA-4, MA-7 y MA-9) | 6 de sus 9 paneles repiten Hoy o Resultados |
| «Qué está en riesgo» debajo de Equipos (EQ-7) y «Cambió hoy» (EQ-4) | Repiten su número y la línea «Ojo» |
| Diferidos, Bombas y Electrosumergibles como pantallas | Repiten Resultados y la lista |
| La calidad del registro y de la clasificación (CO-8 a CO-12) en su vista | Son de confiabilidad |
| La Planta viva como puerta | Es la vista del gerente |

## 7. Hoy contra lo necesario

| | Hoy | Necesario |
|---|---|---|
| Elementos en la primera capa | 9 | 7 |
| Cifras del inicio (página, 390) | 16 | 4 |
| Palabras del inicio (vista / página, 390) | 89 / 133 | 36 |
| Pantallas | 10 | 2 (Hoy y Equipos; Resultados a un toque) |
| Toques para intervenir lo que avisa | 1 | 1 |
