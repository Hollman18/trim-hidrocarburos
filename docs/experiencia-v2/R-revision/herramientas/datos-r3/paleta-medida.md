
### papel (claro)

| Token | Valor | --suelo | --superficie | --panel | --panel2 | --elevado | Mínimo | Exige | ¿Pasa? |
|---|---|---|---|---|---|---|---|---|---|
| --tinta | `#15171a` | 15,35 | 16,46 | 17,35 | 15,91 | 17,96 | **15,35** | 4,50:1 | sí |
| --tinta2 | `#464b52` | 7,51 | 8,06 | 8,50 | 7,79 | 8,79 | **7,51** | 4,50:1 | sí |
| --tinta3 | `#5b6168` | 5,35 | 5,74 | 6,05 | 5,55 | 6,26 | **5,35** | 4,50:1 | sí |
| --dato1 | `#3a3f45` | 9,08 | 9,74 | 10,27 | 9,41 | 10,62 | **9,08** | 3,00:1 | sí |
| --dato3 | `#7a8087` | 3,41 | 3,66 | 3,85 | 3,53 | 3,99 | **3,41** | 3,00:1 | sí |
| --pared | `#7a8087` | 3,41 | 3,66 | 3,85 | 3,53 | 3,99 | **3,41** | 3,00:1 | sí |
| --agua | `#7a8087` | 3,41 | 3,66 | 3,85 | 3,53 | 3,99 | **3,41** | 3,00:1 | sí |
| --flujo | `#7a8087` | 3,41 | 3,66 | 3,85 | 3,53 | 3,99 | **3,41** | 3,00:1 | sí |
| --rayado | `#464b52` | 7,51 | 8,06 | 8,50 | 7,79 | 8,79 | **7,51** | 3,00:1 | sí |
| --dato-1 | `#3a3f45` | 9,08 | 9,74 | 10,27 | 9,41 | 10,62 | **9,08** | 3,00:1 | sí |
| --dato-2 | `#535960` | 6,05 | 6,49 | 6,84 | 6,27 | 7,08 | **6,05** | 3,00:1 | sí |
| --dato-3 | `#6a7077` | 4,28 | 4,59 | 4,84 | 4,43 | 5,00 | **4,28** | 3,00:1 | sí |
| --dato-4 | `#7a8087` | 3,41 | 3,66 | 3,85 | 3,53 | 3,99 | **3,41** | 3,00:1 | sí |
| --dato-5 | `#a3a8ad` | 2,05 | 2,20 | 2,32 | 2,12 | 2,40 | **2,05** | 3,00:1 | no → solo si se usa como forma |
| --eq-trazo | `#5c6066` | 5,41 | 5,80 | 6,11 | 5,60 | 6,33 | **5,41** | 3,00:1 | sí |
| --eq-parado | `#5b6168` | 5,35 | 5,74 | 6,05 | 5,55 | 6,26 | **5,35** | 3,00:1 | sí |
| --interlock | `#8b1a1a` | 7,94 | 8,52 | 8,98 | 8,23 | 9,29 | **7,94** | 3,00:1 | sí |
| --p1 | `#bf4000` | 4,55 | 4,88 | 5,14 | 4,71 | 5,32 | **4,55** | 3,00:1 | sí |
| --p2 | `#f9a825` | 1,68 | 1,81 | 1,90 | 1,75 | 1,97 | **1,68** | 3,00:1 | no → trazo #1f2328: 13,50 |
| --p3 | `#f9a825` | 1,68 | 1,81 | 1,90 | 1,75 | 1,97 | **1,68** | 3,00:1 | no → trazo #1f2328: 13,50 |
| --sincom | `#8420a3` | 6,61 | 7,09 | 7,47 | 6,85 | 7,73 | **6,61** | 3,00:1 | sí |

**Pares propios (forma o texto contra lo que tiene al lado):**

| Par | Razón | Exige | ¿Pasa? |
|---|---|---|---|
| número «1» dentro del rombo (`#ffffff` / `#bf4000`) | 5,32 | 4,50:1 | sí |
| número «2»/«3» dentro del amarillo (`#1f2328` / `#f9a825`) | 8,02 | 4,50:1 | sí |
| equipo en marcha contra parado (`#ffffff` / `#5b6168`) | 6,26 | 3,00:1 | sí |
| contorno del parado (tinta) contra su relleno (`#15171a` / `#5b6168`) | 2,87 | 3,00:1 | **NO** |
| núcleo (flujo) contra el tubo vacío (`#7a8087` / `#e9e6df`) | 3,20 | 3,00:1 | sí |
| pared contra el tubo vacío (`#7a8087` / `#e9e6df`) | 3,20 | 3,00:1 | sí |
| rayado contra el tubo vacío (`#464b52` / `#e9e6df`) | 7,05 | 3,00:1 | sí |
| rayado contra el núcleo (`#464b52` / `#7a8087`) | 2,20 | 3,00:1 | **NO** |
| barra dato1 contra su pista (`#3a3f45` / `#e2dfd8`) | 7,98 | 3,00:1 | sí |
| barra dato3 («lo demás») contra el panel (`#7a8087` / `#fcfbf8`) | 3,85 | 3,00:1 | sí |
| alto impacto (dato1) contra lo demás (dato3), apiladas (`#3a3f45` / `#7a8087`) | 2,66 | 3,00:1 | **NO** |
| raya de la banda (tinta3) contra la banda (`#5b6168` / `#cdccca`) | 3,90 | 3,00:1 | sí |
| raya de la banda (tinta3) contra el panel (`#5b6168` / `#fcfbf8`) | 6,05 | 3,00:1 | sí |
| puntero (tinta) contra la banda (`#15171a` / `#cdccca`) | 11,19 | 3,00:1 | sí |
| puntero gris (tinta3, equipo parado) contra la pista (`#5b6168` / `#e2dfd8`) | 4,70 | 3,00:1 | sí |
| tinta sobre el tinte de alarma (p1-f) (`#15171a` / `#f5e2d4`) | 14,29 | 4,50:1 | sí |
| tinta sobre el tinte amarillo (p2-f) (`#15171a` / `#f6eed4`) | 15,48 | 4,50:1 | sí |
| tinta sobre el tinte morado (sincom-f) (`#15171a` / `#f0e3f4`) | 14,54 | 4,50:1 | sí |
| tinta sobre el tinte del interlock (`#15171a` / `#f0dada`) | 13,47 | 4,50:1 | sí |
| texto del botón principal (`#ffffff` / `#142d88`) | 11,93 | 4,50:1 | sí |

**Separación entre colores de estado** (OKLab ×100; normal · protan · deutan · tritan; ≥ 10 se separa a simple vista):

| Par | Normal | Protan | Deutan | Tritan | Peor | ¿≥ 10? |
|---|---|---|---|---|---|---|
| interlock · alarma | 13,81 | 13,44 | 13,96 | 12,78 | **12,78** | sí |
| interlock · atención/aviso | 39,50 | 42,14 | 38,46 | 34,79 | **34,79** | sí |
| interlock · sin comunicación | 21,24 | 22,77 | 21,02 | 11,13 | **11,13** | sí |
| alarma · atención/aviso | 26,29 | 28,82 | 24,57 | 23,94 | **23,94** | sí |
| alarma · sin comunicación | 26,20 | 25,15 | 26,74 | 16,49 | **16,49** | sí |
| atención/aviso · sin comunicación | 44,72 | 43,48 | 44,92 | 32,12 | **32,12** | sí |
| interlock · gris normal (tinta3) | 17,45 | 16,71 | 10,91 | 19,61 | **10,91** | sí |
| alarma · gris normal (tinta3) | 19,30 | 11,21 | 14,94 | 23,66 | **11,21** | sí |
| atención/aviso · gris normal (tinta3) | 34,86 | 30,18 | 35,88 | 32,19 | **30,18** | sí |
| sin comunicación · gris normal (tinta3) | 19,75 | 15,71 | 12,51 | 11,62 | **11,62** | sí |
| interlock · índigo de marca | 27,16 | 19,26 | 23,86 | 24,85 | **19,26** | sí |
| alarma · índigo de marca | 36,11 | 24,96 | 33,88 | 33,70 | **24,96** | sí |
| atención/aviso · índigo de marca | 54,38 | 46,95 | 54,70 | 45,79 | **45,79** | sí |
| sin comunicación · índigo de marca | 19,85 | 6,24 | 11,02 | 18,32 | **6,24** | no (informativo) |
| sin comunicación · foco / primario | 19,85 | 6,24 | 11,02 | 18,32 | **6,24** | no (informativo) |

### noche (oscuro)

| Token | Valor | --suelo | --superficie | --panel | --panel2 | --elevado | Mínimo | Exige | ¿Pasa? |
|---|---|---|---|---|---|---|---|---|---|
| --tinta | `#f3f4f5` | 15,36 | 14,31 | 13,11 | 13,64 | 11,70 | **11,70** | 4,50:1 | sí |
| --tinta2 | `#c8cdd3` | 10,57 | 9,85 | 9,03 | 9,39 | 8,06 | **8,06** | 4,50:1 | sí |
| --tinta3 | `#a3aab2` | 7,21 | 6,72 | 6,15 | 6,40 | 5,49 | **5,49** | 4,50:1 | sí |
| --dato1 | `#d9dde1` | 12,39 | 11,54 | 10,57 | 11,00 | 9,44 | **9,44** | 3,00:1 | sí |
| --dato3 | `#878e96` | 5,11 | 4,76 | 4,36 | 4,53 | 3,89 | **3,89** | 3,00:1 | sí |
| --pared | `#878e96` | 5,11 | 4,76 | 4,36 | 4,53 | 3,89 | **3,89** | 3,00:1 | sí |
| --agua | `#878e96` | 5,11 | 4,76 | 4,36 | 4,53 | 3,89 | **3,89** | 3,00:1 | sí |
| --flujo | `#9aa1a8` | 6,47 | 6,03 | 5,53 | 5,75 | 4,93 | **4,93** | 3,00:1 | sí |
| --rayado | `#c8cdd3` | 10,57 | 9,85 | 9,03 | 9,39 | 8,06 | **8,06** | 3,00:1 | sí |
| --dato-1 | `#d9dde1` | 12,39 | 11,54 | 10,57 | 11,00 | 9,44 | **9,44** | 3,00:1 | sí |
| --dato-2 | `#c2c7cd` | 9,94 | 9,26 | 8,49 | 8,83 | 7,58 | **7,58** | 3,00:1 | sí |
| --dato-3 | `#a3aab2` | 7,21 | 6,72 | 6,15 | 6,40 | 5,49 | **5,49** | 3,00:1 | sí |
| --dato-4 | `#878e96` | 5,11 | 4,76 | 4,36 | 4,53 | 3,89 | **3,89** | 3,00:1 | sí |
| --dato-5 | `#6f767e` | 3,68 | 3,43 | 3,14 | 3,27 | 2,80 | **2,80** | 3,00:1 | no → solo si se usa como forma |
| --eq-trazo | `#aaadb0` | 7,50 | 6,99 | 6,40 | 6,66 | 5,72 | **5,72** | 3,00:1 | sí |
| --eq-parado | `#0d0f11` | 1,14 | 1,22 | 1,33 | 1,28 | 1,49 | **1,14** | 3,00:1 | no → lo cubre el contorno de 2 px en tinta |
| --interlock | `#ff8080` | 6,97 | 6,49 | 5,95 | 6,19 | 5,31 | **5,31** | 3,00:1 | sí |
| --p1 | `#ffb347` | 9,50 | 8,85 | 8,11 | 8,43 | 7,24 | **7,24** | 3,00:1 | sí |
| --p2 | `#fff176` | 14,57 | 13,58 | 12,44 | 12,94 | 11,10 | **11,10** | 3,00:1 | sí |
| --p3 | `#fff176` | 14,57 | 13,58 | 12,44 | 12,94 | 11,10 | **11,10** | 3,00:1 | sí |
| --sincom | `#c99cff` | 7,80 | 7,27 | 6,66 | 6,93 | 5,94 | **5,94** | 3,00:1 | sí |

**Pares propios (forma o texto contra lo que tiene al lado):**

| Par | Razón | Exige | ¿Pasa? |
|---|---|---|---|
| número «1» dentro del rombo (`#1f2328` / `#ffb347`) | 8,87 | 4,50:1 | sí |
| número «2»/«3» dentro del amarillo (`#1f2328` / `#fff176`) | 13,61 | 4,50:1 | sí |
| equipo en marcha contra parado (`#d9dde1` / `#0d0f11`) | 14,06 | 3,00:1 | sí |
| contorno del parado (tinta) contra su relleno (`#f3f4f5` / `#0d0f11`) | 17,44 | 3,00:1 | sí |
| núcleo (flujo) contra el tubo vacío (`#9aa1a8` / `#2d3237`) | 4,95 | 3,00:1 | sí |
| pared contra el tubo vacío (`#878e96` / `#2d3237`) | 3,91 | 3,00:1 | sí |
| rayado contra el tubo vacío (`#c8cdd3` / `#2d3237`) | 8,09 | 3,00:1 | sí |
| rayado contra el núcleo (`#c8cdd3` / `#9aa1a8`) | 1,63 | 3,00:1 | **NO** |
| barra dato1 contra su pista (`#d9dde1` / `#33383e`) | 8,66 | 3,00:1 | sí |
| barra dato3 («lo demás») contra el panel (`#878e96` / `#262a2f`) | 4,36 | 3,00:1 | sí |
| alto impacto (dato1) contra lo demás (dato3), apiladas (`#d9dde1` / `#878e96`) | 2,43 | 3,00:1 | **NO** |
| raya de la banda (tinta3) contra la banda (`#a3aab2` / `#5d6165`) | 2,66 | 3,00:1 | **NO** |
| raya de la banda (tinta3) contra el panel (`#a3aab2` / `#262a2f`) | 6,15 | 3,00:1 | sí |
| puntero (tinta) contra la banda (`#f3f4f5` / `#5d6165`) | 5,67 | 3,00:1 | sí |
| puntero gris (tinta3, equipo parado) contra la pista (`#a3aab2` / `#33383e`) | 5,04 | 3,00:1 | sí |
| tinta sobre el tinte de alarma (p1-f) (`#f3f4f5` / `#473425`) | 10,68 | 4,50:1 | sí |
| tinta sobre el tinte amarillo (p2-f) (`#f3f4f5` / `#433d25`) | 9,87 | 4,50:1 | sí |
| tinta sobre el tinte morado (sincom-f) (`#f3f4f5` / `#3b3149`) | 11,08 | 4,50:1 | sí |
| tinta sobre el tinte del interlock (`#f3f4f5` / `#4a2a2a`) | 11,52 | 4,50:1 | sí |
| texto del botón principal (`#15171a` / `#f3f4f5`) | 16,31 | 4,50:1 | sí |

**Separación entre colores de estado** (OKLab ×100; normal · protan · deutan · tritan; ≥ 10 se separa a simple vista):

| Par | Normal | Protan | Deutan | Tritan | Peor | ¿≥ 10? |
|---|---|---|---|---|---|---|
| interlock · alarma | 15,07 | 15,10 | 10,84 | 10,46 | **10,46** | sí |
| interlock · atención/aviso | 28,02 | 28,23 | 20,32 | 26,17 | **20,32** | sí |
| interlock · sin comunicación | 18,93 | 17,83 | 18,49 | 16,33 | **16,33** | sí |
| alarma · atención/aviso | 14,69 | 15,31 | 11,41 | 15,80 | **11,41** | sí |
| alarma · sin comunicación | 26,80 | 26,54 | 26,91 | 10,43 | **10,43** | sí |
| atención/aviso · sin comunicación | 33,30 | 32,20 | 31,21 | 17,40 | **17,40** | sí |
| interlock · gris normal (tinta3) | 16,46 | 8,02 | 8,60 | 19,17 | **8,02** | no (informativo) |
| alarma · gris normal (tinta3) | 18,39 | 15,94 | 18,74 | 14,40 | **14,40** | sí |
| atención/aviso · gris normal (tinta3) | 26,24 | 25,04 | 26,17 | 20,65 | **20,65** | sí |
| sin comunicación · gris normal (tinta3) | 14,12 | 11,39 | 10,65 | 5,80 | **5,80** | no (informativo) |
| interlock · índigo de marca | 47,59 | 34,34 | 46,13 | 42,92 | **34,34** | sí |
| alarma · índigo de marca | 56,12 | 48,84 | 56,49 | 47,25 | **47,25** | sí |
| atención/aviso · índigo de marca | 66,75 | 62,26 | 66,14 | 58,11 | **58,11** | sí |
| sin comunicación · índigo de marca | 43,58 | 37,89 | 41,53 | 41,39 | **37,89** | sí |
| sin comunicación · foco / primario | 24,23 | 24,50 | 23,38 | 20,25 | **20,25** | sí |

### Las píldoras blancas (`.blanca`, en los dos temas)

| Estado | Valor | Contra `#ffffff` | ¿≥ 3:1? |
|---|---|---|---|
| --interlock | `#8b1a1a` | 9,29 | sí |
| --p1 | `#bf4000` | 5,32 | sí |
| --sincom | `#8420a3` | 7,73 | sí |
| --p2 (con trazo #1f2328) | `#f9a825` | 1,97 → trazo 15,80 | sí, por el trazo |

### Diferencias entre `src/index.css` y X2 §4.4 / X5 §3.2 (mismo token, otro valor)

| Tema | Token | X2 §4.4 | index.css |
|---|---|---|---|
| claro | --eq-marcha | `#fafaf9` | `#ffffff` |
| claro | --eq-parado | `#686c71` | `#5b6168` |
| oscuro | --eq-marcha | `#d9dcdf` | `#d9dde1` |
| oscuro | --eq-parado | `#1f2225` | `#0d0f11` |

Fallas que cuentan: 6
