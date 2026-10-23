# 5E.7 · «Si falla hoy»: lo que le costaría al campo cada equipo

Lo que le costaría al campo que cada uno de sus equipos fallara **hoy**, con el tramo donde se trabaría, de mayor a menor. Ese orden decide dónde va el vigía, qué rutas predictivas van primero y qué repuesto se pide ya (CHOKE-COMPLETO §10; U2 §6). **No hay una cuenta nueva**: son las mismas de siempre (`diferido.ts`, `riesgoAhora`), para que un mismo número sea igual en todas partes.

Función: `criticidadDelCampo(campoId, ctx)` (`src/entities/criticidad.ts:315-380`) → `CriticidadDelCampo` (`:118-143`); varios campos: `criticidad(campoIds, ctx)` (`:434-435`). Ruta: `GET /api/vistas/criticidad?campos=` (`pedirCriticidad`, `src/shared/api/choke.ts:184`) → `{ ranking, campos }`. Pantallas: Riesgo → «Si falla hoy» (`widgets/riesgo/SiFallaHoy.tsx`), Bombas, el panel del equipo, el resumen del gerente y «Qué limita hoy» (`widgets/arbol/HoyLimita.tsx`).

Datos: el demo, ahora = 2-oct-2026 14:00.

---

### Una fila y sus tres grupos (QA-D6)

**Qué es.** `FilaCriticidad` (`criticidad.ts:54-103`): `equipo`, `nombre`, `familia` (`bomba`, `electrosumergible`, `bombeo-mecanico`, `pozo`, `servicio`), `tramo` y `alcance` (de la topología), `servidos`, **`bpd`** (el crudo por día que el campo deja de sacar si falla hoy, una vez agotado el colchón: el criterio del orden; `null` sin dato), `colchonH`, `costoFalla` (barriles de una falla típica) con `costoDe` (`propio` o `flota`) y `mdtFuente`, `vigilado` (TRIM lee sus instrumentos), `sinDato` (lo que falta, o por qué es techo), `subio`, `estimacion`, **`grupo`**, `parado`, `perdiendoBpd`, **`puesto`** y `porque`.

**Fórmula (orden, `orden`, `:428-432`).** Tres listas (QA-D6), en este orden:

1. **`medido`**: las cifras calculadas, de mayor a menor `bpd`; a igual cifra, el de menos colchón (sin colchón cuenta 0); luego el costo de una falla y el código. **Puesto** = 1 + cuántos medidos cuestan más (los que cuestan lo mismo lo comparten).
2. **`techo`**: lo que supone cerrar todos sus pozos («hasta»), aparte y después, **sin puesto** (no corre el puesto de lo medido).
3. **`sin-dato`**: sin cifra, con su porqué. **No se le inventa un costo.**

Lo que **ya está parado** no entra a la lista: va en `parados` («Perdiéndose ahora»). Lo de afuera (tercero, frontera) no entra: no es un equipo del campo ni se le pone vigía. Lo que no se puede medir va en `sinCalcular`, con el porqué.

**Ejemplo con los datos del demo.** Portafolio: 130 filas (95 medidas, 9 techos, 26 sin dato). Los primeros: El Palmar P-201B 3.277 bbl/d (puesto 1); La Ceiba P-201A y P-201C 3.059 (puesto 1, comparten); Guacamayo P-201A 2.136 (1); Morichal MPP-301 1.600 (1); La Ceiba LC-11 1.031 (3).

**Referencia.** `src/entities/criticidad.ts:51-143, 424-435`; `referencia/choke/criticidad-{campo}.json` y `criticidad-portafolio.json`.

---

### Cómo se calcula cada familia

**Fórmula.**

| Familia | Cuenta | Función |
|---|---|---|
| Bomba de la línea **con instrumento** | **exactamente** el costo por falla de `diferido.ts` (`costoDeBomba` sobre `prediccion` e `historialDeEquipo`), con el colchón del tanque cuando aplica | `deBomba`, `:201-223` |
| Sus **hermanas sin instrumento** (P-201A y P-201C de La Ceiba) | perfil mínimo (`TREN_AGUA`: capacidad y papel, sin tags): el agua que entra ahora contra lo que dejan pasar las otras bombas en marcha, cerrando en el orden de TRIM (`ordenDeCierre`), con el colchón del tanque al nivel de ahora. **Si su hermana está parada, suben** | `deHermana`, `:231-263` |
| Electrosumergible y bombeo mecánico | el crudo de su pozo, **sin colchón** (no hay tanque que aguante la falla del levantamiento de un pozo); el costo de una falla de electrosumergible es el de `riesgoAhora`: crudo × horas fuera promedio ÷ 24, las suyas (`propio`) o las de la flota del campo (`flota`) | `dePozo`, `:159-183` |
| Servicios (subestación, aire, separador, tratador) | la regla de `riesgoAhora`, «se cierra lo que esté produciendo», con los pozos que dependen de ellos según la topología: **un techo**, marcado | `deServicio`, `:284-309` |
| Servicio **con respaldo declarado** | **0 mientras el respaldo esté bien**; si su lectura dice que el respaldo ya está en uso (K-101 con 2 de 3 unidades), vuelve al techo | `respaldoHoy`, `:268-274` |
| Evacuación (tanque de crudo, LACT) y compresor | **sin dato** con su porqué, hasta tener el colchón del tanque de crudo o los pozos que cierra el compresor | — |
| Campo de gas | sin cifras: lo que cuesta una falla en gas todavía no se calcula | — |

**Referencia.** `src/entities/criticidad.ts:1-41, 144-309`.

---

### Ejemplo · La Ceiba

| Grupo | Puesto | Equipo | bbl/d si falla hoy | Colchón | Costo de una falla | Vigila TRIM |
|---|---:|---|---:|---|---:|---|
| medido | 1 | P-201A (bomba, planta) | 3.059 | 0,03 h | — | no |
| medido | 1 | P-201C (bomba, planta) | 3.059 | 0,03 h | — | no |
| medido | 3 | LC-11 (electrosumergible, pozo) | 1.031 | — | 3.636 (propio) | sí |
| medido | 4 | LC-08 | 893 | — | 14.827 (flota) | sí |
| medido | 5 | LC-04 | 825 | — | 2.102 (propio) | sí |
| … | … | … | … | … | … | … |
| medido | 18 | H-302 (servicio, planta) | **0** | — | — | sí |
| techo | — | K-101, SE-2, V-101 (servicios) | hasta 9.394 | — | — | sí |
| sin dato | — | C-401, LACT-01, TK-102 | — | — | — | sí |

**Qué texto (`porque` y `sinDato`, corridos).**

- P-201A: «Si P-201A falla hoy, quedan 84.783 bbl/d de agua sin salida: el campo pierde 3.059 bbl/d después de 2 min de colchón» · «Sin instrumento: TRIM no ve si está en marcha; se supone que sí» · `subio`: «P-201A sube porque P-201B está parada: si P-201A falla ahora, el campo pierde 3.059 bbl/d después de 2 min de colchón».
- LC-11: «Si LC-11 falla hoy, se pierden sus 1.031 bbl/d: no hay tanque que aguante».
- H-302: «Si H-302 cae hoy, toma su carga el respaldo en línea (H-301): no cierra pozos mientras el respaldo esté bien» · «Cero mientras el respaldo esté bien (respaldo en línea (H-301))».
- K-101 (techo): «Si K-101 cae hoy, se frenan los 15 pozos que producen y dependen de él: hasta 9.394 bbl/d, desde el primer minuto» · «Techo: supone que se cierran todos los pozos que dependen de él; su respaldo ya está en uso hoy (2 de 3 unidades en servicio; 3 unidades (N+1))». (En Morichal, Guacamayo y El Palmar K-101 vale 0: su respaldo está bien.)
- C-401: «Si C-401 falla hoy: sin dato. Falta saber a qué pozos cierra: sin eso no se calcula cuánto cuesta».
- LACT-01 y TK-102: «Si LACT-01 falla hoy: sin dato. Falta el colchón del tanque de crudo: sin él no se sabe cuánto aguanta antes de cerrar pozos».
- `sinCalcular` (manifold, depurador, tea, TK-101, tanque de agua, inyección): «Sin equipo registrado en TRIM: no hay con qué medir su falla».

**Lo ya parado** (`parados`):

- P-201B, 1.665 bbl/d ahora: «P-201B está parada: se pierden 1.665 bbl/d ahora. Cuando vuelva, si falla otra vez: 1.426 bbl/d cerrando en el orden de TRIM después de unas 2,1 h de colchón (con el tanque al 77,3 %, como suele estar al parar)»; costo de una falla 2.252: «el promedio de sus 8 fallas cerradas, sin las 2 h que aguanta el tanque al nivel típico al parar». El nivel típico es la mediana de los niveles al parar de sus paradas (11 niveles, de 70,3 % a 82,7 %: mediana 77,3 %; `colchonAlVolver`, `:189-196`).
- LC-16, 869: costo 27.358, «31,5 d fuera, el promedio de su falla cerrada».
- LC-07, 796: costo 13.220, «16,6 d fuera, el promedio de las electrosumergibles del campo (esta no ha fallado)».
- LC-21, 301: sin costo, «El bombeo mecánico no tiene historia de fallas en TRIM: no hay duración típica con qué medirla».

**Referencia.** `referencia/choke/criticidad-ceiba.json`.

---

### Ejemplos · los otros campos

- **Morichal Norte**: MPP-301 1.600 bbl/d (1; «Si falla MPP-301 hoy, se frenan 3 pozos que mueve: 1.600 bbl/d»); P-201B 783 (2; «Si falla P-201B hoy, el campo pierde 783 bbl/d después de 10 h de colchón», costo 1.235); sus seis hermanas 783 (3, comparten; «quedan 40.389 bbl/d de agua sin salida»); techos SE-2 y V-101 hasta 16.920 (40 pozos que producen); H-302 y K-101, 0. Parado: MN-41, 684.
- **Guacamayo**: P-201A 2.136 (1; 5,7 h de colchón; «… La reserva no se cuenta: solo está declarada para otra bomba»); P-201B (recobro) 0: «P-201B inyecta para recobro: si falla hoy no cierra pozos; baja la presión del yacimiento en semanas»; P-201C (reserva) 0: «P-201C es de reserva (…): si falla hoy no cierra pozos».
- **El Palmar**: P-201B 3.277 (1): «Si P-201B falla hoy, quedan 13.192 bbl/d de agua sin salida: el campo pierde 3.277 bbl/d» · «Sin tanque de agua firmado o sin su nivel: no se sabe cuánto aguanta».
- **La Zarza** (gas): todo sin dato, con «La Zarza es un campo de gas: lo que cuesta una falla en gas todavía no se calcula.»; ZA-09: «ZA-09 no tiene prueba: no se le inventa caudal».

**Referencia.** `referencia/choke/criticidad-{morichal,guacamayo,palmar,zarza}.json`.

---

### Lo que se decide con la lista

**Qué es.** Las frases que hacen la lista dinámica y accionable (U2 §6.4): `cambioHoy`, `noIntervenir` (lo decide el jefe), `proximoInstrumento` (lo decide confiabilidad: el primero de la lista que TRIM no ve venir), `desembotellar` (`desembotellarDe`, `:405-422`) y `avisosTrabajo` (`avisosDeTrabajo`, `:385-396`: un trabajo del programa firmado sobre un equipo que hoy vale más porque otro está parado; proponer el plan es otra escritura, que no está en esta versión).

**Qué texto (corridos, La Ceiba).**

- «Cambió hoy: P-201A y P-201C subieron al puesto 1 porque P-201B está parada. Ninguna de las dos tiene instrumento: TRIM no verá venir su falla.»
- «Ojo: P-201A y P-201C valen más mientras P-201B esté parada: no conviene intervenirlas hoy.»
- «Lo primero de la lista sin instrumento: P-201A y P-201C (puesto 1, 3.059 bbl/d si falla hoy). TRIM no ve venir su falla.» (Morichal: «… P-201A, P-201C, P-201D, P-201E, P-201F y P-201G (puesto 3, 783 bbl/d si falla hoy) …»; El Palmar: «… PA-06 (puesto 2, 632 bbl/d …)».)
- Desembotellar: «En La Ceiba, otra bomba de agua no sube la producción: evita que una falla cierre pozos. Cada falla de P-201B le ha costado en promedio unos 4.593 bbl. Para producir más hay que sacarles más a los pozos: la planta y afuera dejan pasar más.» (Morichal: 2.765 bbl por falla.) Es **historia** (lo que ya costaron sus 8 fallas cerradas, MDT 40 h), no «si falla hoy», que descuenta el colchón de hoy (QA-A-08). Otras variantes: limita el agua → «… otra bomba de agua sí sube la producción: hoy el agua es lo que limita …»; casi iguales → «Para producir más hay que ampliar {a} y {b} a la vez …»; limita la planta → «… ampliar el tren de crudo de la planta: abrir más pozos no da nada»; limita afuera → «… más salida afuera: oleoducto, transportador o nominación».
- Aviso de trabajo (con un preventivo de P-201A agregado al programa el 4-oct para la prueba): «Ojo: P-201A vale más mientras P-201B esté parada: tiene programado «Preventivo de la bomba» el 4 de oct. ¿Mover el trabajo?». En el demo, sin ese trabajo, no hay avisos.

**Quién lo calcula.** Servidor.

**Referencia.** `src/entities/criticidad.ts:104-143, 385-422`.
