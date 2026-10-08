# Anexo B. Glosario

Términos del sector y del producto, en el sentido en que se usan en este documento y en el código. Entre paréntesis, el nombre en el código cuando es distinto.

## Producción y medición

| Término | Qué es |
|---|---|
| **Barril (bbl)** | 42 galones estadounidenses a condiciones estándar (en Colombia, 14,65 psia y 60 °F). Unidad de todo volumen de crudo del sistema. |
| **bbl/d** | Tasa: barriles por día calendario. Una tasa **no se acumula**; un volumen sí. |
| **Fluido total** | Lo que sale del pozo: crudo + agua (+ gas). |
| **Corte de agua · BSW** (*basic sediment and water*) | Fracción del fluido que es agua y sedimento. En los campos colombianos maduros va de 92 % a 98 %: por cada barril de crudo se levantan entre 11,5 (92 %: 0,92 ÷ 0,08) y 49 (98 %: 0,98 ÷ 0,02) barriles de agua. |
| **Prueba de pozo** (`Prueba`) | Medición periódica de un pozo en el separador de prueba: crudo, agua, gas y frecuencia de la bomba de fondo a la que se midió. Con ella se reparte la producción entre los pozos. |
| **Pozo sin prueba** | Pozo que produce pero no tiene prueba vigente: su crudo llega al punto de medición pero no se le puede asignar. Es un **hueco de custodia**. |
| **Punto de medición oficial · PMO** | Donde se mide la producción que se reporta al Estado y se vende: la unidad LACT y su **computador de flujo**. Lo que mide es el **fiscal**. |
| **LACT** (*lease automatic custody transfer*) | Unidad de medición automática para transferencia de custodia del crudo. |
| **Fiscal** | El volumen de crudo del día medido en el PMO. Es lo **real**: lo producido se mide. |
| **Asignación de producción** | Repartir el fiscal de un campo entre sus pozos con sus pruebas y sus horas abiertas. |
| **Factor de asignación · FA** | Fiscal del mes ÷ lo que dicen las pruebas en las horas producidas. Si pruebas y PMO cuentan la misma historia, queda cerca de 1. Se compara contra una **banda** de la Res. MME 40236. |
| **Potencial** | Lo que el campo habría producido sin eventos: pruebas × FA × horas del período. |
| **Real** | Lo que se produjo: el fiscal. |
| **Diferido** (barriles diferidos) | Lo que se dejó de producir por un evento (una parada, una frecuencia reducida): potencial − real, repartido evento por evento. Se **calcula**, no se mide. «Diferido» y no «perdido»: el crudo sigue en el yacimiento. |
| **Inventario entre días** (`residuo`) | Lo que los eventos no explican: potencial − real − diferido. Físicamente, el **inventario del tanque de venta**: el PMO mide lo que se despacha cada día, no lo que producen los pozos ese día. En el mes entero suma 0; en un día suelto o un período que corta meses, no. |
| **Eficiencia** | Real ÷ potencial. |
| **Tolerancia del diferido** | El rango de incertidumbre del diferido calculado (Res. MME 40236, Ec. 22: raíz de la suma de los cuadrados de las incertidumbres de cada término). Se muestra como «5.729–6.734 bbl · calculado». |
| **Precio neto** (`netbackUsd`) | Precio por barril del crudo en el campo, neto de transporte y descuentos. Lo firma el gerente con la meta. Valoriza los barriles diferidos en USD. |

## Equipos

| Término | Qué es |
|---|---|
| **Equipo de alto impacto** | Los que al fallar cierran pozos: las **bombas de la línea** (multifásicas, de transferencia y reinyección de agua) y las **electrosumergibles**. Son el foco del producto. |
| **Bomba de reinyección / disposición de agua** | Bomba que devuelve al subsuelo el agua separada del crudo. Con cortes de 92–98 % es el cuello de botella: si para y el respaldo no alcanza, el tanque de agua se llena y hay que cerrar pozos. |
| **Bomba multifásica** | Bomba que mueve crudo, agua y gas juntos desde un grupo de pozos. Si para, esos pozos quedan sin salida. |
| **Electrosumergible · ESP** (*electric submersible pump*) | Bomba de fondo de pozo con motor eléctrico, alimentada por un **variador de frecuencia** en superficie. Tiene un **sensor de fondo** (presión de entrada, temperatura del motor). |
| **Variador** (VSD) | Controla la frecuencia (Hz) de la electrosumergible. Su controlador detiene el pozo y deja un **código**. |
| **Código del controlador** | Por qué paró un pozo, según su controlador: `GF` falla a tierra, `PH` desbalance de fases, `OL` sobrecarga, `UL` baja carga, `OT` temperatura alta del motor, `UV` baja tensión, `PSH` presión alta en la cabeza del pozo, `LSHH` nivel muy alto del tanque de agua, `CMD` parada por orden, `HZ` frecuencia reducida. |
| **Tanque de agua** | Recibe el agua separada antes de reinyectarla. Tiene un transmisor de nivel (`LT-…`) y un nivel **alto-alto** (LSHH) que obliga a cerrar pozos. |
| **Colchón** | Cuántas horas aguanta el tanque de agua, con la bomba parada, antes de llegar al alto-alto. |
| **Respaldo** | Bomba en paralelo o capacidad libre que recibe agua cuando la principal para. Si alcanza, no se cierran pozos. |
| **Orden de cierre** | En qué orden cerrar pozos cuando el tanque no aguanta: primero los que menos crudo dan por cada barril de agua. |
| **Servicio** | Lo que mantiene viva la planta: energía, aire de instrumentos, compresión, evacuación, proceso, tratamiento. Si cae, para todo lo que depende de él. |
| **Parte** (ítem mantenible) | Lo que se daña de un equipo: sello, rodamientos, impulsores, motor, succión; en la electrosumergible, aislamiento del motor y del cable, bomba de fondo, admisión/gas, protector, motor (ISO 14224). |
| **Modo de falla** | Cómo se vio la falla (fuga, vibración, sobrecalentamiento…), ISO 14224 Tabla B.6. |
| **Mecanismo de falla** | Por qué física falló (desgaste, corrosión, fatiga…), ISO 14224 Tabla B.2. |
| **Causa raíz** | Por qué se llegó al mecanismo (diseño, operación, mantenimiento…), ISO 14224 Tabla B.3. |
| **Disparo** (electrosumergible) | Parada de menos de 24 h que no fue falla: el equipo vuelve a arrancar. |
| **Falla** | Parada que exige intervenir el equipo. |
| **MTBF** | Tiempo medio entre fallas («una cada N días»). Solo con dos o más fallas. |
| **Horas fuera · MDT** | Tiempo medio que el equipo pasa fuera de servicio por falla (solo fallas cerradas). |

## Señales, alarmas y vigilancia

| Término | Qué es |
|---|---|
| **PLC** | Controlador lógico programable del campo. Pone la hora de cada evento. |
| **Tag** | Una variable de un instrumento («PI-2010», «LT-2012»): presión, nivel, vibración, corriente… Único en su campo. |
| **Historiador** | La base de series de tiempo del campo (PI u otro). Guarda el valor de cada tag a su cadencia. |
| **Serie** (`SerieTag`) | Los valores de un tag a paso fijo: `desde`, `pasoH`, `valores`; un hueco del historiador va como `null`. |
| **Banda normal** | Entre qué valores opera bien un tag. La declara el instrumento al conectarse y la aprueba ingeniería. |
| **Alarma** | El valor que dispara la alarma del tag. Sale de la base maestra de alarmas (ISA-18.2). |
| **Primera alarma** | La primera señal que se salió antes de que una bomba parara: suele decir qué parte falló. |
| **Firma de señales** | El patrón de las señales al parar (qué subió, qué bajó) que identifica la parte. |
| **Vigía** | La función que proyecta cada señal hacia su alarma y dice **cuándo cruza** («cruza en 43 h») y qué parte se va a dañar. |
| **Pronóstico de cruce** | Las horas que faltan para que una señal llegue a su alarma, con su rango. |
| **Salud de la parte** | El estado de una parte según sus señales: falló, fuera de banda, avisa, estable, detenida, sin dato. |
| **Prioridad** (ISA-18.2) | 1 alarma, 2 atención, 3 aviso, 0 normal. Se pinta con color, forma y número (ISA-101). |
| **Dato inválido** | Sin señal o un dato que no corresponde a nada. Se pinta aparte, en morado, sin prioridad. |
| **¿Acierta el vigía?** | El registro de cada predicción y en qué quedó: acierto, falsa alarma, intervenida antes, se le escapó. |

## Cadena de datos

| Término | Qué es |
|---|---|
| **Borde** | Lo que está en el campo: PLC, gateway, historiador. |
| **Gateway** | El equipo que lee el PLC y publica hacia el servidor (en el demo, un EPIC de Opto 22). |
| **Sparkplug B** | Especificación sobre MQTT para datos industriales: el gateway se presenta con un **certificado de nacimiento** (NBIRTH/DBIRTH) que declara sus dispositivos y tags. |
| **Procedencia** | De dónde sale un número: instrumento, gateway, cálculo, calibración. Se consulta, no se escribe. |
| **Cadena de custodia** | Que cada número se pueda rastrear hasta su medición, con su hora y sin edición manual. |

## Gestión y producto

| Término | Qué es |
|---|---|
| **Campo** | Un área de producción con su PMO. El cliente tiene varios (en el demo: La Ceiba, Morichal Norte, Guacamayo, El Palmar, La Zarza). |
| **Portafolio** | La suma de los campos asignados a la persona. |
| **Configuración firmada** | Lo único que entra a mano: metas, precio, tanques, respaldos, programa de paradas, perfil de cada campo, membrete. Cada cambio es una **versión** con fecha, firmante y motivo; ninguna se sobrescribe. |
| **Tramo de meta** | Una meta que rige desde un día hasta que empieza el siguiente tramo: producción (bbl/d), máximo de diferido (bbl/d), precio neto, máximo sin causa para publicar (%). |
| **Programa de paradas** | Paradas planeadas (mantenimiento): su diferido es «programado», no falla. |
| **Perfil del campo** | Qué familias de equipos tiene (bombas, electrosumergibles) y qué hace con el gas (no, tea, consumo, venta). |
| **Publicación del libro** | Si las cifras de un período se pueden publicar: **publicable**, **provisional** (solo falta que termine el mes) o **bloqueado** (con su motivo). |
| **No conformidad** | Arrancar un equipo sin identificar qué se dañó, o identificarlo tarde. |
| **SAP PM** | El módulo de mantenimiento de SAP. **Aviso** M1 (solicitud: una parte avisa con el equipo en marcha) o M2 (avería: el equipo paró). **Orden** PM01 (correctiva), PM02 (preventiva), PM03 (predictiva). TECO = técnicamente cerrada. |
| **Horas proactivas / correctivas** | Horas confirmadas en órdenes preventivas y predictivas contra las de órdenes correctivas. |
| **Reparación activa y espera** | De una falla: el tiempo que se trabaja en el equipo contra el que se espera (repuesto, permiso, personal). |
| **Folio** | Número consecutivo de un informe exportado: `INF-AAAA-NNNN`. Nunca se reutiliza. |
| **Huella** | SHA-256 de la forma canónica de las cifras de un informe. Si el papel no da la misma huella, fue modificado. |
| **Nivel de detalle** | Lo que un rol ve: `decision` (gerente), `operacion` (supervisor, operador, técnico), `ingenieria` (producción, mantenimiento, confiabilidad, administración). |
| **Capacidad** | Un permiso que el servidor revisa en una escritura (`metas:firmar`, `causa:declarar`…). |
