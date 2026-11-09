# ener · Responsable de energía · ficha de valor

> Rol nuevo de la Fase 4 de facilidades (4-nov-2026), por la decisión **D3** del dueño: *«podríamos colocar al jefe de mantenimiento o podríamos crear también un rol. Yo creo que las dos opciones pueden ser»*. El rol existe y **el cliente lo enciende si tiene esa persona** (en el demo, `VITE_ROL_ENERGIA=1`). Si está apagado, todo lo de esta ficha lo recibe el **jefe de mantenimiento** (`rolDeEnergia`, `src/entities/evento-planta.ts`).

## 1. Su trabajo, en una frase

Que la planta sepa en minutos que se fue la energía, por qué, y cuánto aguanta sin ella.
- Investigación 19 §6.2: *«saberlo en minutos y que alguien actúe»*.
- El experto: cuando por fin alguien revisa, la planta ya no tiene energía, y re-arrancarla puede tardar hasta una semana.

## 2. Su pregunta y su decisión

- **Pregunta:** ¿qué disparó, qué paró y cuánto me queda?
- **Decisión:** a quién manda y en qué orden (el arranque guiado, Fase 6). Y con la tabla de generación: qué soltar primero si se cae la unidad más cargada (margen N-1). TRIM no opera interruptores ni el deslastre: eso es del relé y del PMS.

## 3. Lo que ve

| Cuándo | Qué ve | Cómo lo lee |
|---|---|---|
| Durante un apagón | El aviso, arriba de su Hoy y en su notificación push | «Disparo 52-SE2 14:02:03. Paró: 18 pozos, 3 bombas de agua y el compresor de aire.» Sin relé: «Pararon 22 cargas a la vez…» o «El sitio dejó de mandar datos…» |
| Durante un apagón parcial | Qué circuito cayó | «Cayó: CCM de las bombas de agua.» |
| Sin evento | Su Hoy | «Nada pendiente para usted. Si se va la energía, el aviso le llega aquí y en su notificación.» |
| Después del apagón | El re-arranque guiado, debajo del aviso: el orden por barriles con sus límites, el cronómetro y el margen N-1 | Lo lee; las fases las marca el supervisor. Sin tabla de generación: «Sin la tabla de generación y de cargas … no se puede calcular el escalón ni el margen N-1» |
| Siempre | Los equipos de energía y aire en Equipos (SE-2, K-101, la UPS donde la hay) | Como cualquier equipo: su estado y su cadena del dato |

No contesta las paradas de bombas ni de pozos (no tiene `causa:declarar`): esas son de quien está en el campo. Las de energía las deduce la señal del relé.

## 4. Su pantalla necesaria

Hoy, con el aviso del apagón arriba. Equipos para abrir lo eléctrico. Sin menú de más.

## 5. Sus tareas

1. Leer el aviso y confirmar la causa con el relé.
2. Seguir los relojes (aire, tanque de agua) hasta que vuelva la energía.
3. Activar la notificación en su celular (Perfil · «Aviso de apagón en este dispositivo»).

## 6. Lo que no ve

Los barriles del libro (son de Barriles), las preguntas de las paradas de bombas y pozos, la configuración.

## 7. Hoy contra lo necesario

Construido en la Fase 4: el aviso por rol, el push y el rol. En la Fase 6: el arranque guiado con su cronómetro y el margen N-1 en el motor. Pendiente: la tabla de generación de un campo real; sin ella el margen dice qué falta.

## 8. Piezas (facilidades, 4-nov-2026)

| Pieza | Qué ve | Cómo lo lee | Cuándo | Fase |
|---|---|---|---|---|
| **Núcleo** | La cadena del dato de lo eléctrico: el relé por IEC 61850, el analizador de red por Modbus RTU, la UPS por SNMP, la entrada «hay tensión» del gateway | «De dónde sale», solo lectura | Al revisar un equipo | 3 |
| **Equipos** | Los equipos de energía y aire, por familia (generador, transformador, UPS, aire de instrumentos) | Su estado y sus límites, con fuente o [SUPUESTO] | Cada día | 4 (catálogo) |
| **Energía** | El apagón: disparo, qué paró, circuitos, relojes. Después, el orden de arranque, el cronómetro y el margen N-1 | El aviso de arriba y la notificación; el re-arranque debajo | Durante el evento y el arranque | 4 y 6 |
| **Planta** | — | — | — | — |
| **Barriles** | — | — | — | — |
| **Mantenimiento** | — | — | — | — |
