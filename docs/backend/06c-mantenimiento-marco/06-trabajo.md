## 6C.6 Mi trabajo — «Mi trabajo de hoy» · técnico de mantenimiento

**Para qué.** «Qué está parado o avisa, y qué revisar.» (`src/widgets/Onboarding.tsx:15`).
**Ruta.** `#/tec/trabajo/<campo>/<período>` · **Roles y nivel.** Solo `tec` (operación); es su inicio. **No agrega campos** (sin `agrega`: en portafolio se pide escoger un campo, `SoloCampo`). El período no cambia nada.
**Lee.** `GET /api/vistas/riesgo?campos`; `GET /api/vistas/paradas/por-identificar?campos`; `GET /api/sap/ordenes?campos` (y avisos, sin uso aquí); `GET /api/mensajes?campos` (los avisos `orden` dirigidos a la persona); el programa de paradas de la configuración vigente; la persona de la sesión (`usePersona`).

Fórmulas: perdiendo / en riesgo → 5B §5; preguntas → 5B §3.2; órdenes de SAP, estados y el aviso por WhatsApp de una orden liberada → 5D §6 «Mi trabajo (técnico)» y 5D §5.1 (regla `orden`).

### Captura 1 · técnico, La Ceiba, escritorio

![Mi trabajo · tec · La Ceiba](../img/tec-trabajo.png)

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | **equipos parados** | ◆ **1** | filas `perdiendo` **de alto impacto** (P-201B; LC-21 no cuenta: es un pozo sin identificar) | ◆ P1 si > 0; «equipo parado» / «equipos parados» | `riesgo[]` (`estado`, `altoImpacto`) |
| 2 | Apoyo | «alto impacto · 11.059 bbl/d» | $\sum$ `bblDia` de esas filas | `n0` | `riesgo[].bblDia` |
| 3 | **por identificar** | ▲ **3** | preguntas con `pide` (incluye las que arrancaron sin identificar: P-201B, LC-21 y LC-08) | ▲ P2 si alguna sigue parada; **ojo**: Identificar y Mantenimiento dicen «2» porque separan las no conformes | `pregunta.pide` |
| 4 | Apoyo | «2 sin arrancar» | preguntas con `!fin` | número | `pregunta.fin` |
| 5 | **partes avisando** | «1» · «parte avisando» | filas `en-riesgo` (aquí K-101, aunque no es una parte de un equipo de alto impacto) | singular/plural del rótulo | `riesgo[]` |
| 6 | Pie | chip «ya fuera» | la primera por `horas` (ausente = −1): con horas «la primera cruza en {fmtHoras}»; sin horas: chip fuerte «ya fuera» si es una sola, «{k} ya fuera» si hay varias (cuenta las que no tienen horas) (`Trabajo.tsx:97-100`) | — | `riesgo[].horas` |
| 7 | PARADOS: tipo y desde | «bomba de reinyección · desde 2 de oct, 03:52» (◆ 1 «P-201B»; extra del panel PARADOS «1», y AVISANDO · QUÉ REVISAR «1»: `parados.length`, `avisan.length`, `Trabajo.tsx:112, 142`) | `TIPO_CAUSA[tipo]` en minúscula + `fechaHora(desde)` | — | `riesgo[].tipo`, `.desde` |
| 8 | Parte | «parte sin identificar» | `NOMBRE_PARTE[parte]` en minúscula o «parte sin identificar» | — | `riesgo[].parte` |
| 9 | «no arrancar» | chip | hay una pregunta abierta (`!fin`) del mismo equipo y campo; si no, a la derecha `n0(bblDia)` bbl/d | — | `por-identificar` |
| 10 | PARADAS POR IDENTIFICAR | extra «3»; ▲ 2 «P-201B · 2 de oct, 03:52» «no arrancar»; ■ 3 «LC-08 · 1 de oct, 22:15» «arrancó sin identificar»; ▲ 2 «LC-21 · 1 de oct, 18:20» «no arrancar» (orden del servidor: de la más reciente a la más vieja, 5B §3.2) | marca ▲ 2 si `!fin`, ■ 3 si arrancó; chip «no arrancar» o «arrancó sin identificar» | lista corta: las que siguen paradas nunca se esconden | `pregunta` |
| 11 | «Registrar qué encontré» | botón | si el rol tiene Identificar; si no: «Su rol no responde paradas.» | lleva a `#/tec/causa/…` | — |
| 12 | AVISANDO · instrucción | «Orden 40012053 liberada a su nombre: vea «Órdenes en SAP».» | hay una orden **de la persona** abierta para ese equipo (`ordenMia`); si no, se escribe la `accion` de la fila (con su aviso de seguridad, sin ⓘ) | — | `riesgo[].accion`, `ordenes[]` |
| 13 | Extra de ÓRDENES EN SAP | «1 a su nombre» | órdenes abiertas (REL, PCNF, CRTD) con `tecnico = persona.id`; sin ninguna suya: «{n} abiertas» | — | `GET /api/sap/ordenes` |
| 14 | Número de la orden | «40012053» (K-101) | — | mono | `ordenes[].numero` |
| 15 | Tarea | «Verificar que las tres unidades estén en servicio: hoy hay dos. Con el recibidor en 11 min de autonomía, una parada deja las válvulas en posición segura.» | `descripcion` de SAP, escrita (no en ⓘ) porque es suya | las de otros puestos van bajo «DE OTROS PUESTOS» con ⓘ «qué hacer» | `ordenes[].descripcion` |
| 16 | Datos de la orden | «predictivo · prioridad 2 · liberada 2 de oct, 09:10 · a su nombre» | `NOMBRE_CLASE` · prioridad SAP (1-4, no es la prioridad de alarma) · liberada o «creada {fechaHora}» · «a su nombre» o «puesto {puesto}» | + «Repuestos reservados: {cantidad} × {descripción}, …» si tiene | `ordenes[]` |
| 17 | Aviso por WhatsApp | «TRIM le avisó por WhatsApp · 2 de oct, 09:11» | el mensaje `regla = 'orden'` con ese número y `para = persona` (liberada 09:10 + 1 min) | si no se envió: ◌ «TRIM no pudo avisarle por WhatsApp ({fechaHora}): {motivo}» (dato inválido, morado) | `GET /api/mensajes` → `orden`, `hora`, `noEnviado` |
| 18 | Estado | chip «liberada» | `NOMBRE_ESTADO_ORDEN[estado]` | — | `ordenes[].estado` |
| 19 | PARADAS PROGRAMADAS | «Nada programado de aquí en adelante.» | programa firmado con `hasta ≥ AHORA` | «**{equipo}** · {fechaHora(desde)} a {fechaHora(hasta)}» + motivo; extra «aprobadas» | configuración vigente |

### Captura 2 · técnico, La Ceiba, teléfono (390 px)

![Mi trabajo · tec · La Ceiba · teléfono](../img/tec-trabajo-telefono.png)

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | Menú | botón ☰ «Abrir la navegación» | debajo de 1024 px el riel es un cajón (6C.8) | — | — |
| 2 | Sello en el subtítulo | «Demo · Octubre, en curso» | en el teléfono el sello «DATOS DE DEMOSTRACIÓN» se reduce a «Demo» en el subtítulo (el lector oye «Datos de demostración») | 6C.8 | — |
| 3 | Período | solo el ícono | el nombre del período va en el subtítulo | — | — |
| 4 | «¿cómo se lee?» | solo el ícono | — | — | — |
| 5 | equipos parados | ◆ 1 | igual que en escritorio | — | — |
| 6 | «no arrancar» | chip | — | — | — |
| 7 | Aviso | «TRIM le avisó por WhatsApp · 2 de oct, 09:11» | — | — | — |

En el teléfono los paneles van en una columna, los botones tienen alto de dedo (`min-h-10`) y el técnico no ve «Exportar» (no tiene `evidencia:exportar`).

**Estados.** Sin parados: «Ningún equipo de alto impacto parado.»; sin preguntas: «Todas las paradas tienen causa.»; sin avisos: «Ninguna parte va hacia su límite.»; sin órdenes: «Sin órdenes abiertas.»

**Interacciones.** Clic en un parado, un aviso o una orden → ficha del equipo (cambia al campo). «Registrar qué encontré» → Identificar. «qué hacer» ⓘ en las órdenes de otros puestos (en el papel sale escrito).

**Lectura («¿cómo se lee?»).** «Lo que hay que hacer hoy en {ámbito}, sacado de los equipos. Cuando abra un equipo que paró sin que la señal dijera por qué, registre qué encontró: es lo único que se escribe, y es lo que le enseña al vigía qué mirar la próxima vez. En «Avisando», primero lo que está más cerca de su límite. En las órdenes de otros puestos, toque «qué hacer» para ver la tarea.» ÓRDENES EN SAP: «Las crea y las libera el planeador en SAP; TRIM no las escribe. Cuando SAP libera una a su nombre, TRIM le avisa por WhatsApp. Se notifican y se cierran en SAP.»

**Lo que es simulado en el demo.** La orden `40012053` (PM03, REL, técnico `tec`) y su aviso M1 son la acción inmediata de K-101 armada por la regla del demo (5D §6); el técnico es la persona del registro de TRIM resuelta por su correo en SAP. El backend real lee la orden de SAP y manda la plantilla `trim_orden_liberada` al liberarse.
