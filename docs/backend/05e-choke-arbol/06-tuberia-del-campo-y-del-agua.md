# 5E.6 · La tubería del campo y la tubería del agua

Dos vistas de lectura que ponen juntos los potenciales de hoy (5E.2), lo que se está perdiendo ahora y lo que se perdió en el período (5E.4): **la tubería del campo** (crudo: yacimiento → pozos → planta → afuera) y **la tubería del agua** (agua de los pozos → tratamiento → tanques → bombas de reinyección → inyectores), con el **colchón** de los tanques. En un campo de 92–97 % de agua, el agua decide más paradas que el crudo: «In a field such as Magnus or Ula the Gross Potential is very dependent on water injection capacity, and a separate choke model can be used to model injection performance» (SPE-36848).

Funciones: `tuberiaCampo(campoId, desde, hasta, ctx, versiones?, op?)` (`src/entities/choke-reparto.ts:597-651`) → `TuberiaCampo` (`src/entities/choke.ts:1472-1518`); `tuberiaAgua(campoId, ctx, versiones?)` (`src/entities/choke-agua.ts:207-353`) → `TuberiaAgua` (`:126-181`). Rutas: `GET /api/vistas/campos/:campo/tuberia?desde=&hasta=` (`pedirTuberia`, `src/shared/api/choke.ts:126`) y `GET /api/vistas/campos/:campo/agua` (`pedirTuberiaAgua`, `:152`; es la foto de ahora, sin período). Pantallas: Producción → «La tubería del campo» (`widgets/choke/Tuberia.tsx`, `widgets/choke/Campos.tsx`); Agua → «La tubería del agua» (`widgets/choke/Agua.tsx`; su versión corta de hoy, `widgets/choke/AguaHoy.tsx`, va en Bombas y en el panel del equipo); «Qué limita hoy» en Turno e Identificar (`widgets/arbol/HoyLimita.tsx`).

Datos: el demo, ahora = 2-oct-2026 14:00; el período de la tubería del campo es octubre en curso salvo que se diga otro.

---

### Los tramos de la tubería del campo

**Qué es.** Un `TramoTuberia` por tramo (`choke.ts:1405-1439`), en el orden de la tubería: `potencialBpd` (5E.2; `null` en el yacimiento, que va con los pozos), `fuente` en palabras, `estado` (`pruebas`, `demo`, `firmado`, `sin-firmar`, `sin-dato`), `holguraBpd`, `limita`, `casiIgual`, `trenes` y `trenQueLimita` (la planta por dentro), `subniveles` (afuera por dentro: el oleoducto y el cliente), `pruebaMasVieja`, `disponibleHoy` (lo que queda hoy con un equipo parado), `perdiendoAhoraBpd`, `perdidoBbl` y `equiposTop`.

**Ejemplo con los datos del demo** (La Ceiba):

| Tramo | Potencial (bbl/d) | Estado | Holgura | Perdiéndose ahora | Perdido en oct |
|---|---:|---|---:|---:|---:|
| En el yacimiento | — | sin dato | — | 0 | 0,0 |
| En el pozo | **11.857** (limita) | pruebas | 0 | 0 | 117,9 |
| En la planta o estación | 13.000 | demo | 1.143 | 1.665 | 573,1 |
| Afuera | 14.000 (cliente 15.000) | demo | 2.143 | 0 | 0,0 |

**Qué texto (las fuentes y los ⓘ, corridos).**

- Yacimiento: «El yacimiento no tiene un número propio: lo que puede dar se mide con las pruebas de los pozos».
- Pozos: «La suma de lo que dan los pozos con su prueba vigente. No lleva el factor de asignación del mes: ese sale de lo que ya pasó por la planta y escondería lo que la limita. El libro sí lo usa para valorar lo diferido (unos 11.360 bbl/d hoy): son dos preguntas distintas» (`fuentePozos`, `choke-reparto.ts:586`; con el factor de medición firmado agrega «× el factor de medición firmado (1,004)», con tres decimales, y la cifra de los pozos es la de las pruebas × ese factor: 5E.2). Prueba más vieja: «la prueba más vieja es de hace 36 días (LC-01, 27 de ago)».
- Planta: «El más angosto de sus trenes medidos: el tren de crudo. La capacidad del tren de crudo en el esquema de planta: dato del demo, sin firmar. El agua se pasa a crudo con el corte de las pruebas; el gas no se mide en esta fase». Hoy, con P-201B parada (`disponibleHoy`, `aguaDisponibleHoy`, `choke-reparto.ts:511-528`): «hoy, sin P-201B: 178.500 de 267.750 bbl/d de agua, unos 9.445 bbl/d de crudo; ya entran 174.033 de agua». El tramo **no se angosta**: su alto sigue siendo la capacidad instalada (NSTA p. 29); esto solo dice cuánto queda mientras dura la parada.
- Afuera: subniveles «El oleoducto o el transportador» 14.000 y «El terminal o el cliente (mercado)» 15.000 («… Es un subnivel de afuera: no baja lo que puede pasar afuera»).

**Referencia.** `src/entities/choke-reparto.ts:511-651`; `referencia/choke/tuberia-{campo}-2026-09.json`.

---

### Lo que pasa hoy, lo que se pierde ahora y la brecha de las pruebas de hoy

**Qué es.** La foto de ahora, con **el cuadre de U2 §2.2**:

$$
\text{pozos (pruebas)} - \text{pasa hoy} - \text{perdiéndose ahora} = \text{brecha de las pruebas hoy}
$$

`pasaHoyBpd` = el crudo que sale ahora (`caudalesAhora`, valorado como el libro). `perdiendoAhora` = por tramo y equipo (`PerdiendoAhora`, `choke.ts:1440-1452`), pozo por pozo con la cuenta de `riesgoAhora` (el crudo asignado, o la parte que no da a frecuencia reducida), con **el tramo de la clasificación vigente de su fila de hoy** (lo que corrigió una persona mueve también lo de ahora; `perdiendoPorTramo`, `choke-reparto.ts:460-479`). `null` = sin identificar.

**Ejemplo con los datos del demo** (La Ceiba): pasa hoy **9.394** bbl/d; se pierden ahora **1.966**: en la planta P-201B 1.665 (LC-07 y LC-16, desde las 05:43) y sin identificar LC-21 301 (desde el 1-oct 18:20); brecha de las pruebas hoy: $11.857 - 9.394 - 1.966 = 497$ (= 11.857 de las pruebas − 11.360 asignados). El medidor (`medidorDe`, `:559-572`): «Punto de medición oficial (FQI-0101 · computador de flujo de la unidad LACT-01): en línea; el último día completo dio 11.105 bbl» (1-oct). Sin el dato de ayer: «Sin comunicación con el punto de medición oficial (…) desde el {día}: lo real de esos días queda sin dato».

**Qué texto (`fraseHoy`, `fraseDeHoy`, `:534-540`).** Cuando un equipo parado deja el agua de la planta por debajo de lo que pueden dar los pozos: «Hoy, con P-201B parada, el agua de la planta deja pasar 178.500 bbl/d y ya entran 174.033: lo que den de más los pozos pasa solo hasta unos 236 bbl/d de crudo, hasta que vuelva.» Si ya no cabe nada: «Hoy no: con {equipo} parada, el agua de la planta está llena (entran N de M bbl/d). Lo que den de más los pozos no pasa hasta que vuelva.»

**Referencia.** `src/entities/choke-reparto.ts:436-540`.

---

### Lo que se perdió en el período y la frase del gerente

**Qué es.** `perdidoPeriodo` (por tramo, con los 3 equipos que más pesan) y `sinTramoBbl`, con **el mismo total del libro** (reparto por tramo + sin identificar = diferido, U2 §0, principio 6). `capacidades`: «capacidades firmadas el {día} por {persona}», «capacidades: unas firmadas …, otras del demo, sin firmar» o «capacidades del demo, sin firmar» (`capacidadesDeLaTuberia`, `:575-583`).

**Qué texto (`fraseGerente`, `:636-637`).** «Se trabó {sobre todo, si no es el 100 %} {en los pozos | en la planta | afuera (…)}: {los 2 equipos que más pesan} ({familia}).» + «N bbl todavía sin identificar.» si hay; sin diferido: «Nada se trabó en {campo} en el período.» La familia sale del tipo de causa que más le cargó al equipo (`FAMILIA`, `:656-664`); la baja tensión de un solo pozo se dice «baja tensión».

**Ejemplo con los datos del demo.**

| Campo · período | Frase |
|---|---|
| La Ceiba · oct | «Se trabó sobre todo en la planta: P-201B (bomba de reinyección). 355 bbl todavía sin identificar.» |
| La Ceiba · sep | «Se trabó sobre todo en los pozos: LC-11 y LC-04 (electrosumergibles).» |
| Morichal · sep | «Se trabó sobre todo en los pozos: MN-41 y MN-33 (electrosumergibles).» |
| Guacamayo · sep | «Se trabó en los pozos: GU-05 y GU-09 (electrosumergibles).» (todo en los pozos) |
| El Palmar · sep | «Se trabó sobre todo en los pozos: PA-07 (bombeo mecánico).» |
| La Zarza · sep | «Se trabó afuera (oleoducto, transportador o cliente): ZA-06 (según el operario).» |
| La Zarza · oct | «Nada se trabó en La Zarza en el período.» |

**Quién lo calcula.** Servidor: todo `TuberiaCampo` en una sola lectura.

**Referencia.** `src/entities/choke-reparto.ts:575-674`.

---

### Los tramos de la tubería del agua

**Qué es.** Cinco tramos (`TramoAgua`, `NOMBRE_TRAMO_AGUA`, `choke-agua.ts:45-55`): «Agua de los pozos», «Tratamiento de agua», «Tanque de agua», «Bombas de reinyección», «Pozos inyectores (disposición)». Cada uno en bbl/d de agua y **también en crudo** (agua × crudo por barril de agua de las pruebas, con el factor de medición, QA-D3; nunca con el factor de asignación).

**Fórmula.**

- agua de los pozos = Σ agua de la prueba vigente de los pozos con prueba;
- tratamiento y admisión de los inyectores = las capacidades firmadas o, sin firma, las del demo; lo que el demo no tiene va «sin dato» y **no se inventa**;
- tanques: **no tienen caudal**, son colchón (abajo); no entran al mínimo;
- bombas = la capacidad **instalada** del tren con **una sola cifra por bomba**, la que usa `diferido.ts` (89.250 en La Ceiba, lo que deja el cabezal de disposición; la placa, 90.000, solo de referencia). La de reserva no suma; una parada no baja la capacidad (es pérdida, no menos tubo); lo que queda hoy va aparte;
- el tramo de la disposición más angosto limita **solo si todos los tramos de la disposición tienen número** (`faltanParaDecir` vacío); con un empate entre bombas e inyectores manda el de los inyectores.

**Ejemplo con los datos del demo.**

| Campo | Agua de los pozos | Bombas (en servicio) | Inyectores | Cabe más | Tanque |
|---|---:|---|---:|---:|---|
| La Ceiba | 224.075 (11.857 de crudo) | 3 × 89.250 = 267.750 (14.168 de crudo) | 267.750 (demo, deducida) | 43.675 | TK-AG-CE, 30.000 bbl, 89,6 % |
| Morichal Norte | 581.849 | 7 × 86.500 = 605.500 (18.666) | 605.500 | 23.651 | TK-AG-MN, 60.000 bbl, 61,8 % |
| Guacamayo | 90.122 | 60.000 + 50.000 (P-201C de reserva) = 110.000 (8.334) | sin dato | 19.878 | TK-AG-GU, 20.000 bbl, 42,3 % |
| El Palmar | 13.192 | 16.000 (4.028) | sin dato | 2.808 | sin tanque firmado |
| La Zarza (gas) | 1.429 | 4.000 (sin pasar a crudo) | sin dato | 2.571 | sin tanque firmado |

En ningún campo la disposición limita hoy. El tratamiento de agua no tiene dato en ningún campo del demo.

**Qué texto (`frases`, corridas, La Ceiba).**

- «Con las tres bombas, cabe más agua: 43.675 bbl/d (sin contar la capacidad del tratamiento de agua: no tiene dato).»
- «Bombas de reinyección y pozos inyectores dan exactamente lo mismo: 267.750 bbl/d. Lo que se gane en uno lo frena el otro; la admisión de los inyectores no está firmada: el demo la deduce del mismo límite del cabezal que deja a cada bomba en su capacidad.»
- «Si para una con todos los pozos produciendo, faltan 44.100 bbl/d de salida: el tanque se llena en 1,8 h y hay que cerrar pozos.»
- «P-201B está parada desde el 2 de oct, 03:52: se cerraron LC-07 y LC-16 y se pierden 1.665 bbl/d de crudo.»
- «Cerrando primero los más acuatosos se pierden 1.426 bbl/d de crudo; cerrando parejo, 2.236.»

Morichal: «Si para P-201B, faltan 40.400 bbl/d de salida: el tanque se llena en 10 h y hay que cerrar pozos.» y «Cerrando primero los más acuatosos se pierden 783 bbl/d de crudo; cerrando parejo, 1.222.» Guacamayo (bomba de recobro): «Si para P-201B hoy, no cierra pozos: el agua tiene otra salida. Si sigue parada semanas, el yacimiento pierde presión: eso se trabaría «en el yacimiento».» La Zarza: «La Zarza es un campo de gas: su agua se dice en agua, sin pasarla a crudo.»

**Referencia.** `src/entities/choke-agua.ts:1-353`; `referencia/agua-choke/{ceiba,morichal,guacamayo,palmar,zarza}.json` (5 casos).

---

### El colchón del tanque de agua

**Qué es.** Cuántas horas aguanta el tanque antes del alto-alto si para la bomba que lo vacía (`ColchonAgua`, `choke-agua.ts:62-78`). Es **el mismo de `diferido.ts`** (5B.4): `al-parar`, el de la parada abierta de la bomba, con el nivel al parar (el que ya se reporta); `si-para-ahora`, el de la predicción (`prediccion`, `src/entities/diferido.ts:211`), con el nivel de ahora y la bomba en marcha.

**Fórmula.**

$$
\text{colchón (h)} = 24\cdot\frac{(\text{alto-alto} - \text{nivel})\cdot \text{capacidad}}{\text{agua sin salida}}, \qquad \text{agua sin salida} = \text{lo que movía la bomba} - \text{respaldo libre}
$$

con su rango por las incertidumbres (aforo del tanque, Res. MME 40236/2022, Anexo 2; caudal de agua acotado con la banda del agua). Lo que movía la bomba es la mediana de su medidor mientras trabaja (`aguaQueMueve`, `diferido.ts:52`).

**Ejemplo con los datos del demo.** La Ceiba, P-201B parada (`EV-2011-1002`, 2-oct 03:52:18), nivel al parar 78,7 %: libre $(0{,}90 - 0{,}787)\cdot 30.000 = 3.390$ bbl; sin salida $74.200 - 30.100 = 44.100$ bbl/d → **1,84 h** (1,66–2,03). Con el nivel de ahora (89,6 % a las 13:59) quedarían 120 bbl: 0,07 h. Morichal, si para P-201B ahora (61,8 %): $(0{,}90-0{,}618)\cdot 60.000 / (79.900 - 39.500) \cdot 24 =$ **10,05 h** (9,04–11,06). Guacamayo: sin colchón: «La bomba es de recobro y la reserva toma toda su agua: si para, el tanque no sube».

**Casos borde.** Una parada vieja se mide con el tanque y el respaldo que regían al parar (`configEn`, 5D.2). Sin nivel, no hay colchón.

**Referencia.** `src/entities/choke-agua.ts:62-78`; `src/entities/diferido.ts:52-59, 111-130, 211-252`.

---

### Si para otra: con una bomba ya parada

**Qué es.** Con una bomba del tren parada, lo de hoy y lo que pasa si para **otra** de las que quedan (`SiParaOtra`, `choke-agua.ts:182-199`): lo que entra, lo que caben las que siguen en marcha (las sin instrumento se suponen en marcha), y si para la mayor de ellas: el agua sin salida, el colchón con el nivel de ahora y **el orden de cierre de TRIM** (primero los que menos crudo pierden por barril de agua, `ordenDeCierre`, `diferido.ts:111`). Es la misma cuenta del «si falla hoy» de sus hermanas (5E.7).

**Ejemplo con los datos del demo.** La Ceiba: siguen P-201A y P-201C; entran 174.033 bbl/d y caben 178.500. Si para P-201A: 84.783 bbl/d sin salida, colchón **0,03 h (2 min)**; cerrando en el orden de TRIM (LC-02, LC-10, LC-01, LC-17 y LC-14 enteros; LC-06 y LC-09 al 25 %; LC-11 al 20,5 %) se pierden **3.059** bbl/d de crudo; parejo, 4.577.

**Referencia.** `src/entities/choke-agua.ts:182-353`.
