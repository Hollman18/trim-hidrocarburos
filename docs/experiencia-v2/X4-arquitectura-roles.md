# X4 · Arquitectura por rol: el inicio, las puertas, «La planta viva» y lo técnico tipo SCADA

**25-oct-2026 · X4, diseñador de producto senior (arquitectura de información y recorridos).** Sigue el `BRIEF.md` de esta carpeta. No toca código del producto. Las capturas, las medidas y los guiones están en el scratchpad del equipo:

- `SCR = /private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/ux/X4`
- `SCR/capturas/`: **257 capturas** del demo construido (`http://127.0.0.1:4173`). Son las 52 pantallas de los 9 roles del producto, a 1280 y a 390 px, cada una en lo que se ve sin desplazarse (`-fold`) y en la página completa (`-full`). Además, la introducción de cada rol (`intro-*`) y el cajón de navegación del teléfono (`cajon-*`).
- `SCR/metricas.json` (alto, paneles, controles, cifras, ⓘ y palabras de cada pantalla) · `SCR/respuesta.json` (a qué distancia está la respuesta de cada rol) · `SCR/textos.json` (el texto visible de cada pantalla) · `SCR/entrada.json` (la introducción y el cajón).
- Guiones: `SCR/scripts/auditar.mjs`, `entrada.mjs`, `respuesta.mjs` y `repetidos.mjs` (Playwright, Chromium, solo lectura).

**Cómo leer las cifras.**
- **[demo]**: leída en la pantalla del demo, con su reloj (2-oct-2026, 14:00).
- **[medido X4]**: medida por mis guiones (alto en pantallas, cifras, distancia hasta la respuesta).
- **(ejemplo)**: ilustrativa. No es un dato.

Una «pantalla» de alto es el área de contenido visible: 751 px a 1280 × 800 y 781 px a 390 × 844.

El demo de 4173 se apagó cuando ya estaban las capturas. El cierre proyectado de La Ceiba (§4.3) se leyó en el servidor de desarrollo (`http://localhost:5173`), que sirve los mismos datos del demo: «2.133 bbl · retorno» y «1.046 barriles diferidos», iguales a las capturas.

Leí, además del brief: `src/entities/roles.ts`, `src/app/pantallas.tsx`, `src/app/grupos.ts`, `src/app/url.ts`, `src/widgets/Riel.tsx`, `Cabecera.tsx`, `Onboarding.tsx` y `Subpantallas.tsx`, `src/shared/config/producto.ts`, `e2e/auditoria/rutas.ts`, `PLAN-MAESTRO.md`, `U1-experiencia.md` §1, `U2-choke-experiencia.md` §0–§7, `docs/backend/06d-choke-pantallas/03-gerente.md`, `06b-operacion/06-telefono.md`, `11-ciclo-de-valor.md` §11.1–§11.2 y `01-propuesta-de-valor.md` §1.6, la transcripción de la reunión del 19-oct con Edinson y Adair, y los `X1-identidad-referentes.md` y `X2-norma-hmi.md` que se escribieron en paralelo en esta carpeta.

## Índice

1. [Auditoría de lo que existe](#1-auditoría-de-lo-que-existe)
2. [La pregunta y la acción de cada rol](#2-la-pregunta-y-la-acción-de-cada-rol)
3. [La arquitectura nueva](#3-la-arquitectura-nueva)
4. [«La planta viva» para el gerente](#4-la-planta-viva-para-el-gerente)
5. [Lo técnico, tipo SCADA](#5-lo-técnico-tipo-scada)
6. [Contenido y primera entrada](#6-contenido-y-primera-entrada)
7. [Pruebas con usuarios reales](#7-pruebas-con-usuarios-reales)
8. [Cómo se prueba en el código](#8-cómo-se-prueba-en-el-código)
9. [Desacuerdos](#9-desacuerdos)
10. [Fuentes](#10-fuentes)
11. [Resumen](#11-resumen)

---

## 1. Auditoría de lo que existe

### 1.1 Cómo se midió

- **Recorrido.** Con Playwright (Chromium) sobre el demo construido, con la introducción marcada como vista (`trim.intro.<rol>=1`), abrí cada pantalla de cada rol visible en el primer producto (`ROLES_VISIBLES`: ger, prod, sup, oper, jefe, conf, tec, reg y adm) a 1280 × 800 y a 390 × 844.
  - El campo es el de `e2e/auditoria/rutas.ts`: La Ceiba, salvo el gerente (todos los campos) y confiabilidad (Morichal Norte).
  - `plan` y `cont` están apagados en el MVP (`producto.ts`: `ROLES_V2`). Se tratan por su definición en `roles.ts`, sin capturas.
- **Qué se cuenta** [medido X4]:
  - el **alto** de la pantalla (alto del contenido ÷ alto visible);
  - los **paneles** (títulos en mayúsculas);
  - los **controles** visibles (botones, enlaces, listas, cajas);
  - las **cifras** (números en el texto visible);
  - las **ⓘ** y las **palabras**.
- **La distancia a la respuesta.** Para cada rol busqué el texto que contesta su pregunta principal (PLAN-MAESTRO §4) y medí cuánto hay que bajar para verlo (`respuesta.mjs`).
- **Los toques** se cuentan por diseño. En el teléfono, cambiar de pantalla cuesta dos: ☰ y la entrada del cajón (no hay barra de pestañas).
- **Lo repetido**: el texto visible de las 52 pantallas, con un conteo de bloques y frases (`repetidos.mjs`).

### 1.2 El cuadro por rol

Las cifras son [medido X4], salvo que se diga otra cosa. En «Alto del inicio», la primera cifra es a 1280 px y la segunda a 390 px.

| Rol | Pantallas (entradas en el menú) | Inicio | Alto del inicio | Cifras en el inicio | ¿El inicio responde su pregunta? | Toques hasta la respuesta, en el teléfono |
|---|---|---|---|---|---|---|
| **ger** · gerente | 5 (5) | Resumen | 2,4 / 3,7 | 102 | **A medias.** «Qué campo y qué equipos» (POR CAMPO) está a 1,6 / 2,4 pantallas; «¿está bajando?» (la tendencia), a 1,1 / 1,5 | 0, pero hay que bajar 2,4 pantallas. Lo no planeado de cada campo pide 1 toque más («Ver más de…») |
| **prod** · producción | 9 (7) | Producción | 4,2 / 4,4 | 156 | **A medias.** «Qué limita» sí: la tubería está a 0,2 / 0,4. «Dónde rinde evitar la próxima parada» **no está en ninguna de sus pantallas**: «Si falla hoy» vive en Riesgo y en Bombas, que producción no tiene | — (no la encuentra) |
| **sup** · supervisor | 5 (3) | Bombas | 1,0 / 1,2 | 45 | **No.** Lo de su turno está en Turno | 3: ☰, Turno y «Confirmar las 2», que está a 1 pantalla de altura |
| **oper** · operador | 4 (3) | Bombas | 1,0 / 1,2 | 45 | **No.** Lo que tiene que contestar está en Identificar | 4: ☰, Identificar, la parte y «Registrar respuesta» (a 0,8 pantallas) |
| **jefe** · mantenimiento | 8 (7) | Mantenimiento | 1,3 / 2,0 | 61 | **A medias.** «¿Anticipo?» es «del diferido, programado 0,0 %», sin decir si eso es bueno o malo. «¿Cuánto es espera?» está en Confiabilidad | 2 (☰ y Confiabilidad), más 1,1 pantallas de desplazamiento |
| **conf** · confiabilidad | 11 (9) | Bombas (en el menú, «Equipos») | 1,4 / 2,3 | 86 | **A medias.** «Qué atacar primero» está en Riesgo («Si falla hoy»). «Cuánto le creo» está en Confiabilidad | 2 por cada una |
| **tec** · técnico | 4 (3) | Mi trabajo | 1,0 / 1,3 | 45 | **Sí.** Es el mejor inicio del producto | 0 para ver. Para registrar, 3: «Registrar qué encontré» lleva a Identificar, otra pantalla de 3,4 pantallas de alto |
| **reg** · regulatorio | 1 (1) | Regulatorio | 1,4 / 2,6 | 100 | **Sí.** «No se puede publicar todavía» va arriba de todo (0,04 pantallas) | 0. Pero no dice qué falta, quién lo debe ni para cuándo |
| **adm** · administrador | 5 (4) | Configuración | 1,8 / 2,6 | 65 | **No.** No hay un estado de la configuración: abre en formularios (68 controles) | — (firmar está a 1,2 / 1,7 pantallas) |
| **plan**, **cont** | 2 y 1 (v2) | Superficie y Evidencia | — | — | Apagados en el MVP | — |

**El conjunto** [medido X4]:
- Son 52 pantallas de rol, sin contar el perfil.
- **Densidad:** en el escritorio, una pantalla trae una mediana de **81 cifras**. El máximo es 238, en Confiabilidad de conf.
- **Alto:** 17 de las 52 miden más de 2 pantallas en el escritorio. En el teléfono son 27, y 14 de ellas pasan de 3.
- **La más larga:** Identificar mide **7,2 pantallas** en el teléfono para el supervisor y para el jefe, y 7,3 para confiabilidad. La de confiabilidad trae además 37 ⓘ y 1.200 palabras.

### 1.3 Lo que falla en todos los roles

1. **Se navega por módulos, no por lo que la persona tiene que hacer.**
   - El registro tiene 21 pantallas (`pantallas.tsx`). Cada rol ve de 3 a 9 entradas en el menú: Diferidos, Riesgo, Confiabilidad, Superficie, Identificar, Turno…
   - Son los nombres de las piezas del motor, no de las preguntas de la gente.
   - Nubank cuenta que, al rediseñar su aplicación, evitó reflejar su estructura interna en la experiencia del cliente (Neumann, 2018). TRIM hoy la refleja.
2. **Un mismo lugar tiene cuatro nombres.**
   - En el menú es «Pozos y equipos» (prod, sup) o «Equipos» (oper, jefe, conf, tec). El título es «Bombas de la línea» y la pestaña, «Bombas».
   - Aparte está «Superficie» («Equipos de superficie»), que también lista bombas: el jefe y confiabilidad tienen en el menú **«Equipos» y «Superficie»**, uno debajo del otro.
   - X1 §3.4.6 lo encontró por su lado.
3. **Un mismo rótulo da dos cifras.** En La Ceiba, a la misma hora [demo]:

   | Rótulo | Una pantalla dice | Otra dice |
   |---|---|---|
   | «Perdiéndose ahora» | 1.665 bbl/d (Bombas: solo bombas) | 1.966 bbl/d (Turno, Pozos, Planta y Producción: todas las causas) |
   | Lo que pueden dar los pozos | «Potencial ahora 11.360 bbl/d» (Pozos y la cabecera de Producción) | «◄ LIMITA 11.857 bbl/d, con las pruebas de los pozos» (la tubería, en la **misma** pantalla Producción) |
   | «Antes» | «1 Antes · 0 bbl» (el ciclo) | «1 · Antes · 1 equipo · hasta 9.394 bbl/d en juego» (la franja de abajo, en la **misma** pantalla Riesgo del jefe) |
   | «Durante» (todos los campos) | «2 Durante · 2.102 bbl · 2.349 bbl/d» | «2 · Durante · 2.650 bbl/d», tres renglones más abajo, en Riesgo del gerente |
   | Lo que está en juego (todos los campos) | «45.233 bbl» (retorno, simulado) | «≈ 45.262 bbl de exposición» (estimado), en la misma pantalla |
   | Equipos en riesgo (todos los campos) | «En riesgo · alto impacto · 6 equipos» (Resumen) | «1 · Antes · 8 equipos» (Riesgo) |

   - Cada pareja tiene su explicación en el código: otro alcance, otro factor u otra regla. **La pantalla no la dice.**
   - Para alguien nuevo, son dos verdades sobre lo mismo, y deja de creerle a las dos.
4. **La cifra simulada manda.**
   - El bloque del ciclo (retorno de Antes, Durante y Después, simulado) está en **7 pantallas**: Resumen y Riesgo del gerente, Turno del supervisor y del operador, Mantenimiento y Riesgo del jefe, y Riesgo de confiabilidad.
   - En las siete es lo primero de la pantalla. El gerente abre en «45.233 bbl · retorno» [demo]. El operador abre Turno en «2.133 bbl · 102 mil USD»: un operador no decide nada con dólares.
   - «Ver planes de acción» está en 7 pantallas: las cinco versiones de Identificar, el Resumen y Mantenimiento.
   - Los dígitos 1·2·3 del ciclo son los mismos de las prioridades (rombo 1, triángulo 2, cuadrado 3), a centímetros de distancia (X1 §3.4.2).
5. **Lo que hay que hacer está regado en al menos ocho lugares:**
   - contestar y confirmar paradas: Identificar y Turno;
   - registrar qué se encontró: Mi trabajo, que manda a Identificar;
   - mandar a intervenir: Mantenimiento y Riesgo;
   - aceptar planes: en 7 pantallas;
   - cargar la asignación oficial: Producción;
   - firmar la versión: Configuración;
   - resolver los tags sin equipo: Conectores.

   Nadie tiene **un** lugar con «lo que me toca».
6. **El período manda también donde no aplica.**
   - El selector de período (mes en curso, mes cerrado, trimestre, año, 12 meses o un rango) está en la cabecera de **todas** las pantallas. El operador ve «Demo · Octubre, en curso» encima de sus bombas.
   - En lo que pasa ahora, el período no significa nada.
   - Y el mes en curso va en su día 2: la pantalla Producción del gerente es una página entera para una línea de dos puntos [demo].
7. **Demasiado en cada pantalla.**
   - Mediana de 81 cifras por pantalla.
   - Párrafos de cálculo en la pantalla (X1 §3.3.2): Agua trae cinco renglones seguidos de cuentas.
   - Identificar dice «Conteste aquí, una pregunta a la vez», y muestra abiertas **las 4 paradas a la vez**, cada una con su señal, sus opciones, su caja de texto, su botón y su historia de WhatsApp: 3,4 pantallas en el teléfono del operador.
8. **El teléfono no tiene puertas.**
   - No hay barra de pestañas: todo va detrás de ☰. Cada cambio de pantalla cuesta 2 toques.
   - Para el supervisor y el operador, que viven en el teléfono (6B.6), su respuesta queda siempre a 2 toques y un desplazamiento.
9. **La introducción presenta pantallas; no enseña a mirar.**
   - Es un modal de dos pasos. El primero es el «foco» del rol en un párrafo, con las fichas 1·2·3. El segundo, la lista de pantallas con su «para qué».
   - Mezcla el tú y el usted: «Explicas…», «cierras…», «Abres…» frente a «Usted fija…».
   - Trae palabras de módulo: «causa → SAP/ISO», «custodia completa», «factor de asignación en banda», «palancas», «WhatsApp con ventana».
10. **El gerente no ve su proceso.**
    - La regla de U2 §3.2 es «el gerente no ve la tubería». Su Resumen es una pila de cifras y barras; no hay un dibujo de su planta.
    - Es justo lo que el dueño pide ahora: «su planta, el proceso, el pipeline de dónde se están perdiendo».

### 1.4 Lo que ya sirve y se conserva

| Pieza | Por qué sirve | Dónde queda (§3.7) |
|---|---|---|
| **Mi trabajo** (tec) | Responde su pregunta sin un toque: 1 pantalla con lo parado, lo que hay que identificar, lo que avisa y sus órdenes de SAP | Es el modelo de **Hoy** |
| **Las placas de las bombas** (conf, sup) | Indicador analógico con la banda normal, partes con «cruza en 43 h» y «si se para: 10,1 h de colchón». Es lo más ISA-101 del producto | Nivel 3, el equipo (§5) |
| **La tubería del campo** (prod) | Yacimiento → pozos → planta → afuera, con «◄ limita» en gris y lo que se trabó en cada tramo, sumando exacto el libro | La base técnica de **La planta viva** (§4) |
| **La tubería del agua** (prod, conf, adm) | Ya cuenta el ciclo sobre un flujo: HOY, LO QUE PASÓ y SI PARA OTRA BOMBA son Durante, Después y Antes | Nivel 2, el tren de agua, y el patrón de §4.4 |
| **Las preguntas del operador** | Botones grandes, la historia del equipo como pista, «No arrancar» arriba (X1 §3.2.4) | **Hoy** del operador, de a una |
| **El encabezado de Regulatorio** | «No se puede publicar todavía» en la primera línea | El inicio de reg (§3.4) |
| **Las palabras de campo** | «¿Dónde se trabó?», «Si falla hoy», «colchón», «limita» (U2 §1). «Perdiéndose ahora» cambia de nombre (§3.1, regla 4) | Las reglas de §6 |
| **El esquema de planta** | Trenes de gas, crudo y agua; símbolos; «9 de 13 equipos con datos» | Nivel 2, el mapa de la planta |
| **La ficha ejecutiva del equipo** (ger) | «Qué se está haciendo», «Le ha costado», «llega el 9 de oct», sin detalle técnico | Lo último que abre el gerente (§4.5) |

### 1.5 Rol por rol: dónde se enreda alguien nuevo y qué sobra

**Gerente (ger).** Capturas: `ger-resumen-1280-full.png`, `ger-resumen-390-fold.png`, `ger-riesgo-1280-full.png` y `ger-produccion-1280-fold.png`.
- *Se enreda:*
  - lo primero que lee es «45.233 bbl · retorno», una cifra simulada, y debajo «1 Antes 42.017 bbl»: no sabe antes de qué;
  - después vienen otras **seis** cifras grandes: 2.377 diferidos, 114 mil USD, 40.514, 1.501, 1.222.131 y 80.334;
  - lo suyo (qué campo, qué equipo) llega en la segunda pantalla del escritorio y en la tercera del teléfono.
- *Repetido:*
  - el ciclo en Resumen y en Riesgo;
  - «Durante · crudo en vivo» (Resumen) y «2 · Durante» (Riesgo);
  - POR EQUIPO y MES A MES, en Resumen y en Diferidos.
- *Sobra:*
  - la pantalla Producción, una gráfica que ya está como barra en Resumen;
  - en Riesgo, dos cifras casi iguales (45.233 y 45.262) que significan cosas distintas.

**Producción (prod).** Capturas: `prod-produccion-1280-full.png` y `prod-planta-1280-full.png`.
- *Se enreda:*
  - su inicio son **20 paneles** en 4,2 pantallas;
  - la cabecera dice «potencial 11.360 bbl/d» y la tubería, justo debajo, «LIMITA 11.857».
- *Repetido:*
  - la tubería del campo, idéntica en Producción y en Planta;
  - MEDICIÓN OFICIAL y FACTOR DE ASIGNACIÓN, en Producción y en Diferidos;
  - «lo perdido por tramo, mes a mes» (Producción) frente a «por dónde se trabó», mes a mes (Diferidos).
- *Falta:* «Si falla hoy», que es la segunda mitad de su pregunta.

**Supervisor (sup).** Capturas: `sup-bombas-390-full.png` y `sup-turno-390-full.png`.
- *Se enreda:*
  - abre en Bombas, no en su turno;
  - Turno empieza con el ciclo (2.133 bbl, 102 mil USD) y cuatro cifras grandes más: 983, 1.966, 3 y 723;
  - la acción que importa, «Confirmar las 2», queda a una pantalla de altura en el teléfono.
- *Repetido:* la lista de paradas por identificar está en Turno, en Identificar y en el detalle de la bomba.
- *Sobra:* el ciclo en Turno y «Ver planes de acción» en Identificar.

**Operador (oper).** Capturas: `oper-causa-390-full.png` y `oper-bombas-390-full.png`.
- *Se enreda:*
  - lo suyo está a 2 toques;
  - una vez ahí, ve las 4 paradas abiertas a la vez;
  - su Turno le muestra el ciclo y dólares.
- *Sobra:*
  - «Ver planes de acción» y el período en la cabecera;
  - el historial de WhatsApp debajo de cada pregunta: es su propio chat, ya lo tiene en el teléfono.

**Jefe de mantenimiento (jefe).** Capturas: `jefe-mantenimiento-1280-full.png` y `jefe-equipo-1280-fold.png`.
- *Se enreda:*
  - tiene 7 entradas en el menú, dos de ellas para lo mismo (Equipos y Superficie);
  - «1 Antes · 0 bbl» convive con «1 · Antes · 1 equipo · hasta 9.394 bbl/d» en Riesgo;
  - «del diferido, programado 0,0 %» no dice si es malo ni cuál es la meta.
- *Repetido:*
  - DÓNDE BAJARLO, en Mantenimiento y en Diferidos;
  - lo que hay que intervenir, en Mantenimiento («1 · Intervenir») y en Riesgo.

**Confiabilidad (conf).** Capturas: `conf-bombas-1280-full.png` y `conf-confiabilidad-1280-full.png`.
- *Se enreda:*
  - es el rol con más puertas: 11 pantallas en 9 entradas;
  - Confiabilidad trae 238 cifras en 16 paneles.
- *Lo bueno:* su inicio (las placas de las bombas) es lo más cercano a un SCADA de alto desempeño.
- *Repetido:* «Si falla hoy» en Riesgo y, por bomba, en Bombas.

**Técnico (tec).** Captura: `tec-trabajo-390-full.png`.
- *Se enreda:*
  - P-201B sale en «Parados» y en «Paradas por identificar»; K-101, en «Avisando» y en «Órdenes en SAP»;
  - la lista va ordenada por de dónde viene, no por qué hacer primero;
  - registrar lo manda a otra pantalla de 3,4 pantallas de alto.

**Regulatorio (reg).** Captura: `reg-regulatorio-1280-full.png`.
- *Se enreda:* el encabezado dice que no se puede publicar, pero lo que falta («Falta quién · 355 bbl», con cinco niveles de «Falta…») hay que deducirlo del árbol.
- *Sobra en la pantalla:* calibraciones, PRODML y producción del período. Son para el papel o para «ver más».

**Administrador (adm).** Captura: `adm-configuracion-1280-full.png`.
- *Se enreda:* no hay un «¿qué me falta?». Abre en el perfil del campo y en los tanques.
- La firma, que es el fin de todo, está debajo de los formularios.
- Hay cuatro pestañas y otras tres pantallas: Conectores, Planta y Agua.

---

## 2. La pregunta y la acción de cada rol

La base es PLAN-MAESTRO §4 y U1 §1.1. Afiné cada pregunta para que tenga **una** respuesta en pantalla y una **acción** que se haga desde ahí. La columna «Cifra que manda» es la única cifra grande de su inicio.

| Rol | Mundo | La pregunta (una) | La acción principal | Cifra que manda en su inicio | Qué cambié frente a PLAN-MAESTRO §4 |
|---|---|---|---|---|---|
| **ger** · Gerente de activo | gerencial | «¿Dónde se están quedando mis barriles, por qué equipos, y está bajando?» | Mandar a actuar: abrir el equipo, compartir el informe, firmar las metas | Barriles que se dejan de producir **ahora** (bbl/d), o **en el período** (bbl) contra su máximo firmado | «Dónde» va primero: es lo que pidió el dueño («de dónde se están perdiendo») |
| **reg** · Cumplimiento regulatorio | gerencial | «¿El reporte pasa? Si no, ¿qué falta, quién lo debe y cuánto tiempo queda?» | Pedir lo que falta; exportar | Paradas que faltan para poder publicar, y la hora límite | Se agrega «qué falta y quién»: hoy hay que deducirlo del árbol |
| **cont** · Abastecimiento (v2) | gerencial | «¿Esta parada le toca al contratista, a un tercero o a nosotros, y con qué prueba?» | Exportar el expediente | Paradas con responsable externo en el período | Igual |
| **prod** · Ingeniera de producción | técnico | «¿Qué limita hoy al campo y dónde rinde más evitar la próxima parada?» | Confirmar dónde se trabó cada parada (en lote); cargar la asignación oficial del mes | Lo que pasa hoy contra lo que podría pasar (bbl/d), y el tramo que limita | Igual. Ahora sí se responde la segunda mitad: «Si falla hoy» entra a su Planta (§5) |
| **sup** · Supervisor | técnico | «¿Qué paró en mi turno, por qué, y qué me falta confirmar antes de entregar?» | Confirmar en lote, escalar lo que nadie contestó y cerrar en el orden que menos cuesta | Lo que se deja de producir ahora (bbl/d) y cuántas paradas faltan por confirmar | Se agrega «antes de entregar»: el turno tiene una hora de cierre |
| **oper** · Operador | técnico | «¿Qué me falta contestar ahora?» | Contestar, con un toque | Cuántas preguntas tiene (de a una) | Igual |
| **jefe** · Jefe de mantenimiento | técnico | «¿Estoy anticipando las fallas o corriendo detrás de ellas, y cuánto del tiempo fuera es espera?» | Mandar a intervenir lo que avisa: aviso u orden; aceptar los planes | Del tiempo fuera, cuánto es espera: en La Ceiba, **7,7 de 8,1 días** [demo, Confiabilidad] | Igual. Su cifra ya existe, pero hoy está en otra pantalla |
| **conf** · Confiabilidad | técnico | «¿Qué equipo y qué modo de falla ataco primero, y cuánto le creo al número?» | Escoger dónde va el próximo instrumento o la próxima ruta; corregir una clasificación | El primer equipo de «Si falla hoy», y si TRIM lo vigila | Igual |
| **plan** · Planeadora (v2) | técnico | «¿Qué programo esta semana y qué repuesto pido ya?» | Pedir el repuesto; mover un trabajo | Repuestos que no alcanzan antes de la falla anunciada | Igual |
| **tec** · Técnico | técnico | «¿Qué me toca hoy y qué me falta cerrar?» | Registrar qué encontró; cerrar la orden | Cuántas cosas le tocan hoy | Igual |
| **adm** · Administrador | técnico | «¿Está completo y bien armado cada campo, y qué falta para firmar?» | Completar y firmar la versión | Pasos listos de cada campo (por ejemplo, 5 de 7) | Se cambia «¿está bien configurado?» por una lista con fin: firmar |

**Dos mundos, como pidió el dueño:**
- **Gerencial** (ger, reg y cont): ven el proceso en barriles, con palabras de negocio, sin variables de equipo. Su vista central es **La planta viva** (§4).
- **Técnico** (prod, sup, oper, jefe, conf, plan, tec y adm): ven el mismo proceso con sus variables, en la jerarquía de cuatro niveles de ISA-101 (§5).
- **La planta viva es el nivel 1 de los dos.** El gerente se queda en ese nivel y abre fichas en lenguaje de negocio. El técnico baja hasta el diagnóstico.
- Así una persona con dos roles reconoce el mismo dibujo en los dos.

---

## 3. La arquitectura nueva

### 3.1 Ocho reglas

1. **Una pregunta, un inicio.** El inicio de cada rol responde su pregunta de §2 **sin desplazarse**, en 10 segundos, con:
   - una frase de una línea, como mucho 20 palabras;
   - una cifra grande;
   - el dibujo o la lista que la explica.

   Hoy solo lo cumplen tec y reg (§1.2).
2. **Pocas puertas, y las mismas en el teléfono y en el escritorio.**
   - Son de 3 a 4 destinos por rol.
   - En el teléfono, una barra de pestañas abajo; en el escritorio, el riel de la izquierda con los mismos destinos.
   - Android recomienda la barra de navegación para «tres a cinco destinos de igual importancia» (Android Developers, *Navigation bar*).
   - Hoy hay de 3 a 9 entradas, sin barra en el teléfono.
3. **No reflejar el motor.** Las puertas se llaman por lo que la persona hace (Hoy, Planta, Equipos, Resultados), no por los módulos (Diferidos, Riesgo, Confiabilidad, Superficie). Es la decisión de Nubank (Neumann, 2018).
4. **Un nombre, una cifra.**
   - Cada rótulo tiene **una** definición en todo el producto.
   - Si cambia el alcance, cambia el rótulo: «por bombas paradas: 1.665 bbl/d» no puede llamarse igual que el total del campo (1.966).
   - Lo diferido no «se pierde»: se deja de producir y se recupera después. «Se pierde» queda para la pérdida (pitera, derrame, tea). Por eso «Perdiéndose ahora» pasa a «Se deja de producir ahora» (X1 §4.0, punto 10; Edinson [26:48]).
   - Los seis casos de §1.3.3 se corrigen así (pedido en §4.11).
5. **Mostrar de a poco, con un límite.**
   - **En lo gerencial**, dentro de un campo, solo dos niveles escondidos: la hoja del tramo y la ficha del equipo. Nielsen (2006) advierte que pasar de dos niveles de detalle escondido suele dar baja usabilidad. Desde «Todos mis campos», la ficha del primer equipo de cada campo está a un toque.
   - **En lo técnico**, los cuatro niveles de ISA-101 (§5), siempre con migas para volver. Ningún dato queda a más de 3 toques del inicio.
6. **Lo normal, en gris; el color pide algo.**
   - El color sale solo en lo anormal, y siempre con forma y texto (ISA-101; `Prioridad.tsx`).
   - Una alarma es lo que pide una respuesta a tiempo (ISA-18.2-2016, vía Stauffer, 2016). Si no pide nada, no lleva color ni insignia en la pestaña.
7. **Lo medido manda; lo simulado acompaña.**
   - Ninguna cifra simulada es la grande de una pantalla.
   - El retorno del ciclo se parte en sus tres momentos y va como **una línea** debajo de cada uno, con la palabra «simulado» (§4.4).
8. **El tiempo de cada lugar.**
   - Hoy, Planta y Equipos son **ahora**: sin selector de período.
   - El período (mes, trimestre, año o rango) vive **solo** en Resultados. En el «Después» de La planta viva va como una ficha propia («octubre ▾»).

### 3.2 Las puertas de cada rol

Orden fijo de izquierda a derecha: **Hoy · Planta · Equipos · Resultados**. Cada rol ve un subconjunto. El administrador, regulatorio y abastecimiento tienen el suyo.

| Rol | Pestañas (teléfono abajo = riel del escritorio) | Abre en | Insignia en la pestaña |
|---|---|---|---|
| **ger** | Planta · Equipos · Resultados | **Planta** (La planta viva, todos sus campos) | — (lo que tiene que firmar sale como tarjeta «Para usted» arriba de su Planta) |
| **reg** | Reporte · Planta · Historial | **Reporte** | En Reporte: paradas que faltan para publicar |
| **cont** (v2) | Paradas · Evidencia | **Paradas** | — |
| **prod** | Hoy · Planta · Equipos · Resultados | **Planta** (nivel 1 de su campo) | En Hoy: confirmaciones y cargas pendientes |
| **sup** | Hoy · Planta · Equipos | **Hoy** (su turno) | En Hoy |
| **oper** | Hoy · Planta · Equipos | **Hoy** (sus preguntas) | En Hoy: preguntas sin contestar |
| **tec** | Hoy · Planta · Equipos | **Hoy** (su trabajo) | En Hoy |
| **jefe** | Hoy · Planta · Equipos · Resultados | **Hoy** (mantenimiento) | En Hoy |
| **conf** | Hoy · Planta · Equipos · Resultados | **Equipos**, ordenados por «Si falla hoy» | En Hoy |
| **plan** (v2) | Hoy · Equipos · Resultados | **Hoy** (programa de la semana) | En Hoy: repuestos que no alcanzan |
| **adm** | Estado · Planta · Configurar | **Estado** (lo que falta en cada campo) | En Estado: pasos sin hacer |

**Arriba, en todas las pestañas:**
- **el campo** (o «Todos mis campos»), con su marca de prioridad;
- **«?»** (el «¿cómo se lee?» de hoy);
- **la persona**: su perfil y, para el gerente, «Metas y accesos».

El selector de período y «Exportar» salen **solo** en Resultados, en Reporte, en Evidencia y en una ficha. «Entregar turno» está en Hoy del supervisor.

**Por qué el gerente no tiene «Hoy».** Su trabajo diario es mirar y mandar a actuar. Lo que tiene que hacer es raro (firmar las metas del mes, dar un acceso): sale como tarjeta arriba de su Planta cuando hay algo, y no ocupa una pestaña.

**Por qué el operador, el técnico y el supervisor tienen las mismas tres.** Rotan y se enseñan entre ellos: la misma barra en los tres teléfonos ahorra explicaciones. Planta y Equipos les sirven de contexto: qué más está parado y dónde queda el equipo.

**Las palabras de las pestañas se prueban** (§7.2, tarea G6): «Planta» o «Activo» para el gerente, y «Resultados» o «Mes».

### 3.3 «Hoy»: un solo lugar para lo que me toca

**Qué junta.** Toda tarea que hoy está regada (§1.3.5), con la capacidad que ya la autoriza (`roles.ts`):

| Tarea | Hoy está en | Quién la ve en Hoy | Capacidad |
|---|---|---|---|
| Contestar qué se dañó o por qué paró | Identificar · Por contestar | oper, tec, sup | `causa:declarar` |
| Confirmar las paradas del día, en lote | Turno · Cierre de hoy; Identificar | sup, prod | `anh:confirmar` |
| Confirmar o corregir dónde se trabó; poner «en el yacimiento» | Identificar | sup, prod, jefe, conf (el yacimiento: prod y conf) | `anh:clasificar`, `anh:yacimiento` |
| Escalar lo que nadie contestó | Turno · WhatsApp del turno | sup | — (aviso) |
| Cerrar en el orden que menos cuesta, si el tanque sube | Bombas (ficha) · Agua | sup, oper | — (procedimiento) |
| Registrar qué encontró | Mi trabajo → Identificar | tec | `causa:declarar` |
| Órdenes de SAP a su nombre; crear un aviso | Mi trabajo; ficha de la bomba | tec; sup, oper, jefe, conf | `sap:aviso` |
| Aceptar o dar por hecho un plan de acción | «Ver planes de acción» (7 pantallas) | sup, jefe, conf | `planes:decidir` |
| Intervenir un equipo que ya pasó el límite | Mantenimiento · 1 Intervenir; Riesgo | jefe, conf | `sap:aviso` |
| No intervenir hoy un equipo que vale más | Riesgo («Ojo: P-201A y P-201C valen más…») | jefe, plan | — (aviso) |
| Arrancó sin identificar (no conformidad) | Identificar · No conformidades | sup, jefe, conf | `causa:completar` |
| Cargar la asignación oficial del mes | Producción · Cuadre · Asignación oficial | prod | `asignacion:cargar` |
| Firmar las metas del mes | Configuración · Metas por campo | ger (como tarjeta «Para usted») | `metas:firmar` |
| Firmar la versión de la configuración | Configuración · Firmar la versión | adm (en Estado) | `config:firmar` |
| Tags sin equipo resuelto | Conectores | adm (en Estado) | `conector:configurar` |

**El orden de la lista** (una sola, no por origen):
1. **Lo que dice «no» por seguridad o procedimiento**: «No arrancar P-201B hasta identificar qué se dañó». Va como franja fija arriba, no como tarjeta.
2. **Lo que tiene hora límite**: el cierre del turno o el reporte antes de las 07:00.
3. **Los barriles en juego ahora**, de más a menos (bbl/d).
4. **Lo demás**, por antigüedad.
5. **Lo hecho hoy** se pliega al final: «Hecho hoy (3)».

**La tarjeta** tiene siempre la misma anatomía, de arriba abajo:

```
Confirmar 2 paradas iguales                        ← verbo + qué (sin marca: la tarea no tiene prioridad propia)
◆1 P-201B cerró LC-07 y LC-16 · desde las 05:43    ← dónde, con la marca del equipo
1.665 bbl/d · el reporte sale mañana a las 07:00   ← por qué importa
[ Confirmar las 2 ]             Ver una por una    ← la acción, de un toque
```

- **La marca de prioridad es del equipo, no de la tarea** (X2 §2, B10). P-201B lleva su rombo en la tarjeta, igual que en Planta y en Equipos. La urgencia de la tarea la dice el orden de la lista.
- La acción va en el botón grande, si se puede hacer con un toque.
- «Ver…» abre el detalle: la cadena de 6 pasos de la parada o el equipo en su nivel 3.
- **Vacío:** «Nada pendiente. El campo está normal.» y un enlace a Planta.
- **Hoy es una pantalla de tarea, no un nivel** de la escalera de ISA-101 (X2 §3.4). Lleva arriba la franja de condiciones (X2 §3.5) y las mismas marcas que Planta y Equipos.
- **Insignia:** el número de tarjetas que piden una acción. Un aviso que solo informa («Cambió lo que limita») va en la lista, pero **no** suma a la insignia (regla 6).

### 3.4 El inicio de cada rol

Lo que se ve **sin desplazarse**. Arriba de todo, la frase; debajo, una cifra grande y lo que la explica.

| Rol | Frase (ejemplo con el demo) | Cifra grande | Lo que la explica, sin desplazarse | Detrás de un toque |
|---|---|---|---|---|
| **ger** | «Se dejan de producir 2.650 bbl/d. Casi todo es P-201B, en La Ceiba: la bomba de agua paró y obligó a cerrar 2 pozos.» | **2.650 bbl/d** se dejan de producir ahora | La planta viva de sus 5 campos, una fila por campo (§4.6), con Antes · Durante · Después | El campo → el tramo → la ficha del equipo |
| **reg** | «No se puede publicar todavía: octubre sigue abierto y 2 paradas no tienen causa (355 bbl).» | **2** paradas sin causa | Qué falta, quién lo debe y la hora límite; luego el árbol como la circular | El árbol completo, la medición oficial, el historial |
| **cont** (v2) | «3 paradas del mes se trabaron afuera o las causó un tercero.» (ejemplo) | **3** paradas | Por responsable: contratista, tercero, nosotros | El expediente con la línea de tiempo del PLC |
| **prod** | «Limitan los pozos: a la planta le sobran 1.143 bbl/d. Hoy pasan 9.394.» | **9.394 bbl/d** pasan hoy | La planta viva técnica del campo (nivel 1) y los 3 primeros de «Si falla hoy» | Cada tramo (nivel 2); Resultados para el mes |
| **sup** | «Se dejan de producir 1.966 bbl/d. Le faltan 4 paradas por confirmar: el reporte sale mañana antes de las 07:00.» | **1.966 bbl/d** | Las tarjetas de su turno (§5.5) | La cadena de cada parada; el orden de cierre |
| **oper** | «Tiene 4 preguntas. Empiece por P-201B: está parada y no se puede arrancar.» | **1 de 4** | La primera pregunta con sus botones (§5.5) | Las siguientes, de a una |
| **tec** | «Le tocan 4 cosas hoy. Primero P-201B: diga qué encontró.» | **4** | La lista de Hoy, sin repetidos | El equipo (nivel 3) y su historia |
| **jefe** | «De 8,1 días que dura una falla, 7,7 son espera. El vigía anunció 3 de 3 fallas.» | **7,7 de 8,1 días** son espera | «Intervenir ya» (K-101, ya pasó el límite) y lo que falta por identificar | Resultados: confiabilidad, por parte, programa |
| **conf** | «Ataque primero P-201A y P-201C: hoy valen más y TRIM no las vigila.» | **3.059 bbl/d**: el primero de «Si falla hoy» | Equipos ordenados por «Si falla hoy», con «¿Lo vigila TRIM?» y el acierto del vigía | La placa (nivel 3) y el diagnóstico (nivel 4) |
| **plan** (v2) | «2 repuestos no llegan antes de la falla anunciada.» (ejemplo) | **2** | El programa de la semana y «¿alcanza el repuesto?» | El equipo y la orden |
| **adm** | «La Ceiba: 5 de 7 pasos listos. Falta firmar las capacidades de afuera.» (ejemplo) | **5 de 7** | La lista de pasos por campo, con el siguiente | Configurar en ese paso |

Fuentes de las cifras [demo]:
- **ger:** 2.650 = 1.966 de La Ceiba + 684 de Morichal Norte (Riesgo del gerente).
- **prod:** 1.143 y 9.394, de la tubería de La Ceiba.
- **jefe:** 7,7 y 8,1 días, de «Reparación activa y espera», y 3 de 3, de «¿Acierta el vigía?» (Confiabilidad de La Ceiba).
- **conf:** 3.059 bbl/d, de «Si falla hoy» en La Ceiba. En Morichal, con su campo de entrada, el primero sería MPP-301: 1.600 bbl/d, cruza en 5,2 d (Riesgo de conf).

### 3.5 La cabecera y lo que se sale de ella

| Hoy en la cabecera | Queda | Por qué |
|---|---|---|
| Título de la pantalla («Bombas de la línea») | Cambia por el lugar con migas: «La Ceiba › Agua › P-201B» | Dice dónde se está y cómo volver (§5.3) |
| «Demo · Octubre, en curso · La Ceiba · 11.105 bbl producidos ayer» | El campo queda; «producidos ayer» pasa a Resultados; «Demo» queda solo en el demo | En vivo, el período confunde (§1.3.6) |
| Selector de período | **Solo** en Resultados, Reporte y Evidencia | Regla 8 |
| Exportar | En Resultados, Reporte, Evidencia y la ficha; en Hoy del supervisor, «Entregar turno» | Se exporta un período o un caso, no un tablero en vivo |
| «¿cómo se lee?» | Queda como «?» | Se usa al empezar (§6.2) |
| «DATOS DE DEMOSTRACIÓN» | Solo en el demo | — |

### 3.6 Qué se fusiona, qué se esconde, qué desaparece y qué queda para el papel

**Se fusiona:**
1. **Bombas + Electrosumergibles + Pozos + Superficie → Equipos.**
   - Una lista con filtros: parados, avisan, sin instrumento, todos; por tipo y por tren.
   - Va ordenada por estado y, dentro de cada estado, por «Si falla hoy».
   - El nombre «Superficie» desaparece.
2. **Riesgo se disuelve:**
   - «Perdiéndose ahora» pasa a Planta (Durante) y a la frase del inicio, con su nombre nuevo: «se deja de producir ahora»;
   - «En riesgo» y «Si falla hoy», a Equipos (su orden) y a Planta (Antes);
   - «Intervenir», a Hoy.
3. **Turno, Mi trabajo y la parte de acción de Mantenimiento e Identificar → Hoy.**
   - La entrega de turno se vuelve un botón: arma el resumen e incluye el WhatsApp del turno.
4. **Resumen (gerente) → Planta + Equipos + Resultados.** Dónde se quedan los barriles, qué equipos, y si está bajando: las tres partes de su pregunta.
5. **Producción y Diferidos (producción, jefe, confiabilidad) → Resultados.**
   - Queda una sola vez cada panel: medición oficial, factor, cuadre, mes a mes, por dónde se trabó, por equipo, por parte y el árbol.
   - Hoy MEDICIÓN OFICIAL y FACTOR DE ASIGNACIÓN están en las dos pantallas.
6. **La tubería del campo (Producción y Planta) → una sola**, en el nivel 1 de Planta.
7. **Agua → Planta › Agua**: el tren de agua es un nivel 2.
8. **Configuración + Filosofía operacional + Conectores → Configurar** (administrador), con **Estado** como inicio.
   - Producción y confiabilidad leen la filosofía desde el nivel 2 de Planta: «¿Cómo está armado?».

**Se esconde detrás de «ver más»** (a un toque, nunca borrado):
- las frases de cálculo de Agua y de la ficha de la bomba;
- los supuestos;
- la cadena de custodia;
- el factor de asignación mes a mes;
- «Lo que TRIM dedujo del registro»;
- la señal de cada parada;
- el historial de WhatsApp de cada parada;
- los cinco tramos del tiempo fuera;
- las reglas que más se corrigen;
- el paso 2 por equipo.

**Desaparece:**
- **El bloque del ciclo como cifra principal**, en las 7 pantallas. Su contenido se parte por momento (§4.4).
- **«Ver planes de acción»** como acordeón en 7 pantallas. Los planes pasan a ser tarjetas de Hoy, para quien decide, y una línea en Planta para el gerente.
- **La pantalla Producción del gerente:** su gráfica pasa a Resultados, detrás de «día a día».
- **La pantalla Riesgo y la pantalla Superficie**, como pantallas.
- **El segundo paso de la introducción** (la lista de pantallas).
- **Los nombres** «Pozos y equipos», «Bombas de la línea» y «Equipos de superficie».

**Queda solo para el papel** (el informe que arma Exportar, con membrete, folio y huella, como hoy):
- la tabla de la tubería (hoy «Ver como tabla»);
- el cuadre diario completo;
- la tabla de PRODML;
- las calibraciones declaradas;
- la lista completa de paradas con su cadena;
- los supuestos de cada cifra y los textos de las ⓘ, como ya hace `Info.tsx`.

En la pantalla, prod y reg los tienen detrás de «ver más». El gerente los ve **solo** en el papel.

### 3.7 El mapa: cada pantalla y cada panel de hoy, en su lugar nuevo

Ninguna función se pierde. Si un panel no aparece aquí, va con su pantalla.

| Hoy (pantalla · panel) | Roles | Lugar nuevo |
|---|---|---|
| **Resumen** · ciclo (retorno, 1 Antes · 2 Durante · 3 Después, planes) | ger | Planta: una línea por momento, «lo que todavía se puede mover · simulado» (§4.4); los planes, como línea «3 de 11 planes en marcha» |
| Resumen · MEDIDO · PERÍODO (diferidos, USD, provisional) | ger | Resultados (la cifra grande del período) y Planta · Después |
| Resumen · PROMEDIO DIARIO y CIERRE PROYECTADO | ger | Resultados; la producción contra la meta, también al final de cada tubería («sale hoy») |
| Resumen · franja Durante (crudo en vivo, causa mayor, en riesgo) | ger | Planta: la frase del inicio y Antes · Durante |
| Resumen · 70 % alto impacto, tendencia, «por dónde se trabó» antes → con TRIM, mantenimiento proactivo | ger | Resultados («¿Está bajando?») y Planta · Después (la flecha de cada tramo) |
| Resumen · DIFERIDO MES A MES (por equipo / por dónde se trabó) | ger | Resultados |
| Resumen · POR EQUIPO | ger | Equipos (gerente) |
| Resumen · POR CAMPO (producción y diferido contra la meta, dónde se trabó, lo no planeado, desembotellar) | ger | Planta, nivel de todos los campos (una fila por campo) y la hoja del tramo (§4.5) |
| Resumen · PÉRDIDA | ger | Planta: línea aparte, nunca sumada; y Resultados |
| **Diferidos** · MES A MES, DÓNDE BAJARLO, DÓNDE SE TRABÓ, POR EQUIPO, TIPO DE CAUSA | ger | Resultados; POR EQUIPO también en Equipos |
| **Producción** (gerente) · DÍA A DÍA | ger | Resultados · «Producción día a día» (ver más) |
| **Riesgo** (gerente) · PERDIÉNDOSE AHORA, EN RIESGO | ger | Planta · Durante y Antes; Equipos (filtro «avisan») |
| **Configuración** (gerente) · METAS POR CAMPO, Usuarios y accesos | ger | La persona › Metas y accesos; tarjeta «Para usted» cuando hay que firmar |
| **Producción** (prod) · cabecera (real, potencial, ayer) | prod | Planta, nivel 1: indicadores del campo |
| Producción · LA TUBERÍA DEL CAMPO (y Planta · la misma) | prod, conf, adm | Planta, nivel 1: **una sola vez** |
| Producción · QUÉ LIMITÓ, DÍA POR DÍA | prod | Planta, nivel 1 · «en el tiempo» (ver más); el aviso «Cambió lo que limita», en Hoy |
| Producción · DÍA A DÍA; LO QUE NO SE PRODUJO, POR TIPO (la escalera, la eficiencia) | prod | Resultados · Producción del mes |
| Producción · LO PERDIDO POR TRAMO, MES A MES | prod | Resultados · Diferidos («por dónde se trabó»), una sola vez |
| Producción · MEDICIÓN OFICIAL, FACTOR DE ASIGNACIÓN, CUADRE DIARIO | prod | Resultados · Producción · «¿Cuadra?» (una sola vez) |
| Producción · CUADRE · ASIGNACIÓN OFICIAL (cargar) | prod | Hoy (tarea del mes: «Cargar la asignación de septiembre») y Resultados · Cuadre |
| **Diferidos** (prod, jefe, conf) · MES A MES, CUADRE, CADENA DE CUSTODIA, DÓNDE BAJARLO, TIPO DE CAUSA, POR DÓNDE SE TRABÓ, POR TRAMO, POR QUÉ NO SE PRODUJO (árbol), POR EQUIPO, POR PARTE | prod, jefe, conf | Resultados · Diferidos, con tres vistas de la misma cifra: por equipo, por dónde se trabó, por causa (el árbol). «¿Se puede publicar?» junta cuadre y custodia |
| **Pozos** · POZOS (y su detalle) | prod, sup | Equipos (filtro Pozos) y Planta › Pozos (nivel 2); el detalle del pozo es su nivel 3 |
| **Electrosumergibles** · FLOTA | prod, sup, oper, jefe, conf, tec | Equipos (filtro Electrosumergibles) y Planta › Pozos (nivel 2) |
| **Bombas** · cabecera (perdiéndose ahora, diferido que causaron, próxima en fallar), placas, PARTES, SIN INSTRUMENTO | sup, oper, jefe, conf, tec | Equipos (las placas son el nivel 3); «por bombas paradas» con ese nombre; «Sin instrumento», como filtro y como columna «¿Lo vigila TRIM?» |
| Bombas · detalle (salud por parte, últimas paradas, mientras esté parada, la tubería del agua hoy, orden de cierre) | todos los de Bombas | Nivel 3 (lo de ahora) y nivel 4 (diagnóstico: salud por parte, historia del PLC) |
| **Superficie** · BOMBAS DE LÍNEA, Servicios y proceso | jefe, conf, plan | Equipos (todos, con filtro por tren) |
| **Riesgo** (jefe, conf) · PERDIÉNDOSE AHORA, EN RIESGO, SI FALLA HOY (con «Cambió hoy» y «Ojo») | jefe, conf | Equipos (orden «Si falla hoy», con «Cambió hoy» arriba); Planta, nivel 1 (resumen de alarmas); Hoy («Ojo: no intervenir…» e «Intervenir ya») |
| **Identificar** · POR CONTESTAR / POR IDENTIFICAR / SIN ARRANCAR | oper, tec, sup, prod, jefe, conf | Hoy (una tarjeta por parada) |
| Identificar · SEÑAL, QUÉ SE DAÑÓ, POR QUÉ PARÓ, WHATSAPP | ídem | El detalle de la parada (nivel 4), detrás de la tarjeta |
| Identificar · LA CADENA DE CADA PARADA (6 pasos), corregir, motivo | sup, prod, jefe, conf | El detalle de la parada (nivel 4); en lote, desde la tarjeta de Hoy |
| Identificar · ÁRBOL DE CAUSAS, NO CONFORMIDADES, DECLARADAS, «Cómo va la identificación del período» | prod, sup, jefe, conf | Resultados · Identificación (el árbol y la calidad); las no conformidades, como tarjetas de Hoy |
| **Planta** · aviso rojo de detenidos | prod, conf, adm | Planta, nivel 1: resumen de alarmas (gris, con las marcas de prioridad) |
| Planta · ESQUEMA DE PLANTA | prod, conf, adm | Planta, nivel 2: el mapa (tocar un tren lo abre) |
| Planta · CAPTURANDO DATOS, CONFIGURADOS SIN DATOS, Capacidad por tren | prod, conf, adm | Nivel 2 (por tren); «sin datos», también en Estado (adm) |
| **Agua** · LA TUBERÍA DEL AGUA, HOY, LO QUE PASÓ, SI PARA OTRA BOMBA, POR QUÉ ES CRÍTICA, LA BOMBA DE REINYECCIÓN | prod, conf, adm | Planta › Agua (nivel 2), con las tres filas como Durante, Después y Antes |
| **Turno** · ciclo y las 4 cifras de arriba | sup, oper | Desaparecen como bloque: queda una cifra (lo que se deja de producir ahora) en Hoy |
| Turno · Qué limita hoy, Lo más frágil | sup, oper | Planta, nivel 1 (frase) |
| Turno · CIERRE DE HOY · PARADAS POR CONFIRMAR, Pasando ahora, Identificar, Vigilar, PARADAS NUEVAS | sup, oper | Hoy (tarjetas) |
| Turno · WHATSAPP DEL TURNO | sup, oper | Hoy › Entregar turno (y en el detalle de cada parada) |
| **Mantenimiento** · ciclo y cifras de arriba | jefe | Hoy: la frase y su cifra (espera contra reparación); lo demás, en Resultados · Mantenimiento |
| Mantenimiento · 1 · Intervenir; PARADAS POR IDENTIFICAR; ABIERTO EN SAP | jefe | Hoy |
| Mantenimiento · DÓNDE BAJARLO, POR PARTE, PROGRAMA DE PARADAS, HORAS EN SAP | jefe | Resultados · Mantenimiento (y el programa, en Hoy: «próximas paradas programadas») |
| **Confiabilidad** · ¿ACIERTA EL VIGÍA?, LO QUE ANUNCIÓ, LO QUE NO ANUNCIÓ, EN SEGUIMIENTO | jefe, conf, plan | Resultados · Confiabilidad · «¿Le creo al vigía?»; el acierto, en una línea arriba de Equipos (conf) |
| Confiabilidad · REPARACIÓN ACTIVA Y ESPERA | jefe, conf | Hoy del jefe (la cifra grande) y Resultados · Confiabilidad |
| Confiabilidad · LOS MÁS COSTOSOS, DE QUÉ FALLAN, FALLAS POR MES | jefe, conf, plan | Resultados · Confiabilidad · «¿Qué atacar?»; por equipo, en su nivel 4 |
| Confiabilidad · CALIDAD DEL REGISTRO y DE LA CLASIFICACIÓN, LAS REGLAS QUE MÁS SE CORRIGEN, EL PASO 2 POR EQUIPO, EQUIPOS SIN TOPOLOGÍA | jefe, conf | Resultados · Confiabilidad · «¿Se registra bien?»; los equipos sin topología, también en Estado (adm) |
| **Mi trabajo** · PARADOS, PARADAS POR IDENTIFICAR, AVISANDO, ÓRDENES EN SAP, PARADAS PROGRAMADAS | tec | Hoy: una lista, sin repetidos y en el orden de §3.3 |
| **Regulatorio** · encabezado, ÁRBOL COMO LA CIRCULAR | reg | Reporte (inicio): qué falta y el árbol |
| Regulatorio · PUNTOS DE MEDICIÓN OFICIAL, CALIBRACIÓN DECLARADA, PRODUCCIÓN DEL PERÍODO | reg | Reporte › «Medición oficial» (ver más) |
| Regulatorio · TAMBIÉN EN PRODML | reg | Papel (y ver más) |
| **Configuración** (adm) · PERFIL DEL CAMPO, MEMBRETE, TANQUES, RESPALDO, PARADAS PROGRAMADAS, VERSIONES, NO SE CONFIGURA, esquema | adm (prod y conf, en solo lectura) | Configurar (por pasos); Estado (lo que falta); «Firmar la versión», como tarea de Estado |
| **Filosofía operacional** | adm (prod y conf, en solo lectura) | Configurar › Filosofía; lectura desde Planta, nivel 2 («¿Cómo está armado?») |
| **Conectores** · SISTEMAS CORPORATIVOS, CATÁLOGOS DE DAÑO, PLANTILLAS, UTILIDAD, REGISTRO DE BORDES | adm | Configurar › Conectores; los tags sin equipo, en Estado |
| **Evidencia** | cont (v2) | Evidencia (cont) y el expediente desde Paradas |
| **Perfil** · identidad, avisos, apariencia, permisos, sesiones | todos | La persona › Perfil |
| **Ficha del equipo** (`PanelEquipo`): ficha ejecutiva (ger) y ficha técnica | todos | Gerente: último nivel de §4.5. Técnicos: nivel 3 (§5) |
| **Chat de WhatsApp** del operador | oper, sup | Detalle de la parada (nivel 4) y «Entregar turno» |
| **Introducción** (2 pasos) | todos | Primera entrada en tres señas sobre el inicio de verdad (§6.2) |
| **Selector de campo y «Todos los campos»** | quien tiene varios | Arriba, en todas las pestañas |
| **Período**, **Exportar**, «¿cómo se lee?» | todos | §3.5 |

### 3.8 Las direcciones

La dirección sigue siendo compartible (`url.ts`) y gana el nivel:

```
#/<rol>/hoy/<campo>
#/<rol>/planta/<campo|campo~portafolio>/<momento>                     momento: antes | ahora | despues
#/<rol>/planta/<campo>/<tramo|tren>[/<equipo>[/diagnostico]]          tren: pozos | crudo | agua | gas | servicios
#/<rol>/equipos/<campo>[/<equipo>]
#/<rol>/resultados/<campo>/<período>[/<vista>]                        vista: diferidos | produccion | confiabilidad | …
```

- Toda dirección de hoy se traduce a la nueva. Por ejemplo, `#/sup/bombas/ceiba/curso/P-201B` pasa a `#/sup/equipos/ceiba/P-201B`, y `#/ger/riesgo/…` a `#/ger/planta/…/antes`.
- Así no se rompen los enlaces que ya se compartieron, igual que hoy `leerHash` acepta «portafolio».

---

## 4. «La planta viva» para el gerente

### 4.1 Qué es y qué no es

**Qué es.**
- Es el dibujo del proceso de cada campo, vivo:
  - el crudo va del yacimiento a los pozos, a la planta, afuera y a la venta;
  - el agua sale de la planta, va al tanque y a las bombas de reinyección, y vuelve al yacimiento.
- **El contorno de cada tramo es lo que cabe; el relleno oscuro, lo que pasa ahora.**
- **El hueco rayado es lo que no está pasando, puesto en el tramo donde se trabó.**
- Sobre ese mismo dibujo se ven el **antes** (lo que puede fallar), el **durante** (lo que se deja de producir ahora) y el **después** (lo que ya costó en el período).
- Es lo que pidió el dueño: «su planta, el proceso, el pipeline de dónde se están perdiendo», y no una gráfica.

**Qué no es.**
- No es un simulador de proceso: no responde «¿qué pasa si subo la frecuencia?».
- Solo muestra lo que el motor ya calcula: el tramo de cada parada, «Si falla hoy», el colchón, el orden de cierre y el ciclo.
- Por eso recomiendo **no** llamarlo «gemelo digital» en pantalla.
  - El documento comercial reserva esa palabra para la línea de simulación (01 §1.6: «Simular planta/proceso/línea completa con planos: No — línea gemelo digital»).
  - En la pantalla, la pestaña dice **Planta** y el título, «La Ceiba, hoy».
  - «La planta viva» es el nombre de trabajo de este documento.
  - Si el dueño quiere la palabra «gemelo» para vender esta vista, es su decisión. El riesgo es la licitación que pida simular (01 §1.6, tabla RFP).

**Nace de piezas que ya existen:**
- la tubería del campo (U2 §2; `widgets/choke/Tuberia.tsx`);
- la tubería del agua (U2 §5; `widgets/choke/Agua.tsx`);
- «dónde se trabó» por campo (`DondeSeTrabo.tsx`, 6D.3);
- «Si falla hoy» (`riesgoAhora`, `criticidad`);
- el ciclo (`escenarios.ts`).

Lo nuevo es **juntarlas en un dibujo, con el lenguaje del gerente y los tres momentos encima**.

### 4.2 La anatomía del dibujo

| Pieza | Cómo se dibuja | Qué dice | De dónde sale hoy |
|---|---|---|---|
| **Yacimiento** | Zona sombreada a la izquierda, sin borde ni número | «La roca»: lo que puede dar se mide con las pruebas de los pozos (ⓘ de U2 §1.5) | — |
| **Pozos** | Un tramo de tubería con el conteo | «15 de 18 en marcha» | `estadoCampo` |
| **Recolección** (si hay multifásica) | Un símbolo de bomba sobre la línea entre pozos y planta | «MPP-301 lleva el clúster norte» (Morichal). Cuenta **en la planta**, porque es compartida (U2 §1.1) | `equipos.ts` |
| **Planta** | Un tramo con tres carriles: crudo, agua y gas | El carril que pasa; en el agua, el nivel del tanque | `planta.ts`, `TREN_AGUA` |
| **La rama del agua** | Baja de la planta: el tanque (un medidor de pie) → las bombas (cuántas en marcha y, por excepción, la parada o en riesgo; en la lente técnica, una por una) → los inyectores → **vuelve al yacimiento** | Cierra el círculo del agua. Con 92–97 % de agua, el agua manda (brief) | `TREN_AGUA`, `aguaSinSalidaBpd`, `NIVEL_AHORA` |
| **Afuera** | Un tramo con el oleoducto y el cliente | «recibe» o «no recibe» | `chokes.evacuacion`, `chokes.mercado` |
| **Venta** | Una flecha al final, con la cifra | «Sale hoy 9.394 bbl/d · meta 10.900» | `caudalesAhora`, meta firmada |
| **Lo que no está pasando** (diferido) | **Hueco rayado** en el tramo donde se trabó: la tubería **se angosta** ahí | «1.665 bbl/d · P-201B» | `BrechaChoke`, `riesgoAhora` |
| **Pérdida** | **Gota** que sale de la tubería en el tramo donde pasó, con su cifra aparte | «se regó», «tea», «pitera»; **nunca se suma** al diferido | Hoy, «sin eventos registrados» (6D.3, fila 21) |
| **Sin identificar** | Caja gris discontinua al lado: no es un tramo | «LC-21 · 301 bbl/d · falta que alguien diga qué pasó» | `porChoke['sin-asignar']` |
| **Limita** | Doble contorno gris y la palabra «limita», **nunca** en rojo (U2 §0.4) | El tope de hoy | `TuberiaCampo` |
| **Equipo con alarma** | Su símbolo con la marca de prioridad: forma, número y color | «◆1 P-201B parada» | `Prioridad.tsx` |
| **Sin comunicación** | Círculo punteado morado; la cifra pasa a «---» | «Sin comunicación desde 13:40» (ejemplo) | U1 §9.2 |

**El diferido y la pérdida se dibujan distinto, a propósito.** Edinson lo dijo en la reunión:
- «La diferida es que la producción de crudo […] todavía está en subsuelo, no ha salido a superficie».
- «La pérdida es cuando […] hay un derramamiento de fluidos» [26:48].

Por eso:
- **el diferido es un estrechamiento**: el crudo no entró a la tubería;
- **la pérdida es una gota**: el crudo salió y se perdió.

Si el diferido se pintara como goteo, el gerente vería derrames donde no los hay.

**La escala.** Tres capas en cada tramo, como la tubería de U2 §2.3, más el rayado en su lugar:
- **el contorno** es lo que cabe en el tramo: su capacidad. El gerente no ve el número, pero sí la forma y la palabra «limita» en el más angosto (X2 §3.3, regla 2);
- **el relleno oscuro** es lo que pasa ahora: es el mismo nivel en todos los tramos, porque el crudo pasa por todos;
- **el rayado** es lo que no pasa, encima del relleno y **solo en el tramo donde se trabó**.

El eje parte de cero y nunca se corta para exagerar (U2 §2.3). Lo que no pasa suele ser del 1 % al 17 % de lo que pasa: un rayado del 1 % se dibuja con un mínimo de 2 px. **La palabra y la cifra mandan**; el dibujo acompaña.

**Los equipos, por excepción.** En la lente del gerente, un equipo se dibuja solo si está parado, en alarma o en riesgo, con la misma marca que ve el técnico (X2 §3.3, regla 3). Las bombas de agua van como «2 de 3 en marcha · ◆1 P-201B parada», no una por una. «┄ sin instrumento» sale en Antes, que es donde importa.

### 4.3 Qué dice cada tramo

Para el gerente no hay potenciales, capacidades, «le sobran», códigos de la ANH ni la palabra «choke» (U2 §3.2). Sí ve dónde está el tope («limita»), con una frase de negocio (§4.5).

El encargo nombra las columnas «dónde se pierde hoy» y «lo perdido en el período». En pantalla se dicen «no pasa» y «no se produjo», porque el diferido no se pierde (§3.1, regla 4).

La Ceiba, 2-oct a las 14:00 [demo]:

| Tramo | Lo que pasa | Lo que limita | Dónde no pasa hoy (Durante) | Lo que no se produjo en el período (Después: octubre, 2 días) | Si falla hoy (Antes) |
|---|---|---|---|---|---|
| Yacimiento | — | — | 0 | 0 | nada avisa |
| Pozos · 18 | 15 en marcha, 3 parados | **limita** | 0: los 3 cerraron por la planta o sin causa | **118 bbl** · LC-05 (baja tensión; falta confirmar el tramo) | nada avisa |
| Planta · crudo | pasa lo que llega | — | — | — | ◆1 **K-101** (aire): ya pasó el límite; si para, hasta 9.394 bbl/d, sin colchón |
| Planta · agua | entran 174.033 bbl/d de agua; tanque al 89,6 % (alto-alto 90 %) | — | ◆1 **P-201B** parada desde las 03:52: cerró LC-07 y LC-16 · **1.665 bbl/d** | **573 bbl** · P-201B | **P-201A** o **P-201C**: 3.059 bbl/d después de 2 min de colchón · ┄ sin instrumento |
| Afuera | el oleoducto recibe | — | 0 | 0 | nada avisa |
| ┄ Sin identificar | — | — | **LC-21** · 301 bbl/d, desde el 1-oct a las 18:20 | **355 bbl** · LC-21 247, LC-08 109 | — |
| **Venta** | **sale hoy 9.394 bbl/d** · meta 10.900 | | **1.966 bbl/d** en total | 16.941 bbl producidos · meta a la fecha 17.258 ■3 · en total, **1.046 bbl** no se produjeron = el diferido del libro | 1 equipo avisa · el mes cierra, si sigue así, en 293.287 bbl (meta 337.900) ■3 |

Cuadres que no se rompen (U2 §0.6): 1.665 + 301 = 1.966, y 118 + 573 + 355 = 1.046.

**La lente técnica** (§5) suma en la misma tabla:
- lo que pueden dar los pozos (11.857 bbl/d) y la capacidad de cada tramo (planta 13.000; afuera 14.000);
- «le sobran 1.143»;
- los 497 bbl/d que las pruebas dan de más que el medidor oficial.

### 4.4 Antes · Durante · Después, sobre el mismo flujo

Arriba del dibujo va un selector de tres posiciones, con las palabras del dueño y una aclaración corta:

**( Antes · lo que viene )   ( Durante · ahora )   ( Después · lo que pasó )**

- **Sin los números 1·2·3**: esos dígitos son de las prioridades (X1 §3.4.2).
- La aclaración evita el error más probable: leer «Antes» como «el pasado». En el producto, «Antes» es *antes de la falla* (`11-ciclo-de-valor.md` §11.1).
- La palabra se prueba (§7.2, G5).

| Momento | Qué cambia en el dibujo | La cifra grande | La línea de abajo (lo que todavía se puede mover · **simulado**) |
|---|---|---|---|
| **Antes · lo que viene** | La tubería va llena. Los equipos que avisan llevan su marca y una línea punteada de riesgo con «si falla hoy». Las bombas sin instrumento van con «┄ sin instrumento» | **Cuántos equipos avisan y el más cercano.** La Ceiba: «1 equipo avisa: K-101 ya pasó el límite». Todos los campos: «8 equipos avisan; el más cercano, K-101 (La Ceiba), ya pasó el límite» (Riesgo del gerente) [demo] | «Si se interviene a tiempo en los 6 de alto impacto, se evitan ≈ 42.017 bbl · simulado» (ciclo, Antes) [demo]. Mientras el motor no unifique el conteo de equipos en riesgo (§4.11, pedido 3), cada cifra dice su alcance |
| **Durante · ahora** | El oscuro es lo que pasa; el rayado, lo que no pasa, en su tramo. Las marcas de alarma. «Limita» en gris | **Lo que se deja de producir ahora.** La Ceiba: **1.966 bbl/d**. Todos: **2.650 bbl/d** | «Si P-201B vuelve antes de su promedio (40 h), ≈ 2.072 bbl; cerrando en el orden de TRIM, 30 más · simulado» (ciclo, Durante = 2.102) [demo] |
| **Después · lo que pasó** | Debajo de cada tramo, una barra gris con lo que no se produjo en el período, en el dibujo de su tramo (`tramos.tsx`). Sin identificar, aparte. El período en su ficha: «octubre ▾» | **Lo que no se produjo en el período.** La Ceiba: **1.046 bbl** en octubre; todos: **2.377 bbl**, con su máximo firmado | «No repetir la parte que más costó: ≈ 30 bbl en La Ceiba, 1.114 en todos · simulado» (ciclo, Después) [demo] |

**Reglas de los tres momentos:**
1. **Uno manda; los otros acompañan.**
   - En el teléfono se ve un momento a la vez.
   - En el escritorio, la tabla de §4.6 muestra los tres renglones. El elegido va en tinta y los otros dos en gris.
   - Abre en **Durante**: es lo que pasa ahora, como el saldo en Nubank.
2. **El retorno del ciclo deja de ser una cifra suelta.**
   - «45.233 bbl · retorno» no aparece más como la cifra grande.
   - Cada momento lleva su parte, con «simulado» en la misma línea y su plan a un toque.
   - La suma solo está en Resultados, como «retorno posible del ciclo · simulado».
3. **«Antes» se define una vez** (pedido en §4.11).
   - Hoy hay tres cifras para lo mismo: «1 Antes · 0 bbl», «1 equipo · hasta 9.394 bbl/d en juego» y «≈ 45.262 bbl de exposición».
   - En la planta viva, la cifra grande de Antes es **un conteo y un nombre**, porque un techo de servicio («hasta») no se puede sumar. El estimado en barriles va en la línea de abajo.
4. **Después, a comienzo de mes.**
   - Si el mes lleva menos de 7 días, Después muestra lo que va **y** el mes anterior cerrado: «Octubre (2 días): 1.046 bbl · Septiembre: 7.716 bbl» [demo, 6D.3 captura 2].
   - Hoy, el gerente ve una gráfica de dos puntos (§1.3.6).
5. **La tendencia va aparte, con su base.** Debajo de Después va una línea:
   > «Desde que entró TRIM (1-sep), lo no planeado por día bajó en la planta (268 → 51 bbl/d) y subió en los pozos (122 → 215) · muestra corta»

   Son las cifras de 6D.3, captura 3 [demo]. Se muestran las dos flechas, la que baja y la que sube (U2 §7.3).

### 4.5 Bajar al detalle: el tramo, sus equipos, sus causas y el árbol de Edinson

Para el gerente son dos niveles debajo del campo, en hojas que suben (en el escritorio, un panel a la derecha).

**1 · La hoja del tramo.** Al tocar «Planta» en el dibujo o en la tabla:
1. **La frase del tramo en el momento elegido.** Por ejemplo: «P-201B (bomba de agua) está parada desde las 03:52 y obligó a cerrar LC-07 y LC-16.»
2. **Sus equipos**, ordenados por barriles en ese momento, cada uno con su marca:
   - P-201B · parada · 1.665 bbl/d;
   - K-101 · ya pasó el límite · si para, hasta 9.394;
   - P-201A y P-201C · ┄ sin instrumento.
3. **¿Por qué?**: el árbol de Edinson del tramo, en el orden de gestión (`ArbolChoke`, `orden=gestion`), con palabras de campo y sin códigos:
   - «No planeada · 573 bbl → falla de la planta (bombeo de agua) → afectó a varios pozos»;
   - «Planeada · 0»;
   - «Sin saber si fue planeada · 0».

   Es la misma rama que reg ve con sus códigos (`resp_par`, `choke_mod`, `cau_niv1`…) en Regulatorio. Para el gerente, solo las palabras.
4. **Desde que entró TRIM**: la flecha del tramo.
5. **Para producir más**: la frase que el motor ya arma (`desembotellarDe`, 6D.3, fila 18), por ejemplo:
   > «En La Ceiba, otra bomba de agua no sube la producción: evita que una falla cierre pozos. Cada falla de P-201B le ha costado en promedio unos 4.593 bbl. Para producir más hay que sacarles más a los pozos: la planta y afuera dejan pasar más.»

   Es la traducción a negocio de «limita» (§4.3).

**2 · La ficha del equipo.** Al tocar un equipo se abre la ficha ejecutiva que ya existe (6D.3; `FichaEjecutiva.tsx`):
- «Qué se está haciendo»;
- «Le ha costado»;
- «pozos cerrados desde…»;
- «llega el 9 de oct».

Desde la fila de un campo en «Todos mis campos», el primer equipo también abre su ficha directo, sin pasar por el tramo.

**Lo que no está en la hoja del gerente:** las variables del equipo, la salud por parte, el vigía, los códigos y los potenciales. Son del nivel 3 y 4 del técnico (§5).

### 4.6 Bocetos de escritorio

**a) Todos sus campos (el inicio del gerente), Durante:**

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ trim    ● Planta    ○ Equipos    ○ Resultados                    Todos mis campos ▾    ?   AV  │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌ Para usted: firmar las metas de noviembre. Vence el 1 de nov.              [ Firmar ] ┐      │ ← solo si hay algo
│                                                                                                │
│  Se dejan de producir 2.650 bbl/d. Casi todo es P-201B, en La Ceiba: la bomba de agua          │
│  paró y obligó a cerrar 2 pozos.                                                               │
│                                                                                                │
│  ( Antes · lo que viene )   (■ Durante · ahora )   ( Después · lo que pasó )                   │
│                                                                                                │
│  2.650 bbl/d   se dejan de producir ahora · 4 de 87 pozos parados                              │
│                                                                                                │
│                  YACIMIENTO   POZOS            PLANTA                AFUERA      NO PASA       │
│  La Ceiba        ░░░░ ═══════ ════════════ ═══ ◆1 P-201B ▨▨▨ ═══════ ══════ ▶   1.966 bbl/d  › │
│                                                agua · cerró 2 pozos  ┄ LC-21 sin identificar   │
│  Morichal Norte  ░░░░ ═══════ ◆1 MN-41 ▨ ═════ ═════════════════════ ══════ ▶     684 bbl/d  › │
│                               electrosumergible                                                │
│  Guacamayo       ░░░░ ═══════ ════════════ ═══ ═════════════════════ ══════ ▶       0 bbl/d  › │
│  El Palmar       ░░░░ ═══════ ════════════ ═══ ═════════════════════ ══════ ▶       0 bbl/d  › │
│  La Zarza        gas: la tubería del gas todavía no está (U2 §1.5)                  0 bbl/d  › │
│                                                                                                │
│  Lo que todavía se puede mover: ≈ 2.102 bbl si P-201B vuelve antes de su promedio y se         │
│  cierra en el orden de TRIM · simulado · Ver el plan ›                                         │
│  Pérdida (lo que salió y no se vendió): sin eventos registrados ⓘ                              │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- Los campos van ordenados por lo que dejan de producir en el momento elegido. Un campo en «0 bbl/d» no es «normal»: Guacamayo no deja de producir nada ahora, pero GU-07 ya pasó su límite y sale en Antes [demo].
- La franja de condiciones de X2 §3.5 (una cuenta por condición, sumada por campo) va en la primera fila, debajo de la barra.
- La fila es la tubería en chico, con la marca en el tramo donde se trabó.
- Un toque en la fila abre el campo; uno en el equipo, su ficha.

**b) Un campo (La Ceiba), Durante, con los tres momentos en la tabla:**

```
┌─ Planta › La Ceiba ──────────────────────────────────────────────────────────────── La Ceiba ▾   ?   AV ───────┐
│  Se dejan de producir 1.966 bbl/d: P-201B (bomba de agua) paró a las 03:52 y obligó a cerrar LC-07 y LC-16.    │
│  ( Antes · lo que viene )   (■ Durante · ahora )   ( Después · lo que pasó: octubre ▾ )                        │
│  1.966 bbl/d  se dejan de producir ahora · 3 de 18 pozos parados                                               │
│                                                                                                                │
│   YACIMIENTO        POZOS · 18              PLANTA                     AFUERA        VENTA                     │
│   ░░░░░░░ ════▶ ███████████████ ════▶ crudo █████████▨▨▨▨ ════▶ ███████████ ════▶ sale hoy                     │
│   ░░░░░░░       15 en marcha          ◆1 P-201B: cerró 2 pozos   recibe            9.394 bbl/d                 │
│   ░░░░░░░       ◄ limita                       │                                   meta 10.900                 │
│      ▲                                   agua  ▼ 174.033 bbl/d de agua                                         │
│      │                            tanque ▕▓▓▓▓▓▓▓▓▓▓│ 89,6 % · alto-alto 90 %                                  │
│      └──── inyectores ◀═══ bombas: 2 de 3 en marcha · ◆1 P-201B parada                                         │
│                                                                                                                │
│              │ POZOS           │ PLANTA                      │ AFUERA │ SIN IDENTIF. │ VENTA                   │
│  Antes       │ nada avisa      │ ◆1 K-101 (aire) ya pasó el  │   —    │              │ el mes cierra, si sigue │
│              │                 │ límite · si para, ≤ 9.394/d │        │              │ así, en 293.287 bbl     │
│              │                 │ ┄ P-201A o C · 3.059/d      │        │              │ (meta 337.900) ■3       │
│  Durante  ■  │ —               │ ◆1 P-201B · 1.665 bbl/d     │   —    │ LC-21 · 301/d│ sale hoy 9.394 bbl/d    │
│  Después     │ 118 bbl · LC-05 │ 573 bbl · P-201B            │   0    │ 355 bbl      │ 16.941 bbl ■3           │
│              │                 │                             │        │              │ (meta a la fecha 17.258)│
│                                                                                                                │
│  Desde que entró TRIM: en la planta bajó (268 → 51 bbl/d); en los pozos subió (122 → 215) · muestra corta ⓘ    │
│  Lo que todavía se puede mover: ≈ 2.072 bbl si P-201B vuelve antes de 40 h, y 30 más cerrando en el orden      │
│  de TRIM · simulado · Ver el plan ›                                                                            │
│  Para producir más: sacarles más a los pozos. Otra bomba de agua no sube la producción: evita que una          │
│  falla cierre pozos ›                                                                                          │
│  Pérdida: sin eventos registrados en octubre ⓘ                                                                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- El oscuro (█) es lo que pasa; el rayado (▨), lo que no pasa, en el tramo donde se trabó.
- En el escritorio, el dibujo ocupa unos 900 px (la medida de U2 §2.5).
- Cada columna de la tabla queda **debajo de su tramo**: el ojo baja derecho del dibujo a la cifra.
- **Antes**: el dibujo apaga el rayado, enciende las líneas punteadas de riesgo en K-101 y en las dos bombas, y la cifra grande cambia por «1 equipo avisa».
- **Después**: el dibujo cambia el rayado por las barras del período bajo cada tramo.
- **La columna Venta** cierra cada momento con la meta: el cierre proyectado del mes (Antes), lo que sale hoy (Durante) y lo producido a la fecha (Después) [demo, Resumen del gerente para La Ceiba y Producción].

### 4.7 Bocetos del teléfono (390 px, unos 38 caracteres)

```
┌────────────────────────────────────┐   ┌────────────────────────────────────┐
│ Todos mis campos ▾          ?   AV │   │ ‹ Todos   La Ceiba ▾        ?   AV │
│ Se dejan de producir 2.650 bbl/d.  │   │ Se dejan de producir 1.966 bbl/d:  │
│ Casi todo es P-201B, en La Ceiba:  │   │ P-201B (bomba de agua) paró a las  │
│ la bomba de agua paró y obligó a   │   │ 03:52 y obligó a cerrar LC-07 y    │
│ cerrar 2 pozos.                    │   │ LC-16.                             │
│                                    │   │ (Antes)(■ Durante)(Después)        │
│ (Antes)(■ Durante)(Después)        │   │ 1.966 bbl/d  no se producen ahora  │
│                                    │   │                                    │
│ 2.650 bbl/d                        │   │ YACIMIENTO  ░░░░                   │
│ se dejan de producir ahora         │   │   ║                                │
│ 4 de 87 pozos parados              │   │ POZOS · 18  15 en marcha · limita  │
│                                    │   │   ║                                │
│ La Ceiba               1.966 /d  › │   │ PLANTA      ◆1 P-201B parada     › │
│ ░═══════════◆▨▨═══════▶            │   │   ║  ▨▨     1.665 bbl/d · cerró    │
│ planta · P-201B (agua)             │   │   ║         LC-07 y LC-16          │
│                                    │   │   ╠═ agua   tanque 89,6 %          │
│ Morichal Norte           684 /d  › │   │   ║                                │
│ ░═══◆▨══════════════════▶          │   │ AFUERA      recibe                 │
│ pozos · MN-41 (electrosumergible)  │   │   ║                                │
│                                    │   │ VENTA       sale hoy 9.394 bbl/d   │
│ Guacamayo              0 bbl/d   › │   │             meta 10.900            │
│ El Palmar              0 bbl/d   › │   │ ┄ Sin identificar                  │
│ La Zarza               0 bbl/d   › │   │   LC-21 · 301 bbl/d              › │
│                                    │   │                                    │
│ ≈ 2.102 bbl se pueden mover ahora  │   │ ≈ 2.102 bbl se pueden mover        │
│ · simulado · Ver el plan ›         │   │ · simulado · Ver el plan ›         │
├────────────────────────────────────┤   ├────────────────────────────────────┤
│  ● Planta   ○ Equipos  ○ Resultados│   │  ● Planta   ○ Equipos  ○ Resultados│
└────────────────────────────────────┘   └────────────────────────────────────┘
```

**En el teléfono, la tubería va de pie** (U2 §2.6): los tramos uno debajo del otro, en el mismo orden. La rama del agua sale de la planta como un renglón propio.

**La hoja del tramo, en el teléfono:**

```
┌────────────────────────────────────┐
│               ─────                │
│ La planta · La Ceiba · ahora       │
│ P-201B (bomba de agua) está parada │
│ desde las 03:52 y obligó a cerrar  │
│ LC-07 y LC-16.                     │
│                                    │
│ EQUIPOS                            │
│ ◆1 P-201B · parada    1.665 /d   › │
│ ◆1 K-101 · aire · ya pasó el       │
│    límite     si para, ≤ 9.394   › │
│ ┄  P-201A · sin instrumento      › │
│ ┄  P-201C · sin instrumento      › │
│                                    │
│ ¿POR QUÉ? · octubre                │
│ No planeada               573 bbl  │
│  └ falla de la planta: bombeo de   │
│    agua · afectó a varios pozos    │
│ Planeada                    0 bbl  │
│                                    │
│ Desde que entró TRIM, lo que se    │
│ trabó aquí bajó: 268 → 51 bbl/d ⓘ  │
└────────────────────────────────────┘
```

### 4.8 Qué métricas van en cada nivel

| Nivel | Qué ve el gerente | Cuántas cifras grandes | Lo que ya calcula el motor |
|---|---|---|---|
| **Todos sus campos** (si tiene varios) | La frase; la cifra del momento; una fila por campo con la tubería en chico, la marca del tramo y el primer equipo; lo que se puede mover (simulado); la pérdida | 1 | `riesgoAhora`, `Libro.porCampo`, `BrechaChoke`, `fraseGerente`, el ciclo |
| **Un campo** | La frase; la cifra; el dibujo con la rama del agua; la tabla de los tres momentos; «sale hoy» contra la meta; desde que entró TRIM; lo que se puede mover; para producir más; la pérdida | 1 | `TuberiaCampo`, `riesgoAhora`, `criticidad.desembotellar`, `LineaBasePorTramo`, el ciclo |
| **Un tramo** (hoja) | La frase del tramo; sus equipos con barriles; ¿por qué? (el árbol en el orden de gestión); su flecha desde TRIM; para producir más | 0 (es una lista) | `ArbolChoke` (`orden=gestion`), `porChokeEquipo`, `porChokeEscalon` |
| **Un equipo** (ficha ejecutiva) | Estado, qué se está haciendo, le ha costado, pozos cerrados, repuesto y fecha | 1 | `FichaEjecutiva` |
| **Resultados** (pestaña) | El diferido del período contra el máximo; la producción contra la meta; el cierre proyectado; antes → con TRIM; el mes a mes (por equipo o por dónde se trabó); el mantenimiento proactivo; el retorno posible del ciclo (simulado); el informe para exportar | 1 por bloque | `Libro`, la serie, la base, el ciclo |

Con la numeración de X2 §3.3, que se adopta para construir y probar:
- todos sus campos = N1;
- un campo, con sus hojas de tramo = N2;
- la ficha del equipo = N3;
- el informe, los planes y las metas = N4 (soporte, sin diagnóstico).

### 4.9 Cómo se lee en 10 segundos

Son tres miradas, en este orden:
1. **La frase** (unos 3 s). Dice qué pasa y dónde, en ≤ 20 palabras, con un equipo por su nombre y su familia: «P-201B (bomba de agua)».
2. **La cifra** (unos 2 s). Una sola, con su unidad y pocas palabras: «1.966 bbl/d · se dejan de producir ahora».
3. **El tramo marcado** (unos 5 s).
   - En cada momento se marca **un** tramo: el de más barriles.
   - Ahí van el rayado y la marca del equipo. Lo demás queda gris.
   - Debajo, en su columna, el nombre y la cifra.

**Lo que lo hace posible:**
- en el teléfono, como mucho **5 cifras** sin desplazarse (hoy hay 10 o más en el Resumen);
- color solo en lo que pide una acción;
- la frase es la misma que oye el lector de pantalla en el `aria-label` del dibujo (U2 §2.8);
- la arma el motor: ya existe `fraseGerente` para el período; faltan la de «ahora» y la de «lo que viene» (§4.11).

Se prueba con la tarea G1 (§7.2): «Mire 10 segundos y dígame qué pasa, dónde y por qué equipo».

### 4.10 Estados

| Situación | Qué se ve |
|---|---|
| Nada deja de producirse ahora | La tubería llena, sin rayado. Frase: «La Ceiba produce sin paradas ahora.» La cifra: «0 bbl/d sin producir». Los otros dos momentos siguen a un toque |
| Nada se trabó en el período | «Nada se trabó en octubre (en curso).», como hoy (6D.3, fila 10) |
| Campo de gas (La Zarza) | «La Zarza es un campo de gas. La tubería del gas todavía no está.» (U2 §1.5). La fila del campo sigue en la lista |
| Gas sin medir | El carril del gas, en gris discontinuo: «gas · sin medir» (U2 §1.5) |
| Una capacidad sin firmar | En la lente del gerente, el contorno de ese tramo va discontinuo y «limita» lleva su ⓘ: «con una capacidad sin firmar». En la técnica, como U2 §1.5 |
| Sin comunicación con un medidor | Círculo punteado morado en ese punto; su cifra en «---» y «Sin comunicación desde {hora}». La cifra grande dice «al menos» si le falta ese caudal |
| Sin identificar | La caja gris discontinua, con el botón «Pedir a {rol}» para el gerente (no identifica él) |
| Comienzo de mes | Después muestra lo que va y el mes anterior (§4.4, regla 4) |
| Un campo sin perfil firmado | La fila dice «Sin el esquema de planta firmado no se sabe dónde se trabó. Lo firma el administrador.» |
| Pérdida | «Pérdida: sin eventos registrados» hasta que TRIM registre pérdidas (P1 §1.9). Cuando las haya, la gota en su tramo, con bbl y KPC aparte |

### 4.11 Lo que el motor ya da y lo que hay que pedirle

**Ya existe:**
- el reparto por tramo que suma el libro (`BrechaChoke`);
- la tubería y su frase de período (`TuberiaCampo.fraseGerente`);
- «Si falla hoy» con sus tres grupos (`riesgoAhora`, `criticidad`);
- el desembotellamiento (`desembotellarDe`);
- la base antes → con TRIM por tramo (`LineaBasePorTramo`);
- el árbol por tramo (`ArbolChoke`);
- el ciclo por momento (`cicloValor`);
- el tren de agua de La Ceiba y Morichal (`TREN_AGUA`).

**Pedidos.** La pantalla pinta; el motor calcula (brief):
1. **Una vista por campo y momento.**
   - Hoy, por cada campo, el Resumen pide cuatro vistas enteras para usar unas pocas cifras de cada una (6D·H3).
   - Se pide `GET /api/vistas/planta-viva?campos&momento&desde&hasta`, con: la frase, la cifra, los tramos con su valor del momento, el tramo marcado, el primer equipo y la línea simulada.
2. **Las frases de «ahora» y de «lo que viene»**, como `fraseGerente`.
3. **Un nombre, una cifra** (regla 4). Corregir los seis casos de §1.3.3:
   - «Se deja de producir ahora» (hoy «Perdiéndose ahora») es siempre el total del campo; el de Bombas se llama «por bombas paradas»;
   - un solo «lo que pueden dar los pozos» por lente;
   - una sola definición de Antes y de «exposición»;
   - un solo conteo de «equipos en riesgo» (de alto impacto o todos, pero uno).
4. **La rama del agua de todos los campos.** `TREN_AGUA` solo trae La Ceiba y Morichal; en los demás, la rama sale en gris discontinuo («sin dato»).
5. **La regla del comienzo de mes** (§4.4, regla 4).
6. **El registro de pérdidas** (P1 §1.9), para que la gota exista.

---

## 5. Lo técnico, tipo SCADA

### 5.1 Los cuatro niveles de ISA-101, en TRIM

ANSI/ISA-101.01-2015 es la norma de interfaces para la automatización de procesos (ISA). Ordena las pantallas en una jerarquía de cuatro niveles. En palabras de Fitzpatrick (2018):

- **Nivel 1:** «overviews for monitoring span of control»;
- **Nivel 2:** «operating displays for major areas of the span of control»;
- **Nivel 3:** «detailed displays used for general troubleshooting»;
- **Nivel 4:** «auxiliary displays used for focused troubleshooting or intermittent task support».

Las definiciones textuales de la norma no las leí: no tengo el documento (**NO VERIFICADO** en la fuente primaria). Las de arriba vienen de una fuente secundaria, citada en §10.

| Nivel | En TRIM | La pregunta | Qué muestra | Qué no muestra | Hoy está en |
|---|---|---|---|---|---|
| **N1 · Campo** (lo que la persona tiene a cargo) | **La planta viva con la lente técnica**: un campo, o sus campos en filas | «¿Está bien mi campo y dónde miro?» | Lo de §4, más: lo que pueden dar los pozos, la capacidad de cada tramo, «limita» y «le sobran»; **indicadores analógicos** de lo que pasa contra lo que cabe, del agua que entra contra lo que sacan las bombas, del tanque contra el alto-alto y de la presión del aire; **el resumen de alarmas** (las primeras, por prioridad y barriles); «Si falla hoy», los 3 primeros; la producción de 24 h | Las variables de cada equipo; la historia | Producción (la tubería), Planta (el aviso rojo), Turno («Qué limita hoy», «Lo más frágil»), Riesgo («Perdiéndose ahora») |
| **N2 · Área o tren** | Pozos · Recolección · Tren de crudo · Tren de agua · Tren de gas · Servicios (aire, energía) | «¿Qué pasa en esta parte?» | El esquema del tren: equipos en gris, con su marca solo si están anormales; caudales y niveles con su banda. **El tren de agua** con el colchón, «si para otra bomba» y el orden de cierre. **Los pozos** con su estado y su electrosumergible | Las partes; el vigía | Planta (esquema), Agua, Pozos, Electrosumergibles (flota), Superficie |
| **N3 · Equipo** | **La placa**: la bomba con sus variables | «¿Cómo está este equipo?» | Estado (en marcha, parado, disparo, interlock con candado); indicadores analógicos con la banda normal; partes con «cruza en»; «si se para» y «si falla hoy»; colchón y respaldo; últimas paradas; la orden de SAP; las acciones (crear aviso, identificar) | El árbol completo; las métricas de 12 meses | Bombas (placas), detalle de la bomba, del pozo y de la electrosumergible, la ficha (`PanelEquipo`) |
| **N4 · Diagnóstico** | **El porqué** | «¿Por qué falla y qué hago?» | La tendencia de cada variable con su banda y su cruce; la primera alarma y el interlock del PLC; la parada con su cadena de 6 pasos y quién la confirma; la confiabilidad del equipo: tiempo entre fallas con su banda, tiempo fuera, reparación y espera; el procedimiento («No arrancar hasta identificar»); el instrumento: tag, calibración, sin comunicación | — | Bombas (salud por parte, últimas paradas), Identificar (la cadena), Confiabilidad (por equipo), Conectores (tags) |

**La pantalla Bombas de hoy**, con varias placas iguales lado a lado, es una pantalla de grupo: un nivel «1,5» según Hollifield (X2 §3.2). Queda como el índice del N3, en la pestaña Equipos.

**Resultados** es otra cosa. No es un nivel del SCADA: es la historia, el período, el informe. Ahí van Diferidos, Producción del mes, Confiabilidad, Identificación y Mantenimiento.

**Lo que cambia en cada nivel frente a hoy:**
- **N1.** Junta en un lugar lo que hoy está en cuatro pantallas. La tubería, que hoy está en Producción y en Planta, queda una vez. Producción gana «Si falla hoy», que hoy no tiene (§1.2).
- **N2.** El esquema de Planta deja de compartir pantalla con la tubería y con las listas «capturando datos». Tocar un tren lo abre.
- **N3.** La placa de Bombas es buena (§1.4). Se agrega **el grupo de variables normales plegado**:
  - Adair cuenta que estas bombas tienen «9 temperaturas, 2, 3 vibraciones, 2 presiones, succión, descarga, flujo» y la corriente del variador [36:51];
  - mostrar 15 indicadores a la vez es ruido;
  - van abiertas las que están fuera de banda, y las demás en un renglón: «9 temperaturas · todas en banda ›».
- **N4.** Se vuelve **una dirección propia por equipo** (`…/P-201B/diagnostico`). Hoy el diagnóstico vive dentro de una ficha o en el detalle de Bombas.

### 5.2 Por rol: qué niveles usa y por dónde entra

● = lo usa a diario; ○ = lo puede abrir, como contexto. La última columna cuenta los toques desde su inicio.

| Rol | Inicio | N1 | N2 | N3 | N4 | Resultados | Su camino más común |
|---|---|---|---|---|---|---|---|
| **sup** | Hoy | ● | ● el agua: el orden de cierre | ● | ● confirmar la cadena | — | Hoy → «Confirmar las 2»: **1 toque** (hoy son 3, más 1 pantalla de desplazamiento) |
| **oper** | Hoy | ○ qué más está parado | ○ | ● su ruta | ○ las preguntas y el procedimiento | — | Hoy → la parte que se dañó: **1 toque**, con «Deshacer» (hoy son 4) |
| **tec** | Hoy | ○ | ○ | ● | ● registrar qué encontró, partes | — | Hoy → «Qué encontré» en la misma tarjeta: **1–2 toques** (hoy son 3 y otra pantalla) |
| **prod** | Planta (N1) | ● | ● pozos, trenes | ● pozo, electrosumergible | ● el tramo de la parada, el yacimiento, la prueba de pozo | ● producción del mes, cuadre | N1 → tramo → pozo: **2 toques** |
| **jefe** | Hoy | ● | ● | ● | ● tiempo fuera, partes | ● mantenimiento, confiabilidad | Hoy → K-101 → «Crear aviso»: **2 toques** |
| **conf** | Equipos (N3, por «Si falla hoy») | ● | ● | ● | ● vigía, aciertos, tiempo entre fallas | ● confiabilidad, calidad de la clasificación | Equipos → P-201A → «¿Lo vigila TRIM?»: **1 toque** |
| **plan** (v2) | Hoy | ○ | ○ | ● el repuesto | ○ | ● el programa | Hoy → repuesto → equipo: **2 toques** |
| **adm** | Estado | ● para verificar | ● el esquema | ● los tags | ● el instrumento | — | Estado → el paso que falta → Configurar: **1 toque** |

### 5.3 Cómo se navega entre niveles

1. **Bajar es tocar.**
   - Un tramo o un tren del N1 abre su N2.
   - Un equipo en cualquier dibujo o lista abre su N3.
   - En el N3, una parte, una parada o «¿Por qué?» abre el N4.
2. **Subir es por las migas.** Arriba de todo:
   > «La Ceiba › Agua › P-201B › Diagnóstico»

   Cada miga es un toque. En el teléfono también sirve la flecha de volver. Hoy no hay migas: el título es el de la pantalla (§3.5).
3. **De lado, sin subir:**
   - en el N2, pestañas por tren: Pozos · Crudo · Agua · Gas · Servicios;
   - en el N3, ‹ › pasan al equipo vecino del mismo tren (de P-201A a P-201B y a P-201C).
4. **Atajos a lo urgente:**
   - el resumen de alarmas del N1 lleva **directo al N3** del equipo. Es la práctica que describe Fitzpatrick (2018): desde el nivel 1, enlaces a los displays de nivel 3 con alarmas que escalan;
   - las tarjetas de Hoy llevan al N3 o al N4 **con las migas ya armadas**, para poder subir y ver el contexto;
   - la pestaña Equipos es el índice del N3: se busca por tag («P-201B») y se filtra por estado, por tipo y por tren.
5. **Nada a más de 3 toques del inicio.** Es N1 → N2 → N3 → N4. Una documentación de proveedor pide «< 3 clicks to any display» (Tatsoft, fuente secundaria).
6. **El mismo orden en todos los niveles**, de arriba abajo:
   - la frase del estado;
   - la cifra;
   - el dibujo o los indicadores;
   - las listas;
   - «ver más».

   Quien aprende un nivel ya sabe leer los otros.
7. **La dirección guarda el nivel**, y se comparte:
   > `#/conf/planta/morichal/recoleccion/MPP-301/diagnostico`

   Abre lo mismo en el teléfono de otra persona, si tiene ese campo (`url.ts`).

### 5.4 Bocetos de los cuatro niveles

**N1 · La Ceiba, lente técnica (producción, escritorio):**

```
┌─ Planta › La Ceiba ────────────────────────────────────────────── La Ceiba ▾   ?   MR ─┐
│ Limitan los pozos: a la planta le sobran 1.143 bbl/d. Hoy pasan 9.394.                 │
│ ◆ 2 alarmas · ▲ 2 atención · ■ 1 aviso · sin comunicación: 0                           │
│ (Antes)(■ Durante)(Después)                                                            │
│                                                                                        │
│ YACIMIENTO    POZOS · 18            PLANTA                   AFUERA          VENTA     │
│ ░░░░░ ══▶ ┏━━━━━━━━━━━━━┓ ══▶ ┌───────────────────┐ ══▶ ┌────────────┐ ══▶ 9.394       │
│           ┃ 11.857      ┃     │ crudo  13.000     │     │ 14.000     │     bbl/d       │
│           ┃ ◄ limita    ┃     │ agua  ≈14.168  ◆1 │     │ le sobran  │                 │
│           ┗━━━━━━━━━━━━━┛     │ gas   sin medir ┄ │     │ 2.143      │                 │
│                               │ le sobran 1.143   │     └────────────┘                 │
│                               └───────────────────┘                                    │
│ Pasa hoy      ▕█████████████████▌    ▏   9.394 de 11.857 bbl/d · 497 son medición ⓘ    │
│ Agua entra    ▕███████████████████▌ ▏ 174.033 de 178.500 bbl/d (sin P-201B)            │
│ Tanque agua   ▕██████████████████▌│▏  89,6 % · alto-alto 90 % · nivel quieto           │
│ Aire (K-101)  PT-1011 112 psi · degradado ◆1                                           │
│                                                                                        │
│ LAS PRIMERAS DE LA FRANJA                                              ver todas ›     │
│ ◆1 P-201B  bomba de agua · parada desde 03:52 · cerró LC-07 y LC-16 1.665 bbl/d   ›    │
│ ◆1 K-101   aire de instrumentos · ya pasó el límite · si para, ≤ 9.394 bbl/d      ›    │
│ ▲2 LC-21   pozo · cerrado sin causa desde el 1-oct, 18:20             301 bbl/d   ›    │
│                                                                                        │
│ SI FALLA HOY · los 3 primeros                                          ver todos ›     │
│ P-201A ┄ sin instrumento · 3.059 bbl/d después de 2 min · sube porque P-201B paró ›    │
│ P-201C ┄ sin instrumento · 3.059 bbl/d después de 2 min                           ›    │
│ LC-11  electrosumergible · 1.031 bbl/d · sin colchón                              ›    │
│                                                                                        │
│ Producción 24 h  ▃▃▃▃▃▃▃▃▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁  cae a las 03:52 (P-201B)                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- La forma de la tubería es la de §4. La lente técnica le suma los números de capacidad, los indicadores y las listas.
- La segunda línea es **la franja de condiciones** de X2 §3.5: una cuenta por condición, igual en todo nivel 1, 2 y 3. Cada cuenta abre su lista, y cada fila, el equipo. En La Ceiba: ◆1 P-201B y K-101; ▲2 LC-21 y TK-102; ■3 H-302 [demo, Planta y Riesgo].
- Fuentes [demo]:
  - las capacidades, «le sobran» y los 497, de la tubería;
  - «Si falla hoy», de Riesgo del jefe;
  - la presión del aire, de «Capturando datos» de Planta.
- La forma de la curva de 24 h es (ejemplo).

**N2 · El tren de agua de La Ceiba (el teléfono del supervisor):**

```
┌────────────────────────────────────┐
│ ‹ La Ceiba › Agua            ?  NO │
│ Pozos·Crudo·[Agua]·Gas·Servicios   │
│ ◆ 2 · ▲ 2 · ■ 1 · ◌ 0              │
│ El tanque no sube: P-201A y P-201C │
│ toman lo que entra.                │
│ 174.033 bbl/d de agua entran       │
│                                    │
│ AGUA DE LOS POZOS  174.033 bbl/d   │
│   ║  corte 94,9 % · 3 pozos parados│
│ TRATAMIENTO        sin dato ┄      │
│   ║                                │
│ TANQUE  ▕████████████▌│▏ 89,6 %    │
│   ║     alto-alto 90 % · quieto    │
│ BOMBAS  P-201A ┄  89.250        ›  │
│   ║     ◆1 P-201B parada        ›  │
│   ║     P-201C ┄  89.250        ›  │
│ INYECTORES  caben 178.500 hoy      │
│                                    │
│ Durante · ahora                    │
│ P-201B parada desde 03:52: se      │
│ cerraron LC-07 y LC-16 · 1.665/d   │
│ Antes · si para otra bomba         │
│ cerrar primero LC-02, LC-10,       │
│ LC-01…: dejan de producirse 3.059  │
│ bbl/d después de 2 min  Ver orden ›│
│ Después · lo que pasó              │
│ Paró con el tanque al 78,7 %: TRIM │
│ previó 1,8 h y se llenó en 1,8 h  ›│
├────────────────────────────────────┤
│  ○ Hoy (3)   ● Planta   ○ Equipos  │
└────────────────────────────────────┘
```

Las tres filas de abajo son las que ya tiene Agua (HOY, SI PARA OTRA BOMBA, LO QUE PASÓ), con los nombres de los tres momentos. «Por qué es crítica» pasa a la ⓘ del título. Cifras [demo], de la pantalla Agua de La Ceiba.

**N3 · La placa de MPP-301, la multifásica del clúster norte de Morichal (confiabilidad, escritorio).** Es el tipo de bomba que Adair propuso para el piloto [33:45]:

```
┌─ Planta › Morichal Norte › Recolección › MPP-301 ──────────────────────────────────────────┐
│ ▲2 Bomba multifásica de doble tornillo · clúster norte (MN-07, MN-18, MN-33)               │
│    en marcha · perdiendo eficiencia · lleva la producción a la planta                      │
│                                                                                            │
│ Si se para: 1.600 bbl/d de inmediato · ≈ 3.245 bbl si falla hoy                            │
│                                                                                            │
│ Caída de presión del filtro   ▕──────────▒▒▒▒▒▒▒▒▒──┼────▲──▏  9,6 psi  ▲2 fuera de banda  │
│ Vibración                     ▕────▒▒▒▒▒▒▒▒▒▒▒▒─▼───┼──────▏  4,3 mm/s                     │
│ Velocidad                     ▕──────▒▒▒▒▒▒▒▒▒▼▒▒▒──┼──────▏  1.535 rpm                    │
│ Nivel del depósito de barrera ▕──┼──▒▒▒▒▒▼▒▒▒▒▒▒▒▒──────────▏  71 %                        │
│ 9 temperaturas · todas en banda ›                         (ejemplo: lo que pidió Adair)    │
│                                                                                            │
│ PARTES                                           cruza el límite en                        │
│ ▲2 Filtro de entrada      caída de presión          5,2 d (4,7–5,7)         ¿Por qué? ›    │
│ ■3 Rodamientos                                     10,3 d                   ¿Por qué? ›    │
│ ■3 Tornillos y holguras                            17,5 d                   ¿Por qué? ›    │
│ ■3 Sellos mecánicos (cuatro)                       33,0 d                   ¿Por qué? ›    │
│ · 2 partes estables                                                                        │
│                                                                                            │
│ 7 fallas en 12 meses · una cada 52 d · 2,0 d fuera cada vez · le ha costado 3.226 bbl      │
│ por falla                                                                                  │
│ [ Crear aviso en SAP ]   [ Ver la historia del PLC ]                                       │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- Las variables, las partes, los cruces y la historia son [demo], de la placa de Bombas de confiabilidad en Morichal y de su Riesgo.
- ▒ es la banda normal; ▼ es el valor; ┼ es el límite.
- **Una marca por equipo.** Hoy la placa de MPP-301 en Bombas lleva ■3, y su fila en Riesgo, ▲2 [demo]. Con la regla de §5.6 va la misma en los dos; aquí, ▲2, la de su parte fuera de banda. Es el caso B10 de X2, en otra pantalla.
- **Con el equipo parado, la placa lleva una sola marca**: la de la parada. Sus variables van en gris con «parada», sin prioridad propia. Hoy P-201B parada muestra cuatro rombos (X2 §2, B9).
- La única marca de color va en la variable fuera de banda y en su parte (ISA-101).
- No lleva ‹ ›: es la única bomba de la recolección de Morichal. En la placa de P-201B, ‹ › pasan a las otras seis bombas de agua del campo.

**N4 · El diagnóstico del filtro de entrada de MPP-301:**

```
┌─ … › MPP-301 › Diagnóstico · filtro de entrada ────────────────────────────────────────────┐
│ La caída de presión del filtro sube desde el 28-sep: cruzaría el límite en 5,2 días        │
│ (entre 4,7 y 5,7).                                                     (fecha: ejemplo)    │
│                                                                                            │
│ Caída de presión del filtro · 14 días                                                      │
│ psi  ┼────────────────────────────────────────────────────────── límite                    │
│      │                                       ....·····´´´  ← proyección                    │
│      │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  banda normal                                │
│      └──────────────────────────────────────────────────────────── hoy ──────────          │
│                                                                                            │
│ Lo que dice la historia: esta bomba falló 7 veces en 12 meses: 4 por los sellos, 2 por     │
│ tornillos y holguras, 1 por lubricación. El filtro no causó ninguna: es una señal nueva.   │
│ ¿Le creo al vigía? En Morichal, desde el 1-sep: acertó 1 de 3 avisos, con 2 falsas         │
│ alarmas; 3 intervenidas sin calificar.                                                     │
│ Una señal apunta, no prueba: la causa la confirma quien abre el equipo.                    │
│                                                                                            │
│ Qué hacer: cambiar o limpiar el filtro antes de 4,7 días.  [ Crear aviso ]  [ Ver orden ]  │
│ ▸ Primera alarma e interlocks del PLC · ▸ Instrumento PDIT (tag, calibración)              │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- «Acertó 1 de 3 · 2 falsas alarmas · 3 intervenidas, sin calificar» y el reparto de las 7 fallas (sellos 4, tornillos y holguras 2, lubricación 1) son [demo], de Confiabilidad de Morichal.
- La frase «una señal apunta, no prueba» es la regla de Hollman [37:34] (PLAN-MAESTRO §2).
- La curva, el tag y la fecha de inicio son (ejemplo).

### 5.5 El supervisor y el operador, en el teléfono: «lo que me toca ahora»

**El operador.**
- Una pregunta a la vez, de verdad: la tarjeta ocupa la pantalla y la siguiente espera.
- Contestar es **un toque** en la opción, con «Deshacer» durante 5 segundos. Lo que escribe o la foto son opcionales.
- Su respuesta no confirma la cadena: la confirma su supervisor (U2 §3.1). Por eso un toque basta.

```
┌────────────────────────────────────┐
│ Hoy · La Ceiba               ?  JP │
│ ◆ 2 · ▲ 2 · ■ 1 · ◌ 0              │
│ ┌────────────────────────────────┐ │
│ │⊘ No arrancar P-201B hasta decir│ │
│ │  qué se dañó                   │ │
│ └────────────────────────────────┘ │
│ Tiene 4 preguntas.          1 de 4 │
│                                    │
│ ◆1 P-201B · bomba de agua          │
│ Paró hoy a las 03:52 (hace 10 h)   │
│                                    │
│ ¿Qué parte se dañó?                │
│ Lo que más le ha fallado:          │
│ ┌────────────────────────────────┐ │
│ │ Sello mecánico                 │ │
│ │ 5 de 8 fallas                  │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ Rodamientos y cámara de empuje │ │
│ │ 3 de 8 fallas                  │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ Otra parte                     │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ Todavía no sé                  │ │
│ └────────────────────────────────┘ │
│ + Lo que encontró, o una foto      │
│                                    │
│ Siguiente: LC-21 · pozo ›          │
├────────────────────────────────────┤
│  ● Hoy (4)   ○ Planta   ○ Equipos  │
└────────────────────────────────────┘
```

- «5 de 8 fallas» y «3 de 8 fallas» son [demo] (Identificar del operador).
- «⊘» es el bloqueo de procedimiento (§5.6, punto 4): va en tinta, no en rojo.
- «Todavía no sé» es nueva: deja la pregunta abierta y vuelve en la próxima ronda de WhatsApp. Hoy la única salida es escoger una parte de la lista.
- El historial de WhatsApp, la señal y los planes salen de esta pantalla. Están en el detalle de la parada (N4), a un toque desde «P-201B».

**El supervisor.**
- Su turno en una lista: arriba, lo que tiene hora; abajo, lo hecho.
- El ciclo y las cinco cifras de Turno quedan en **una** cifra y **una** frase.
- «Lo más frágil» va como un renglón, no como una tarjeta: no pide nada ahora.

```
┌────────────────────────────────────┐
│ Hoy · La Ceiba               ?  NO │
│ ◆ 2 · ▲ 2 · ■ 1 · ◌ 0              │
│ Se dejan de producir 1.966 bbl/d.  │
│ Le faltan 4 paradas por confirmar: │
│ el reporte sale mañana a las 07:00.│
│ ┌────────────────────────────────┐ │
│ │⊘ No arrancar P-201B hasta      │ │
│ │  identificar qué se dañó       │ │
│ └────────────────────────────────┘ │
│ Confirmar 2 paradas iguales        │
│ ◆1 P-201B cerró LC-07 y LC-16      │
│ 1.665 bbl/d · desde las 05:43      │
│ [ Confirmar las 2 ]     Ver una ›  │
│                                    │
│ Conseguir la causa de LC-21        │
│ ▲2 LC-21 lleva 19 h sin causa: se  │
│ escaló a las 20:20 y nadie         │
│ contestó · 301 bbl/d               │
│ [ Responder yo ]        Llamar ›   │
│                                    │
│ Seguir la orden de K-101           │
│ ◆1 K-101 (aire) ya pasó el límite  │
│ Orden 40012056, liberada a Óscar   │
│ Daza                       Ver ›   │
│                                    │
│ Lo más frágil: el agua. Si para    │
│ otra bomba, cerrar LC-02, LC-10,   │
│ LC-01…                Ver orden ›  │
│ Hecho hoy (2) ⌄                    │
│ [ Entregar turno ]                 │
├────────────────────────────────────┤
│  ● Hoy (3)   ○ Planta   ○ Equipos  │
└────────────────────────────────────┘
```

- Cifras [demo], de Turno, Identificar y Mi trabajo de La Ceiba.
- La segunda línea es la franja de condiciones de La Ceiba (X2 §3.5): ◆ 2 alarmas, ▲ 2 atención, ■ 1 aviso y ◌ 0 sin comunicación. Cada cuenta abre su lista.
- La insignia dice 3: el número de tarjetas que piden algo, no de paradas. «Lo más frágil» no cuenta.
- **«Entregar turno»** arma el resumen del turno con:
  - lo que paró y lo que quedó pendiente;
  - el WhatsApp del turno;
  - la firma de quien entrega.

  Se comparte por WhatsApp o en PDF. Reemplaza la pantalla Turno, que hoy mide 2,2 pantallas en el teléfono [medido X4].

**El técnico.** El mismo patrón:
- una lista sin repetidos;
- P-201B una sola vez, con «Diga qué encontró» en la tarjeta;
- K-101 una sola vez, con su orden;
- las paradas programadas al final, como «Lo que viene».

Registrar se hace en la misma tarjeta, sin pasar a otra pantalla.

### 5.6 Colores y alarmas: lo que la arquitectura necesita

- **La paleta es de X1 (§4.0) y de X2 (§4), sobre U1 §9.** No la repito.
- **No es «la paleta de ISA-101».** X2 §1.8 muestra que la norma pide gris para lo normal y forma más texto, pero no fija colores: lo de Adair es una convención de sitio. TRIM la adopta como guía de estilo configurable por operadora.
- **Lo que pidió Adair** [33:45], que la arquitectura respeta en todos los niveles:
  - morado = falla de comunicación;
  - rojo = interlock;
  - naranja y amarillo = alarma.
- **Lo que exige la arquitectura:**
  1. **Una marca, en todos los niveles y en Hoy.** P-201B lleva la misma marca en la fila de su campo, en el N1, en el N2, en su placa y en la tarjeta de Hoy.
  2. **Cada lista, su orden; la misma marca en las dos.** El resumen de alarmas del N1 va por prioridad y luego por barriles en juego. Hoy va por lo que tiene hora y luego por barriles (§3.3), porque ordena tareas, no equipos.
  3. **Lo que no pide acción no tiene color ni insignia.** Una alarma es lo que pide «a timely response» (ISA-18.2-2016, vía Stauffer, 2016).
     - «Limita» es gris (U2 §0.4).
     - «Sin instrumento» es gris discontinuo.
     - «Cambió lo que limita» es un aviso sin insignia.
  4. **El candado.** «No arrancar hasta identificar» es un bloqueo de procedimiento.
     - U1 §9 propone el candado y el rojo para el interlock del PLC.
     - La arquitectura pide que los dos **no** se confundan: el bloqueo de procedimiento va como franja fija arriba de Hoy y de la placa, en tinta, con su ícono. El rojo queda para el interlock real.
     - En los bocetos, el bloqueo va con «⊘».
     - Es una decisión para validar con Adair (§7.4, tarea A3).

---

## 6. Contenido y primera entrada

### 6.1 Reglas de escritura

1. **Una cifra grande por vista, con su unidad y una frase.**
   - La frase dice qué pasa y dónde, en ≤ 20 palabras.
   - La cifra lleva pocas palabras: «1.966 bbl/d · se dejan de producir ahora».
2. **La frase empieza por lo que pasa** y nombra el equipo con su familia:
   > «P-201B (bomba de agua) paró a las 03:52 y obligó a cerrar LC-07 y LC-16.»

   No: «Se registra una disminución del caudal en el tren de agua».
3. **Usted, siempre.** Hoy se mezclan el tú y el usted (§1.3.9; X1 §6.5).
4. **Palabras de campo**, las de U2 §1:
   - se dicen: «se trabó», «limita», «Si falla hoy», «colchón», «cerró», «paró», «por identificar», «no arrancar», «acuatosos», «pórtico», «red de media», «pitera», «tea», «se regó»;
   - no se dicen en las pantallas de campo ni en las del gerente: «choke» (solo en la ⓘ), «downtime», «KPI», «brecha», «dominante», «exportación» (se dice «afuera»), «reservorio» (se dice «yacimiento») (U2 §1.4);
   - MTBF y MTTR, solo en ingeniería y con su nombre en español: «tiempo entre fallas», «tiempo fuera».
5. **Diferido no es pérdida, tampoco en la voz** (X1 §4.0, punto 10).
   - Lo diferido «se deja de producir», «no pasa» o «se trabó». «Se pierde» es solo para la pérdida.
   - Excepción: en Agua, el producto ya dice «se pierden 3.059 bbl/d de crudo» para un diferido. Pasa a «dejan de producirse».
6. **Un nombre, una cifra** (§3.1, regla 4). Si cambia el alcance, cambia el rótulo.
7. **Tres palabras de origen en la pantalla, no seis:**
   - **«medido»**, si sale del medidor;
   - **«calculado»**, si sale de una cuenta con datos medidos;
   - **«simulado»**, si es lo que podría pasar.

   Hoy conviven seis (medido, calculado, provisional, simulado, firmado, sin firmar: X1 §3.4.4). «Provisional», «firmado» y «sin firmar» van a la ⓘ, salvo en Resultados, en Configurar y en el papel, donde la custodia decide. Lo estimado lleva «≈».
8. **Lo simulado nunca es la cifra grande**, y lleva la palabra en la misma línea, no en una ficha aparte.
9. **El tiempo como se dice en campo:** «hoy a las 03:52», «hace 10 h», «cruza en 4 h», «2 de oct» (`formatoFecha`).
10. **Unidades:**
    - bbl para volumen y bbl/d para ritmo, nunca los dos en la misma cifra grande;
    - sin decimales por encima de 100;
    - los rangos, en la ⓘ, salvo en ingeniería.
11. **Nada de párrafos de cálculo en la pantalla.** La cuenta va en la ⓘ o en el papel (X1 §3.3.2). En la pantalla, una frase.
12. **Los números 1·2·3 son de las prioridades.** Nada más se numera así: ni Antes · Durante · Después ni «1 · Intervenir».
13. **Los botones dicen lo que hacen:** «Confirmar las 2», «Responder yo», «Crear aviso», «Entregar turno». Nunca «Aceptar», «OK» ni «Ir».
14. **Los vacíos enseñan:** «Nada pendiente. El campo está normal.», «Nada se trabó en octubre (en curso).»

**Antes y después, con textos reales del demo:**

| Hoy dice | Dónde | Pasa a decir |
|---|---|---|
| «Barriles que no se produjeron, el retorno posible del ciclo antes / durante / después, y si baja contra la meta que usted firmó. Usted fija las metas de cada campo y da los accesos.» | Introducción del gerente (`roles.ts`, `foco`) | «Aquí ve dónde se quedan los barriles en sus campos, por qué equipos, y si está bajando.» |
| «Explicas el mes en barriles: el factor de asignación en banda, la custodia completa y nada sin identificar.» | Introducción de producción | «Usted explica cada barril del mes: qué limitó, qué paró y qué falta identificar.» |
| «Durante: identificar antes de arrancar (causa → SAP/ISO).» | Para qué de Identificar (`Onboarding.tsx`) | (desaparece) La tarjeta de Hoy dice: «Diga qué se dañó antes de arrancar.» |
| «Antes: vigía y partes que avisan. Durante: orden de cierre y tanque.» | Para qué de Bombas | (desaparece) Equipos dice: «Cómo están sus equipos y cuál avisa.» |
| «45.233 bbl · retorno · 2,2 M USD», como la cifra grande | Resumen del gerente | La frase de lo que pasa y, en cada momento, «≈ 2.102 bbl se pueden mover ahora · simulado» |
| «Perdiéndose ahora · 1.665 bbl/d» | Bombas | «Por bombas paradas: 1.665 bbl/d» |
| «del diferido, programado · 0,0 % · 0 bbl · 1.046 bbl no programado (libro)» | Mantenimiento | «Ninguna parada de este mes estaba programada: los 1.046 bbl fueron fallas o siguen sin identificar.» |
| «Con las tres bombas, cabe más agua: 43.675 bbl/d (sin contar la capacidad del tratamiento de agua: no tiene dato).» | Agua | «Con las tres bombas, al agua le sobra espacio. Si para una, hay que cerrar pozos.» Las cifras, en la ⓘ |
| «1 · Antes · 8 equipos · hasta 14.655 bbl/d en juego · ≈ 45.262 bbl de exposición · sin 1 servicio» | Riesgo del gerente | «8 equipos avisan. El más cercano: K-101 (La Ceiba), ya pasó el límite.» |
| «Conteste aquí, una pregunta a la vez. Lo técnico lo revisa su supervisor.» | Identificar del operador | Se queda: es buena. Y se cumple: una tarjeta a la vez |

### 6.2 La primera entrada

**Lo que se quita:** el modal de dos pasos. No se presenta una lista de pantallas: con 3 o 4 pestañas, la lista sobra. Tampoco el párrafo del «foco», con fichas 1·2·3 (§1.3.9).

**Lo que se pone:**
1. **Entrar directo al inicio del rol, con sus datos.** La primera pantalla ya responde su pregunta (§3.4).
2. **Tres señas encima del inicio de verdad**, en el orden de la lectura de 10 segundos (§4.9): la frase, la cifra y lo marcado o la primera tarjeta.
   - Una línea cada una.
   - Se pasan con «Siguiente» y se cierran con «Ya entendí».
   - No vuelven, salvo con «?».
3. **Un primer acierto.** La tercera seña pide **una acción real y reversible**: abrir el campo, contestar la primera pregunta o abrir la primera bomba. Se aprende haciendo.
4. **«?» se queda** en la cabecera. Prende las líneas de lectura de la pantalla que se está viendo (`Lectura`), como hoy «¿cómo se lee?».
5. **Mientras carga, una frase.**
   - Nubank, en su rediseño de 2018, mostraba a quien entraba por primera vez un «fake loader» que explicaba el tablero nuevo mientras cargaba (Neumann, 2018).
   - En TRIM, la primera carga de Planta dice:
     > «Su planta, de izquierda a derecha: el yacimiento, los pozos, la planta y la venta. Lo oscuro pasa; lo rayado no pasa, y está donde se trabó.»

**Las tres señas de cada rol:**

| Rol | 1 · La frase | 2 · La cifra o el control | 3 · El primer acierto |
|---|---|---|---|
| **ger** | «Esto es lo que pasa ahora en sus campos, en una frase.» | «Antes: lo que puede fallar. Durante: lo que se deja de producir ahora. Después: lo que ya costó.» | «Toque La Ceiba para ver dónde se trabó.» |
| **reg** | «Si el reporte pasa, o qué le falta.» | «Quién lo debe y para cuándo.» | «Toque lo que falta para pedirlo.» |
| **prod** | «Qué limita hoy al campo.» | «Lo oscuro pasa; lo rayado no, y está en el tramo donde se trabó.» | «Toque el tramo que limita.» |
| **sup** | «Lo que se deja de producir ahora en su campo.» | «Lo que le toca, en orden: lo que tiene hora va primero.» | «Confirme estas 2, o véalas una por una.» |
| **oper** | «Esto no se hace hasta contestar.» (la franja «No arrancar») | «Aquí le llegan las preguntas que solo usted puede contestar. Una a la vez.» | «Un toque y listo. Si se equivoca, toque «Deshacer».» |
| **tec** | «Lo que le toca hoy, en orden.» | «Lo que usted encuentra le enseña al vigía.» | «Diga qué encontró en P-201B.» |
| **jefe** | «De cada falla, cuánto es reparar y cuánto es esperar.» | «Lo que hay que intervenir ya.» | «Abra K-101 y cree el aviso.» |
| **conf** | «Ordenados por lo que le quitan al campo si fallan hoy.» | «Sin instrumento, TRIM no ve venir la falla.» | «Abra P-201A: ¿por qué subió?» |
| **adm** | «Lo que falta en cada campo, en orden.» | «Empiece por aquí.» | «Complete este paso; al final se firma.» |

**El operador** suele conocer TRIM antes por WhatsApp (6D.8). Su primera seña lo conecta: «Las preguntas que le llegan por WhatsApp también están aquí.»

---

## 7. Pruebas con usuarios reales

### 7.1 El formato

**Antes de construir.**
- Se prueba **con prototipos**, hechos con estos bocetos y con los de X1 (`ux/X1/prototipos/`).
- Se ponen frente al demo de hoy: **las mismas tareas en los dos**, para medir la mejora y no solo la opinión.

**La sesión.**
- Individual, de 45 minutos, presencial o por videollamada con la pantalla compartida.
- El gerente, Edinson y Adair, en el computador; el campo, en su teléfono.

**Qué se mide en cada tarea:**
- si la hizo, sin ayuda;
- el tiempo;
- **cuántos toques** usó;
- **los errores de lectura**. El que más importa: leer lo simulado como logrado.
- Después de cada tarea, la pregunta de facilidad de 1 a 7 (Single Ease Question; Sauro, MeasuringU). Su media de referencia ronda 5,5.
- Se piensa en voz alta.

**Cuántos.**
- Con 5 personas se encuentra cerca del 85 % de los problemas. Con dos grupos distintos, 3 o 4 por grupo (Nielsen, 2000).
- Gerentes: 3 a 5.
- Edinson y Adair son expertos: una sesión de revisión de 60 a 90 minutos con cada uno. Además, se les pide presentar a 2 o 3 colegas de su oficio para la prueba de tareas.

**Datos.**
- Se usa el demo.
- Nada real de una operadora sin su acuerdo.
- Se graba con permiso.

### 7.2 Con el gerente

Gerentes de activo o de producción reales. Los consigue Hollman; Edinson puede presentar.

| # | Tarea | Éxito |
|---|---|---|
| **G1** | **Diez segundos.** Se le muestra Planta (todos sus campos, Durante) 10 s y se tapa: «¿Qué pasa, dónde y por qué equipo?» Con dos dibujos, en orden alterno: con contorno (tres capas, §4.2) y sin él (lo que pasa y lo que no pasa) | Dice La Ceiba, P-201B (bomba de agua o de reinyección) y unos 2.600 bbl/d. **Criterio: 4 de 5**. Si las tres capas confunden, el contorno queda para la lente técnica (X1 §6.7) |
| **G2** | «¿Qué campo le costó más este mes, y por qué equipo?» | Morichal Norte (1.253 bbl) y MN-41 (electrosumergible, 1.083 bbl) [demo], en ≤ 30 s y ≤ 2 toques |
| **G3** | «¿Está bajando?» | Encuentra «desde que entró TRIM» y dice las dos flechas: en La Ceiba bajó la planta y subieron los pozos. Dice que es una muestra corta |
| **G4** | «¿Qué puede fallar pronto y cuánto costaría?» (Antes) | Nombra K-101 (ya pasó el límite) o las bombas sin instrumento; no confunde «avisa» con «parado» |
| **G5** | «Explíqueme qué es Antes, Durante y Después aquí» | **Nadie lee «Antes» como el pasado.** Se prueban dos rótulos: con aclaración («Antes · lo que viene») y sin ella. En el escritorio, también la tabla de tres renglones contra un solo momento |
| **G6** | **Las palabras.** «¿Cómo le dice a esto?», señalando el tramo marcado. «¿Qué nombre le pondría a esta pestaña?» | Se anota su palabra. Se ponen frente a frente: «limita», «cuello de botella» y «tope»; «Planta», «Activo» y «Campos»; «Resultados» y «Mes». Y «gemelo digital»: «¿qué esperaría de algo con ese nombre?» (si espera simular, se confirma §4.1) |
| **G7** | «¿Por qué no se produjeron los 573 bbl de la planta de La Ceiba?» | Llega a «No planeada · falla de la planta (bombeo de agua)» y a la ficha de P-201B, en ≤ 2 toques. Responde «¿qué se está haciendo?» |
| **G8** | **La trampa.** «¿Cuánto ha recuperado gracias a TRIM?» | **No** responde con la cifra simulada: dice que «se pueden mover» es una simulación. **Criterio: 0 errores** |

Al final: «¿Qué le sobra? ¿Qué le falta? ¿Se lo mandaría a su jefe tal como está?».

### 7.3 Con Edinson (confiabilidad)

| # | Tarea | Éxito |
|---|---|---|
| **E1** | **El árbol debajo de cada tramo**, con 10 paradas del demo. Es la tarea de U2 §10.2, ahora desde la hoja del tramo: «¿Este tramo y esta rama son los que usted pondría?» | **9 de 10 de acuerdo**. Las que no, se anotan con su porqué |
| **E2** | **Equipos por «Si falla hoy»**, el inicio de confiabilidad: «¿Ataca en este orden? ¿Qué columna falta?» | Dice si el orden le sirve para escoger instrumento y ruta, y qué le falta («¿alcanza el repuesto?», la banda del tiempo entre fallas) |
| **E3** | **«¿Cuánto le creo?»**: lea «acertó 1 de 3, 2 falsas alarmas» y el tiempo entre fallas con su banda | Lo diría así a su gerente, o propone otra forma |
| **E4** | **La cifra que abre cada familia** (su pedido [22:34]): para las de reinyección, las electrosumergibles y las multifásicas | Escoge entre tiempo entre fallas, tiempo fuera, reparación activa y logística. Queda como configuración por operadora (PLAN-MAESTRO §3, «Métricas») |
| **E5** | **La planta viva del gerente**: «¿Un gerente de su operadora la entendería?» | Señala lo que confunde. Dice si «filosofía operacional» es el nombre de lo que arma el dibujo |
| **E6** | **Diferido contra pérdida**: el estrechamiento rayado y la gota | Confirma que coincide con su definición [26:48]. Dice cómo se dibujaría una pérdida sin parada (tea, rechazo) |
| **E7** | **Hoy del técnico**, contra su dolor de las órdenes en papel [22:34]: «¿Con esto se cierra el día sin papel?» | Dice qué falta: rutas, campañas de vibración, fotos |

### 7.4 Con Adair (automatización)

| # | Tarea | Éxito |
|---|---|---|
| **A1** | **Los cuatro niveles.** De Planta de Morichal al diagnóstico del filtro de MPP-301, y de vuelta a P-201B de La Ceiba | Llega sin ayuda, en ≤ 3 toques por bajada, y sube por las migas sin perderse |
| **A2** | **La placa (N3).** «¿Están las variables que un operador espera en una multifásica o en una de inyección?» | Revisa sus «9 temperaturas, 2, 3 vibraciones, 2 presiones, succión, descarga, flujo» y la corriente del variador [36:51]. Dice si el grupo plegado («todas en banda») le parece seguro |
| **A3** | **Colores y marcas.** Interlock en rojo con candado, alarmas en naranja y amarillo, falla de comunicación en morado, normal en gris, y «⊘ No arrancar» (bloqueo de procedimiento) | No los confunde: en el monitor de una sala de control, en el teléfono al sol y con la simulación de daltonismo (`ux/X1/scripts/contraste.mjs`) |
| **A4** | **El resumen de alarmas** del N1 y la franja (X2 §3.5): el orden por prioridad y por barriles | Cumple lo que espera de una alarma («pide una respuesta a tiempo», ISA-18.2). Dice qué sobra |
| **A5** | **Un dato que no llega**: se corta un tag en el prototipo | Ve el morado en N1, N2 y N3, y las cifras que dependen de él en «---» o con «al menos» |
| **A6** | **El piloto**: qué tags existen en la bomba que se escoja (PLAN-MAESTRO, F0) | Confirma o corrige el contenido del N3 y del N4 para ese equipo |

### 7.5 En campo: operador, supervisor y técnico

El protocolo es el de U1 §11.1: de 5 a 8 personas, en campo, con su propio teléfono y con guantes. Se agregan tres tareas:

| # | Tarea | Éxito |
|---|---|---|
| **O1** | Contestar la primera pregunta | 1 toque; usa «Deshacer» si se equivoca |
| **S1** | Confirmar las 2 iguales y conseguir la causa de LC-21 | ≤ 2 toques por tarjeta; entrega el turno |
| **T1** | Decir qué encontró en P-201B | En la misma tarjeta, sin pasar a otra pantalla |

### 7.6 Cuándo se pasa a construir

- **G1**: 4 de 5 gerentes.
- **G8**: ningún error.
- **E1**: Edinson de acuerdo en 9 de 10 paradas.
- **A1 y A3**: Adair aprueba, o deja una lista corta de cambios.
- **Campo**: la tarea principal en ≤ 2 toques para 4 de 5 personas.
- **Todas las tareas**: una facilidad media de 5,5 o más.

---

## 8. Cómo se prueba en el código

El brief exige que lo nuevo se pruebe como hoy: con las 209 pruebas e2e y el auditor que recorre 100 rutas en 5 anchos. No se toca código en esta fase; esto es lo que habrá que agregar.

1. **Las rutas nuevas en `e2e/auditoria/rutas.ts`**, para los 5 anchos de `ANCHOS`:
   - cada rol × su inicio, sus pestañas y un camino de niveles;
   - por ejemplo, `#/conf/planta/morichal/recoleccion/MPP-301/diagnostico`.
2. **Ninguna función perdida.** Una prueba toma **cada** ruta de la `RUTAS` de hoy y comprueba que lleva a su lugar nuevo (§3.8), con su contenido: la tabla de §3.7 hecha prueba.
3. **Las aserciones de cada inicio** (`ASERCIONES`):
   - hay una frase, de ≤ 20 palabras;
   - hay **una sola** cifra principal (`data-cifra-principal`);
   - la cifra principal **no** dice «simulado»;
   - el gerente no ve los términos de `NO_DECISION`, que ya existen;
   - Hoy del operador pinta **una** pregunta (`data-pregunta` cuenta 1).
4. **Lo que se ve sin desplazarse.**
   - La respuesta de cada rol está dentro de la primera ventana, a 390 y a 1280 px: es la medida de `respuesta.mjs`, hecha prueba.
   - En el teléfono, como mucho 5 cifras en esa ventana.
5. **El presupuesto de toques.** Un flujo por rol cuenta los clics desde su inicio hasta su acción principal: sup 1, oper 1, tec ≤ 2, jefe ≤ 2, ger ≤ 2 hasta la ficha.
6. **Un nombre, una cifra.** Una prueba lee «se deja de producir ahora» de La Ceiba en Hoy, en Planta y en la fila de todos los campos, y exige el mismo número. Habría atrapado los seis casos de §1.3.3.
7. **Navegación.** Migas en todo N2, N3 y N4; volver funciona; ningún N4 a más de 3 clics del N1.
8. **Accesibilidad.**
   - El `aria-label` del dibujo es la frase.
   - Tab recorre los tramos y Enter abre la hoja (U2 §2.8).
   - La tabla equivalente existe.
9. **Sin librerías nuevas.** La planta viva es SVG propio, como la tubería de hoy. No necesita `eval` y cumple la política de seguridad del demo (brief).

---

## 9. Desacuerdos

1. **Con U2 §3.2 y 6D («el gerente no ve la tubería»).**
   - Propongo que **la vea**, en su lente: el proceso, dónde se trabó, «limita» como forma y palabra, y las tres fases.
   - Sin potenciales, capacidades en número, carriles con cifras, códigos ni «choke»: eso de U2 se conserva.
   - Motivo: el pedido del dueño del 25-oct («su planta, el proceso, el pipeline»). X2 §3.3 llega a lo mismo desde la norma (el nivel 1 del gerente como «la planta y el proceso»).
2. **Con `11-ciclo-de-valor.md` §11.1b (el retorno simulado arriba de todo en el Resumen).**
   - El retorno deja de ser la cifra grande y se parte por momento, con «simulado» en la línea (§4.4).
   - X1 §6.2 y X2 §2 (B14) dicen lo mismo.
   - El riesgo comercial: el pitch pierde su «número grande». Se cuida dejando la suma en Resultados («retorno posible del ciclo · simulado»), donde el vendedor la puede mostrar sin que el gerente la lea como lograda.
3. **Con U2 §1.4 («cuello de botella» prohibido en pantalla).**
   - El dueño usa esa palabra. Mantengo «limita» y lo pruebo (G6).
   - Si los gerentes dicen «cuello de botella», se usa **solo** en la lente del gerente y **solo** para «limita», nunca para «dónde se trabó», que es el uso de la circular (U2 §1.4).
4. **Con U1 §1.2 (más bloques en las pantallas de hoy).**
   - U1 agrega a Turno «Cierre de hoy para la ANH», a Diferidos cuatro vistas y a Mantenimiento el programa y los 5 tramos.
   - La arquitectura saca las acciones a Hoy y deja el análisis en Resultados. Lo que U1 diseñó se conserva, pero no se apila.
5. **Con la revisión del 6-oct en `roles.ts`** («al jefe y a confiabilidad Riesgo sí les aporta»).
   - Lo que aporta se conserva: lo parado ahora, los equipos que no son de alto impacto como el aire, y «Si falla hoy».
   - Lo que se va es **la puerta**: queda en Equipos (su orden), en Planta (N1) y en Hoy.
6. **Con X2 §3.2 (Resultados como nivel 2 o 4 de producción).** X2 ordena en niveles las pantallas de hoy. Para la arquitectura nueva coincidimos: su nota «Coherencia con la arquitectura nueva de X4» respalda N1 a N4 y dice que Hoy es una pantalla de tarea.
   - X2 pone «Día a día», Diferidos y el factor dentro de la escalera de producción.
   - Yo los separo en **Resultados**, fuera de la escalera, porque viven en un período y solo ahí va el selector de período (§3.1, regla 8).
   - Es una diferencia de nombre más que de fondo: en términos de ISA-101, Resultados son pantallas de nivel 2 y 4 de período. Lo decide la prueba con producción.
7. **Con X2 §3.3 sobre los niveles del gerente.**
   - Coincidimos en el contenido. X2 numera N1 = todos los campos, N2 = el campo, N3 = la ficha y N4 = el soporte.
   - Yo llamo a los dos primeros «La planta viva» a dos escalas. Para construir y probar, adopto la numeración de X2.
8. **Con X1, la fuente de Nubank.**
   - X1 §1 cita «Lucas Neumann (building.nu.com, 15-mar-2018)».
   - El artículo que yo abrí, *Designing a multi-product experience*, firma «Guilherme Neumann – Former Head of Design», con fecha «13 Jun, 18».
   - Puede ser otro artículo de la serie; conviene que X1 lo revise.
   - Coincido con todo su diagnóstico (§3.3 y §3.4) y con su dirección C, que usa la anatomía de §4.2.
9. **Con X1 §6.7 y X2 §3.3: el dibujo en tres capas.**
   - X2 pide el alto de cada tramo proporcional a su capacidad. Mi primera versión decía que el grosor era lo que pasa.
   - X1 propone que caben juntas, y así queda en §4.2: contorno = lo que cabe, relleno = lo que pasa, rayado = lo que no pasa, en su tramo.
   - X1 advierte que tres capas pueden ser mucho para el gerente. Por eso G1 prueba con contorno y sin él.
10. **Con `01-propuesta-de-valor.md` §1.6.** No es un desacuerdo: confirmo la reserva de «gemelo digital» (§4.1). Lo decide el dueño.
11. **Con PLAN-MAESTRO §4 frente a `roles.ts`.**
    - La pregunta de producción incluye «dónde rinde más evitar la próxima parada», pero `roles.ts` no le da Riesgo ni Bombas: hoy no la puede responder (§1.2).
    - La arquitectura lo resuelve con «Si falla hoy» en su N1.

---

## 10. Fuentes

**De la norma y de la industria:**
- ISA. *ANSI/ISA-101.01-2015, Human Machine Interfaces for Process Automation Systems*, aprobada el 9-jul-2015. https://www.isa.org/products/isa-101-01-2015-human-machine-interfaces-for — **El texto no se leyó** (es de pago). Las definiciones de los niveles vienen de la fuente siguiente. Ver X2 §1.1 para lo verificado en el extracto oficial.
- Fitzpatrick, B. «How to design effective HMIs». *Control Global*, 26-jul-2018. https://www.controlglobal.com/articles/2018/how-to-design-effective-hmis — las cuatro definiciones de nivel citadas en §5.1 y los enlaces del nivel 1 a los displays de nivel 3 con alarmas que escalan.
- Tatsoft. «ISA-101 HMI Compliance How-to» (documentación de proveedor, fuente secundaria). https://docs.tatsoft.com/display/FX/ISA-101+HMI+Compliance+How-to — «Use grayscale as default — Color only for abnormal conditions»; «< 3 clicks to any display».
- Stauffer, T. «New Version of ISA-18.2 Alarm Management Standard Is Released (2016)». *exida*, 19-abr-2016. https://www.exida.com/Blog/new-version-of-isa-18.2-alarm-management-standard-is-released-2016 — la definición de alarma de ISA-18.2-2016, «requiring a timely response».

**De diseño de producto:**
- Neumann, G. (firma «Guilherme Neumann – Former Head of Design»). «Designing a multi-product experience». *Building Nubank*, 13-jun-2018. https://building.nu.com/designing-a-multi-product-experience/ — «helpful, contextual, simple at-a-glance»; «…without replicating our internal structure as a complex experience to our users»; más de 100 sesiones y 85 % de éxito; el «fake loader» para quien entra por primera vez.
- Android Developers. «Navigation bar» (Compose, Material 3). https://developer.android.com/develop/ui/compose/components/navigation-bar — «Three to five destinations of equal importance».
- Nielsen, J. «Progressive Disclosure». *Nielsen Norman Group*, 3-dic-2006. https://www.nngroup.com/articles/progressive-disclosure/ — más de dos niveles de detalle escondido suelen dar baja usabilidad.
- Nielsen, J. «Why You Only Need to Test with 5 Users». *Nielsen Norman Group*, 18-mar-2000. https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/ — cerca del 85 % de los problemas con 5 usuarios; 3 o 4 por grupo.
- Sauro, J. «10 Things To Know About The Single Ease Question (SEQ)». *MeasuringU*, 30-oct-2012 (media actualizada en mayo de 2019). https://measuringu.com/seq10/ — la pregunta «Overall, how difficult or easy was the task to complete?», de 1 a 7, después de cada tarea; «The average SEQ score is around a 5.5».

**Del proyecto:**
- `docs/plan-circular-24/PLAN-MAESTRO.md` (§2, §4, §5), `U1-experiencia.md` (§1, §9, §11), `U2-choke-experiencia.md` (§0–§7, §10).
- `docs/backend/01-propuesta-de-valor.md` §1.6, `11-ciclo-de-valor.md` §11.1–§11.2, `06d-choke-pantallas/03-gerente.md`, `06b-operacion/06-telefono.md`.
- `docs/reuniones/2026-10-19-edinson-adair/transcript.txt`: Edinson [22:34], [26:48] y [31:08]; Adair [33:45] y [36:51]; Hollman [37:34].
- Código leído: `src/entities/roles.ts`, `src/app/pantallas.tsx`, `src/app/grupos.ts`, `src/app/url.ts`, `src/shared/config/producto.ts`, `src/widgets/Riel.tsx`, `Cabecera.tsx`, `Onboarding.tsx`, `Subpantallas.tsx`, `src/pages/Resumen.tsx`, `Trabajo.tsx` y `src/shared/ui/Prioridad.tsx`, `Info.tsx`.
- Del equipo: `docs/experiencia-v2/X1-identidad-referentes.md` y `X2-norma-hmi.md` (versiones del 25-oct, leídas a las 13:48).

---

## 11. Resumen

1. **Auditoría** (257 capturas, 52 pantallas, 9 roles): solo tec y reg abren en su respuesta. El gerente baja 2,4 pantallas en el teléfono, y su cifra más grande es simulada. El supervisor y el operador están a 3 y 4 toques de lo suyo. Hay una mediana de 81 cifras por pantalla, seis rótulos con dos cifras y un lugar con cuatro nombres.
2. **Puertas:** 3 o 4 por rol, abajo en el teléfono e iguales en el riel del escritorio. Los técnicos tienen **Hoy · Planta · Equipos · Resultados**. El gerente, **Planta · Equipos · Resultados**: dónde, qué equipo y si baja.
3. **Hoy** junta en una lista, con una acción por tarjeta, lo que hoy está regado en ocho lugares.
4. **La planta viva** es el proceso: yacimiento → pozos → planta → afuera → venta, con el agua que vuelve. El contorno es lo que cabe; el oscuro, lo que pasa; el rayado, lo que no pasa, en su tramo. El diferido se dibuja como un estrechamiento y la pérdida, como una gota.
5. **Antes · Durante · Después** van sobre el mismo dibujo. Lo simulado es una línea con su palabra, nunca la cifra grande. En pantalla no se llama «gemelo digital».
6. **Lo técnico, tipo SCADA:** N1 campo · N2 tren · N3 placa · N4 diagnóstico, con migas y nada a más de 3 toques.
7. **El mapa de §3.7** ubica cada pantalla y cada panel: no se pierde ninguna función.
8. **Pruebas:** con gerentes (G1–G8), con Edinson (E1–E7) y con Adair (A1–A6), con un criterio para pasar a construir.
