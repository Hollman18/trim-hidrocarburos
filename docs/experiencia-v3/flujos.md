# Los flujos de cada rol, antes y después

**M2 · experiencia v3, §9 del encargo · 27-oct-2026.**
- Lo de «antes» está **medido** en la aplicación (Playwright, 1440 × 900 y 390 × 844).
- Lo de «después» es la **propuesta**: se mide cuando esté construida.
- El detalle, con capturas, está en [`flujos-que-fallan.md`](flujos-que-fallan.md) (los números «FF-n» de abajo son los suyos).

**Cómo leer cada diagrama:**
- `[pantalla]` es una pantalla o una hoja;
- `→ «botón»` es un toque;
- `↓` es un desplazamiento;
- `✎` es escribir;
- `✗` es un callejón sin salida;
- los segundos son estimados (el modelo de `flujos-que-fallan.md`).

**Reglas que cumple cada «después»** (§9.3 del encargo):
- la tarea principal, a 1 toque;
- ningún dato a más de 3;
- una acción principal por pantalla;
- deshacer en vez de confirmar dos veces;
- nada de modales con párrafos.

---

## 1. Las 3 tareas de cada rol

### ger · Gerente de activo

**Tarea 1 · Dónde se trabó y quién está en ello** (FF-9). La decisión: a quién mandar a actuar.
```
Antes (escritorio · 3 toques · 4 pantallas · ~14 s)
[Todos mis campos] → «Ver qué se está haciendo» → [ficha P-201B, ya en La Ceiba] → «×» → [La Ceiba] → «Todos mis campos» → [Todos mis campos]
Antes (teléfono · 4 toques · 1 ↓ · 5 pantallas · ~20 s)
[Todos mis campos] → «La Ceiba» → [La Ceiba] ↓ → «Ver qué se está haciendo» → [ficha] → «×» → [La Ceiba] → «Todos mis campos»
Después (1440 y 390 · 2 toques · 3 pantallas, la última es la misma del inicio · ~10 s)
[Todos mis campos] → «Ver qué se está haciendo» → [ficha, encima] → «×» → [Todos mis campos]
```

**Tarea 2 · ¿Está bajando? El mes** (FF-12). La decisión: si el mes va contra su máximo firmado.
```
Antes (2 toques · 3 pantallas · ~10 s): dos lugares con el mismo 2.376
[La planta viva] → «Después» → [Después: 2.376, selector propio] → «Resultados» → [Resultados: 2.376, otro selector]
Después (1 toque · 2 pantallas · ~6 s)
[La planta viva] → «Después» (o «Resultados»: uno solo) → [el mes, un solo selector de período]
```

**Tarea 3 · Firmar las metas del mes** (FF-15). Es obligatorio (`metas:firmar`).
```
Antes (5 toques · 1 ↓ · ✎ · 3 pantallas · ~26 s)
[La planta viva] → «Andrés Vélez» → «Metas y accesos» → [elija un campo] → «La Ceiba» → [las metas de los 5 campos] ↓ → ✎ motivo → «Firmar»
Después (2 toques · 2 pantallas · ~7 s): solo cuando hay algo por firmar
[La planta viva + tarjeta «Para usted · Firmar las metas de noviembre»] → «Firmar…» → [hoja: 5 campos, motivo prellenado] → «Firmar» (Deshacer)
```

### prod · Ingeniera de producción

**Tarea 1 · Confirmar las paradas del día** (FF-10). La decisión: dónde se trabó cada parada.
```
Antes (2 toques · 2 pantallas · ~7 s; teléfono +1 ↓)
[La planta viva] → «Ver Hoy» → [Hoy] → «Confirmar las 2»
Después (1 toque · 1 pantalla · ~3 s)
[La planta viva + tarjeta «Confirmar 2 paradas iguales»] → «Confirmar las 2» (Deshacer)
```

**Tarea 2 · Cargar la asignación oficial del mes** (FF-14). Es obligatoria (`asignacion:cargar`).
```
Antes (5 toques · 3 ↓ en el escritorio, 5 en el teléfono · ✎ · 3 pantallas · ~29 s)
[La planta viva] → «Ver Hoy» → [Hoy] → «Cargarla» → [Producción contra plan, arriba, en octubre] ↓↓↓ → [formulario] → ✎ motivo (antes del archivo, o carga sin él) → «Subir un CSV» → archivo
Después (2 toques · 2 pantallas · ~7 s + escoger el archivo)
[La planta viva + tarjeta «Cargar la asignación de septiembre»] → «Cargarla» → [hoja: campo y mes puestos, motivo prellenado] → «Subir un CSV» → archivo → listo («Deshacer» = volver a la anterior)
```

**Tarea 3 · Qué limita hoy y el primero de «Si falla hoy»** (ya funciona).
```
Antes y después (0 toques para saberlo, 1 para abrir P-201A · ~6 s)
[La planta viva: «Limitan los pozos… Si falla hoy: P-201A 3.059»] → «P-201A» → [nivel 3]
```

### sup · Supervisor de operaciones

**Tarea 1 · Confirmar en lote** (ya funciona).
```
Antes y después (1 toque · ~3 s)
[Hoy] → «Confirmar las 2» → «Confirmadas LC-07 y LC-16 · Deshacer»
```

**Tarea 2 · Entregar el turno** (FF-4). Es la hora de cierre del turno.
```
Antes (teléfono · 2 toques · 2 ↓ · 2 pantallas · ~10 s); además, la subpantalla «Turno» repite la entrega con otras cifras
[Hoy] ↓↓ → «Entregar turno» (a 1.336 px) → [resumen] → «Compartir en PDF»
Después (1440 y 390 · 2 toques · 0 ↓ · ~5 s)
[Hoy: «Entregar turno» fijo arriba, junto a la cifra] → [resumen] → «Compartir en PDF»
```
**[WhatsApp]** «El turno en WhatsApp», en el resumen y en el lateral. Se borra aparte.

**Tarea 3 · Decidir los planes de la parada** (FF-3).
```
Antes (3 toques · 2 ↓ (escritorio) o 3 ↓ (teléfono) · 3 pantallas · ~15 s)
[Hoy] → «Ver los planes» → [nivel 3: sin planes ✗] → «Ver el diagnóstico» → [nivel 4] ↓↓ → «Aceptar»
Después (1 toque · 1 pantalla · ~3 s)
[Hoy: tarjeta con los 3 planes] → «Aceptar» (Deshacer)
```

### oper · Operador de campo

**Tarea 1 · Decir qué se dañó** (FF-2).
```
Antes (escritorio · 3 toques · ~6 s; teléfono · 2 toques · ~4 s)
[Hoy] → «Contestar» → [¿qué parte?] → «Sello mecánico» → [¿qué vio?] → «Fuga hacia afuera»
Después (1 toque · ~3 s)
[Hoy: la pregunta abierta] → «Sello mecánico · fuga hacia afuera» (Deshacer)
```

**Tarea 2 · Decir por qué paró un pozo** (FF-2).
```
Antes (escritorio · 2 toques · ~4 s)
[Hoy] → «Contestar» → «Cierre para prueba o intervención del pozo»
Después (1 toque · ~3 s): llega abierta, después de la anterior
[Hoy: pregunta 2 de 4, abierta] → «Cierre para prueba…»
```

**Tarea 3 · Avisar a SAP** (FF-5).
```
Antes (3 toques · 2 pantallas · ~8 s)
[Hoy] → «Ver P-201B» → [nivel 3] → «Crear aviso en SAP» → [panel] → «Enviar aviso a SAP»
Después (1 toque · ~3 s)
[Hoy: «P-201B · SAP no lo sabe · Avisar»] → «Avisar» (Deshacer)
```

### tec · Técnico de mantenimiento

**Tarea 1 · Decir qué se dañó** (FF-2).
```
Antes (1440 y 390 · 3 toques · ~6 s): en el teléfono no se abre sola, como al operador
[Hoy] → «Contestar» → «Sello mecánico» → «Fuga hacia afuera»
Después (1 toque · ~3 s)
[Hoy: la pregunta abierta] → «Sello mecánico · fuga hacia afuera» (Deshacer)
```

**Tarea 2 · Atender la orden de K-101** (FF-6).
```
Antes (2 toques · 2 pantallas · ~7 s · ✗ no la puede cerrar ni decir qué encontró)
[Hoy] → «Ver la orden» → [nivel 3 K-101] → «Ver la orden en SAP» → [la orden, para leer] ✗
Después (1 toque · ~3 s)
[Hoy: «Orden 40012056 · K-101 · Diga qué encontró»] → una opción (Deshacer)
```

**Tarea 3 · Ver el equipo que le toca** (ya funciona).
```
Antes y después (1 toque · ~6 s)
[Hoy] → «Ver P-201B» → [nivel 3]
```

### jefe · Jefe de mantenimiento

**Tarea 1 · Decidir los planes** (FF-3).
```
Antes (3 toques · 1 ↓ (escritorio) o 4 ↓ (teléfono) · 3 pantallas · ~13 s)
[Hoy] → «Ver los planes» → [nivel 3: sin planes ✗] → «Ver el diagnóstico» → [nivel 4] ↓ → «Aceptar»
Después (1 toque · ~3 s)
[Hoy: tarjeta con los 3 planes] → «Aceptar» (Deshacer)
```

**Tarea 2 · La orden que ya pasó el límite (K-101)** (FF-6).
```
Antes (2 toques · 2 pantallas · ~7 s, para leer lo que ya decía la tarjeta)
[Hoy] → «Ver la orden» → [nivel 3] → «Ver la orden en SAP»
Después (0 toques)
[Hoy: línea informativa «K-101 · orden 40012056 liberada a Óscar Daza 09:10»]: no suma a la insignia
```

**Tarea 3 · Cuánto del tiempo fuera es espera** (FF-11). Es su cifra.
```
Antes (2 toques · 3 pantallas · ~10 s; la cifra no se toca)
[Hoy: «7,7 de 8,1 días son espera» ⓘ] → «Resultados» → [Resultados] → «Confiabilidad» → [Reparación activa y espera]
Después (1 toque · 2 pantallas · ~6 s)
[Hoy] → la cifra → [hoja: reparación activa y espera, por equipo]
```
Además, si contesta él (FF-2), pasa de 3 toques a 2 («Contestar yo» → la opción).

### conf · Ingeniero de confiabilidad

**Tarea 1 · Qué atacar primero** (FF-8).
```
Antes (1 toque para abrir P-201A, pero 4 ↓ (escritorio) o 7 ↓ (teléfono) para ver la página: P-201A sale 3 veces)
[Equipos: arriba «Si falla hoy» · lista de 28 · abajo el Riesgo de antes] → «P-201A» → [nivel 3]
Después (1 toque · 0 o 1 ↓ · ~6 s)
[Equipos: la cifra y la lista ordenada por «Si falla hoy»] → «P-201A»
```

**Tarea 2 · ¿Le creo al vigía?** (menores).
```
Antes (1 toque · cambia a Resultados › Confiabilidad, con período y Exportar · ~6 s)
[Equipos] → «Ver el detalle» → [Confiabilidad]
Después (1 toque · hoja encima de Equipos · ~6 s)
[Equipos] → «Ver el detalle» → [hoja: aciertos del vigía] → «×» → [Equipos]
```

**Tarea 3 · Decidir planes y conseguir la causa** (FF-3 y FF-2). Su Hoy es el del jefe.
```
Antes: planes 3 toques + 1 o 2 ↓; contestar 3 toques
Después: planes 1 toque; contestar 2 toques («Contestar yo» → la opción), en una tarjeta arriba de Equipos
```

### reg · Cumplimiento regulatorio

**Tarea 1 · ¿Se puede publicar?** (ya funciona).
```
Antes y después (0 toques · ~2 s)
[Reporte: «2 paradas sin causa · Las contesta el operador de campo mañana antes de las 07:00»]
```

**Tarea 2 · Pedir la causa que falta** (FF-7).
```
Antes (1 toque · ✗)
[Reporte] → «LC-21» → [ficha del pozo: Exportar, Expandir, Cerrar] ✗
Después (1 toque · ~3 s)
[Reporte] → «Pedir» en la fila de LC-21 → «Pedida a las hh:mm · Deshacer» (sube en el Hoy de quien la debe)
```
**[WhatsApp]** Antes lo hacía el recordatorio y el escalamiento del chat. Se borra aparte.

**Tarea 3 · Exportar el mes de sus 5 campos** (FF-13). Es obligatorio (Circular 024).
```
Antes (20 toques · 5 pantallas · ~38 s)
[Reporte] → período → «Septiembre» → «Exportar» → «CSV para la ANH» → 4 × (campo → «Morichal…» → «Exportar» → «CSV para la ANH»)
Después (3 toques · ~6 s)
[Reporte · Todos mis campos: una fila por campo] → período → «Septiembre» → «Exportar los 5»
```

### adm · Administrador de la implementación

**Tarea 1 · Qué le falta al campo** (ya funciona).
```
Antes y después (0 toques · ~2 s)
[Estado: «La Ceiba · 3 de 6 pasos», con la lista de pasos]
```

**Tarea 2 · Firmar a qué pozos sirve cada equipo** (FF-16).
```
Antes (11 toques · 5 ↓ · ~26 s · ✗ no se puede firmar: «1 sin contestar» contra «Sin responder 0»)
[Estado] → «A qué pozos…» → [Filosofía, paso 1] → 8 × «Aceptar lo que TRIM dedujo» (con ↓ entre grupos) → «3 Ver el impacto y firmar» → [«Corrija antes de firmar»] → «Ver lo que falta» → [«Nada en Sin responder»] ✗
Después (3 toques + lo que falte de verdad · ✎ · ~22 s)
[Estado] → «A qué pozos…» → [paso 1] → «Aceptar todo lo que TRIM dedujo (36)» → [lo que falta, con su equipo] → ✎ motivo → «Firmar»
```

**Tarea 3 · Asociar los tags sin equipo** (menores).
```
Antes (2 toques · 1 ↓ (escritorio) o 3 toques · 2 ↓ (teléfono) · ~9 a 12 s)
[Estado] → «Conectores» → [Conectores] ↓ → «Aplicar las 3»
Después (1 toque · ~3 s)
[Estado: paso «Tags sin equipo · 3»] → «Aplicar las 3» (Deshacer)
```

### plan y cont · Apagados en el MVP (FF-17)

Sus 6 tareas de X4 §2 abren la vista de producción, con el aviso «todavía no está en esta versión»:
- **plan:** qué repuesto pido, qué programo y si alcanza el repuesto;
- **cont:** a quién le toca la parada, el expediente y las paradas externas.

No hay flujo que medir. El dueño decide si siguen apagados o se borran (§5 del encargo).

---

## 2. Las puertas del panel: cuántas necesita cada rol

**Cómo se contó:**
- **Hoy:** las puertas son las de `PUERTAS_DEL_ROL` (`src/app/pantallas.tsx`). Las pantallas son las subpantallas que el panel ofrece dentro de esas puertas, según `roles.ts`.
- **Lo que necesita:** las puertas por las que pasaron sus tareas en el recorrido, con los arreglos de arriba.
- **Una puerta pasa** si al menos una tarea frecuente del rol la necesita y no está ya en otra (el examen de §4 del encargo).

| Rol | Hoy: puertas · pantallas en el panel | Las que usaron sus tareas | Lo que necesita | ¿Menú? |
|---|---|---|---|---|
| **ger** | 3 · 3 (La planta viva, Equipos, Resultados) + Metas en el menú de la persona | La planta viva (todas); Resultados repite «Después» (FF-12); Equipos repite «Durante» | **2:** La planta viva y Resultados. **1** si «Después» absorbe Resultados. Metas, como tarjeta | Sí, con 2. No, con 1 |
| **prod** | 4 · 11 (Hoy 2, La planta viva 3, Equipos 3, Resultados 3) | La planta viva; Hoy solo para confirmar (FF-10) y cargar (FF-14) | **2:** La planta viva (con sus tarjetas) y Resultados (el mes y la asignación). Equipos, desde «Ver todos los equipos ›» | Sí (2) |
| **sup** | 3 · 8 (Hoy 3, La planta viva 1, Equipos 4) | Hoy (todas); Identificar y Turno repiten Hoy (FF-4); La planta viva ya está en Hoy («Su campo, ahora») | **2:** Hoy y Equipos | Sí (2) |
| **oper** | 3 · 7 (Hoy 3, La planta viva 1, Equipos 3) | Solo Hoy; el equipo, desde la tarjeta | **1:** Hoy | **No** |
| **tec** | 3 · 6 (Hoy 2, La planta viva 1, Equipos 3) | Solo Hoy; el equipo, desde la tarjeta | **1:** Hoy | **No** |
| **jefe** | 4 · 10 (Hoy 2, La planta viva 1, Equipos 3, Resultados 4) | Hoy, Equipos (P-201A) y Resultados (Confiabilidad, su cifra) | **3:** Hoy, Equipos y Resultados | Sí (3) |
| **conf** | 4 · 11 (Hoy 2, La planta viva 3, Equipos 3, Resultados 3) | Equipos (inicio) y Resultados (vigía); su Hoy es el del jefe | **2:** Equipos (con sus tarjetas arriba) y Resultados | Sí (2) |
| **reg** | 3 · 3 (Reporte, La planta viva, Resultados) | Solo Reporte | **1:** Reporte, con los 5 campos en filas | **No** |
| **adm** | 2 · 5 (Configurar 2, La planta viva 3) | Solo Configurar (Estado → cada paso) | **1:** Estado, y cada paso abre su editor (Conectores pasa a ser un paso) | **No** |
| **plan** y **cont** | apagados | — | 0, hasta que el dueño decida | — |
| **Total (9 roles)** | **29 puertas · 64 pantallas** | | **15 puertas** (14 si el gerente queda con 1) | 4 roles sin menú |

**Lo que se borra del panel, con su porqué:**
- **Identificar y Turno** (sup, oper, tec, jefe, conf y prod): repiten Hoy con otros nombres y otro control (FF-2 y FF-4). Sus direcciones abren Hoy.
- **La planta viva** como puerta de sup, oper, tec, jefe, conf y adm: ninguna de sus tareas pasó por ella.
  - Su resumen ya está en el Hoy de cada uno («Su campo, ahora · Abrir La planta viva»), y queda a un toque desde ahí.
  - Se queda como puerta del gerente y de producción, que abren en ella.
- **Equipos** del gerente: es lo mismo que «Durante» y «Diferido por equipo» de su La planta viva.
- **Las subpantallas viejas dentro de las puertas** (Bombas, Electrosumergibles, Pozos, Planta, Agua, Diferidos, Producción, Confiabilidad y Mantenimiento):
  - no salen en este documento: las tareas medidas no las necesitaron como entrada del panel;
  - las que se queden van como filtro o como hoja dentro de su puerta;
  - la lista de qué se borra es de `borrado.md`, con su examen de valor.

**En el teléfono** (FF-1): las puertas que queden van en una barra de pestañas abajo, nunca detrás de ☰. Con una sola puerta, no hay barra.

**Lo que no se probó y hay que confirmar con usuarios** (X4 §7):
- si el operador o el técnico necesitan buscar un equipo que no está en su Hoy. Si lo piden, Equipos vuelve como su segunda puerta;
- si el gerente prefiere «Después» o «Resultados» como el nombre del mes.
