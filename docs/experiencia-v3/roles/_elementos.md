# Catálogo de elementos de hoy (para las fichas de cada rol)

**27-oct-2026 · M1.** Muchas pantallas son las mismas para varios roles: La planta viva, Hoy, Equipos, Resultados y la ficha del equipo. Para no repetirlas once veces, cada elemento lleva aquí un código, qué es y quién lo pidió. Cada `roles/<rol>.md` usa esos códigos y pone **su** veredicto: el mismo elemento puede quedar para un rol y borrarse para otro.

**Fuente del inventario:**
- los textos de cada pantalla medidos por la revisión (`docs/experiencia-v2/R-revision/medicion/despues-textos/paginas/*.txt`, ed559e4);
- la app, abierta el 27-oct en `localhost:5181`, a 390 × 844, con la introducción saltada.

**Veredictos (§4 del encargo):**
- **Q**: queda en la primera capa;
- **T**: va a un toque;
- **P**: va solo al papel (el informe);
- **F**: se funde con otro;
- **B**: se borra;
- **W**: se borra con WhatsApp (§6). Es de otro agente y no entra en `borrado.md`.

**Quién lo pidió:**
- `Hollman [T 04:00]`, `Edinson [T 22:34 / 26:48 / 31:08]` y `Adair [T 33:45 / 36:51]`: la reunión del 19-oct;
- `X4 §n`, `U1 §n`, `PM §n` (`PLAN-MAESTRO.md`) y `CHOKE §n` (`CHOKE-COMPLETO.md`);
- `C24`: la Circular 024;
- `P-nn`: un hallazgo de la revisión;
- **«sin dueño con nombre»**: no se encontró quién lo pidió para qué decisión. Es candidato a borrar (§4, paso 1).

---

## CA · La cabecera (todas las pantallas)

| Código | Elemento | Quién lo pidió | Veredicto por defecto · por qué |
|---|---|---|---|
| CA-1 | Selector de campo y «Todos mis campos» | Hollman: «puede filtrar un campo o varios» [T 04:00] | **Q** para quien tiene varios campos; desaparece con uno solo |
| CA-2 | «Datos de demostración» | Demo | **Q** solo en el demo |
| CA-3 | Título y «hoy, 2 de oct · datos de las 14:00» | X2 (dato viejo, ISA-101) | **Q** la hora de los datos; el título **se funde** con el campo |
| CA-4 | La franja de condiciones: 4 conteos (alarmas, atención, aviso, sin comunicación) y «· medidor oficial» | Adair: los colores de alto desempeño [T 33:45]; X2 §3.5 | **F**: queda la marca de la peor condición del campo, con su número. Los 4 conteos van **T**. Hoy son 4 cifras más en cada pantalla, que compiten con el número principal |
| CA-5 | El período («Octubre, en curso») y «Exportar» | X4 §3.5 | **Q** solo en Resultados, Reporte y la ficha; **B** en las demás (UI-08) |
| CA-6 | El menú de puertas con su insignia | X4 §3.2 | **Q** solo si el rol tiene más de una pantalla; si no, **B** (§9.4) |
| CA-7 | El menú de la persona (Perfil y, para el gerente, Metas y accesos) | X4 §3.2 | **Q** |
| CA-8 | La introducción (un modal con el «foco» del rol) | X4 §6.2; Hollman la mostró [T 04:00] | **B**: una pantalla necesaria se entiende sola (la vara de Nubank). Además usa «tú» [P-15] |
| CA-9 | «?» y las ⓘ | X4 §3.5 | **T** |

## PV · La planta viva

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| PV-1 | La cifra «Ahora mismo N barriles por día se dejan de producir» o, con la lente técnica, «salen hoy» | Hollman [T 04:00]; X4 §3.4 | Dónde mandar a actuar |
| PV-2 | La frase que la explica (equipo, pozos y causa) | X4 §3.4 | Ídem |
| PV-3 | «Ver qué se está haciendo», «Compartir el informe» y «Ver Hoy» | X4 §4 | Abrir el equipo; compartir |
| PV-4 | El control Antes · Durante · Después | X4 §4.4 (el ciclo) | Cambia el momento. Nadie decide nada distinto con él: sin dueño para una decisión |
| PV-5 | La tubería de 4 tramos (yacimiento, pozos, planta, salida) con el tanque, el agua, los inyectores y «Pedir la causa» | Edinson: el árbol de 4 categorías [T 26:48]; Hollman: el diagrama [T 04:00] | Dónde se trabó |
| PV-6 | La lente técnica: pozos «dan», planta y salida «caben» (sin firmar) | CHOKE §15; X4 §3.4 (prod) | Qué limita el campo |
| PV-7 | «Ver como tabla» | X4 §3.6 (papel) | Ninguna: la tabla va al papel |
| PV-8 | «Este mes»: diferido en bbl, USD, rango, nota y «sin causa» | Hollman [T 04:00] | Contra la meta |
| PV-9 | Promedio por día contra la meta (con el cuadrado «3 Aviso») | Hollman [T 04:00] | Contra la meta |
| PV-10 | «Si falla hoy», los 3 primeros (prod) | PM F2; X4 §3.4 | Dónde evitar la próxima parada |
| PV-11 | «Lo que todavía se puede mover · simulado»: 2.133 bbl, Antes 0 · Durante 2.102 · Después 30, «Ver el plan», «0 de 3 planes en marcha» | X4 §4.4 y §3.7 | Para el gerente, ninguna: los planes los decide el jefe. Es simulado |
| PV-12 | «Diferido por equipo» (los 4 primeros) | Hollman: «¿cuáles son los equipos?» [T 04:00] | Qué equipo atacar |
| PV-13 | «Diferido por día, mes a mes» (13 meses) | Hollman: «el histórico» [T 04:00] | Si está bajando, a largo plazo |
| PV-14 | «¿Está bajando? Desde que entró TRIM» (planta y pozos) | PM §1; X4 §3.7 | Si TRIM funciona |
| PV-15 | Todos los campos: una fila por campo con sus bbl/d y su causa | Hollman: «visión holística» [T 04:00] | Qué campo |
| PV-16 | La hoja del tramo, al tocarlo: frase, equipos, «¿Por qué?», «Desde que entró TRIM» y «Para producir más» | X4 §4.5 | Detalle del tramo |
| PV-17 | «Pérdida: nada registrado» | Edinson [T 26:48]; PM §2.5 | Dice que falta el dato |

## HO · Hoy

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| HO-1 | La cifra y la frase del rol | X4 §3.4 | La del rol |
| HO-2 | La franja «No arrancar … hasta identificar qué se dañó» | X4 §3.3, regla 1 (seguridad) | No arrancar |
| HO-3 | La tarjeta «Confirmar N paradas iguales» («Confirmar las 2», «Ver una por una») | U1 §2; C24 | Confirmar |
| HO-4 | La tarjeta «Conseguir la causa de N paradas» («Responder yo», «Ver el chat») | X4 §3.3 | Quién contesta |
| HO-5 | La tarjeta «Seguir» o «Atender la orden de K-101» («Ver la orden») | X4 §3.3 | Intervenir |
| HO-6 | La tarjeta «Decidir 3 planes de P-201B · simulado» | X4 §3.3 | Aceptar un plan simulado |
| HO-7 | El aviso «Lo más frágil: el agua. Si para otra bomba, cierre primero…» | U2 §6; CHOKE §9 | Cerrar en orden **cuando para una bomba**. Hoy está siempre puesto |
| HO-8 | El aviso «Ojo: no intervenir hoy» | U2 §6.4 | No intervenir |
| HO-9 | La tarjeta «Contestar»: «Diga qué se dañó», «Diga por qué paró», «¿De dónde vino el corte?» | Hollman [T 04:00]; U1 §2 | Declarar |
| HO-10 | La tarjeta «Cargar la asignación de septiembre» | P1; X4 §3.7 | Cuadre |
| HO-11 | «Su campo, ahora»: la tubería chica, 2 frases y «Abrir La planta viva» | X4 §3.3 | Ninguna nueva: repite PV-5 y el tanque |
| HO-12 | «El turno en WhatsApp» | X4 §3.7 | — |
| HO-13 | «Diferido de su turno · 12 h · 723 barriles» | X4 §5.5 | Ninguna: no cambia lo que hace |
| HO-14 | «Entregar turno» (abre la pantalla Turno) | X4 §3.6 punto 3; P-06 | Entregar |
| HO-15 | «Hecho hoy (n)», plegado | X4 §3.3 | Deshacer |
| HO-16 | El texto «“Entregar turno” abre la entrega del turno: lo que paró…» | — | Ninguna: explica un botón |

## TU · Entrega de turno (`#/…/turno`)

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| TU-1 | 1.966 bbl/d, 3 pozos parados y 723 bbl en 12 h | Turno v1; X4 §3.7 | Repite HO-1 |
| TU-2 | «≈ 983 bbl en el turno que entra · proyectado» | Turno v1 | Ninguna |
| TU-3 | «Qué limita hoy al campo» (párrafo de 47 palabras) | Turno v1 | Repite PV-6 |
| TU-4 | «Lo más frágil» | Turno v1 | Repite HO-7 |
| TU-5 | «Cierre de hoy · faltan 4 de 4» (confirmar las 2, 2 sin causa) | U1 §1.2 | Repite HO-3 y HO-4 |
| TU-6 | «Parado ahora · 2 causas» | Turno v1 | Repite HO-2 y PV-1 |
| TU-7 | «Por identificar» (lista) | Turno v1 | Repite HO-4 y HO-9 |
| TU-8 | «Por vigilar · K-101» | Turno v1 | Repite HO-5 |
| TU-9 | «Paradas nuevas · 12 h» | Turno v1 | Repite HO-3 |
| TU-10 | «WhatsApp del turno» | X4 §3.7 | — |

## ID · Identificar (`#/…/causa`)

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| ID-1 | La regla «No arrancar hasta identificar el daño» y «La regla completa» | X4 §3.3 | Repite HO-2 |
| ID-2 | «Por identificar · sin arrancar»: tarjeta con «Ver la señal», «Qué se dañó» (la pista de la historia y las partes), «Qué encontró (opcional)» y «Contestar» | Hollman [T 04:00]; U1 §2 | Declarar (repite HO-9) |
| ID-3 | El bloque WhatsApp por parada y «Ver el chat de Jairo Peña» | U1 §2.6 | — |
| ID-4 | Cómo va la identificación: 66,1 % probada por señal, 0,0 % declarada y 33,9 % sin identificar | U1 §1.1 (calidad) | La calidad del registro (conf) |
| ID-5 | Por identificar · histórico; no conformidades | X4 §3.7 | Repite HO-9 |
| ID-6 | La cadena de 6 pasos de cada parada, con «TRIM lo dedujo…» en cada paso, y «Confirmar los 2», «Corregir dónde se trabó», «Corregir otro paso», «Ver las 2 filas del reporte» | Edinson [T 26:48]; U1 §2; C24 | Confirmar y corregir (es «Ver una por una» de HO-3) |
| ID-7 | Las preguntas de la cadena («¿De dónde vino el corte?») | U1 §2.4 | Completar un paso |

## EQ · Equipos (la lista)

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| EQ-1 | La cabeza de confiabilidad: «Si falla hoy 3.059 bbl/d», la frase «Ataque primero…» y las 3 filas | X4 §3.4; P-02 | Qué atacar |
| EQ-2 | «¿Le creo al vigía? … acertó 3 de 3 avisos. Ver el detalle» | X4 §3.7; PM F2 | Cuánto creerle |
| EQ-3 | La línea del jefe: «Ojo: P-201A y P-201C valen más… no conviene intervenirlas hoy» | U2 §6.4; P-10 | No intervenir |
| EQ-4 | «Cambió hoy: P-201A y P-201C subieron al puesto 1…» | U2 §6 (criticidad dinámica) | Repite EQ-1 y EQ-3 |
| EQ-5 | Los filtros (Parados, Avisan, Sin instrumento, Todos y «Más filtros»: tipo y tren; 12 en total) | X4 §3.6 punto 1 | Buscar |
| EQ-6 | La lista de 28 equipos: estado, «¿Lo vigila TRIM?» y bbl/d | X4 §3.6 punto 1 | Abrir un equipo |
| EQ-7 | «Qué está en riesgo» (el Riesgo fundido): se deja de producir ahora, equipos que avisan, el más cercano y «Por qué · 2 causas» | K1 · P-10 | Repite PV-1, EQ-1 y EQ-6 |
| EQ-8 | La tabla completa de «Si falla hoy»: se trabaría en, después de, una falla ≈, techos «hasta», «ver 13 más» y «sin dato» | PM F2; CHOKE §10 | Qué atacar (repite EQ-1 con más detalle) |
| EQ-9 | «Del esquema de planta, sin equipo registrado» | P-02 | Dice lo que no se mide |
| EQ-10 | Para el gerente: «Ahora: lo que está parado o avisa · 7 equipos» y «Diferido por equipo» | X4 §3.7 | Repite PV-12 |

## BO, ES y PZ · Bombas, Electrosumergibles y Pozos (pantallas de antes, bajo Equipos)

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| BO-1 | Cabecera: «Se deja de producir ahora, por bombas paradas 1.665», «Diferido que causaron 573», «Próxima en fallar · ninguna» | v1 | Repite PV-1 y EQ-1 |
| BO-2 | La placa de la bomba (P-201B) con 3 variables | v1; Adair [T 36:51] | Repite el nivel 3 |
| BO-3 | «Sin instrumento · 2 bombas» (P-201A y P-201C) | v1 | Repite EQ-6 (filtro) |
| ES-1 | Electrosumergibles: en falla, con aviso, diferido y la flota (tabla de 15) | v1 | Repite EQ-6 (filtro) |
| PZ-1 | Pozos: 15 de 18, potencial del libro, se deja de producir, filtros y la tabla de 18 (crudo, agua, ESP, diferido) | Hollman: «¿cuáles son los pozos?» [T 04:00] | Para producción: pozos por diferido |

## N3 y N4 · La ficha del equipo (nivel 3) y su diagnóstico (nivel 4)

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| N3-1 | El estado y la cifra («1.665 barriles por día se dejan de producir: cerró LC-07 y LC-16») | X4 §5 | La del equipo |
| N3-2 | «No arrancar hasta identificar», «Diga qué se dañó» y «Crear aviso en SAP» | X4 §5; Hollman, SAP [T 04:00] | Declarar; aviso |
| N3-3 | «Sus señales»: 8 indicadores con su banda y su alarma | Adair [T 33:45 y 36:51]; X2 | Ver la salud |
| N3-4 | «En su tren de agua»: el esquema | X4 §5.4 | Contexto |
| N3-5 | «Mientras esté parada»: entra, caben, el tanque y el orden de cierre | CHOKE §9 | Cerrar en orden |
| N3-6 | «Los 12 días antes de parar»: 3 tendencias | X2 (tendencias) | Ver si avisó |
| N3-7 | «Su historia»: 9 fallas, una cada 41 d, el costo, las últimas, y los repuestos (kit de sello: llega el 9-oct) | Edinson [T 22:34]; R3 | Repetición; repuesto |
| N3-8 | «Ver el diagnóstico» | X4 §5 | Bajar al nivel 4 |
| N4-1 | «Cómo está y por qué», modo de falla, respaldo y aguas abajo | X4 §5.4 | Diagnóstico |
| N4-2 | «Planes · lo que todavía se puede mover · simulado», con «Aceptar» (4 planes) | X4 §3.3 | Decidir un plan (`planes:decidir`) |
| N4-3 | «Salud por parte» | Edinson [T 22:34]; PM F2 | El modo que atacar |
| N4-4 | «Variables · 8 de 13 instrumentadas» y «Falta instrumentar» | Adair [T 36:51] | Dónde instrumentar |
| N4-5 | «Vigía · 4 señales» con su norma ISO 14224 | PM F2 | Cuánto creerle |
| N4-6 | «Paradas del PLC · 11 paradas» | X4 §3.7 | La historia |

## RE · Resultados

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| RE-1 | «Lo que pasó · 1.046 barriles no se produjeron», frase, rango, 50 mil USD, «Provisional» | Hollman [T 04:00] | Contra la meta |
| RE-2 | «Ver qué se está haciendo», «Ver el libro de diferidos», «Ver el reporte» | X4 §4 | Navegar |
| RE-3 | Promedio por día: producción contra la meta y diferido contra el máximo | Hollman [T 04:00] | Contra la meta |
| RE-4 | Cierre proyectado: producción y diferido | Hollman [T 04:00] | ¿Se logra el mes? |
| RE-5 | «Diferido por día, mes a mes», con «Por equipo» y «Por dónde se trabó» | Hollman: el histórico [T 04:00] | Tendencia |
| RE-6 | «Diferido por equipo» | Hollman [T 04:00] | Qué equipo |
| RE-7 | «Dónde se trabó» (planta, sin identificar, pozos) y su frase | Edinson [T 26:48] | Qué tramo |
| RE-8 | «Dónde bajarlo» (5 filas: alto impacto, con parte vigilada, sin instrumento, sin parte, evitable cerrando en orden) | Pantalla Diferidos v1 (sin dueño con nombre) | Ninguna que no esté en RE-6 y RE-7 |
| RE-9 | «Tipo de causa» | Pantalla Diferidos v1; U1 §1.2 | Repite RE-6 (mismos 3 renglones con otro nombre) |
| RE-10 | «Producción día a día» (enlace) | X4 §3.7 | Para producción |
| RE-11 | «¿Está bajando?», alto impacto −18 % y «14 % mantenimiento proactivo» | PM §1; U1 §1.1 | Si TRIM funciona |
| RE-12 | «Retorno posible del ciclo · simulado» (Antes, Durante, Después, «Ver el plan») | X4 §4.4 | Ninguna para quien no decide planes |
| RE-13 | «Pérdida: nada registrado» | Edinson [T 26:48] | Dice que falta el dato |
| RE-14 | «¿Se puede publicar?» | C24; X4 §3.7 | Cumplir |
| RE-15 | Mantenimiento: «De 8,1 días, 7,7 son espera», «Ver lo que hay que atacar» (jefe) | X4 §3.4 | Tiempo fuera |
| RE-16 | «¿Le creo al vigía? 100 %» (jefe) | X4 §3.7 | Cuánto creerle |

## DI · Diferidos (`#/…/diferidos`, pantalla de antes bajo Resultados)

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| DI-1 | La cifra 1.046 y su frase | v1 | Repite RE-1 |
| DI-2 | «Mes a mes», por cómo se identificó o por dónde se trabó | v1 | Repite RE-5 |
| DI-3 | «¿Se puede publicar? Cuadre y custodia»: potencial − real = diferido; señal, declarado y sin identificar; el factor en banda; la cadena de custodia | P1; C24 | Cumplir (prod y reg) |
| DI-4 | «Dónde bajarlo» | v1 | Repite RE-8 |
| DI-5 | «Tipo de causa» | v1 | Repite RE-9 |
| DI-6 | «Por dónde se trabó», por tramo, con sus ramas (el árbol) | Edinson [T 26:48] | Repite RE-7 con el árbol |
| DI-7 | «Por qué no se produjo»: la escalera | CHOKE §15 | Para producción |
| DI-8 | «Por equipo», acumulado | v1 | Repite RE-6 |
| DI-9 | «Por parte» | R3 | Para confiabilidad |

## PR · Producción (`#/prod/produccion`)

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| PR-1 | Producción medida 16.941 bbl, meta a la fecha, «lo medido es el 94,2 %» | Hollman [T 04:00] | Contra la meta |
| PR-2 | «La tubería del campo» (la 2.ª copia) | CHOKE | Repite PV-5 y PV-6 |
| PR-3 | «Qué limitó, día por día» | CHOKE §15 | Si cambió lo que limita |
| PR-4 | «Día a día» (gráfica) | v1 | Tendencia diaria |
| PR-5 | «Lo que no se produjo, por tipo»: eficiencia 90,2 % y la escalera | CHOKE §15 | Dónde se fue el barril |
| PR-6 | «Medición oficial» (LACT-01, factor 0,958, banda ±15 %) | P1; C24 | Cuadre |
| PR-7 | «Factor de asignación contra su banda», 13 meses | P1 | Cuadre |
| PR-8 | «¿Cuadra? Día por día» (tabla) | P1 | Cuadre (papel) |
| PR-9 | «Cuadre · asignación oficial»: 12 meses, «Plantilla», «Subir un CSV» y el motivo | P1; `asignacion:cargar` | Cargar la asignación |

## PL y AG · Planta y Agua

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| PL-1 | El aviso «Alarma · 2 detenidos o en alarma · 573 bbl» | v1 | Repite CA-4 y PV-1 |
| PL-2 | La tubería del campo (la 3.ª copia) | CHOKE | Repite PV-5 |
| PL-3 | El esquema de planta (trenes y equipos) | Hollman: «un diagrama de la planta» [T 04:00] | Contexto; nivel 2 |
| PL-4 | «Capturando datos · 9 equipos» | v1 (adm) | Si llega el dato |
| PL-5 | «Configurados sin datos · 4 equipos» | v1 (adm) | Qué instrumentar o conectar |
| PL-6 | «Capacidad por tren» (plegado) | CHOKE | Para producción y adm |
| AG-1 | «La tubería del agua»: agua de los pozos, tanque, bombas, inyectores y «cabe más» | CHOKE §9; Edinson [T 31:08] | Cuánto aguanta el agua |
| AG-2 | «Hoy»: P-201B parada, el nivel no sube | CHOKE §9 | Repite N3-5 |
| AG-3 | «Lo que pasó»: el tanque se llenó en 1,8 h | CHOKE §9 | Historia |
| AG-4 | «Si para otra bomba»: el orden de cierre de los más acuatosos | Edinson [T 31:08]; CHOKE §9 | Cerrar en orden (repite HO-7 y N3-5) |
| AG-5 | «Por qué es crítica» (3 frases) | v1 | Ninguna |
| AG-6 | «La bomba de agua» (una minificha) | v1 | Repite N3 |

## MA y CO · Mantenimiento y Confiabilidad

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| MA-1 | «Fallas de alto impacto · 573 bbl», 661 bbl/d contra un máximo de 800, «antes 366» | v1 | Repite RE-3 |
| MA-2 | «Por identificar» y la frase «Ninguna parada de este mes estaba programada» | v1 | Repite HO-4 |
| MA-3 | «Intervenir ya · 1 equipo avisa · K-101» | X4 §3.7 | Intervenir (repite HO-5) |
| MA-4 | «Dónde bajarlo» | v1 | Repite RE-8 |
| MA-5 | «Por parte» | R3 | Ídem DI-9 |
| MA-6 | «Programa de paradas · firmado» | Edinson: el programa [T 22:34] | Planear |
| MA-7 | «Horas en SAP» | Hollman, SAP [T 04:00] | Ninguna: no hay órdenes cerradas en el período |
| MA-8 | «Abierto en SAP» (1 orden) | Hollman, SAP [T 04:00] | Seguir la orden (repite HO-5) |
| MA-9 | «Paradas por identificar» (lista) e «Ir a identificar» | v1 | Repite HO-4 |
| CO-1 | Tiempo entre fallas por familia (41 d; 916 d) | Edinson [T 22:34]; R3 | Qué familia |
| CO-2 | «Historia · 12 meses» | R3 | Contexto |
| CO-3 | «¿Le creo al vigía?» | PM F2 | Cuánto creerle |
| CO-4 | «Reparación activa y espera» (8 h; 7,7 d; 8,1 d) | X4 §3.4; PM §1 | Tiempo fuera |
| CO-5 | «Los más costosos» (tabla) | Edinson [T 22:34]; R3 | Qué atacar |
| CO-6 | «De qué fallan, contra la referencia» | R3; ISO 14224 | Qué modo |
| CO-7 | «Fallas por mes» (gráfica; **la cuenta la hace la pantalla**) | PM §1 | El indicador del norte |
| CO-8 | «Calidad del registro» (ISO 14224: parte por falla) | R3 | Cuánto creerle al registro |
| CO-9 | «Calidad de la clasificación» (confirmado, corregido y en falta, por paso) | U1 §1.1; PM §7 | Cuánto creerle a TRIM |
| CO-10 | «Las reglas que más se corrigen» | U1 §1.1 | Corregir la regla |
| CO-11 | «Dónde se trabó, por equipo» | U1 §1.1 | Ídem CO-10 |
| CO-12 | «Equipos sin topología» | X4 §3.7 | Para adm |

## RG · Reporte al regulador

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| RG-1 | «2 paradas sin causa · No se puede publicar todavía…» y «Las contesta el operador de campo mañana antes de las 07:00» | X4 §3.4; P-03 | Publicar o no |
| RG-2 | Una fila por parada: qué falta, quién lo debe, la hora y los bbl | X4 §3.4 | A quién apurar |
| RG-3 | El árbol de causas como la circular: 6 pasos con su %, y «Ver los códigos ANH» | Edinson [T 26:48]; C24 | El contenido del reporte |
| RG-4 | «Pérdida: TRIM todavía no tiene registro de pérdidas», repetida en cada rama (×3) | Edinson [T 26:48] | Dice que falta el dato |
| RG-5 | «= el diferido del libro · 1.046 bbl» | U1 §1.0, regla 3 | Que cuadre |
| RG-6 | «Medición oficial · Ver más · 2 puntos» | X4 §3.7 | Cuadre |
| RG-7 | «Exportar» en la cabecera | C24 | Entregar el reporte |

## CF y CN · Configurar y Conectores

| Código | Elemento | Quién lo pidió | Qué decisión habilita |
|---|---|---|---|
| CF-1 | «Estado de la configuración · 3 de 6 pasos listos» y su frase | X4 §3.4; P-04 | Qué sigue |
| CF-2 | Los 6 pasos, cada uno con su estado | X4 §3.4 | Ir al paso |
| CF-3 | «Sus otros campos» | X4 §3.4 | Otro campo |
| CF-4 | Las partes: técnica, filosofía, metas y accesos | X4 §3.6 punto 8 | Navegar |
| CF-5 | Configuración técnica: perfil, membrete, tanques, respaldo, programa, versiones y «No se configura» | P1 | Configurar |
| CF-6 | Filosofía operacional, paso 1: 36 equipos con «TRIM deduce…», «Aceptar los 18» y «Subir Excel o CSV»; paso 2: capacidades; «Ver el impacto y firmar» | Edinson: la filosofía operacional [T 22:34]; U2 §8 | Confirmar a qué pozos sirve cada equipo |
| CF-7 | Metas de los campos (para el gerente): vigente o plan mes a mes, por campo, precio y publicación, «Firmar la versión» y versiones | Hollman [T 04:00] | Firmar metas |
| CF-8 | Usuarios y accesos | Seguridad | Dar accesos |
| CN-1 | SAP S/4HANA: avisos, órdenes (18 · 1 abierta), horas (132 h), repuestos (5) y equipos del PLC en SAP (16 de 16) | Hollman [T 04:00] | Ver que SAP está conectado |
| CN-2 | Catálogos de daño (bomba de reinyección y electrosumergible) | ISO 14224 | Qué partes ofrece la pregunta |
| CN-3 | WhatsApp Business, el número, sus plantillas y «ver 5 más» | — | — |
| CN-4 | «Bordes conectados»: tags registrados (33), asociados (30), por asociar y sin equipo | U2 | Asociar |
| CN-5 | Los bordes EPIC (serie, firmware, enlace y buffer) | U2 | Diagnóstico del enlace |
| CN-6 | «Inscribir un borde nuevo» | U2; `conector:configurar` | Inscribir |
| CN-7 | «Tags por asociar · 3 de 3 con sugerencia · Aplicar las 3» | U2 | Asociar |

## PF · Perfil (todos)

| Código | Elemento | Quién lo pidió | Veredicto por defecto · por qué |
|---|---|---|---|
| PF-1 | Identidad: nombre, rol, correo, área y campos | — | **T** |
| PF-2 | «WhatsApp» (el número) y «Avisos: su rol no recibe alertas por WhatsApp» | — | **W** |
| PF-3 | «Su foco» (el párrafo de `roles.ts`) | X4 | **B**: es la introducción repetida, y de tú [P-15] |
| PF-4 | Apariencia (sistema, claro u oscuro) | X5 | **T** |
| PF-5 | Permisos: «Puede» y «No puede», 13 renglones | `roles.ts` (seguridad) | **F**: quedan los «Puede»; los «No puede» se borran porque no habilitan nada |
| PF-6 | Sesiones y contraseña | Seguridad | **T** |
