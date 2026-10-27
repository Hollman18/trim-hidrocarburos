# Lo que se borra (§4 y §10.1)

**27-oct-2026 · M1.** Es la lista consolidada de las 11 fichas (`roles/<rol>.md`) contra lo necesario de cada rol (`necesario-por-rol.md`).
- **WhatsApp no está aquí:** su inventario y sus reemplazos son de otro agente (§6, `whatsapp.md`). En las fichas va marcado **W**.
- **Nada de esto se construye antes del «hazlo» del dueño** (§10).
- **Y nada del contrato se borra** (§3.1). Lo que el front deja de usar se le dice al backend como «no prioritario» o «para después», en `docs/backend/CAMBIOS-CONTRATO.md`.

**Qué no se toca:**
- el reporte a la ANH (6 pasos, C024-2026 y DICC-V3.2);
- la trazabilidad de quién dijo qué (D1);
- la regla de no mandar texto libre a la ANH (D2);
- las capacidades por rol.

Ninguna fila de esta lista toca eso.

**Cuánto sale (medido con `despues.json`, 1440 px):**
- las 64 pantallas de las puertas de hoy suman **24.383 palabras**;
- las que salen de las puertas de su rol suman **17.811 (73 %)**;
- por pantalla:

| Pantalla | Palabras que salen de las puertas |
|---|---|
| Identificar | 4.225 |
| Equipos (para los roles que no la necesitan) | 2.312 |
| La planta viva (fuera de ger y prod) | 2.277 |
| Diferidos | 1.534 |
| Agua | 1.356 |
| Planta | 1.156 |
| Bombas | 1.071 |
| Electrosumergibles | 833 |
| Resultados (fuera de ger, prod y jefe) | 653 |
| Turno | 619 |
| Producción | 550 |
| Confiabilidad (fuera de conf) | 433 |
| Pozos | 322 |
| Mantenimiento | 248 |
| Hoy (de conf: se funde en su Equipos) | 222 |

Una parte de eso **no se borra: va a un toque**. Por ejemplo, la cadena de Identificar queda como «Ver una por una». Lo que sí desaparece del producto es la sección A.

---

## A. Se borra del producto

| # | Qué era | Dónde estaba (roles) | Quién lo había pedido | Por qué no agrega valor | Qué lo reemplaza |
|---|---|---|---|---|---|
| A-01 | **La pantalla Turno** (`#/…/turno`): 4 cifras arriba, «Qué limita hoy», «Lo más frágil», «Cierre de hoy», «Parado ahora», «Por identificar», «Por vigilar» y «Paradas nuevas» (TU-1 a TU-9) | sup, oper | La pantalla Turno de la v1; X4 §3.6 punto 3 la volvió «Entregar turno»; P-05 y P-06 | Repite Hoy con otros nombres: cada bloque es una tarjeta de Hoy. Con «Entregar turno» abre y no termina [P-05, P-06] | Su Hoy **es** la entrega. El PDF es el escalón 1 de sup |
| A-02 | «≈ 983 bbl en el turno que entra si nada cambia · proyectado» (TU-2) | sup, oper | Turno v1 | Es una proyección que no cambia ninguna acción. Ya fue un S1: la proyectada era la cifra grande [P-06] | Nada |
| A-03 | «Diferido de su turno · últimas 12 h · 723» (HO-13) | sup | X4 §5.5 | No cambia lo que hace el supervisor; el diferido se gestiona por mes | Nada (va en la entrega en PDF si se aprueba el escalón 1) |
| A-04 | **«Su campo, ahora»**: la tubería chica, 2 frases y «Abrir La planta viva» (HO-11) | prod, sup, oper, jefe, conf, tec | X4 §3.3 | Repite la tubería de La planta viva y el tanque, que ya dicen el bloqueo y la tarjeta | Nada |
| A-05 | El texto «“Entregar turno” abre la entrega del turno…» (HO-16) | sup | — | Explica un botón | Nada |
| A-06 | **El control Antes · Durante · Después** (PV-4) | ger, prod, y todos los que tenían La planta viva | X4 §4.4 (el ciclo) | Ningún rol decide algo distinto con él. «Antes» es «Si falla hoy» (de conf y prod); «Después» es Resultados | «Si falla hoy» en conf y prod; Resultados |
| A-07 | **«Dónde bajarlo»** (5 filas) (RE-8, DI-4, MA-4) | ger, prod, jefe, conf | La pantalla Diferidos de la v1 (sin dueño con nombre) | Repite «por equipo» y «dónde se trabó» con otra cuenta. Es la misma cifra (573) en 3 renglones | «Diferido por equipo» (a un toque) |
| A-08 | **«Tipo de causa»** (RE-9, DI-5) | ger, prod, jefe, conf | Diferidos v1; U1 §1.2 | Son los mismos 3 renglones de «por equipo» con otro nombre | Ídem |
| A-09 | **La pantalla Diferidos** como pantalla (DI-1, DI-2 y DI-8) | prod, jefe, conf | v1 | Repite Resultados (la misma cifra, 1.046, y las mismas barras). Lo único propio (DI-3 cuadre, DI-6 árbol, DI-7 escalera) se funde (ver C) | Resultados |
| A-10 | **La 2.ª y la 3.ª tubería del campo** (PR-2, PL-2) | prod, conf, adm | CHOKE | El mismo dibujo tres veces [P-16, UI-19] | La de La planta viva, una sola vez |
| A-11 | El aviso «Alarma · 2 detenidos o en alarma · 573 bbl» de Planta (PL-1) | prod, conf, adm | v1 | Repite la marca del campo y la cifra | La marca del campo |
| A-12 | **La pantalla Mantenimiento** como está: «Fallas de alto impacto», «Por identificar», «Horas en SAP» y «Paradas por identificar» (MA-1, MA-2, MA-7 y MA-9) | jefe | v1 | 6 de sus 9 paneles repiten Hoy o Resultados. «Horas en SAP» dice «Sin órdenes cerradas en el período» | Hoy del jefe; MA-5 y MA-6 a un toque (ver B) |
| A-13 | **«Qué está en riesgo»** debajo de la lista de Equipos (EQ-7) | jefe, conf | K1 · P-10 (el Riesgo fundido) | Repite la cabeza, la franja y la lista | La cabeza de Equipos |
| A-14 | «Cambió hoy: P-201A y P-201C subieron al puesto 1…» (EQ-4) | jefe, conf, tec | U2 §6 | Repite la frase de la cabeza (conf) y la línea «Ojo» (jefe) | Esas dos |
| A-15 | **Las pantallas Bombas y Electrosumergibles** (BO-1 a BO-3, ES-1) | sup, oper, jefe, conf, tec, prod | v1 | Su contenido ya es un filtro de Equipos [X4 §3.6, punto 1]. Las fichas viven en el nivel 3 | Equipos (filtros) y la ficha |
| A-16 | **La pantalla Equipos del gerente** (EQ-10) | ger | X4 §3.7 | Repite el diferido por equipo; el gerente abre los equipos desde la frase y la tubería | Resultados («por equipo») |
| A-17 | «Por qué es crítica» (3 frases) y la minificha «La bomba de agua» de Agua (AG-5, AG-6) | prod, conf, adm | v1 | No habilitan decisión; repiten la ficha | La ficha de P-201B |
| A-18 | **La introducción** (el modal con el «foco»), en todos los roles (CA-8) | todos | X4 §6.2; Hollman la mostró [T 04:00] | Una pantalla necesaria se entiende sola (la vara de Nubank, §1). Va de tú [P-15] | El «?» a un toque |
| A-19 | «Su foco» en el perfil (PF-3) | todos | X4 | Es la introducción repetida | Nada |
| A-20 | Los «No puede» del perfil (10 renglones en adm) (PF-5) | todos | `roles.ts` | No habilitan ninguna acción. Los «Puede» quedan | Los «Puede» |
| A-21 | **El rol cont y la pantalla Evidencia** (`pages/Evidencia.tsx`) | cont (apagado) | U1 §1.1 (F3); `roles.ts` | No baja un barril; el responsable ya está en el paso 1 del árbol de la ANH; nadie lo pidió. Además, la pantalla calcula (suma horas y barriles) | Si vuelve: vista «por responsable» de ger o reg |
| A-22 | El salto silencioso de `#/plan/…` y `#/cont/…` a la vista de producción | plan, cont | Nadie (respaldo de `rolPorId`) | Muestra otra persona sin avisar [P-17] | «Este rol todavía no está disponible» |
| A-23 | «Pedir la causa ›» en la tubería, para el gerente (PV-5) | ger | X4 §4.3 | El gerente no identifica; la pregunta ya le sale en Hoy a quien la debe | Nada para ger (queda para prod) |
| A-24 | «Seguir la orden de K-101» en el Hoy del supervisor (HO-5) | sup | X4 §3.3 | La orden es del jefe y del técnico; el supervisor no actúa sobre ella | Hoy del jefe y del técnico |
| A-25 | «Pérdida: TRIM todavía no tiene registro…» repetida en cada rama del árbol (RG-4, ×3) | reg | Edinson [T 26:48] | Se dice una vez, no tres | Una línea |
| A-26 | El segundo «Exportar» del Reporte | reg | — | Dos botones para lo mismo (UI-08) | El de la cabecera |
| A-27 | «Horas en SAP» (MA-7) | jefe | Hollman (SAP) | Hoy dice «sin órdenes cerradas»; la cifra útil son los 5 tramos del tiempo fuera | Escalón: los 5 tramos (falta en el motor) |
| A-28 | «Equipos sin topología» en Confiabilidad (CO-12) | jefe, conf | X4 §3.7 | Es trabajo de adm, y ya está en su Estado | Estado de adm |
| A-29 | Los porcentajes de identificación y el histórico en Identificar (ID-4, ID-5) para sup, oper y tec | sup, oper, tec | U1 §1.1 | Son de conf (calidad) y prod (nada sin identificar) | «355 sin causa» (prod); CO-8 (conf) |
| A-30 | «Lo que todavía se puede mover · simulado» y «Retorno posible del ciclo» en la **primera capa** (PV-11, RE-12) | ger, prod, jefe, conf, reg | X4 §4.4 | Es simulado y no entra al libro. Para quien no decide planes no habilita nada | A un toque, escalón 2 de ger; planes en la ficha (N4-2) para jefe y conf |

**Total de la sección A: 30 cosas.**

---

## B. Sale de las puertas de un rol (sigue en el producto)

No se borra la función: deja de ser una puerta de ese rol. Si le sirve, queda **a un toque** desde lo necesario.

| # | Qué | Roles que la pierden como puerta | Dónde queda |
|---|---|---|---|
| B-01 | La planta viva | sup, oper, tec, jefe, conf, reg y adm (la conservan ger y prod) | Escalón 1 de oper; a un toque desde la ficha o la parada |
| B-02 | Equipos | sup, oper, tec, prod (la conservan jefe y conf) | A un toque desde la tarjeta («Ver P-201B») |
| B-03 | Resultados | reg y conf (conf usa Confiabilidad) | reg escoge el mes en su período |
| B-04 | Planta y Agua como pantallas propias | prod, conf y adm | Nivel 2 al tocar el tramo «planta» en la tubería (prod, escalón 2); lo de datos pasa al Estado de adm |
| B-05 | Pozos como pantalla | sup | Escalón 3 de prod |
| B-06 | Identificar como pantalla | todos los que la tenían | Lo de contestar entra en Hoy; la cadena de 6 pasos, a un toque («Ver una por una») |
| B-07 | Confiabilidad y Diferidos | jefe | Resultados a un toque |
| B-08 | Metas y accesos en la vista de adm | adm | Del gerente |
| B-09 | El menú de puertas | sup, oper, tec, reg (una sola pantalla) | Sin menú (§9.4) |

---

## C. Se funde (el contenido queda, en un solo lugar)

| # | Qué | Con qué |
|---|---|---|
| C-01 | Los 4 conteos de la franja de condiciones (CA-4) | La marca del campo: la peor condición y su número; los 4, a un toque |
| C-02 | «¿Se puede publicar? Cuadre y custodia» de Diferidos (DI-3) | «¿Cuadra?» en Resultados de prod |
| C-03 | La escalera de Diferidos (DI-7) y la de Producción (PR-5) | Una sola, en Resultados de prod (escalón 1) |
| C-04 | «Intervenir ya» y «Abierto en SAP» de Mantenimiento (MA-3, MA-8) | El número principal del jefe y su «Ver la orden» |
| C-05 | «Reparación activa y espera» (CO-4) | El apoyo «espera» del jefe |
| C-06 | «Ojo: no intervenir hoy» en Hoy y en Equipos (HO-8, EQ-3) | Una línea en el inicio del jefe, cuando aplica |
| C-07 | El bloqueo «No arrancar» para jefe y conf (HO-2) | «Por identificar» |
| C-08 | «Configurados sin datos» y «Capacidad por tren» de Planta (PL-5, PL-6) | Pasos del Estado de adm |
| C-09 | «¿Le creo al vigía?» en Confiabilidad y Equipos (CO-3, EQ-2) | El apoyo de conf |
| C-10 | La tarjeta de Identificar y la de Hoy (ID-2, HO-9) | La tarjeta de Hoy |

---

## D. La prueba del 10 %: lo que hubo que devolver

El algoritmo de §4 dice: si no hubo que devolver al menos el 10 % de lo borrado, se borró poco. Este trabajo se hizo en dos cortes:
1. **«El mínimo»**, el primer encargo del 27-oct;
2. **«Lo necesario»**, el criterio nuevo del dueño ese mismo día.

En el camino, y al revisar contra lo obligatorio, **se devolvieron 9 cosas que el primer corte había sacado. Son el 30 % de las 30 de la sección A.**

| # | Qué se devolvió | A dónde | Por qué volvió |
|---|---|---|---|
| D-01 | **El orden de cierre** («cierre primero LC-02, LC-10 y LC-01») (HO-7, AG-4, N3-5) | sup y oper, **solo en la alarma** | Se había cortado como aviso fijo sin decisión, pero es barril evitable: 30 bbl en octubre («evitable cerrando en orden») |
| D-02 | **La medición oficial y el factor contra su banda** (PR-6, PR-7) | prod, a fin de mes | Se habían mandado a un escalón, pero sin el factor en banda el reporte a la ANH queda bloqueado (`sin-factor`, `fa-fuera-de-banda`) |
| D-03 | **El cierre proyectado** (RE-4) | ger, en el inicio | El primer corte lo dejaba en un escalón. Hollman lo pidió con nombre: «si lo vamos a lograr o si no» [T 04:00] |
| D-04 | **La pérdida, aunque diga «sin registro»** (PV-17, RE-13) | ger, prod y reg | Se había cortado porque no hay dato. Vuelve porque el norte es diferidos **y perdidos**, y decir «sin registro» es lo honesto [T 26:48 Edinson] |
| D-05 | **El diferido mes a mes y por equipo** (PV-12, PV-13) | ger, a un toque | Hollman: «entender también el histórico» [T 04:00] |
| D-06 | **La ficha del equipo (nivel 3)** | oper, a un toque | Adair: que se sienta como su SCADA [T 33:45] |
| D-07 | **Dar accesos** | ger, en el menú de la persona | Seguridad (§3.4), aunque se use poco |
| D-08 | **La calidad de la clasificación** (CO-9) | conf, en el inicio | Clasificar mal planeada o no planeada es el riesgo del indicador del norte [PM §7] |
| D-09 | **Las fallas de los equipos críticos del mes** (CO-7) | jefe, en el inicio | Es el primer indicador de éxito del plan [PM §1] |

**Lectura:** el primer corte sí borró de más. Eso es lo que el algoritmo pide comprobar. Las devoluciones se reparten así:
- **5 por evidencia de valor:** D-01, D-03, D-04, D-05 y D-06;
- **2 por obligación:** D-02 (ANH) y D-07 (seguridad);
- **2 por el norte:** D-08 y D-09.

---

## E. Para el dueño (puerta §10.1)

- Aprobar o tachar cada fila de la sección A. Las de B y C cambian el lugar, no la función.
- **Las que más pesan:**
  - **A-01:** la pantalla Turno;
  - **A-09:** Diferidos;
  - **A-12:** Mantenimiento;
  - **A-15:** Bombas y Electrosumergibles;
  - **A-21:** el rol cont;
  - **B-01:** La planta viva fuera de ger y prod.
- **Lo que hay que construir para que lo necesario esté completo** (falta en el motor, no es un borrado):
  - la pérdida (`EventoPerdida`) y su captura en el teléfono;
  - cerrar la orden sin papel;
  - la respuesta de la ANH y la hora de corrección;
  - la conversión del árbol de la operadora;
  - los 5 tramos del tiempo fuera;
  - publicar como número las paradas por confirmar (sup y prod);
  - pasar al motor la cuenta de fallas por mes, que hoy hace la pantalla.
