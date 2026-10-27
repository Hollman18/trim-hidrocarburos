# prod · Ingeniera de producción · ficha de valor

**Lo necesario** de este rol está en `../necesario-por-rol.md` §2, y los códigos de los elementos en `_elementos.md`.

## 1. Su trabajo, en una frase

Que el campo saque lo que puede y explicar el mes en barriles, sin nada sin identificar.
- Hollman: «Al de producción le interesa literal ver es la producción diaria, pero también le interesan los barriles diferidos… ¿cuáles son los pozos? ¿cuáles son las bombas?» y «por identificar… es importante el código de fallo» [T 04:00].
- `roles.ts` (foco): «Explicas el mes en barriles: el factor de asignación en banda, la custodia completa y nada sin identificar».

## 2. Su pregunta y su decisión

- **Pregunta:** ¿qué limita hoy al campo y dónde rinde más evitar la próxima parada? [X4 §2]
- **Decisión:** confirmar dónde se trabó cada parada (la clasificación de la ANH, en lote), dónde atacar la restricción y cargar la asignación oficial del mes.

## 3. Lo que ve hoy, elemento por elemento

**Pantallas (11 en 4 puertas):**
- Hoy, Identificar;
- La planta viva, Planta, Agua;
- Equipos, Electrosumergibles, Pozos;
- Resultados, Diferidos, Producción;
- además, Configuración y Filosofía en solo lectura.

Medido:
- el inicio (La planta viva, `#/prod/planta-viva/…`) tiene **82 palabras sin desplazarse y 307 en la página, con 55 cifras**, a 390 px;
- sus puertas suman **4.555 palabras** a 1440 px;
- **ve la misma tubería tres veces** (PV-5, PR-2 y PL-2) [P-16].

| Elemento | Dónde | Quién lo pidió | Qué decisión habilita | Frecuencia | Si se borra… | Veredicto |
|---|---|---|---|---|---|---|
| CA-4: 4 conteos | Cabecera | Adair [T 33:45] | Ver lo anormal | Cada vez | — | **F**: la marca del campo; los conteos, **T** |
| CA-6: 4 puertas, 11 pantallas | Panel | X4 §3.2 | Navegar | — | — | **F**: su inicio y Resultados |
| CA-8: la introducción | Modal | X4 §6.2 | Ninguna | Una vez | — | **B** |
| PV-1 y PV-2 con la lente: «9.394 bbl/d salen hoy», «Limitan los pozos: a la planta le sobran 1.143» | Planta viva | X4 §3.4 | Qué limita | Cada día | Pierde su pregunta | **Q** (principal) |
| PV-3: «Ver qué se está haciendo», «Ver Hoy» | Planta viva | X4 | Navegar | — | — | **F**: las tarjetas de Hoy entran a su inicio |
| PV-4: Antes · Durante · Después | Planta viva | X4 §4.4 | Ninguna propia | — | — | **B** |
| PV-5 y PV-6: la tubería con «dan» y «caben» | Planta viva | Edinson [T 26:48]; CHOKE §15 | Qué limita | Cada día | Pierde el choke | **Q**, una sola vez |
| PV-7: «Ver como tabla» | Planta viva | X4 §3.6 | — | — | — | **P** |
| PV-8: «Este mes · 1.046 · 355 sin causa» | Planta viva | `roles.ts` | Nada sin identificar | Semanal | — | **Q** (apoyo) |
| PV-9: «10.700 de 10.900» | Planta viva | Hollman [T 04:00] | Contra la meta | Semanal | Lo da el principal | **F** (con el principal) |
| PV-10: «Si falla hoy», los 3 primeros | Planta viva | X4 §3.4 | Dónde evitar la próxima | Semanal | Pierde la mitad de su pregunta | **Q** (apoyo; el primero, y los 3 a un toque) |
| PV-11: lo que se puede mover, simulado | Planta viva | X4 §4.4 | Ninguna suya | — | — | **B** de su primera capa |
| PV-12 y PV-13: por equipo, mes a mes | Planta viva | Hollman [T 04:00] | Tendencia | Mensual | Lo tiene en Resultados | **T** |
| PV-14: ¿está bajando? | Planta viva | PM §1 | — | Mensual | — | **T** (Resultados) |
| HO-1: «2 cosas le tocan hoy» | Hoy | X4 §3.4 | — | Cada día | — | **F**: las tarjetas suben a su inicio |
| HO-3: «Confirmar 2 paradas iguales» | Hoy | U1 §2; C24 | Confirmar | Cada día | El reporte no sale | **Q** (acción principal) |
| HO-10: «Cargar la asignación de septiembre» | Hoy | P1 | Cuadre | Mensual | No coteja con la operadora | **Q** solo cuando vence |
| HO-11: «Su campo, ahora» | Hoy | X4 §3.3 | Repite PV-5 | — | — | **B** |
| ID-2 a ID-7 (Identificar) | Identificar | U1 §2 | Confirmar y corregir paso a paso | Cada día | — | **F**: la cadena es «Ver una por una» de HO-3; lo demás, **T** |
| ID-3: WhatsApp por parada | Identificar | — | — | — | — | **W** |
| ID-4: cómo va la identificación (66,1 %…) | Identificar | U1 §1.1 | Nada sin identificar | Mensual | Lo da «355 sin causa» | **F** (con PV-8) |
| PR-1: producción medida y potencial | Producción | Hollman [T 04:00] | Contra la meta | Mensual | — | **F** (con el principal y Resultados) |
| PR-2: la 2.ª tubería | Producción | — | Repite | — | — | **B** |
| PR-3: qué limitó, día por día | Producción | CHOKE §15 | Si cambió lo que limita | Mensual | — | **T** (escalón 1) |
| PR-4: día a día | Producción | v1 | Tendencia | Mensual | — | **T** |
| PR-5: la escalera y la eficiencia | Producción | CHOKE §15 | Dónde se fue el barril | Mensual | — | **T** (escalón 1) |
| PR-6 y PR-7: medición oficial y factor contra su banda | Producción | P1; C24 | Cuadre | Mensual | El reporte queda bloqueado | **Q** a fin de mes, en Resultados («¿Cuadra?») |
| PR-8: ¿cuadra? día por día | Producción | P1 | Cuadre | Mensual | — | **P** |
| PR-9: cuadre y asignación oficial (cargar) | Producción | P1 | Cargar | Mensual | — | **F** (con HO-10) |
| DI-1, DI-2, DI-4, DI-5 y DI-8 | Diferidos | v1 | Repiten RE | — | — | **B** (la pantalla se funde en Resultados) |
| DI-3: cuadre y custodia | Diferidos | P1; C24 | Cumplir | Mensual | — | **F** (con «¿Cuadra?») |
| DI-6: el árbol por tramo | Diferidos | Edinson [T 26:48] | Por qué no se produjo | Mensual | — | **T** |
| DI-7: por qué no se produjo (la escalera) | Diferidos | CHOKE §15 | — | Mensual | — | **F** (con PR-5) |
| DI-9: por parte | Diferidos | R3 | De confiabilidad | — | — | **B** para prod |
| RE-1 a RE-14 | Resultados | Hollman; C24 | El mes | Mensual | — | **T** (su segunda pantalla); RE-8, RE-9 y RE-12: **B** |
| PL-1: aviso de detenidos | Planta | v1 | Repite CA-4 | — | — | **B** |
| PL-2: la 3.ª tubería | Planta | — | Repite | — | — | **B** |
| PL-3: el esquema de planta | Planta | Hollman [T 04:00] | Contexto | Casi nunca | — | **T** (al tocar «planta» en la tubería) |
| PL-4 a PL-6: datos y capacidad por tren | Planta | v1 | De adm | — | — | **T** |
| AG-1 a AG-6: Agua | Agua | CHOKE §9; Edinson [T 31:08] | Cuánto aguanta el agua | Semanal en campos de agua | — | **T** (escalón 2: nivel 2 al tocar «planta · agua») |
| ES-1 y PZ-1: Electrosumergibles y Pozos | Equipos | Hollman [T 04:00] | Pozos por diferido | Semanal | — | **T** (escalón 3) |
| EQ-5 y EQ-6: la lista de equipos | Equipos | X4 | Abrir un equipo | Semanal | — | **T** («Ver todos los equipos ›») |
| CF-5 y CF-6 en solo lectura | Configuración y Filosofía | U2 §8.1 | Leer cómo está armado | Casi nunca | — | **T** |

## 4. Su pantalla necesaria («tipo número»)

- **Principal:** **9.394 de 11.857 bbl/d** · «salen hoy».
- **Apoyo:**
  - paradas por confirmar (2, antes de las 07:00);
  - diferido del mes (1.046, 355 sin causa);
  - el primero de «Si falla hoy» (3.059 bbl/d);
  - pérdida (dice «sin registro»).

  Son 4, uno más que la guía, porque explicar el mes en barriles exige la pérdida [T 26:48 Edinson].
- **Lo que lo explica:** la tubería del campo, una sola vez.
- **Acción principal:** «Confirmar las 2». **Secundarias:** «Ver una por una», con corregir y yacimiento adentro; cargar la asignación (solo cuando vence).
- **A un toque:** Resultados (¿cuadra?, mes a mes, el árbol), la lista de equipos y los pozos.

## 5. Sus 3 tareas más frecuentes

| Tarea | Hoy | Después |
|---|---|---|
| Confirmar las paradas del día | Inicio (Planta viva) → Hoy → «Confirmar las 2». **2 toques** | Inicio → «Confirmar las 2». **1 toque** |
| Saber qué limita | La frase y «◄ limita». **0 toques** | Igual. **0 toques** |
| Ver si el mes cuadra | Producción → bajar hasta «Medición oficial» y «Factor». **1 toque y desplazarse** (o Diferidos → «¿Se puede publicar?») | Resultados → «¿Cuadra?» arriba. **1 toque** |

Los segundos no se midieron aquí: los mide §9.

## 6. Lo que se le borra

| Qué | Por qué |
|---|---|
| La 2.ª y la 3.ª tubería (PR-2, PL-2) | Es el mismo dibujo tres veces [P-16] |
| La pantalla Diferidos como pantalla propia (DI-1, DI-2, DI-4, DI-5 y DI-8) | Repite Resultados con otros nombres |
| «Su campo, ahora» (HO-11) y el aviso de detenidos (PL-1) | Repiten la tubería y la condición del campo |
| Antes · Durante · Después y lo que se puede mover, simulado (PV-4, PV-11) | No cambian su decisión |
| «Por parte» (DI-9) | Es de confiabilidad |
| La introducción (CA-8) | — |

## 7. Hoy contra lo necesario

| | Hoy | Necesario |
|---|---|---|
| Elementos en la primera capa del inicio | 16 (PV-1 a PV-14 y CA-4; sin las tarjetas de Hoy, que están en otra pantalla) | 9 (principal, 4 de apoyo, la tubería y 3 acciones) |
| Cifras del inicio (página, 390) | 55 | 5 |
| Palabras del inicio (vista / página, 390) | 82 / 307 | 41 |
| Palabras de todas sus puertas (1440) | 4.555 | — (2 pantallas) |
| Pantallas | 11 | 2 |
| Toques para confirmar | 2 | 1 |
