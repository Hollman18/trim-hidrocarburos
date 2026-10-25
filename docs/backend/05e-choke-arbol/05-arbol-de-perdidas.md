# 5E.5 · El árbol de pérdidas del choke

SPE-36848 abre cada tramo de la tubería en niveles más bajos, «down to at least another level e.g. ESP failure». En la ANH esos niveles son los pasos del árbol de Edinson: responsable, diferida o pérdida, planeada o no, causa N1 y detalle N2 («esto está copiado del modelo choque», [26:48]). El árbol de pérdidas cuelga **cada barril diferido del período** de un tramo y, dentro de él, de todo el árbol; **cada nodo suma exacto lo que tiene debajo**.

Función: `arbolDelChoke(campoIds, desde, hasta, ctx, op?)` (`src/entities/choke-arbol.ts:279-290`), que arma con `armar` (`:245-271`) → `ArbolChoke` (`:152-163`). Regla: **`choke.arbol@1`** (`REGLA_ARBOL`, `:119`). Ruta: `GET /api/vistas/choke/arbol?campos=&desde=&hasta=&orden=` (`pedirArbolChoke`, `src/shared/api/choke.ts:227`; `orden` obligatorio). Pantallas: Producción → «Ramas» y el árbol circular (`widgets/choke/Ramas.tsx`, `widgets/choke/ArbolCircular.tsx`); Diferidos → «Por tramo»; Resumen del gerente.

Datos de los ejemplos: el demo, `AHORA = 2026-10-02T14:00-05:00`.

---

### Los tres órdenes y sus niveles

**Qué es.** El mismo barril, tres maneras de recorrerlo (`ORDENES_ARBOL`, `NIVELES_ARBOL`, `choke-arbol.ts:62-75`):

| Orden | Niveles debajo de la raíz | `NOMBRE_ORDEN` (`:77-81`) |
|---|---|---|
| `gestion` (por defecto) | tramo → planeación → N1 → N2 → equipo → parte | «Por dónde se trabó: tramo, planeada o no, causa, detalle, equipo y parte» |
| `circular` | responsable → tramo → impacto → planeación → N1 → N2 (los 6 pasos de la C24, p. 5) | «Como la circular: quién, dónde se trabó, diferida o pérdida, planeada o no, causa y detalle» |
| `responsable` | responsable → tramo → N1 → equipo | «Por quién: quién, dónde se trabó, causa y equipo» |

El de gestión es el del norte: dónde se trabó y qué hay que evitar. Rótulos de nivel (`NOMBRE_NIVEL`, `:84-87`): «Dónde se trabó», «Quién», «Qué pasó», «¿Planeada?», «Causa», «Detalle», «Equipo», «Parte». Cada paso de la circular viaja en su campo de `paradas_pozo` (`CAMPO_ANH`, `:95-97`): `resp_par`, `choke_mod`, `dif_perd`, `pla_no_plan`, `cau_niv1`, `cau_niv2`.

**Referencia.** `src/entities/choke-arbol.ts:59-119`.

---

### Un nodo del árbol

**Qué es.** `NodoArbol` (`choke-arbol.ts:124-150`): `dimension` (el nivel, o `raiz`); `valor` (el código: `planta`, `no-planeada`, `NP_SUB`, `NP_SUB/falla-esp`, `op-mantenimiento`, `P-201B`…; `falta` si el paso falta; en el tramo, `sin-asignar`; en la raíz, `total`); `texto` (en palabras de campo); `cadena?` (lo que viaja a la ANH en la forma de salida vigente, solo en los pasos que tienen valor: **nunca se inventa una cadena**); `bbl`; `filas` y `eventos`; `confirmadoBbl` (los barriles con los 6 pasos avalados por una persona); `noPlaneadaBbl` (la cifra del norte de sus filas, QA-D4); `hijos`.

**Fórmula (invariantes).**

$$
\text{raíz.bbl} = \text{diferido del libro del período} = \sum_{f} \text{bbl}_f, \qquad \text{nodo.bbl} = \sum_{h\ \in\ \text{hijos}} h.\text{bbl}
$$

Lo mismo para `filas`, `eventos`, `confirmadoBbl` y `noPlaneadaBbl` (un nodo nunca tiene más confirmado ni más no planeado que barriles). Las filas son **las del reparto** (`filasDelChoke`), con la clasificación vigente: el primer nivel del orden `gestion` es el reparto por tramo de 5E.4, también después de que una persona corrige el paso 2 o el 4 (QA-A-01; C-09). Un período que no empieza a medianoche toma de cada fila solo sus horas dentro (QA-A-11).

**Reglas.**

- **Un paso que falta va en su propia rama** (`falta`; en el tramo, «Sin identificar»). Nunca se reparte para que cuadre (U2 §0, principio 5). Textos (`TEXTO_FALTA`, `:108-111`): «Sin identificar», «Falta quién», «Falta qué pasó», «Falta saber si fue planeada», «Falta la causa», «Falta el detalle», «Sin equipo», «Sin parte».
- **Orden de las hermanas**: de más a menos barriles; «falta» y «sin identificar» al final; a igual cifra, por su código.
- **La rama de la pérdida existe en el paso 3, pero hoy está vacía**: TRIM todavía no registra pérdidas (lo producido que no se vendió). Ningún barril diferido se pasa a ella. Texto: «Pérdida: TRIM todavía no tiene registro de pérdidas»; ⓘ (`EXPLICA_PERDIDA`, `:116`): «La pérdida es lo producido que no se vendió (derrame, tea, pitera). Va aparte y nunca se suma a lo diferido. TRIM todavía no tiene el registro de pérdidas: esta rama queda vacía hasta que lo tenga, y ningún barril diferido se pasa a ella.»
- **Lo no planeado** de cada nodo es el escalón `disponibilidad-no-planeada` de sus filas (sin la capacidad ni lo sin identificar). El paso 4 de la ANH es su propio nivel (`planeacion`), el que lee Regulatorio.
- El equipo se rotula con el tipo de causa que más pesa en sus filas (`tipoMayor`): «P-201B · bomba de reinyección», «LC-05 · energía eléctrica», «LC-21 · sin identificar». La causa lleva el mismo nombre de la cadena de Identificar y del editor (B-27): el de la Tabla 1.

**Quién lo calcula.** Servidor. El front comprueba lo que llega con `revisarArbol` (`:303-340`): un nodo que no suma sus ramas, ramas del nivel equivocado, un nodo con paradas y sin ramas, lo confirmado o lo no planeado por encima del nodo, o hermanas fuera de orden. Corrido con un árbol roto a propósito (+1 bbl en un nodo): «raiz.hijos[0]: no suma sus ramas: 6675.509 bbl y sus ramas 6676.509 | raiz.hijos[0].hijos[0]: no suma sus ramas: 6676.509 bbl y sus ramas 6675.509».

**Referencia.** `src/entities/choke-arbol.ts:100-340`.

---

### Ejemplo · La Ceiba, septiembre (orden de gestión)

Raíz «Lo diferido del período» = **7.716,1 bbl**, 28 filas, 18 eventos, no planeado 7.716,1, confirmado 0:

```
En el pozo [POZO] ............................................. 6.675,5  (24 filas, 16 eventos)
  No planeada [NO PLANEADA] ................................... 6.675,5
    No planeada - Mecánica subsuelo [NP_SUB] .................. 6.436,1
      Falla ESP ............................................... 6.040,1  (13 filas, 6 eventos)
      Falta el detalle ........................................   396,0  (8 filas, 7 eventos)
    No planeada - Eléctrica interna [NP_ENINT] ................   239,4
      Falta el detalle ........................................   239,4
En la planta o estación [PLANTA] .............................. 1.040,6  (4 filas, 2 eventos)
  No planeada [NO PLANEADA] ................................... 1.040,6
    No planeada - Mecánica superficie [NP_SUP] ................ 1.040,6
      Falla rodamiento/cojinete (bearing box) ................. 1.040,6
```

Comprobación: $6.040{,}1 + 396{,}0 + 239{,}4 + 1.040{,}6 = 7.716{,}1$ = la brecha del libro de La Ceiba en septiembre (5A.3) = el reparto por tramo (5E.4).

---

### Ejemplo · La Ceiba, octubre en curso (gestión y circular)

Gestión, raíz **1.046,0 bbl**, 7 filas, 5 eventos, no planeado 691,0:

```
En la planta o estación ...................................... 573,1  (2 filas)
  No planeada > NP_PROC > Parada estación/bombeo afecta pozos > P-201B · bomba de reinyección > Sin parte
En el pozo .................................................... 117,9  (1 fila)
  No planeada > NP_ENINT > Falta el detalle > LC-05 · energía eléctrica > Sin parte
Sin identificar ............................................... 355,0  (4 filas, 2 eventos; no planeado 0)
  Falta saber si fue planeada > Falta la causa > Falta el detalle
    LC-21 · sin identificar 246,5 · LC-08 · sin identificar 108,5
```

Circular, la misma raíz: «Operador · Mantenimiento» [Operador-Mantenimiento] 691,0 → planta 573,1 (Diferida 573,1; **Pérdida 0,0**) y pozo 117,9 (Diferida 117,9; Pérdida 0,0); «Falta quién» 355,0 → Sin identificar → Pérdida 0,0 y «Falta qué pasó» 355,0. La conciliación de las filas da lo mismo (`conciliarAnh`): 1.046,03 = NP_ENINT 117,92 + NP_PROC 573,06 + sin causa 355,04.

**Lo que dicen las personas mueve el árbol** (con lo guardado encima):

- Edwin (confiabilidad) **confirma** los 6 pasos de LC-07 (`EP-LC07-261002-79@2026-10-02#1`): el nodo de la planta pasa a tener 273,135 de 573,061 bbl confirmados.
- Nelson (supervisor) **corrige** el paso 2 de LC-05 a «En la planta»: la planta sube a 691,0 y queda sin identificar 355,0 (el pozo, 0).

**Referencia.** `referencia/choke-arbol/ceiba-2026-10-gestion.json`, `ceiba-2026-09-{gestion,circular,responsable}.json`; `referencia/escenarios/correcciones/arbol-ceiba-2026-10-gestion.json`.

---

### Ejemplo · El portafolio, septiembre

Los tres órdenes dan la misma raíz: **33.944,738 bbl**, 129 filas, 69 eventos, no planeado 32.150,533, forma de salida `C024-2026`. Dos niveles del de gestión:

| Tramo | bbl | Filas | No planeada | Planeada | Falta saber si fue planeada |
|---|---:|---:|---:|---:|---:|
| En el pozo | 24.482,6 | 98 | 22.991,0 | 1.385,1 | 106,5 |
| En la planta o estación | 9.159,5 | 30 | 9.159,5 | — | — |
| Afuera | 302,6 | 1 | 302,6 (paso 4); **no planeado del norte 0** | — | — |

Lo de afuera es ZA-06 (el mercado): la ANH lo marca «no planeada» en el paso 4, pero su escalón es capacidad, así que su `noPlaneadaBbl` es 0 (QA-D4).

**Las cadenas completas** (`cadenasAnh`, las 5 de más barriles), en las dos formas de salida:

| C024-2026 | DICC-V3.2 | bbl |
|---|---|---:|
| Operador-Mantenimiento · POZO · DIFERIDA · NO PLANEADA · NP_SUB · Falla ESP | OPERADOR - MANTENIMIENTO · POZO · DIFERIDA · NO PLANEADA · NO PLANEADA - MECÁNICA SUBSUELO · FALLA ESP | 18.209,6 |
| Operador-Mantenimiento · PLANTA · DIFERIDA · NO PLANEADA · NP_PROC · Parada estación/bombeo afecta pozos | … · NO PLANEADA - PROCESO / FACILIDADES · PARADA ESTACIÓN/BOMBEO AFECTA POZOS | 6.815,3 |
| Operador-Operación · PLANTA · DIFERIDA · NO PLANEADA · NP_PROC · Capacidad tratamiento agua/crudo limitada | OPERADOR - OPERACIÓN · … · CAPACIDAD TRATAMIENTO AGUA/CRUDO LIMITADA | 1.303,6 |
| Operador-Mantenimiento · PLANTA · DIFERIDA · NO PLANEADA · NP_SUP · Falla rodamiento/cojinete (bearing box) | … · NO PLANEADA - MECÁNICA SUPERFICIE · FALLA RODAMIENTO/COJINETE (BEARING BOX) | 1.040,6 |

**Referencia.** `referencia/choke-arbol/portafolio-2026-09-{gestion,circular,responsable}.json`.

---

### Lo que mueve una corrección (con las mismas filas)

Corrido con lo guardado encima de lo que propone TRIM, para mostrar que el árbol, el reparto y la PE se mueven juntos:

| Lo que se dice | Período | Antes → después |
|---|---|---|
| El paso 2 de LC-11 (`EP-LC11-260925-40`, 3.677,2 bbl) → «En la planta» | La Ceiba · sep | pozo 6.675,5 → 2.998,3; planta 1.040,6 → 4.717,8; frase del gerente: «Se trabó sobre todo en la planta: LC-11 (electrosumergible) y P-201B (bomba de reinyección).» |
| … y el paso 4 → planeada (el jefe) | La Ceiba · sep | no planeadas 7.716,1 → 4.038,8; PE no planeada 2,158 % → 1,130 % |
| El paso 2 de las 127 filas de LACT-01 que esperan «¿el oleoducto recibía?» → afuera | Guacamayo · 13 meses | por confirmar 19.051,5 → 3.872,7; afuera 0 → 15.178,9; **sigue en capacidad** (15.178,9): la causa no cambia |
| El yacimiento en MN-23 (`EP-MN23-260905-79`, 761,5 bbl; producción, con prueba) | Morichal · 13 meses | yacimiento 0 → 761,5 (desarrollo); PE no planeada 3,421 % → 3,410 % |

Y con períodos que cortan días: la última hora (2-oct 13:00 → 14:00, La Ceiba) da 81,918 bbl en el árbol y en el libro; del 10-sep 08:30 al 20-sep 17:45 (portafolio), 5.187,110 en los dos.

**Referencia.** `referencia/escenarios/correcciones/` (18 casos: `arbol-*`, `reparto-*`, `paradas-*`, `calidad-ceiba-2026-09.json`, `mensual-portafolio.json`, `base-ceiba-2026-10.json`, `serie-ceiba-2026-09.json`, `tuberia-ceiba-2026-09.json`).
