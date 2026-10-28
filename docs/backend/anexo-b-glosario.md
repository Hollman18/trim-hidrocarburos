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
| **Eficiencia** | Real ÷ potencial. En el modelo choke, la **PE** se mide contra el potencial del sistema (ver «Modelo choke»). |
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

## Modelo choke y clasificación ANH

| Término | Qué es |
|---|---|
| **Choke · modelo choke** | El campo como una tubería en serie: yacimiento → pozos → planta → afuera. Lo que limita es el tramo más estrecho, y cada parada se trabó en uno de los tramos. Viene de SPE-36848 (BP, 1996): un estándar internacional que sirve en cualquier planta para entender de dónde vienen los diferidos y las pérdidas. En Colombia, además, la ANH lo está incorporando como el paso 2 de su árbol (`choke_mod`). |
| **Tramo** (de la tubería) (`ChokeAnh`) | Yacimiento, pozo, planta o afuera (`reservorio`, `pozo`, `planta`, `exportacion`). No confundir con el **tramo del libro** (`Tramo`): un pedazo de tiempo de una parada. Lo que no tiene tramo todavía va «sin identificar» (`sin-asignar`). |
| **Mercado** | Lo de afuera que no recibe: el terminal, el cliente o la nominación. La NSTA lo pone como quinto tramo; en TRIM es un **subnivel** de afuera. |
| **Alcance** (`AlcanceElemento`) | A quién sirve un equipo: **dedicado** (a un solo pozo → el pozo), **compartido** (a varios → la planta), **frontera** o **tercero** (la brida de salida, otro dueño → afuera). El tramo sale del alcance: nadie lo escoge. |
| **Topología** | La lista de equipos de un campo con su alcance y los pozos a los que sirve. La firma el administrador (`Config.topologia`); sin firma, rige la que se deriva del registro. |
| **«Todavía no sé»** (`Config.topologiaPorSaber`) | La respuesta del administrador cuando no sabe a qué pozos sirve un equipo: el motor no adivina su tramo y cada parada lo pregunta. |
| **Caso de borde (misma locación)** | Un equipo que sirve a 2 o 3 pozos de una misma locación: va a la planta, marcado, hasta que la operadora confirme la regla. |
| **Factor de medición** | El sesgo del separador de prueba contra el punto oficial, medido en días sin restricción y firmado por campo. Mientras no se mida, 1. Con él se leen las pruebas para el choke; **nunca** el factor de asignación del mes. |
| **Tren** (de la planta) | Un carril de la planta: crudo, agua o gas, con su capacidad instalada. Manda el más angosto **medido**, pasado a crudo; el gas sin medir no entra. |
| **Potencial del sistema** | El menor de los tres potenciales (pozos, planta, afuera): lo más que el campo puede entregar hoy. |
| **Lo que limita · dominante** | El tramo de menor potencial. Sale de los potenciales, nunca de lo real. |
| **Holgura** | Lo que le sobra a un tramo sobre el que limita, bbl/d. |
| **Empate** | Dos tramos iguales al barril. La NSTA pide explicarlo por escrito (`explicacionEmpate`, con la firma de las capacidades). |
| **Casi iguales** | Dos tramos a menos del 3 % (provisional): lo que se gane en uno lo frena el otro, y no se avisa un cambio de lo que limita. |
| **Capacidad firmada** | Lo que deja pasar un tramo, firmado con su fuente (placa, prueba, contrato, nominación o estimado). Sin firma, el dato del demo, marcado. |
| **Escalón** | La clase de pérdida de un barril diferido: desarrollo, desempeño, paradas planeadas, **paradas no planeadas**, capacidad (restricción sin falla) o sin clasificar. |
| **Cifra del norte** | Lo no planeado (el escalón `disponibilidad-no-planeada`): la única cifra que el producto busca bajar. La misma en todas las vistas. |
| **Estructural** | Lo que no pasa aunque nada pare: cuando lo que limita no son los pozos, lo que los pozos podían dar de más. Ningún arreglo de equipos lo recupera; solo más capacidad. |
| **Brecha de las pruebas** | Lo que las pruebas dicen de más que el punto oficial. Sesgo de medición o desempeño de los pozos; no es de ninguna parada. |
| **PE · eficiencia de producción** | Real ÷ potencial del sistema (NSTA §5.3, ISO/TS 3250). **PE no planeada**: lo no planeado que le costó al campo ÷ potencial del sistema. |
| **Cabía en la holgura** | Lo diferido de un día en que no limitaban los pozos y que no le costó al campo: el real llegó a lo que dejaba pasar el tramo que limitaba. |
| **Superado** | Un día en que lo real pasó la capacidad declarada del tramo que debía limitar: la capacidad está corta y hay que revisarla. |
| **Árbol de pérdidas** | Cada barril diferido del período colgado de su tramo y, dentro, de los pasos de la clasificación; cada nodo suma exacto sus ramas. |
| **Si falla hoy** (`FilaCriticidad`) | Lo que le costaría al campo, en bbl/d, que un equipo fallara hoy, con el tramo donde se trabaría. Tres grupos: **medido** (con puesto), **techo** (supone cerrar todos sus pozos: «hasta»), **sin dato** (con su porqué). |
| **Fila ANH · `paradas_pozo`** (`ParadaAnh`) | Lo que se reporta a la ANH: un pozo × un día operacional × una causa. Sale del libro; no se guarda. |
| **Día operacional** | El día calendario con corte a las 23:59:59, hora de Colombia. Una parada que cruza la medianoche son dos filas. |
| **Abierta al corte** | Una fila de un pozo que seguía parado a las 23:59:59: termina ahí y lo dice. |
| **Parcial · disparo · exceso** | Parcial: frecuencia reducida (también es parada). Disparo: electrosumergible que vuelve a arrancar en menos de 24 h. Exceso: lo que siguió cerrado después de la ventana del programa (no planeado). |
| **Seis pasos** | La clasificación de la Circular 0024: responsable, choke, impacto (diferida o pérdida), planeación, causa N1 y detalle N2. |
| **N1 · N2** | La causa (20 claves de la Tabla 1: 8 planeadas `P_`, 12 no planeadas `NP_`) y su detalle (117 por versión del catálogo). |
| **Forma de salida** | Cómo se escribe cada valor en el JSON: `C024-2026` (la circular, por defecto) o `DICC-V3.2` (el Diccionario de Datos). |
| **Procedencia** | De dónde salió un paso: señal, registro, regla, conversión, programa, o una persona (declarado, confirmado, corregido). |
| **Origen A/M/C** | El origen de cada campo de la fila: `A` de la señal o el registro, `M` lo que tocó una persona, `C` lo deducido que nadie confirmó. |
| **Retirado** | Lo que dijo una persona y otra dejó sin efecto, con motivo, porque ya no iba con lo nuevo. No se borra: la fila vuelve a lo que propone TRIM y la historia lo muestra. |
| **Una señal apunta** | Una causa que sale de un código que puede venir de superficie (GF, PH, UV) o del first-out de un variador: TRIM la propone, pero solo la confirma quien abre o analiza el equipo. |
| **Revisión** | «Algo está mal» o «Pedir a producción»: no corrige nada; pasa la parada a quien corrige, con el motivo. |
| **Lote** | Varias filas de paradas distintas confirmadas de un toque por quien firma el día (supervisión o producción). |
| **`desc_evid`** | La descripción y evidencia de la fila: la arma TRIM solo con lo estructurado; nunca lleva lo que escribió una persona. |

## Producto y venta

| Término | Qué es |
|---|---|
| **TRIM (producto global)** | **Prevenir paradas no planificadas** y contabilizarlas en barriles, foco en **electrosumergible**, **bomba multifásica** (`transporte`) y **bomba de reinyección** (`reinyeccion`); otras líneas en planta y causas. Libro, vigía, colchón, ciclo Antes/Durante/Después. Yacimientos maduros y en desarrollo. Capítulo 1. |
| **Gemelo digital (línea futura)** | Modelo para **simular** el proceso, planta o línea del cliente, alimentado por **planos** (P&ID, layouts), datasheets y tags. Escenarios «qué pasa si…». **No** es el pitch de TRIM hoy. Capítulo 1 §1.6. |
| **Ciclo de valor · Antes / Durante / Después** | Tres momentos comerciales traducidos a barriles **simulados** (`retornoBbl`): evitar la parada, perder menos tiempo en la parada, no repetir en el período. No entra al libro medido. Capítulo 11. |
| **Medido vs simulado** | **Medido:** diferido del período, fiscal, libro publicable. **Simulado:** retorno del ciclo y planes de acción (chip «simulado» en pantalla). |
