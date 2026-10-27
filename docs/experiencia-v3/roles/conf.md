# conf · Ingeniero de confiabilidad · ficha de valor

**Lo necesario** de este rol está en `../necesario-por-rol.md` §6, y los códigos de los elementos en `_elementos.md`.

## 1. Su trabajo, en una frase

Escoger qué equipo y qué modo de falla atacar primero, y dónde va el próximo instrumento.
- Hollman: «en confiabilidad… cuáles son esos equipos específicos que estamos midiendo… las variables específicas» [T 04:00].
- Edinson, el experto en confiabilidad, pidió las métricas «de alguna manera modular» [T 22:34].

## 2. Su pregunta y su decisión

- **Pregunta:** ¿qué equipo ataco primero, y cuánto le creo al número? [X4 §2]
- **Decisión:** el equipo, el modo y el instrumento.

## 3. Lo que ve hoy, elemento por elemento

**Pantallas (11 en 4 puertas):**
- Hoy, Identificar;
- La planta viva, Planta, Agua;
- Equipos, Bombas, Electrosumergibles;
- Resultados, Diferidos, Confiabilidad;
- además, Configuración y Filosofía en solo lectura.

Medido:
- el inicio (Equipos) a 390 px tiene **88 palabras sin desplazarse y 1.111 en la página, con 108 cifras**;
- la página mide **6.593 px** y tiene **59 botones**;
- sus puertas suman **5.164 palabras** a 1440 px, el rol con más.

| Elemento | Dónde | Quién lo pidió | Qué decisión habilita | Frecuencia | Si se borra… | Veredicto |
|---|---|---|---|---|---|---|
| CA-4: 4 conteos | Cabecera | Adair | Ver lo anormal | — | — | **F**: la marca del campo |
| EQ-1: «Si falla hoy 3.059 bbl/d» y «Ataque primero P-201A y P-201C…» | Equipos | X4 §3.4; P-02 | Qué atacar | Semanal | Pierde su pregunta | **Q** (principal) |
| EQ-1: las 3 filas | Equipos | P-02 | Qué atacar | Semanal | — | **Q** (lo que explica el número) |
| EQ-2: «¿Le creo al vigía? 3 de 3» | Equipos | X4 §3.7 | Cuánto creerle | Semanal | — | **Q** (apoyo) |
| EQ-5: 12 filtros y «Más filtros» | Equipos | X4 §3.6 | Buscar | Semanal | — | **T**: quedan los 4 de estado plegados; tipo y tren, a un toque |
| EQ-6: la lista de 28 | Equipos | X4 §3.6 | Abrir un equipo | Semanal | — | **T** («Ver los 28») |
| EQ-6: «Sin instrumento» como cuenta | Equipos | X4 §3.7 | Dónde instrumentar | Semanal | — | **Q** (apoyo: 5) |
| EQ-7: «Qué está en riesgo» debajo de la lista | Equipos | K1 · P-10 | Repite EQ-1 y la franja | — | — | **B** |
| EQ-8: la tabla completa de «Si falla hoy» (después de, una falla ≈, techos, sin dato) | Equipos | PM F2; CHOKE §10 | Qué atacar, con el detalle | Mensual | — | **T** («Ver los 18») |
| EQ-9: «del esquema, sin equipo registrado» | Equipos | P-02 | Lo que no se mide | — | — | **T** |
| HO-1: «3 cosas le tocan hoy» | Hoy | X4 | — | — | — | **F**: su insignia queda en el inicio |
| HO-4: «Conseguir la causa de 3 paradas» | Hoy | X4 §3.3 | Completar el análisis | Semanal | — | **Q** como tarjeta en su inicio |
| HO-6: «Decidir 3 planes · simulado» | Hoy | X4 §3.3 | Aceptar un plan | — | — | **T** |
| HO-11: «Su campo, ahora» | Hoy | — | — | — | — | **B** |
| CO-1: entre fallas por familia | Confiabilidad | Edinson [T 22:34] | Qué familia | Semanal | — | **Q** (apoyo, la del primero) |
| CO-2: historia de 12 meses | Confiabilidad | R3 | — | — | — | **T** |
| CO-3: «¿Le creo al vigía?» | Confiabilidad | PM F2 | — | — | — | **F** (con EQ-2) |
| CO-4: reparación activa y espera | Confiabilidad | X4 | Tiempo fuera | Mensual | — | **T** |
| CO-5 y CO-6: los más costosos; de qué fallan | Confiabilidad | Edinson [T 22:34] | Qué modo atacar | Semanal | — | **T** (su segunda pantalla) |
| CO-7: fallas por mes | Confiabilidad | PM §1 | El norte | Mensual | — | **T** (la cuenta pasa al motor) |
| CO-8: calidad del registro | Confiabilidad | R3 | Cuánto creerle al registro | Mensual | — | **T** |
| CO-9: calidad de la clasificación (0 de 7 confirmadas) | Confiabilidad | U1; PM §7 | Cuánto creerle a TRIM | Semanal | Nadie más lo vigila | **Q** (apoyo 4) |
| CO-10 y CO-11: reglas más corregidas, por equipo | Confiabilidad | U1 §1.1 | Corregir la regla | Mensual | — | **T** |
| CO-12: equipos sin topología | Confiabilidad | X4 §3.7 | De adm | — | — | **B** para conf |
| DI-1 a DI-9: Diferidos | Diferidos | v1 | Repiten Resultados | — | — | **B** como pantalla; DI-9 «por parte», **T** en Confiabilidad |
| RE-1 a RE-14: Resultados | Resultados | Hollman | El mes | Mensual | — | **F**: su Resultados es Confiabilidad; RE-8, RE-9 y RE-12: **B** |
| PV-1 a PV-17: Planta viva | Planta viva | X4 | La del gerente | — | — | **B** como puerta |
| PL-1 a PL-6, AG-1 a AG-6: Planta y Agua | Planta, Agua | CHOKE; Edinson | Contexto | Casi nunca | — | **B** como puertas; **T** desde la ficha (en su tren) |
| BO-1 a BO-3 y ES-1 | Bombas, Electrosumergibles | v1 | Repiten la lista | — | — | **B** como pantallas |
| N3-1 a N3-8: la ficha | Nivel 3 | Adair [T 33:45 y 36:51] | Ver la salud | Semanal | — | **T** (1 toque desde el primero) |
| N4-1 a N4-6: el diagnóstico | Nivel 4 | PM F2; Edinson | El modo y el instrumento | Semanal | — | **T** |
| CF-6 en solo lectura | Filosofía | U2 §8.1 | Cómo está armado | Casi nunca | — | **T** |

## 4. Su pantalla necesaria («tipo número»)

- **Principal:** **3.059 bbl/d** · «si falla hoy el primero» (P-201A y P-201C, sin instrumento).
- **Apoyo:**
  - vigía 3 de 3;
  - 5 equipos sin instrumento;
  - 41 d entre fallas;
  - 0 de 7 clasificaciones confirmadas.

  Son 4, uno más que la guía, porque «cuánto le creo» tiene dos caras: al vigía y a la clasificación [PM §7].
- **Lo que lo explica:** los 3 primeros de «Si falla hoy».
- **Acción principal:** abrir el primero. **Secundarias:** completar el análisis; corregir una clasificación.
- **A un toque:** la lista de 28, la tabla completa y Confiabilidad.

## 5. Sus 3 tareas más frecuentes

| Tarea | Hoy | Después |
|---|---|---|
| Qué atacar primero | La cabeza de Equipos. **0 toques** | Igual. **0 toques** |
| Abrir el primero | Tocar P-201A. **1 toque** | Igual. **1 toque** |
| De qué falla la familia | Panel → Resultados → Confiabilidad → bajar hasta «De qué fallan». **2 toques y desplazarse** | Desde la ficha del primero, o desde Confiabilidad. **1 toque** |

Los segundos no se midieron aquí: los mide §9.

## 6. Lo que se le borra

| Qué | Por qué |
|---|---|
| «Qué está en riesgo» debajo de la lista (EQ-7) | Repite la cabeza y la franja |
| La tabla completa de «Si falla hoy» y los 12 filtros en el inicio (EQ-5, EQ-8) | Van a un toque: son la mayor parte de las 1.111 palabras |
| Diferidos, Planta, Agua, Bombas, Electrosumergibles y la Planta viva como puertas | Repiten su lista o son de otro rol |
| «Equipos sin topología» (CO-12) | Es de adm |
| «Su campo, ahora» (HO-11) | — |

## 7. Hoy contra lo necesario

| | Hoy | Necesario |
|---|---|---|
| Elementos en la primera capa del inicio | 9 (EQ-1 a EQ-9) | 8 (principal, 4 de apoyo, las 3 filas y la acción) |
| Cifras del inicio (página, 390) | 108 | 5 |
| Palabras del inicio (vista / página, 390) | 88 / 1.111 | 34 |
| Botones del inicio (página) | 59 | 3 |
| Pantallas | 11 | 2 (Equipos y Confiabilidad) |
| Toques para «de qué falla» | 2 y desplazarse | 1 |
