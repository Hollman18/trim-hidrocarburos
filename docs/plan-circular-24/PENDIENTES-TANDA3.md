# Lo que dejó abierto la tanda 3 (pantallas del choke)

Lo junta el coordinador a medida que cierran los agentes. Es la entrada de la tanda 4 (QA y cierre del motor).

## P2-UI · gerente, «Si falla hoy», diferidos por tramo (terminó 21-oct)

**Pedidos al motor y al contrato:**
1. La frase completa de U2 §6.5, hecha en el motor: «otra bomba no sube la producción; evita que una falla cierre pozos; cada falla cuesta X bbl». Hoy la pantalla pinta una línea genérica, «Para producir más».
2. `FilaCriticidad.puesto` la calcula la PANTALLA con la regla de `cambioHoy`. Tiene que venir del motor: el motor calcula y la pantalla pinta.
3. Cruce con el programa (`AvisoTrabajoCritico`), para el «¿moverlo?» del jefe, y una escritura para «Proponer un plan».
4. Un gancho de pérdidas (`EventoPerdida`): la pérdida aparte sale vacía porque todavía no existe el registro de pérdidas.
5. Las paradas que el vigía volvió planeadas (U2 §7.3).
6. Para un servicio ya caído, el motor solo trae la frase «si cae hoy»; la pantalla dice «está caído: se pierden N bbl/d». La frase debe venir del motor.

**Revisar en QA:**
- `src/widgets/diferidos/reparto.ts`: un archivo de cálculo dentro de `widgets`; verificar que no calcule lo que es del motor.
- El motor discrepa de U2 en ZA-06: queda en el pozo y U2 esperaba «afuera».
- Guacamayo ya no sale «casi iguales». Es lo esperado desde la corrección de capacidades de C1; U2 tiene la cifra vieja.
- A 320 px, `widgets/ciclo` encima «bbl». Ya venía del trabajo del 15-oct.

## P4-UI · Filosofía operacional (terminó 21-oct)

**Datos del demo:**
- **Empate artificial en Guacamayo.** El crudo de la planta y la salida quedaron los dos en 7.500 bbl/d, porque C1 redondeó ambos al siguiente número redondo sobre el máximo real (7.440). El método pide explicar un empate (NSTA §5.4). Corregir el dato: la salida se queda en 7.500 y es lo que sigue a los pozos, como en la historia original de Guacamayo; el crudo de la planta sube a 8.000. Regenerar la referencia a propósito.

**Motor:**
- **«Todavía no sé»:** U2 dice que esas paradas quedan «en falta», pero el motor les pone el tramo por tipo de falla. Decidir y alinear. Propuesta: si el administrador responde que no sabe, el tramo va a `faltan` con su pregunta y el motor no adivina.
- **Equipos nuevos del registro:** con una topología firmada no aparecen para contestar.
- **La regla de la primera firma** (la topología va completa) y la plantilla CSV deben vivir en el motor, no en `widgets/configuracion/topologia.ts`. Revisar ese archivo.
- **Nombres de código:** el `fuente` de la tubería trae cosas como `Chokes.evacuacion`. Debe traer un texto en palabras.

**Contrato y store:**
- `Config.capacidades` y el máximo diario por tramo, para poder escribirlas y firmarlas. Hoy el paso 2 solo muestra.
- Acciones del store para la vista previa y la carga: hoy la pantalla llama `escrituras.ts` directamente.
- Un borrador guardado en el servidor, para contestar en el teléfono y firmar en el escritorio.

**Rutas y roles:**
- Una dirección propia para «Filosofía operacional»: hoy es una pestaña y el enlace no la conserva.
- Configuración para prod y conf, en solo lectura (`roles.ts`).

**Revisar en QA:**
- El rótulo del «Esquema de planta» cambió: ya no dice «no cambia cálculos».

## P1-UI · tubería del campo y del agua (terminó 21-oct)

**Motor (error confirmado por P1 y P2):**
- **ZA-06 («el comprador nominó menos») cae «en el pozo».** Es mercado → «afuera» (exportación, subnivel mercado), con responsable externo (U2 §1.1; R2 §2.2). Corregir `chokeDeCausa` y su prueba.

**Pedidos al motor y al contrato:**
- Tubería del campo: `trenQueLimita`; `disponibleHoy` en CRUDO (hoy llega en agua); quién y cuándo firmó las capacidades; la prueba más vieja; el estado del medidor.
- Agua: `estado` y `casiIguales` por tramo.
- «Perdiéndose ahora»: desde cuándo y los pozos por nombre.
- Una escritura para «Explicar» un empate exacto (NSTA §5.4).

**Fuera de sus archivos:**
- `Onboarding.tsx` no tiene texto para la pantalla Agua.
- `docs/backend/01` dice que Agua está apagada (lo hace D1).

**Revisar en QA:**
- Usó `!` para ocultar en el papel las notas dentro del dibujo, porque `.solo-impresion` de `index.css` no está en una capa. Ver si conviene ponerla en una capa en vez de `!`.
- `src/widgets/choke/palabras.ts`: textos de pantalla; confirmar que no tenga cálculos.

## P3-UI · árbol en Identificar, Turno y Confiabilidad (terminó 21-oct)

**Contrato y motor:**
1. **Respuesta de campo del operador.** `clasificarParada` le rechaza los pasos que no son suyos, y lo que TRIM deduce de su respuesta no se guarda. Por eso «¿De dónde vino el corte?» le sale como «la registra su supervisor». Falta `POST /anh/paradas/:id/respuesta {pregunta, opcion}`, que corra `responder`.
2. **«¿Qué lo paró?»** no se muestra: sus preguntas siguientes no llegan a las pantallas.
3. **«Algo está mal» y «Pedir a producción»** no tienen escritura para marcarlas; el chat le dice al operador que avise a su supervisor.
4. **Reglas copiadas en los widgets:** quién confirma la causa que una señal solo apunta (jefe y confiabilidad) y los nombres de las reglas. Exportarlas desde `src/shared/api/arbol.ts` y borrar las copias.
5. **Escrituras fuera del store:** pasan por `widgets/arbol/escribir.ts` con el rol actual, porque `app/store.ts` no las tiene. Igual que en P4: llevarlas al store.
6. **«Si falla hoy» en Confiabilidad** no estaba en ningún encargo. Decidir si va (hoy está en Riesgo para jefe y conf).

**Coordinador (hecho):** los títulos y textos decían «REPORTE A LA ANH» y «CIERRE DE HOY PARA LA ANH». Ahora dicen «ÁRBOL DE CAUSAS» y «CIERRE DE HOY · PARADAS POR CONFIRMAR», y el reporte a la ANH queda como lo que sale de lo mismo (el norte). La prueba de P3 quedó ajustada.
