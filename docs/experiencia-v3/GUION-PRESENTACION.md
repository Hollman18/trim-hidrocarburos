# Guion de presentación · TRIM Hidrocarburos

**Unos 12 minutos.** Una sola historia: la bomba de agua P-201B de La Ceiba paró a las 03:52 de la madrugada. Se sigue la misma falla por todos los roles, desde que pasa hasta que el sistema demuestra que sirvió.

**Antes de empezar:**
- abre el demo en http://127.0.0.1:4173;
- para cambiar de persona, toca tu nombre abajo a la izquierda y luego **«Cambiar de rol»**, o pega la dirección de cada paso;
- todo está fijo en «hoy, 2 de octubre, 14:00» y los datos son de demostración.

---

## 0. El problema (sin pantalla, 1 minuto)

> «En estos campos sale 92 a 97 % agua. Si una bomba de agua para, el agua no tiene a dónde ir y hay que **cerrar pozos**. Esos barriles no se pierden: se **dejan de producir** y se recuperan después; eso es el **diferido**. Otra cosa es la **pérdida**: un derrame o una tea, crudo que salió y no se vende.
>
> Hoy nadie sabe al instante cuánto se está dejando de producir, en qué parte del proceso se trabó, ni quién tiene que actuar. Y la ANH exige reportar cada parada con su causa antes de las 7 de la mañana.
>
> TRIM resuelve eso: **cuánto, dónde, por qué y quién**, para cada persona según su trabajo.»

---

## 1. El gerente: ¿cuánto estoy dejando de producir?

**Dirección:** `#/ger/planta-viva/ceiba~portafolio/curso` (Gerente, «Todos mis campos»)

| Muestre | Diga |
|---|---|
| El número grande **2.650 bbl/d** | «En este momento, sus 5 campos están dejando de producir 2.650 barriles por día. Lo que más pesa es una sola bomba: P-201B, en La Ceiba.» |
| Toque **«Ver P-201B»** (se abre el modal) | «Paró hoy a las 03:52 y obligó a cerrar dos pozos: 1.665 barriles por día. Aquí ve cuánto le ha costado y qué se está haciendo.» |
| Cierre el modal y baje a **«Producido · diferido · perdido»** | «Este mes: se produjeron 64.147 barriles, se dejaron de producir 2.376 y la pérdida dice "sin registro": no hay derrames registrados. Diferido y perdido nunca se suman, porque son cosas distintas.» |
| La tabla **«Por tramo»** | «Esto es el **modelo choke**, el estándar internacional que adoptó la ANH: el proceso en 4 tramos (yacimiento, pozos, planta y salida). Aquí se ve **dónde** se trabó: 1.448 en pozos, 573 en planta y 355 que todavía nadie ha explicado.» |
| Toque el tramo **Planta** | «Y con un toque, la rama completa: si fue planeada o no, la causa, cada parada y quién lo confirmó y cuándo. **Trazabilidad total.**» |

---

## 2. El supervisor: ¿qué paró en mi turno?

**Dirección:** `#/sup/hoy/ceiba/curso` (Supervisor)

| Muestre | Diga |
|---|---|
| **4 paradas por confirmar · antes de las 07:00** | «El supervisor no tiene que averiguar nada: TRIM ya dedujo dónde y por qué paró. Él solo confirma.» |
| La tarjeta **«Confirmar 2 paradas iguales»** y toque **«Confirmar las 2»** | «Un toque, y queda a su nombre y con su hora. Si se equivoca, "Deshacer".» |
| **«Mi turno · de 06:00 a 18:00»** | «Lo que pasó en su jornada, con la hora de inicio y fin de cada parada: lo mismo que pide la ANH.» |
| **«Orden de cierre»** | «Y si para otra bomba, TRIM le dice qué pozos cerrar primero para perder menos: LC-02, LC-10 y LC-01.» |

---

## 3. El operador, en el celular: ¿qué se dañó?

**Dirección:** `#/oper/hoy/ceiba/curso`. Achique la ventana o use el celular.

| Muestre | Diga |
|---|---|
| **«Pregunta 1 de 4 · ¿Qué parte se dañó?»** | «El operador no llena formularios. Le llega una pregunta, con lo que más le ha fallado a esa bomba.» |
| Toque **«Sello mecánico»** | «Un toque. Esa respuesta completa la causa en el árbol de la ANH.» |
| **«Registrar una pérdida»** | «Y si ve una pitera o un derrame, lo registra aquí con botones: tipo, tramo y barriles. Así, por primera vez, las pérdidas también se miden.» |

---

## 4. El jefe de mantenimiento: ¿qué intervengo antes de que falle?

**Dirección:** `#/jefe/hoy/ceiba/curso`

| Muestre | Diga |
|---|---|
| **«Avisan 1 · K-101 ya pasó el límite · frenaría en la planta»** | «Esto es lo que más vale: el sistema avisa **antes** de la falla. El compresor K-101 ya pasó su límite; si para, frena la planta.» |
| **«Espera 7,7 de 8,1 días por falla»** | «Y le muestra la verdad incómoda: de los 8,1 días que dura una falla, 7,7 son de espera (repuestos, permisos), no de reparación. Ahí está la plata.» |
| **«Ojo: no conviene intervenirlas hoy»** | «Hasta le dice qué NO tocar hoy: P-201A y P-201C están cargando todo mientras P-201B está parada.» |

---

## 5. El técnico, en el celular: cierra su trabajo sin papel

**Dirección:** `#/tec/hoy/ceiba/curso` (en el celular)

| Muestre | Diga |
|---|---|
| **«5 cosas · Primero P-201B: diga qué se dañó»** | «El técnico sabe qué hacer primero.» |
| Su orden: **«Cerrar la orden»** | «Y cierra la orden desde el celular: qué reparó, las lecturas y las horas. Se acabaron las órdenes en papel llenas de grasa.» |

---

## 6. Regulatorio: ¿puedo reportar a la ANH?

**Dirección:** `#/reg/regulatorio/ceiba/curso`

| Muestre | Diga |
|---|---|
| **«Paradas sin causa: 2 · 355 bbl · límite 07:00 mañana»** | «Regulatorio sabe exactamente qué falta para reportar, quién lo debe y para cuándo.» |
| **«Qué falta y quién lo debe»** | «LC-21 y LC-08: las debe el operador de campo. Ya le llegó la pregunta en su celular.» |
| **«Exportar el reporte»** | «Cuando está completo, se exporta en el formato de la Circular 024, con folio y huella.» |

---

## 7. El cierre: ¿está funcionando? (vuelva al gerente)

**Dirección:** `#/ger/planta-viva/ceiba~portafolio/curso`, tarjeta **«¿Está funcionando?»**

| Muestre | Diga |
|---|---|
| **Antes de TRIM 1.381 bbl/d → este mes 1.222 → ya se ganó 9.520 bbl** | «Antes de TRIM, sus campos dejaban de producir 1.381 barriles por día por paradas no planeadas. Este mes van 1.222. Desde septiembre, **9.520 barriles dejaron de diferirse**, y el sistema anticipó 5 de 7 fallas. Así se demuestra que sirve, con sus propios números.» |

**Remate:**

> «Cada persona ve solo lo que necesita para su trabajo: el gerente, cuánto; el supervisor, qué confirmar; el operador, una pregunta; el jefe, qué intervenir antes; regulatorio, qué falta. Y todo cuelga del mismo modelo internacional, el choke, que es el que exige la ANH.»

---

## Preguntas que le pueden hacer

- **¿Diferido o pérdida?** Diferido: el crudo se queda en el yacimiento y se recupera. Pérdida: salió a superficie y se perdió (derrame, tea). Se miden aparte y nunca se suman.
- **¿Qué es el choke?** El método de BP (SPE-36848, 1996) que la ANH adoptó en las Circulares 003 y 024. Divide el proceso en 4 tramos para ubicar dónde se trabó la producción. No es la válvula del pozo.
- **¿Por qué La Ceiba «este mes» está peor que antes (436 contra 391)?** Porque este mes paró P-201B. Lo acumulado desde septiembre igual ganó 3.934 barriles. TRIM no esconde un mes malo.
- **¿Los datos son reales?** Son de demostración, construidos con el comportamiento real de un campo con 92–97 % de agua. Con la operadora se conecta a su SCADA, su SAP y su medición oficial.
- **¿Las pérdidas en cero?** No es cero: dice «sin registro», porque nadie ha registrado una. TRIM nunca inventa un número.
