/* F4 · El presupuesto de palabras del inicio de cada rol (PROMPT-REVISION-UX §4 y §11).

   La meta: al menos −40 % de palabras sin desplazarse en el inicio de cada rol. Por la
   decisión D-1 del coordinador se mide a 390 × 844 px (el teléfono de las imágenes
   aprobadas), en toda la ventana: la banda, la cabecera y el contenido.

   `antes` es la medición de R1 sobre 5aaa7f2 (`docs/experiencia-v2/R-revision/medicion/
   antes.json`, columna `palVista`, 390 px, tema claro; la misma en el oscuro), y `tope`
   es el −40 %: `Math.floor(antes × 0,6)`. La cuenta es la de `inicio.ts`, la misma
   del guion de R1 (`herramientas/medir.mjs`).

   **Para el coordinador.** Este archivo es de datos: si un rol no llega al −40 % porque
   la imagen aprobada trae más texto (D-1), se sube su `tope` y se escribe el `porque`
   (qué imagen y qué bloque). Un tope sin `porque` es el −40 % exacto. plan y cont están
   apagados en el MVP (`ROLES_V2`): abren como producción y no se miden.

   **D-1, tipo de pantalla (coordinador, 27-oct).** Un rol sin imagen propia toma la de su mismo tipo de
   pantalla: tareas y listas (Hoy de jefe y tec; la cabeza de Equipos de conf), la imagen 3b al abrir
   (89 palabras, 9 cifras); una vista de un campo (Reporte de reg, Configurar de adm), la imagen 2 (81, 9).

   **K2 · Lo mismo con las cifras.** Como mucho 5 sin desplazarse (`CIFRAS_TELEFONO`), sin
   la franja ni la hora de los datos (D-1). Si la imagen aprobada del rol trae más, sube
   `cifras` con su `porqueCifras`. Las palabras de cada imagen se contaron con la regla de
   `inicio.ts` (una palabra es un pedazo con letra o número; el número dentro de una marca
   de prioridad no cuenta). El detalle, en `docs/experiencia-v2/R-revision/cierre-k2.md`. */

export type Presupuesto = { antes: number; tope: number; porque?: string; cifras?: number; porqueCifras?: string }

const menos40 = (antes: number): Presupuesto => ({ antes, tope: Math.floor(antes * 0.6) })

export const PRESUPUESTO: Record<string, Presupuesto> = {
  ger: {
    ...menos40(97), tope: 85,
    porque: 'la imagen 2 (La Ceiba, al medio) trae 81 palabras sin desplazarse: «‹ Todos mis campos», la franja, la cifra con su frase, '
      + 'Antes · Durante · Después y la tubería de pie con sus cinco rótulos y la caja de LC-21; más «Demo» (UI-22) y «el agua solo deja pasar '
      + '236 bbl/d más de crudo» en vez de «no da para más crudo» (P-14, V1: +3)',
    cifras: 9,
    porqueCifras: 'la imagen 2 (La Ceiba) rotula cada tramo con su cifra: 1.966, 15 de 18, 1.665, 89,6 %, 9.394, meta 10.900 y 301 (8); más 236 de P-14',
  },
  prod: {
    ...menos40(98), tope: 82,
    porque: 'la misma pantalla y la misma tubería de la imagen 2 (La Ceiba, 81 palabras), con la cifra de producción (P-01) y sin repetirla '
      + 'en «Sale hoy · meta 10.900»; más «Demo» (UI-22) y P-14 (+3)',
    cifras: 9,
    porqueCifras: 'los rótulos de la tubería de la imagen 2 (15 de 18, 1.665, 89,6 %, meta 10.900 y 301), la cifra 9.394 (una vez), 236 de P-14 y la insignia del ☰',
  },
  // Decisión del coordinador (D-1): un rol sin imagen propia toma la imagen aprobada de su MISMO tipo de pantalla.
  reg: {
    ...menos40(130), tope: 81, cifras: 9,
    porque: 'tipo vista de un campo: imagen 2 (La Ceiba), 81 palabras y 9 cifras (decisión del coordinador). Con el árbol plegado en el '
      + 'teléfono (título, «Ver los códigos ANH» y su total, que lo abre) y la fila sin repetir quién lo debe: 81',
    porqueCifras: 'tipo vista de un campo: imagen 2 (La Ceiba), 9 cifras',
  },
  sup: {
    ...menos40(117), tope: 104,
    porque: 'la imagen 3b al abrir trae 89 palabras (la cifra con «Le faltan 4 paradas por confirmar…», el «No arrancar», «Confirmar 2 paradas iguales» '
      + 'entera y el comienzo de «Conseguir la causa»); la tarjeta entera, con su porqué, «Responder yo» y «Ver el chat», es la de la imagen 3b '
      + 'después de confirmar (+15). Más «Demo» (UI-22) y «ni LC-21» (dato); sin «su turno» ni la hora de la tarjeta (−3)',
    cifras: 10,
    porqueCifras: 'la imagen 3b al abrir trae 9 (la insignia, 1.966, 4, 07:00, el 2 de «Confirmar 2 paradas», «las 2», «causa de 2», 05:43 y 19,7); '
      + 'sin 05:43 y con «Entre las 2: 219 bbl hoy» de la tarjeta entera (imagen 3b, después de confirmar)',
  },
  oper: {
    ...menos40(94), tope: 93,
    porque: 'la imagen 5 (la primera de 4) trae 112 palabras sin desplazarse: la banda con la pregunta, la franja, el bloqueo con su salvedad, '
      + 'la tubería chica y las cuatro opciones con su dato; aquí, con el momento en palabras («paró hoy en la madrugada»), 93',
    cifras: 7,
    porqueCifras: 'la imagen 5 trae 9: la insignia, «Pregunta 1 de 4», 03:52, 10,1 h y «5 de sus 8» y «3 de sus 8» fallas; sin la hora ni el «hace» quedan 7',
  },
  jefe: {
    ...menos40(131), tope: 89, cifras: 9,
    porque: 'tipo tareas: imagen 3b al abrir, 89 palabras y 9 cifras (decisión del coordinador): la cifra de X4 con el vigía, el «No arrancar» '
      + 'y las tarjetas de lo que falta por identificar y de K-101',
    porqueCifras: 'tipo tareas: imagen 3b al abrir, 9 cifras (la de X4 ya trae 4: 7,7 de 8,1 y 3 de 3)',
  },
  conf: {
    ...menos40(108), tope: 89, cifras: 9,
    porque: 'tipo lista (su cabeza es una lista de filas: los tres primeros de «Si falla hoy»): imagen 3b al abrir, 89 palabras y 9 cifras (decisión del coordinador)',
    porqueCifras: 'tipo lista: imagen 3b al abrir, 9 cifras',
  },
  tec: {
    ...menos40(116), tope: 89, cifras: 9,
    porque: 'tipo tareas: imagen 3b al abrir, 89 palabras y 9 cifras (decisión del coordinador)',
    porqueCifras: 'tipo tareas: imagen 3b al abrir, 9 cifras',
  },
  adm: {
    ...menos40(95), tope: 81, cifras: 9,
    porque: 'tipo vista de un campo: imagen 2 (La Ceiba), 81 palabras y 9 cifras (decisión del coordinador): «N de M pasos listos», lo que falta y los pasos',
    porqueCifras: 'tipo vista de un campo: imagen 2 (La Ceiba), 9 cifras',
  },
}

/** Como mucho 5 cifras sin desplazarse en el teléfono (§4; X4 §3.1). */
export const CIFRAS_TELEFONO = 5
/** Una sola cifra grande por vista (X5 §2.1). */
export const GRANDES = 1
