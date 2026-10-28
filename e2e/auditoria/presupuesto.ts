/* El presupuesto de palabras y cifras del inicio de cada rol, a 390 × 844 px (el teléfono de las
   imágenes; D-1), sin desplazarse y en toda la ventana: la banda, la cabecera y el contenido.

   **v3 (B4, 27-oct).** Los topes salen de LO NECESARIO de cada rol (`docs/experiencia-v3/
   necesario-por-rol.md`, aprobado por el dueño): su número principal, los de apoyo y lo que el rol
   HACE a un toque, contados sobre el boceto de §14. El boceto no trae la cabecera común; aquí sí se
   cuenta (☰, el campo, «Demo», la franja y, donde la hay, el título con la hora de los datos), así
   que cada `porque` dice las dos partes: el contenido contra su boceto y la cabecera.

   Cómo se fijó cada tope: se midió el inicio de la v3 con la regla de `inicio.ts` (la misma de R1) en
   Chrome y en Safari de teléfono (dieron igual). Donde la pantalla traía texto de más frente a su
   boceto, se recortó la PANTALLA, no se subió el tope:
   - prod: la frase de lo que limita la dice la tubería de abajo; entera, en su ⓘ («por qué»). De 11 a 9 cifras.
   - reg: el porqué del «no se puede publicar» y la Circular 024, en una ⓘ; «no se puede reportar» (lo dice
     arriba), «faltan todos los pasos» y la hora de cada fila (va una vez, en «Límite»), fuera; lo que baja
     «Exportar», en su ⓘ. De 115 a 76 palabras.
   - ger: el equipo que más pesa lo nombra «Ver P-201B» y la tubería dice dónde se trabó; la frase, en su ⓘ.
     De 85 a 57.
   - oper (y tec, que comparte la pregunta): «Un toque y queda a nombre de…» (D1), en su ⓘ. De 83 a 72.
   El tope es lo medido después del recorte: una palabra o una cifra de más hace fallar la prueba.

   `antes` es el inicio de la v2 a 390 px (§13, columna «Palabras del inicio (vista)», hoy). La guía de
   las cifras (D-1, `CIFRAS_TELEFONO`): un número principal y los de apoyo necesarios, sin la franja ni
   la hora de los datos (`inicio.ts` no las cuenta); si un rol necesita más, `cifras` y `porqueCifras`
   dicen cuáles. plan y cont no se miden: abren «Este rol todavía no está disponible» (A-22). */

export type Presupuesto = { antes: number; tope: number; porque: string; cifras?: number; porqueCifras?: string }

export const PRESUPUESTO: Record<string, Presupuesto> = {
  ger: {
    antes: 85, tope: 57,
    porque: 'necesario §1 y §14 con un campo (La Ceiba): «Se deja de producir ahora 1.966 bbl/d», «por qué» (la frase, en su ⓘ), '
      + '«Ver P-201B» (HACE principal), «Compartir el informe» y «Metas» (HACE), y la tubería de 4 tramos con sus rótulos (TIENE, con un campo): '
      + '43 de contenido (el boceto, con 5 campos, 42); cabecera 14 (☰, campo, «‹ Todos mis campos», «Demo» y la franja)',
    cifras: 4,
    porqueCifras: '1.966 (el principal); en la tubería, 15 de 18 pozos en marcha y 1.665 bbl/d que no pasan por la planta (§1 TIENE: lo que explica el número)',
  },
  prod: {
    antes: 82, tope: 65,
    porque: 'necesario §2 y §14: «Salen hoy 9.394 de 11.857 bbl/d», «por qué» (lo que limita, entero, en su ⓘ), «Confirmar las 2» (HACE principal), '
      + 'la tubería Pozos → Planta → Salida una sola vez, con lo que dan, caben, sobran y salen (TIENE; el «Limitan los pozos. Planta: sobran 1.143» '
      + 'del boceto) y el comienzo de «Por confirmar 4 · antes de las 07:00» (apoyo 1): 51 de contenido (boceto 41); cabecera 14',
    cifras: 9,
    porqueCifras: 'el principal 9.394 de 11.857; la tubería (11.857 dan, 13.000 caben, sobran 1.143, 9.394 salen: el dibujo que explica el número, §2 TIENE); '
      + '«Confirmar las 2» (la acción); «Por confirmar 4 · antes de las 07:00» (apoyo 1). El boceto también trae 9',
  },
  reg: {
    antes: 81, tope: 76,
    porque: 'necesario §10 y §14: «Paradas sin causa 2 · No se puede publicar todavía» (el porqué y la Circular 024, en su ⓘ), «Sin causa 355 bbl», '
      + '«Límite 07:00 mañana», «Qué falta y quién lo debe» con una fila por parada (LC-21 247 bbl y LC-08 108 bbl, lo debe el operador de campo), '
      + '«Exportar el reporte» (HACE principal) e «Informe en PDF», y el comienzo de «Respuesta de la ANH» (apoyo 3): 51 de contenido (boceto 34); '
      + 'cabecera 25 (☰, campo, «Reporte al regulador», la fecha y la hora de los datos, el período, «Demo» y la franja)',
    cifras: 5,
    porqueCifras: '2 (el principal), 355 bbl, 07:00, y 247 y 108 de cada fila (§10: los bbl sin causa, la hora límite y quién debe cada parada), como el boceto',
  },
  sup: {
    antes: 104, tope: 84,
    porque: 'necesario §3 y §14: «Paradas por confirmar 4 · el reporte sale mañana antes de las 07:00», «Ahora 1.966 bbl/d · se dejan de producir», '
      + '«No arrancar 2 · P-201B y LC-21», «Sin causa 2 · LC-21 y LC-08»; «Entregar turno» (escalón 1, arriba por FF-4) y «Registrar una pérdida» '
      + '(§0b: la pérdida con su registro; `perdidas:registrar` del supervisor); la tarjeta de confirmar en lote con lo que TRIM dedujo '
      + '(«en la planta, no planeada»: TRIM propone y la persona confirma, §3 HACE) con «Confirmar las 2 · Ver una por una», y el título de '
      + '«Conseguir la causa de 2 paradas» («Responder yo», §3 HACE): 67 de contenido (boceto 29); cabecera 17 (con «Hoy» y la hora de los datos)',
    cifras: 9,
    porqueCifras: '4 (el principal), 07:00, 1.966, No arrancar 2 y Sin causa 2 (§3, apoyos 1 a 3, como el boceto); el 2 de «Confirmar 2 paradas iguales», '
      + 'de «Confirmar las 2» y de «la causa de 2 paradas» (las dos acciones de §3 con lo que tocan), y la insignia del ☰ (4)',
  },
  oper: {
    antes: 93, tope: 80,
    porque: 'necesario §4 y §14: «Pregunta 1 de 4», «P-201B · bomba de agua · paró hoy en la madrugada · planta · agua» (el tramo, §0b), '
      + '«¿Qué parte se dañó?» con sus 4 opciones a un toque y el dato de cada una («5 de sus 8 fallas», «escoja de la lista», «la pregunta sigue en Hoy»), '
      + '«+ Lo que encontró (si quiere)» (lo que vio, opcional: HACE principal), «a su nombre» (D1, en su ⓘ) y «Ver P-201B» (TIENE: la ficha a un toque): '
      + '69 de contenido (boceto 25, sin el dato de cada opción); cabecera 11: «Hoy · datos de las 14:00» y la franja (C1, QA v3: la imagen '
      + 'd1-grafito-oper aprobada las trae, y ISA-101 N2 y D3 las piden en todo nivel 1; antes una regla de CSS las escondía y el tope era 72)',
    cifras: 6,
    porqueCifras: '1 de 4 (el principal) y las fallas de cada parte: 5 de sus 8 y 3 de sus 8 (el orden de las opciones, imagen 5)',
  },
  jefe: {
    antes: 89, tope: 71,
    porque: 'necesario §5 y §14: «Avisan 1 · K-101 ya pasó el límite · frenaría en la planta», «Por identificar 3 · P-201B, LC-21 y LC-08», '
      + '«Fallas críticas · octubre 1 · P-201B (planta)», «Espera 7,7 de 8,1 días por falla» y «Ver la orden» (HACE principal); debajo, el título de '
      + '«Conseguir la causa de 3 paradas» con «Contestar yo» (HACE: completar el análisis) y el de «Decidir planes · simulado» (escalón 2, después de lo necesario): '
      + '51 de contenido (boceto 36); cabecera 20',
    cifras: 7,
    porqueCifras: '1 (el principal), 3, 1 y 7,7 de 8,1 (§5, apoyos 1 a 3, como el boceto), la causa de 3 paradas y la insignia del ☰ (3)',
  },
  conf: {
    antes: 88, tope: 87,
    porque: 'necesario §6 y §14: «Si falla hoy 3.059 bbl/d · P-201A y P-201C · sin instrumento · se trabaría en la planta», «Vigía 3 de 3 aciertos», '
      + '«Sin instrumento 5 equipos», «Entre fallas 41 d · bombas de agua», «Clasificación confirmada 0 de 7 filas · planeada o no» y «Abrir P-201A» '
      + '(HACE principal); su Hoy en una línea («Le tocan 2 cosas · conseguir la causa de 3 paradas · Ver lo que le toca») y «P-201B · SAP no lo sabe · Avisar» '
      + '(FF-5): 64 de contenido (boceto 34); cabecera 23 (con «Equipos», la fecha y la hora de los datos)',
    cifras: 9,
    porqueCifras: '3.059 (el principal), 3 de 3, 5, 41 y 0 de 7 (§6, apoyos 1 a 4, como el boceto), y «Le tocan 2 cosas · la causa de 3 paradas» (su Hoy en una línea)',
  },
  tec: {
    antes: 88, tope: 87,
    porque: 'necesario §8 y §14: «Hoy 5 cosas · Primero P-201B: diga qué se dañó», «No arrancar 2 · P-201B y LC-21», la tarjeta de P-201B (alarma, '
      + 'bomba de agua, paró hoy en la madrugada) con «Contestar» y «Ver P-201B», y la pregunta abierta con sus opciones a un toque y el dato de cada una '
      + '(HACE principal; FF-2: le llega abierta): 71 de contenido (boceto 25); cabecera 16',
    cifras: 6,
    porqueCifras: '5 (el principal), No arrancar 2 (apoyo 1), y las fallas de cada parte: 5 de sus 8 y 3 de sus 8 (el orden de las opciones)',
  },
  adm: {
    antes: 79, tope: 77,
    porque: 'necesario §11 y §14: «3 de 6 pasos listos», «Falta firmar a qué pozos sirve cada equipo», «Seguir el paso» (HACE principal) y los 6 pasos '
      + 'con su estado («firmado», «completos», «sin firmar»: el siguiente se lee en la lista, VE principal): 57 de contenido (boceto 31); cabecera 20',
    cifras: 2,
    porqueCifras: '3 de 6 (el principal)',
  },
}

/** Como mucho 5 cifras sin desplazarse en el teléfono (§4; X4 §3.1), salvo el `cifras` de un rol con su porqué. */
export const CIFRAS_TELEFONO = 5
/** Una sola cifra grande por vista (X5 §2.1). */
export const GRANDES = 1
