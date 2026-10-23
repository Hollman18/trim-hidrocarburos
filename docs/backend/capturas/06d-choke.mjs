/* Capturas del capítulo 6D · Pantallas del choke y del árbol de causas
 * (docs/backend/06d-choke-pantallas/). Se generan desde la raíz del repositorio con:
 *
 *   npm run pantallazos:doc -- --solo 06d                 # todas las de este capítulo
 *   npm run pantallazos:doc -- --solo 06d-prod-produccion # las que empiecen así
 *
 * Cada marca remite a la fila del mismo número en la tabla de su pantalla
 * (NN-*.md); las variantes reusan el número de la fila que explican. Las que
 * escriben en una caja antes de capturar van en CAPTURAS_ESCRITAS. */

// ─────────────── 6D.1 Producción y 6D.2 Planta y Agua ───────────────

const A_TUBERIA = 'section:has([data-tuberia])'
const A_SERIE = 'section:has([data-serie])'
const A_ESCALERA = 'section:has([data-escalera])'
const A_MENSUAL = 'section:has([data-mensual])'
const A_CAMPOS = 'section:has([data-tuberias])'
/** Ancho de las capturas de la tubería: con 1.300 px el número de la frase de hoy cabe a su derecha. */
const A_ANCHO = 1300
const A_DETALLE_PLANTA = 'section[aria-label="Detalle: Planta o estación"]'
const A_AGUA = 'section:has([data-tuberia-agua])'
const A_AGUA_HOY = '[data-agua-hoy]'
const A_SIN_INSTRUMENTO = '[data-sin-instrumento]'

const A_CAPTURAS = [
  /* ───────────── 6D.1 Producción ───────────── */
  { archivo: '06d-prod-produccion-ceiba', ruta: '#/prod/produccion/ceiba/curso', ancho: A_ANCHO, elemento: A_TUBERIA, marcas: [
    { n: 1, texto: /^qué limita hoy al campo/ },
    { n: 2, texto: /potenciales con las pruebas vigentes/, lado: 'der' },
    { n: 3, rol: 'button', nombre: 'Ver como tabla' },
    { n: 4, texto: /^va con los pozos/, lado: 'abajo' },
    { n: 5, texto: 'POZOS · 18', exacto: true },
    { n: 6, sel: 'button[data-tramo="pozo"]', caja: 'elemento' },
    { n: 7, texto: '◄ LIMITA', exacto: true, lado: 'der' },
    { n: 8, texto: 'con las pruebas de los pozos', exacto: true },
    { n: 9, texto: 'P-201B', exacto: true, lado: 'der' },
    { n: 10, texto: /^le sobran 1\.143/ },
    { n: 11, texto: 'dato del demo, sin firmar', exacto: true, i: 0 },
    { n: 12, texto: /^crudo 13\.000/ },
    { n: 13, texto: /^agua ≈ 14\.168/ },
    { n: 14, rol: 'button', nombre: 'Ver la tubería del agua' },
    { n: 15, texto: 'gas · sin medir', exacto: true, lado: 'der' },
    { n: 16, sel: '[data-hoy-linea]', caja: 'elemento' },
    { n: 17, texto: /^hoy, sin P-201B: 178\.500/, lado: 'der' },
    { n: 18, texto: /^le sobran 2\.143/ },
    { n: 19, texto: /^El terminal o el cliente/ },
    { n: 20, sel: '[data-sin-identificar]', caja: 'elemento' },
    { n: 21, sel: '[data-frase]', lado: 'arriba' },
    { n: 22, sel: '[data-frase-hoy]', lado: 'der' },
    { n: 23, texto: 'PASA HOY', exacto: true, lado: 'der' },
    { n: 24, texto: 'PERDIÉNDOSE AHORA', exacto: true, lado: 'der' },
    { n: 25, sel: '[data-cuadre-hoy]', lado: 'der' },
    { n: 26, texto: /cerró LC-07 y LC-16/, lado: 'der' },
    { n: 27, rol: 'button', nombre: 'Abrir P-201B' },
    { n: 28, texto: /LC-21 · todavía sin causa/, lado: 'der' },
    { n: 29, texto: '1.046 bbl', exacto: true },
    { n: 30, rol: 'button', nombre: 'Ver por dónde se trabó', lado: 'arriba' },
    { n: 31, texto: '(LC-05)', exacto: true, lado: 'der' },
    { n: 32, texto: '(P-201B)', exacto: true, lado: 'der' },
    { n: 33, texto: '(LC-21 247 · LC-08 109)', exacto: true, lado: 'der' },
  ] },
  { archivo: '06d-prod-produccion-ceiba-tabla', ruta: '#/prod/produccion/ceiba/curso', ancho: A_ANCHO, elemento: A_TUBERIA,
    antes: [{ nombre: 'Ver como tabla' }], marcas: [
      { n: 1, rol: 'button', nombre: 'Ocultar la tabla' },
      { n: 2, texto: /^La tubería del campo, en números/, lado: 'der' },
      { n: 3, texto: 'Pozos (18) ◄ limita', exacto: true, lado: 'der' },
      { n: 4, texto: '13.000 · sin firmar', exacto: true },
      { n: 5, texto: '┄ Sin identificar', exacto: true, lado: 'der' },
      { n: 6, texto: 'pasa hoy 9.394', exacto: true },
      { n: 7, texto: /^Cuadre de hoy: los pozos 11\.857/, lado: 'der' },
    ] },
  { archivo: '06d-prod-produccion-ceiba-tramo', ruta: '#/prod/produccion/ceiba/curso', ancho: A_ANCHO, elemento: A_TUBERIA,
    antes: [{ nombre: /^en la planta/ }], marcas: [
      { n: 1, sel: '[data-tramo-periodo="planta"] button[aria-expanded="true"]', caja: 'elemento', lado: 'abajo' },
      { n: 2, sel: '[data-ramas="planta"]', caja: 'elemento', lado: 'der' },
      { n: 3, texto: /^Toque un tramo para abrirlo/, lado: 'der' },
    ] },
  { archivo: '06d-prod-produccion-ceiba-cerrado-serie', ruta: '#/prod/produccion/ceiba/cerrado', elemento: A_SERIE, marcas: [
    { n: 1, texto: /^Sin cambios: en el período/, lado: 'der' },
    { n: 2, rol: 'img', nombre: /^Cambió lo que limita:/ },
    { n: 3, texto: 'Po', exacto: true, i: 0, lado: 'abajo' },
    { n: 4, sel: '[data-dia="21"] rect[fill^="url(#pl"]', caja: 'elemento' },
    { n: 5, sel: '[data-dia="26"] > rect:last-child', caja: 'elemento' },
    { n: 6, sel: '[data-leyenda-serie]', lado: 'der' },
  ] },
  { archivo: '06d-prod-produccion-ceiba-cerrado-cabecera', ruta: '#/prod/produccion/ceiba/cerrado', elemento: 'main section:first-of-type', marcas: [
    { n: 17, sel: '[data-del-potencial]', lado: 'der' },
  ] },
  { archivo: '06d-prod-produccion-ceiba-cerrado-escalera', ruta: '#/prod/produccion/ceiba/cerrado', elemento: A_ESCALERA, marcas: [
    { n: 1, rol: 'img', nombre: /^La escalera:/, lado: 'abajo' },
    { n: 2, texto: '94,7 %', exacto: true, lado: 'der' },
    { n: 3, rol: 'img', nombre: /^Eficiencia de producción:/, lado: 'der' },
    { n: 4, texto: /^338\.662 de 357\.485 bbl/, lado: 'der' },
    { n: 5, texto: '2,2 %', exacto: true },
    { n: 6, texto: /bbl en paradas no planeadas$/ },
    { n: 7, texto: 'Lo que dan los pozos según sus pruebas', exacto: true, lado: 'der' },
    { n: 8, sel: '[data-brecha-pruebas] > span', lado: 'der' },
    { n: 9, texto: /^= El potencial del libro/, lado: 'der' },
    { n: 10, texto: /^− El yacimiento y los proyectos/, lado: 'der' },
    { n: 11, texto: /^− Paradas no planeadas/, lado: 'der' },
    { n: 12, texto: /^− Sin identificar: falta que una persona/, lado: 'der' },
    { n: 13, texto: /^− Sin explicar: el inventario/, lado: 'der' },
    { n: 14, texto: '= Lo que salió por el punto de medición oficial', exacto: true, lado: 'der' },
    { n: 15, texto: /tienen el tramo como propuesta de TRIM/, lado: 'der' },
    { n: 16, rol: 'button', nombre: 'Ver por tramo', lado: 'der' },
  ] },
  { archivo: '06d-prod-produccion-ceiba-portramo', ruta: '#/prod/produccion/ceiba/curso', elemento: A_ESCALERA,
    antes: [{ nombre: 'Ver por tramo' }], marcas: [
      { n: 1, rol: 'button', nombre: 'Ocultar por tramo', lado: 'der' },
      { n: 2, texto: 'Por tramo y escalón · bbl', exacto: true, lado: 'der' },
      { n: 3, texto: 'Paradas no planeadas: fallas, disparos y terceros', exacto: true, lado: 'der' },
      { n: 4, texto: 'Sin identificar: falta que una persona diga qué pasó', exacto: true, lado: 'der' },
      { n: 5, texto: 'Total del tramo', exacto: true, lado: 'der' },
    ] },
  { archivo: '06d-prod-produccion-ceiba-cerrado-mensual', ruta: '#/prod/produccion/ceiba/cerrado', elemento: A_MENSUAL, marcas: [
    { n: 1, texto: '16,9 k', exacto: true },
    { n: 2, sel: '[data-mes-activo]', caja: 'elemento' },
    { n: 3, texto: 'SEP', exacto: true },
    { n: 4, texto: 'en curso', exacto: true },
    { n: 5, texto: 'sin identificar', exacto: true, dentro: A_MENSUAL, lado: 'der' },
  ] },
  { archivo: '06d-prod-produccion-portafolio', ruta: '#/prod/produccion/ceiba~portafolio/curso', elemento: A_CAMPOS, marcas: [
    { n: 1, texto: /^qué limita hoy/ },
    { n: 2, texto: /^Qué limita hoy: los pozos \(11\.857/, lado: 'der' },
    { n: 3, texto: /^A la planta le sobran 1\.143/, dentro: '[data-tuberias]', lado: 'der' },
    { n: 4, sel: '[data-no-se-produjeron]', i: 0 },
    { n: 5, texto: /^Qué limita hoy: los pozos \(3\.321/, lado: 'der' },
  ] },
  { archivo: '06d-prod-produccion-ceiba-telefono', ruta: '#/prod/produccion/ceiba/curso', telefono: true, elemento: A_TUBERIA, marcas: [
    { n: 1, texto: /^va con los pozos/, lado: 'der' },
    { n: 2, texto: '◄ LIMITA', exacto: true },
    { n: 3, texto: '11.857bbl/d', exacto: true },
    { n: 4, sel: '[data-dibujo="de-pie"] [data-hoy-linea]', caja: 'elemento' },
    { n: 5, texto: /^le sobran 1\.143 · ┄ dato del demo/, lado: 'der' },
  ] },
  { archivo: '06d-prod-produccion-ceiba-cerrado-serie-telefono', ruta: '#/prod/produccion/ceiba/cerrado', telefono: true, elemento: A_SERIE, marcas: [
    { n: 1, texto: 'SEMANA DEL 28 DE SEPT', exacto: true, lado: 'der' },
    { n: 2, texto: 'limitaron los pozos 3 de 3 días', exacto: true, lado: 'der' },
  ] },
  /* ───────────── 6D.2 Planta y Agua ───────────── */
  { archivo: '06d-prod-planta-ceiba', ruta: '#/prod/planta/ceiba/curso', ancho: 1512,
    antes: [{ nombre: /^Planta o estación/ }], marcas: [
      { n: 1, texto: 'LA TUBERÍA DEL CAMPO', exacto: true },
      { n: 2, sel: 'button[data-tramo="planta"]', caja: 'elemento' },
      { n: 3, rol: 'button', nombre: 'Ver la tubería del agua', dentro: A_DETALLE_PLANTA },
      { n: 4, rol: 'button', nombre: 'Ver la planta en el esquema', lado: 'der' },
      { n: 5, rol: 'button', nombre: 'Ver la tubería', exacto: true },
      { n: 6, texto: 'ESQUEMA DE PLANTA', exacto: true },
    ] },
  { archivo: '06d-prod-agua-ceiba', ruta: '#/prod/agua/ceiba/curso', marcas: [
    { n: 1, rol: 'img', nombre: /^La tubería del agua:/, lado: 'abajo' },
    { n: 2, texto: /agua de las pruebas vigentes/ },
    { n: 3, texto: /^224\.075/ },
    { n: 4, texto: /^hoy 174\.033/ },
    { n: 5, sel: '[data-tramo-agua="tratamiento"]', caja: 'elemento' },
    { n: 6, texto: /^TK-AG-CE · 30\.000/ },
    { n: 7, sel: '[data-tanque="TK-AG-CE"] span[aria-hidden]', caja: 'elemento' },
    { n: 8, texto: '89,6 %', exacto: true },
    { n: 9, texto: /^al parar P-201B estaba al 78,7/ },
    { n: 10, texto: /^267\.750/, i: 0 },
    { n: 11, texto: /^cabe más: 43\.675/, i: 0 },
    { n: 12, texto: '┄ dato del demo, sin firmar', i: 0 },
    { n: 13, texto: 'casi iguales', exacto: true, i: 0 },
    { n: 14, sel: '[data-bomba="P-201A"]' },
    { n: 15, sel: '[data-bomba="P-201B"]' },
    { n: 16, texto: /^3 × 90\.000 de placa/ },
    { n: 17, sel: '[data-tramo-agua="bombas"] [data-hoy]' },
    { n: 18, sel: '[data-tramo-agua="inyectores"]', caja: 'elemento' },
    { n: 19, texto: /^Con las tres bombas, cabe más agua/ },
    { n: 20, texto: /dan exactamente lo mismo/ },
    { n: 21, texto: /^Si para una con todos los pozos/ },
    { n: 22, texto: /^P-201B está parada desde/ },
    { n: 23, texto: /^Cerrando primero los más acuatosos/ },
    { n: 24, texto: 'HOY', exacto: true },
    { n: 25, texto: 'LO QUE PASÓ', exacto: true },
    { n: 26, texto: /evitable cerrando en orden/ },
    { n: 27, texto: 'SI PARA OTRA BOMBA', exacto: true },
    { n: 28, texto: /^con P-201A y P-201C solas/ },
    { n: 29, texto: 'LC-02', exacto: true, dentro: '[data-orden-si-para-otra]' },
    { n: 30, texto: /^→ se pierden 3\.059/ },
    { n: 31, texto: 'POR QUÉ ES CRÍTICA', exacto: true },
    { n: 32, texto: 'No hay bomba de sobra.', exacto: true },
    { n: 33, texto: 'El tanque aguanta horas y la reparación dura días.', exacto: true },
    { n: 34, texto: 'Para seguido.', exacto: true },
    { n: 35, rol: 'button', nombre: 'Abrir P-201B' },
    { n: 36, texto: 'LA BOMBA DE REINYECCIÓN', exacto: true },
  ] },
  { archivo: '06d-conf-agua-morichal', ruta: '#/conf/agua/morichal/curso', marcas: [
    { n: 1, texto: /^si para P-201B ahora, aguanta/ },
    { n: 2, sel: '[data-tramo-agua="bombas"] ul', caja: 'elemento' },
    { n: 3, sel: '[data-bomba="P-201B"]' },
    { n: 4, texto: /^Si para P-201B, faltan 40\.400/ },
    { n: 5, texto: 'SI PARA UNA BOMBA', exacto: true },
    { n: 6, texto: 'MN-27', exacto: true },
    { n: 7, texto: /^→ se pierden 783/ },
    { n: 8, texto: /El tanque aguanta 10,1 h/ },
    { n: 9, rol: 'button', nombre: 'Ver la bomba y el orden de cierre' },
    { n: 10, texto: /^Hay que quitar 40\.400/ },
  ] },
  { archivo: '06d-sup-bombas-ficha-P-201B', ruta: '#/sup/bombas/ceiba/curso/P-201B', ancho: 900, marcas: [
    { n: 1, texto: 'LA TUBERÍA DEL AGUA, HOY', exacto: true },
    { n: 2, texto: '174.033', exacto: true, dentro: A_AGUA_HOY },
    { n: 3, texto: '178.500', exacto: true, dentro: A_AGUA_HOY },
    { n: 4, texto: '89,6 %', exacto: true, dentro: A_AGUA_HOY },
    { n: 5, texto: /^El nivel no sube/ },
    { n: 6, sel: `${A_AGUA_HOY} [data-frases-agua]`, caja: 'elemento' },
    { n: 7, texto: /^Si para otra bomba ahora/ },
    { n: 8, texto: 'LC-02', exacto: true, dentro: A_AGUA_HOY },
    { n: 9, texto: /^→ se pierden 3\.059/, dentro: A_AGUA_HOY },
  ] },
  { archivo: '06d-sup-bombas-ceiba-sininstrumento', ruta: '#/sup/bombas/ceiba/curso', elemento: A_SIN_INSTRUMENTO, marcas: [
    { n: 1, texto: 'SIN INSTRUMENTO', exacto: true, lado: 'der' },
    { n: 2, texto: '2 bombas', exacto: true },
    { n: 3, texto: '┄ sin instrumento', exacto: true, i: 0, lado: 'der' },
    { n: 4, texto: /^Se supone en marcha/, i: 0, lado: 'der' },
    { n: 5, texto: /^Si falla hoy: 3\.059/, i: 0, lado: 'der' },
    { n: 6, rol: 'button', nombre: 'Abrir P-201A' },
  ] },
  { archivo: '06d-sup-bombas-ficha-P-201A', ruta: '#/sup/bombas/ceiba/curso/P-201A', ancho: 900, marcas: [
    { n: 7, texto: 'Tren de agua · La Ceiba', exacto: true },
    { n: 8, texto: /TRIM no ve si está en marcha/ },
    { n: 9, texto: /^Si falla hoy: 3\.059/, dentro: '[data-ficha-minima]' },
    { n: 10, texto: /^P-201A sube porque/ },
    { n: 11, texto: /TRIM no ve venir su falla/ },
    { n: 12, texto: 'LA TUBERÍA DEL AGUA, HOY', exacto: true },
  ] },
  { archivo: '06d-prod-agua-ceiba-telefono', ruta: '#/prod/agua/ceiba/curso', telefono: true, elemento: A_AGUA, marcas: [
    { n: 1, texto: /^224\.075/, lado: 'der' },
    { n: 2, texto: '89,6 %', exacto: true, lado: 'der' },
    { n: 3, sel: '[data-bomba="P-201B"]', lado: 'der' },
    { n: 4, texto: 'SI PARA OTRA BOMBA', exacto: true, lado: 'der' },
  ] },
  { archivo: '06d-sup-bombas-ficha-P-201B-telefono', ruta: '#/sup/bombas/ceiba/curso/P-201B', telefono: true, elemento: A_AGUA_HOY, marcas: [
    { n: 1, texto: '174.033', exacto: true, dentro: A_AGUA_HOY, lado: 'der' },
    { n: 2, texto: /^El nivel no sube/, lado: 'der' },
    { n: 3, rol: 'img', nombre: /^Los más acuatosos:/, dentro: A_AGUA_HOY, lado: 'arriba' },
  ] },
]

// ─────────────── 6D.3 El gerente y 6D.4 Diferidos ───────────────

/** El panel «POR CAMPO» del Resumen del gerente (el único con la línea de la pérdida). */
const B_POR_CAMPO = 'main section:has([data-perdida])'
/** El panel de la tendencia de alto impacto (con «Antes → con TRIM» por tramo y el mes a mes). */
const B_TENDENCIA = 'main section:has([data-antes-con-trim])'
/** «POR DÓNDE SE TRABÓ» de Diferidos y «DÓNDE SE TRABÓ» del gerente llevan el mismo id. */
const B_DONDE = '#por-donde-se-trabo'
const B_MES = 'main section:has(h2:text-is("MES A MES"))'
const B_EQUIPO = 'main section:has(h2:text-is("POR EQUIPO"))'
/** La línea de la barra de un campo (sin las palabras de encima ni las de al lado). */
const B_BARRA = (dentro) => ({ sel: `${dentro} [data-barra-tramos] > .overflow-hidden`, caja: 'elemento', lado: 'arriba' })
/** Un renglón de «lo no planeado de cada tramo» de un campo. */
const B_NO_PLANEADO = (campo, tramo) => ({ sel: `[data-ver-mas="${campo}"] [data-tramo-no-planeado="${tramo}"]`, caja: 'elemento' })
/** La leyenda de los tramos (la marca va a la derecha de su última palabra) y la ⓘ de la pérdida. */
const B_LEYENDA = (dentro) => ({ texto: 'sin identificar', exacto: true, dentro: `${dentro} [data-leyenda-tramos]`, lado: 'der' })
const B_PERDIDA = (dentro) => ({ sel: `${dentro} [data-perdida] [role=img]`, lado: 'der' })

const B_CAPTURAS = [
  /* ───────────── 6D.3 El gerente · Resumen ───────────── */
  // Captura 1: octubre en curso, los cinco campos, «Ver más de La Ceiba» abierto.
  { archivo: '06d-ger-resumen-portafolio', ruta: '#/ger/resumen/ceiba~portafolio/curso', elemento: B_POR_CAMPO,
    antes: [{ nombre: 'Ver más de La Ceiba', exacto: true }], marcas: [
      { n: 1, texto: 'dónde se trabó', exacto: true, i: 1 },
      { n: 2, ...B_BARRA('[data-donde-se-trabo="ceiba"]') },
      { n: 3, texto: 'planta 55 %', exacto: true },
      { n: 4, texto: 'sin identificar 34 %', exacto: true },
      { n: 5, texto: 'pozos 11 %', exacto: true },
      { n: 6, texto: 'Se trabó sobre todo en la planta: P-201B (bomba de reinyección). 355 bbl todavía sin identificar.', exacto: true },
      { n: 7, sel: '[data-bbl-campo="ceiba"]' },
      { n: 8, texto: 'Se trabó en los pozos: MN-41 (electrosumergible) y MN-22 (según el operario).', exacto: true },
      { n: 9, texto: 'pozos 100 %', exacto: true, i: 0 },
      { n: 10, texto: 'Nada se trabó en octubre (en curso).', exacto: true, i: 0 },
      { n: 11, rol: 'button', nombre: 'Ver menos de La Ceiba', exacto: true },
      { n: 12, texto: 'pozos 118 · planta 573 · sin identificar 355 bbl', exacto: true },
      { n: 13, texto: '· 118 bbl con el tramo sin confirmar', exacto: true, lado: 'der' },
      { n: 14, texto: 'lo no planeado de cada tramo', exacto: true, dentro: '[data-ver-mas="ceiba"]' },
      { n: 15, ...B_NO_PLANEADO('ceiba', 'pozo') },
      { n: 16, ...B_NO_PLANEADO('ceiba', 'planta') },
      { n: 17, ...B_NO_PLANEADO('ceiba', 'sin-asignar') },
      { n: 18, texto: /^En La Ceiba, otra bomba de agua no sube la producción/ },
      { n: 19, rol: 'button', nombre: 'Ver más de Guacamayo', exacto: true },
      { n: 20, ...B_LEYENDA('main') },
      { n: 21, ...B_PERDIDA('main') },
    ] },
  // Captura 2: septiembre cerrado, con «Ver más» de Morichal Norte y de La Zarza abiertos.
  { archivo: '06d-ger-resumen-portafolio-cerrado', ruta: '#/ger/resumen/ceiba~portafolio/cerrado', elemento: B_POR_CAMPO,
    antes: [{ nombre: 'Ver más de Morichal Norte', exacto: true }, { nombre: 'Ver más de La Zarza', exacto: true }], marcas: [
      { n: 1, texto: 'pozos 56 %', exacto: true },
      { n: 2, texto: 'planta 44 %', exacto: true },
      { n: 3, texto: 'Se trabó sobre todo en los pozos: MN-41 y MN-33 (electrosumergibles).', exacto: true },
      { n: 4, texto: 'pozos 8.724 · planta 6.815 bbl', exacto: true },
      { n: 5, texto: '· 1.183 bbl con el tramo sin confirmar', exacto: true, lado: 'der' },
      { n: 6, ...B_NO_PLANEADO('morichal', 'pozo') },
      { n: 7, ...B_NO_PLANEADO('morichal', 'planta') },
      { n: 8, texto: 'planta 13 %', exacto: true },
      { n: 9, texto: 'Se trabó sobre todo en los pozos: LC-11 y LC-04 (electrosumergibles).', exacto: true },
      { n: 10, texto: 'afuera 100 %', exacto: true },
      { n: 11, texto: 'Se trabó afuera (oleoducto, transportador o cliente): ZA-06 (según el operario).', exacto: true },
      { n: 12, ...B_NO_PLANEADO('zarza', 'exportacion') },
      { n: 13, texto: 'Se trabó sobre todo en los pozos: PA-07 (bombeo mecánico).', exacto: true },
    ] },
  // En el teléfono: el nombre y el total arriba, las barras debajo; la palabra que no cabe va al lado.
  { archivo: '06d-ger-resumen-portafolio-cerrado-telefono', ruta: '#/ger/resumen/ceiba~portafolio/cerrado', telefono: true, elemento: B_POR_CAMPO, marcas: [
    { n: 9, texto: 'Se trabó sobre todo en los pozos: LC-11 y LC-04 (electrosumergibles).', exacto: true, lado: 'abajo' },
    { n: 8, texto: 'planta 13 %', exacto: true, lado: 'der' },
  ] },
  // Captura 3: La Ceiba, «Antes → con TRIM» por tramo y el mes a mes «Por dónde se trabó».
  { archivo: '06d-ger-resumen-ceiba-tendencia', ruta: '#/ger/resumen/ceiba/curso', elemento: B_TENDENCIA,
    antes: [{ nombre: 'Por dónde se trabó', exacto: true }], marcas: [
      { n: 1, texto: /^Alto impacto · tendencia \(jun a ago/, lado: 'der' },
      { n: 2, sel: '[data-antes-con-trim] [role=img]', i: 0, lado: 'der' },
      { n: 3, texto: 'muestra corta', exacto: true, lado: 'der' },
      { n: 4, sel: '[data-antes-con-trim] dd', i: 0 },
      { n: 5, sel: '[data-antes-con-trim] dd', i: 1, lado: 'arriba' },
      { n: 6, sel: '[data-antes-con-trim] dd', i: 2 },
      { n: 7, sel: '[data-antes-con-trim] dd', i: 3, lado: 'abajo' },
      { n: 8, texto: 'En La Ceiba bajó lo que se trabó en la planta y subió lo de los pozos.', exacto: true, lado: 'der' },
      { n: 9, rol: 'button', nombre: 'Por dónde se trabó', exacto: true, lado: 'der' },
      { n: 10, texto: '661', exacto: true, dentro: B_TENDENCIA, lado: 'arriba' },
      { n: 11, sel: `${B_TENDENCIA} svg rect:has(title)`, caja: 'elemento' },
      { n: 12, texto: 'afuera', exacto: true, dentro: B_TENDENCIA, lado: 'der' },
    ] },
  // Captura 4: la misma comparación en los cinco campos.
  { archivo: '06d-ger-resumen-portafolio-tendencia', ruta: '#/ger/resumen/ceiba~portafolio/curso', elemento: B_TENDENCIA, marcas: [
    { n: 4, sel: '[data-antes-con-trim] dd', i: 0 },
    { n: 5, sel: '[data-antes-con-trim] dd', i: 1, lado: 'arriba' },
    { n: 6, sel: '[data-antes-con-trim] dd', i: 2 },
    { n: 7, sel: '[data-antes-con-trim] dd', i: 3, lado: 'abajo' },
    { n: 8, texto: 'En el conjunto de campos bajó lo que se trabó en los pozos y en la planta.', exacto: true, lado: 'der' },
  ] },
  // Captura 5: un campo solo: el panel «DÓNDE SE TRABÓ» en lugar de «POR CAMPO».
  { archivo: '06d-ger-resumen-ceiba', ruta: '#/ger/resumen/ceiba/curso', elemento: B_DONDE, marcas: [
    { n: 1, texto: 'DÓNDE SE TRABÓ', exacto: true, lado: 'der' },
    { n: 2, ...B_BARRA(B_DONDE) },
    { n: 3, texto: 'pozos 11 %', exacto: true, lado: 'der' },
    { n: 4, texto: 'Se trabó sobre todo en la planta: P-201B (bomba de reinyección). 355 bbl todavía sin identificar.', exacto: true, lado: 'der' },
    { n: 5, rol: 'button', nombre: 'Ver más de La Ceiba', exacto: true, lado: 'der' },
    { n: 6, ...B_LEYENDA(B_DONDE) },
    { n: 7, ...B_PERDIDA(B_DONDE) },
  ] },

  /* ───────────── 6D.4 Diferidos ───────────── */
  // Captura 1: producción, La Ceiba, octubre en curso, los tramos cerrados.
  { archivo: '06d-prod-diferidos-ceiba', ruta: '#/prod/diferidos/ceiba/curso', elemento: B_DONDE, marcas: [
    { n: 1, texto: 'POR DÓNDE SE TRABÓ', exacto: true, lado: 'der' },
    { n: 2, texto: 'bbl · el diferido del libro', exacto: true },
    { n: 3, ...B_BARRA(B_DONDE) },
    { n: 4, texto: 'La Ceiba se trabó sobre todo en la planta: 573 bbl de 1.046', exacto: true, lado: 'der' },
    { n: 5, sel: 'b[data-tramo="reservorio"]' },
    { n: 6, sel: 'b[data-tramo="pozo"]' },
    { n: 7, texto: 'LC-05 118', exacto: true, lado: 'der' },
    { n: 8, sel: 'b[data-tramo="planta"]' },
    { n: 9, sel: 'b[data-tramo="sin-asignar"]' },
    { n: 10, texto: 'LC-21 247 · LC-08 109', exacto: true, lado: 'der' },
    { n: 11, rol: 'button', nombre: 'Identificar', exacto: true, dentro: B_DONDE, lado: 'der' },
    { n: 12, sel: '[data-total-tramos]' },
    { n: 13, texto: /^Toque un tramo para abrirlo/, lado: 'der' },
    { n: 14, texto: 'POR QUÉ NO SE PRODUJO', exacto: true, lado: 'der' },
    { n: 15, texto: 'el mismo total, por escalón', exacto: true, lado: 'der' },
    { n: 16, sel: '[data-escalon="disponibilidad-no-planeada"]' },
    { n: 17, texto: 'lo que TRIM tiene que bajar', exacto: true, lado: 'der' },
    { n: 18, sel: '[data-escalon="disponibilidad-planeada"]' },
    { n: 19, sel: '[data-escalon="sin-clasificar"]' },
    { n: 20, texto: '118 bbl con dónde se trabó por confirmar', exacto: true, lado: 'der' },
    { n: 21, rol: 'button', nombre: 'Cada tramo por qué no se produjo', exacto: true, lado: 'der' },
    { n: 22, ...B_LEYENDA(B_DONDE) },
  ] },
  // Captura 2: septiembre cerrado, con los pozos y la planta abiertos y el cruce desplegado: el árbol nodo por nodo.
  { archivo: '06d-prod-diferidos-ceiba-cerrado', ruta: '#/prod/diferidos/ceiba/cerrado', elemento: B_DONDE,
    antes: [{ nombre: /^En los pozos/ }, { nombre: /^En la planta o estación/ }, { nombre: 'Cada tramo por qué no se produjo', exacto: true }], marcas: [
      { n: 1, sel: 'b[data-tramo="pozo"]' },
      { n: 2, texto: 'LC-11 3.677 · LC-04 2.261 · LC-16 217 · y 8 más', exacto: true },
      { n: 3, sel: '[aria-label^="LC-04 · "]', lado: 'der' },
      { n: 4, texto: 'No planeada', exacto: true, dentro: '[data-ramas="pozo"]' },
      { n: 5, texto: 'No planeada - Mecánica subsuelo', exacto: true },
      { n: 6, texto: 'Falla ESP', exacto: true },
      { n: 7, texto: 'LC-11 · electrosumergible', exacto: true },
      { n: 8, texto: '· parte: Aislamiento del motor y del cable', exacto: true, i: 0, lado: 'arriba' },
      { n: 9, texto: 'Falta el detalle', exacto: true, dentro: '[data-ramas="pozo"]', i: 0, lado: 'der' },
      { n: 10, texto: 'No planeada - Eléctrica interna', exacto: true },
      { n: 11, texto: 'LC-04 · energía eléctrica', exacto: true },
      { n: 12, sel: '[data-ramas="planta"] li[data-cadena-larga] > div', caja: 'elemento' },
      { n: 13, texto: 'Paradas no planeadas', exacto: true, dentro: `${B_DONDE} table`, lado: 'arriba' },
      { n: 14, texto: '635 bbl con dónde se trabó por confirmar', exacto: true, lado: 'der' },
    ] },
  // Captura 3: octubre en curso, con los tres tramos abiertos: las cadenas en un renglón y lo que falta.
  { archivo: '06d-prod-diferidos-ceiba-ramas', ruta: '#/prod/diferidos/ceiba/curso', elemento: B_DONDE,
    antes: [{ nombre: /^En los pozos/ }, { nombre: /^En la planta o estación/ }, { nombre: /^Sin identificar.*con sus ramas/ }], marcas: [
      { n: 1, sel: '[data-ramas="pozo"] li[data-cadena-larga] > div', i: 0, caja: 'elemento' },
      { n: 2, sel: '[data-ramas="pozo"] li[data-cadena-larga] > div', i: 1, caja: 'elemento' },
      { n: 3, sel: '[data-ramas="planta"] li[data-cadena-larga] > div', caja: 'elemento' },
      { n: 4, texto: 'Falta saber si fue planeada', exacto: true, lado: 'der' },
      { n: 5, texto: 'Falta la causa', exacto: true, lado: 'der' },
      { n: 6, texto: 'Falta el detalle', exacto: true, dentro: '[data-ramas="sin-asignar"]', lado: 'der' },
      { n: 7, texto: 'LC-21 · sin identificar', exacto: true },
      { n: 8, rol: 'button', nombre: 'Identificar', exacto: true, dentro: B_DONDE, lado: 'der' },
      { n: 9, sel: '[data-tramo-fila="sin-asignar"] [aria-label^="Sin identificar:"]', lado: 'der' },
    ] },
  // En el teléfono: una columna; la cadena de un renglón se parte en varios.
  { archivo: '06d-prod-diferidos-ceiba-telefono', ruta: '#/prod/diferidos/ceiba/curso', telefono: true, elemento: B_DONDE,
    antes: [{ nombre: /^En la planta o estación/ }], marcas: [
      { n: 1, ...B_BARRA(B_DONDE) },
      { n: 2, sel: '[data-ramas="planta"] li[data-cadena-larga] > div', caja: 'elemento' },
      { n: 3, texto: 'POR QUÉ NO SE PRODUJO', exacto: true, lado: 'der' },
    ] },
  // Captura 4: el mes a mes «Por dónde se trabó» (septiembre: el mes del período con contorno).
  { archivo: '06d-prod-diferidos-ceiba-cerrado-mesames', ruta: '#/prod/diferidos/ceiba/cerrado', elemento: B_MES,
    antes: [{ nombre: 'Por dónde se trabó', exacto: true }], marcas: [
      { n: 1, rol: 'button', nombre: 'Por cómo se identificó', exacto: true, lado: 'abajo' },
      { n: 2, rol: 'button', nombre: 'Por dónde se trabó', exacto: true, lado: 'der' },
      { n: 3, sel: '[data-mes-activo]', caja: 'elemento', lado: 'der' },
      { n: 4, texto: '7,7 k', exacto: true, lado: 'arriba' },
      { n: 5, texto: 'AGO', exacto: true, dentro: B_MES, lado: 'abajo' },
      { n: 6, sel: `${B_MES} svg rect:has(title)`, caja: 'elemento', lado: 'der' },
      { n: 7, texto: 'en curso', exacto: true, dentro: B_MES, lado: 'abajo' },
      { n: 8, texto: 'sin identificar', exacto: true, dentro: B_MES, lado: 'arriba' },
      { n: 9, texto: 'máximo firmado', exacto: true, dentro: B_MES, lado: 'arriba' },
    ] },
  // Captura 5: el Pareto «POR EQUIPO» de septiembre: «3 paradas de un solo pozo» (B-12).
  { archivo: '06d-prod-diferidos-ceiba-cerrado-pareto', ruta: '#/prod/diferidos/ceiba/cerrado', elemento: B_EQUIPO, marcas: [
    { n: 1, texto: 'SE-2', exacto: true, dentro: B_EQUIPO },
    { n: 2, texto: '3 paradas de un solo pozo', exacto: true, lado: 'der' },
    { n: 3, texto: '239', exacto: true, dentro: B_EQUIPO, lado: 'arriba' },
    { n: 4, texto: '2 pozos', exacto: true, dentro: B_EQUIPO, lado: 'abajo' },
  ] },
  // Captura 6: el gerente, La Ceiba, octubre: «DÓNDE SE TRABÓ» en su Diferidos, con «Ver más» abierto.
  { archivo: '06d-ger-diferidos-ceiba', ruta: '#/ger/diferidos/ceiba/curso', elemento: B_DONDE,
    antes: [{ nombre: 'Ver más de La Ceiba', exacto: true }], marcas: [
      { n: 1, texto: 'DÓNDE SE TRABÓ', exacto: true, lado: 'der' },
      { n: 2, ...B_BARRA(B_DONDE) },
      { n: 3, texto: 'Se trabó sobre todo en la planta: P-201B (bomba de reinyección). 355 bbl todavía sin identificar.', exacto: true, lado: 'der' },
      { n: 4, texto: 'pozos 118 · planta 573 · sin identificar 355 bbl', exacto: true },
      { n: 5, texto: 'lo no planeado de cada tramo', exacto: true },
      { n: 6, ...B_NO_PLANEADO('ceiba', 'sin-asignar') },
      { n: 7, ...B_LEYENDA(B_DONDE) },
    ] },
  // Captura 7: el mes a mes del gerente en Diferidos, «Por dónde se trabó».
  { archivo: '06d-ger-diferidos-ceiba-mesames', ruta: '#/ger/diferidos/ceiba/curso', elemento: B_MES,
    antes: [{ nombre: 'Por dónde se trabó', exacto: true }], marcas: [
      { n: 1, rol: 'button', nombre: 'Por equipo', exacto: true, lado: 'abajo' },
      { n: 2, rol: 'button', nombre: 'Por dónde se trabó', exacto: true, lado: 'der' },
      { n: 3, texto: '661', exacto: true, dentro: B_MES, lado: 'arriba' },
      { n: 4, texto: 'afuera', exacto: true, dentro: B_MES, lado: 'der' },
    ] },
]

// ─────────────── 6D.5 Riesgo y 6D.6 Turno ───────────────

const C_SIFALLA = '#si-falla-hoy'
/** Una fila de «Si falla hoy» (`data-fila-critica`, `data-campo`): sus hijos son las columnas #, equipo, tramo, cifra y el resto. */
const C_FILA = (equipo, campo = 'ceiba') => `[data-fila-critica="${equipo}"][data-campo="${campo}"]`
/** Un panel por su título (`Panel`: section > header > h2). */
const C_PANEL = titulo => `section:has(> header h2:text-is("${titulo}"))`
const C_CIERRE = C_PANEL('CIERRE DE HOY · PARADAS POR CONFIRMAR')
const C_P1 = 'Prioridad 1 · alarma'

const C_CAPTURAS = [
  /* ───────────── 6D.5 Riesgo: «Si falla hoy» ───────────── */
  { archivo: '06d-jefe-riesgo-ceiba', ruta: '#/jefe/riesgo/ceiba/curso', marcas: [
    { n: 1, texto: '1.966' },
    { n: 2, sel: 'small:has-text("del potencial") > span.inline-flex', caja: 'elemento', lado: 'der' },
    { n: 3, sel: '[data-en-juego]' },
    { n: 4, texto: 'ya pasó el límite', exacto: true, i: 0 },
    { n: 5, rol: 'button', nombre: 'ver «Si falla hoy»' },
    { n: 6, sel: '[data-se-trabaria]', lado: 'der' },
    { n: 7, texto: /^cruza en ya pasó el límite$/, caja: 'elemento' },
    { n: 8, texto: /^si para hasta 9\.394 bbl\/d$/ },
    { n: 9, texto: 'de lo que más le quita al campo por día a lo que menos' },
    { n: 10, texto: 'Lo que el campo deja de sacar por día si el equipo falla hoy' },
    { n: 11, sel: '[data-parado="P-201B"]', caja: 'elemento' },
    { n: 12, texto: 'También parados' },
    { n: 13, sel: '[data-cambio-hoy]' },
    { n: 14, sel: '[data-decide="jefe"]' },
    { n: 15, sel: `${C_FILA('P-201A')} > span:nth-child(1)` },
    { n: 16, texto: 'sube', exacto: true, i: 0, lado: 'arriba' },
    { n: 17, sel: `${C_FILA('P-201A')} > span:nth-child(3)` },
    { n: 18, sel: `${C_FILA('P-201A')} > span:nth-child(4)` },
    { n: 19, sel: `${C_FILA('P-201A')} > span:nth-child(5) > span:nth-child(1)` },
    { n: 20, sel: `${C_FILA('LC-11')} > span:nth-child(5) > span:nth-child(2)` },
    { n: 21, sel: `${C_FILA('LC-08')} > span:nth-child(5) > span:nth-child(2) small`, lado: 'abajo' },
    { n: 22, sel: `${C_FILA('P-201A')} > span:nth-child(5) > span:nth-child(3)` },
    { n: 23, rol: 'button', nombre: 'ver 13 más' },
    { n: 24, texto: 'Sin cifra todavía · techo si cierran todos sus pozos' },
    { n: 25, sel: `${C_FILA('K-101')} > span:nth-child(4)` },
    { n: 26, sel: `${C_FILA('K-101')} > span:nth-child(5) > span:last-child` },
    { n: 27, texto: '«hasta»: supone que se cierran todos los pozos' },
    { n: 28, texto: 'Sin dato · lo que falta para calcularlos' },
    { n: 29, sel: `${C_FILA('C-401')} > span:nth-child(4)` },
    { n: 30, sel: `${C_FILA('C-401')} > span:nth-child(5) > span:nth-child(1)`, lado: 'der' },
    { n: 31, sel: `${C_FILA('TK-102')} > span:nth-child(5) > span:last-child` },
    { n: 32, sel: '[data-sin-calcular]' },
  ] },
  // La cabecera del portafolio: la suma con un techo dice «hasta» (sumaSiPara). Solo lo de arriba (800 px).
  { archivo: '06d-jefe-riesgo-portafolio', ruta: '#/jefe/riesgo/ceiba~portafolio/curso', completa: false, marcas: [
    { n: 1, sel: '[data-en-juego]' },
    { n: 3, texto: 'se trabaría en el pozo', i: 0, lado: 'der' },
    { n: 2, texto: 'se trabaría en la planta', i: 0, lado: 'der' },
  ] },
  { archivo: '06d-conf-riesgo-morichal', ruta: '#/conf/riesgo/morichal/curso', elemento: C_SIFALLA, marcas: [
    { n: 1, sel: `${C_SIFALLA} p:has-text("modelo choke")`, lado: 'der' },
    { n: 2, texto: 'Parados: MN-41' },
    { n: 3, sel: '[data-decide="conf"]', lado: 'der' },
    { n: 4, sel: `${C_FILA('MPP-301', 'morichal')} > span:nth-child(5) > span:last-child` },
    { n: 5, sel: `${C_FILA('P-201A', 'morichal')} > span:nth-child(1)`, lado: 'der' },
    { n: 6, rol: 'button', nombre: 'ver 42 más', lado: 'der' },
    { n: 7, sel: `${C_FILA('SE-2', 'morichal')} > span:nth-child(4)` },
    { n: 8, sel: '[data-sin-calcular]', lado: 'arriba' },
  ] },
  { archivo: '06d-ger-riesgo-ceiba', ruta: '#/ger/riesgo/ceiba/curso', marcas: [
    { n: 1, sel: 'small:has-text("del potencial") > span.inline-flex', caja: 'elemento', lado: 'der' },
    { n: 2, sel: '[data-en-juego]' },
    { n: 3, texto: 'ya pasó el límite', exacto: true, i: 0 },
    { n: 4, texto: 'EN RIESGO', exacto: true },
    { n: 5, texto: 'aire de instrumentos', exacto: true, lado: 'abajo' },
    { n: 6, texto: /^si para hasta 9\.394 bbl\/d$/ },
  ] },
  { archivo: '06d-jefe-riesgo-zarza', ruta: '#/jefe/riesgo/zarza/curso', elemento: C_SIFALLA, marcas: [
    { n: 1, sel: '[data-campo-de-gas]', lado: 'der' },
  ] },
  // Las fichas, a 900 px como las de 6B.4; solo lo de arriba (lo demás de la ficha está en 6B.4).
  { archivo: '06d-jefe-riesgo-ceiba-ficha-K-101', ruta: '#/jefe/riesgo/ceiba/curso/K-101', ancho: 900, completa: false, marcas: [
    { n: 1, texto: 'P1 · ALARMA', lado: 'der' },
    { n: 2, texto: '3 unidades (N+1)', lado: 'arriba' },
    { n: 3, sel: '[data-si-falla-ficha="K-101"]' },
  ] },
  { archivo: '06d-jefe-riesgo-ceiba-ficha-P-201A', ruta: '#/jefe/riesgo/ceiba/curso/P-201A', ancho: 900, completa: false, marcas: [
    { n: 1, texto: 'TRIM no ve si está en marcha; se supone que sí' },
    { n: 2, texto: 'Si falla hoy:', exacto: true, dentro: '[data-ficha-minima]' },
    { n: 3, texto: 'P-201A sube porque P-201B está parada' },
    { n: 4, texto: 'Sin instrumento: TRIM no ve venir su falla.', exacto: true },
    { n: 5, texto: 'LA TUBERÍA DEL AGUA, HOY' },
  ] },
  { archivo: '06d-jefe-riesgo-ceiba-telefono', ruta: '#/jefe/riesgo/ceiba/curso', telefono: true, elemento: C_SIFALLA, marcas: [
    { n: 1, sel: `${C_FILA('P-201A')} > span:nth-child(4)` },
    { n: 2, sel: `${C_FILA('P-201A')} > span:nth-child(3)` },
    { n: 3, sel: `${C_FILA('P-201A')} > span:nth-child(5)` },
    { n: 4, sel: `${C_FILA('LC-11')} > span:nth-child(5)` },
    { n: 5, sel: `${C_FILA('LC-08')} > span:nth-child(5) > span:nth-child(2) small`, lado: 'arriba' },
  ] },

  /* ───────────── 6D.6 Turno: «Qué limita hoy», «Lo más frágil» y el cierre de hoy ───────────── */
  { archivo: '06d-sup-turno-ceiba', ruta: '#/sup/turno/ceiba/curso', marcas: [
    { n: 1, texto: '1.966' },
    { n: 2, sel: 'small:has-text("pozos parados") > span.inline-flex', caja: 'elemento', lado: 'der' },
    { n: 3, texto: 'por identificar', exacto: true },
    { n: 4, texto: 'Qué limita hoy al campo' },
    { n: 5, sel: '[data-hoy-limita] span[aria-label^="Limita"]' },
    { n: 6, sel: '[data-frase-hoy]' },
    { n: 7, sel: '[data-fragil]' },
    { n: 8, texto: 'CIERRE DE HOY · PARADAS POR CONFIRMAR' },
    { n: 9, texto: '4 · 0 completas' },
    { n: 10, texto: /^4 paradas hoy/ },
    { n: 11, sel: '[data-lote] > b' },
    { n: 12, sel: '[data-lote] > p' },
    { n: 13, sel: '[data-lote] li' },
    { n: 14, rol: 'button', nombre: 'Confirmar las 2' },
    { n: 15, rol: 'button', nombre: 'Ver una por una', lado: 'der' },
    { n: 16, sel: '[data-falta-hoy]' },
    { n: 17, rol: 'button', nombre: 'Responder en Identificar', lado: 'der' },
    { n: 18, texto: 'en la planta', exacto: true, lado: 'arriba' },
    { n: 19, texto: 'dónde: sin identificar todavía', lado: 'der' },
    { n: 20, rol: 'img', nombre: C_P1, dentro: C_PANEL('2 · Identificar') },
  ] },
  // Lo que queda después de «Confirmar las 2» (el lote sale; el aviso lo dice).
  { archivo: '06d-sup-turno-ceiba-confirmado', ruta: '#/sup/turno/ceiba/curso', antes: [{ nombre: 'Confirmar las 2' }], elemento: C_CIERRE, marcas: [
    { n: 1, texto: '4 · 2 completas' },
    { n: 2, texto: /^4 paradas hoy · 2 completas/, lado: 'der' },
    { n: 3, sel: 'p[role=status]', lado: 'der' },
    { n: 4, sel: '[data-falta-hoy]', lado: 'der' },
  ] },
  { archivo: '06d-oper-turno-ceiba', ruta: '#/oper/turno/ceiba/curso', completa: false, marcas: [
    { n: 1, texto: 'CIERRE DE HOY · PARADAS POR CONFIRMAR' },
    { n: 2, texto: 'Lo confirma supervisión o producción, que firman el día.' },
    { n: 3, texto: 'bomba de reinyección', exacto: true, i: 0, lado: 'der' },
  ] },
  { archivo: '06d-sup-turno-ceiba-telefono', ruta: '#/sup/turno/ceiba/curso', telefono: true, marcas: [
    { n: 1, sel: '[data-hoy-limita] span[aria-label^="Limita"]', lado: 'der' },
    { n: 2, texto: 'Lo más frágil', lado: 'der' },
    { n: 3, rol: 'button', nombre: 'Ver una por una', lado: 'der' },
    { n: 4, rol: 'button', nombre: 'Responder en Identificar', lado: 'der' },
    { n: 5, texto: 'en la planta', exacto: true, lado: 'der' },
  ] },
]

// ─────────────── 6D.7 Identificar y 6D.8 WhatsApp ───────────────

/** El panel del árbol en Identificar (supervisión, producción, el jefe, confiabilidad). */
const D_ARBOL = 'main section:has([data-seccion])'
/** La tarjeta de la cascada de P-201B (LC-07 y LC-16, una sola raíz). */
const D_LC0716 = 'main article[data-parada-anh]:has-text("LC-07 y LC-16")'
/** La tarjeta de LC-05 (baja tensión: falta «¿De dónde vino el corte?»). */
const D_LC05 = 'main article[data-parada-anh]:has-text("LC-05")'
/** La tarjeta de LC-21 (sin causa). */
const D_LC21 = 'main article[data-parada-anh]:has-text("LC-21")'
/** La tarjeta de LC-07 sola, cuando la cascada se partió en dos. */
const D_LC07 = 'main article[data-parada-anh]:has-text("LC-07 · ")'
/** El editor «Corregir otro paso» abierto. */
const D_EDITOR = 'main form[aria-label^="Corregir un paso"]'
/** El chat simulado de WhatsApp. */
const D_CHAT = '[role=group][aria-label^="Chat de WhatsApp"]'
/** El bloque WHATSAPP de la tarjeta de P-201B con el chat abierto (Causa.tsx, HiloWhatsapp). */
const D_HILO = 'main div:has(> div > [role=group][aria-label^="Chat de WhatsApp"])'

/** Cambiar de rol desde «Mi perfil» (MenuPerfil.tsx): la sesión del demo (lo guardado) sigue. */
const D_ROL = (de, a) => [{ nombre: de }, { nombre: 'Cambiar de rol' }, { nombre: a }]
const D_DEL_JEFE = /^Camilo Rueda · /, D_DEL_SUP = /^Nelson Ortiz · /, D_DEL_OPER = /^Jairo Peña · /
const D_A_SUP = /^Supervisor de operaciones/, D_A_JEFE = /^Jefe de mantenimiento/

/** El jefe corrige el detalle de la cascada de P-201B y el supervisor cambia «¿Planeada?»
 *  sin motivo: eso retira el detalle del jefe y el servidor responde 422 `falta-motivo`
 *  (e2e/experiencia-f2c.spec.ts, «Corregir: si el cambio retira…»). */
const D_HASTA_EL_422 = [
  { sel: `${D_LC0716} button:has-text("Corregir otro paso")` },
  { sel: `${D_EDITOR} select[aria-label="Detalle"]`, elegir: 'NP_PROC/tanques-llenos-capacidad-limitada' },
  { sel: `${D_EDITOR} button[type=submit]` },
  ...D_ROL(D_DEL_JEFE, D_A_SUP),
  { sel: `${D_LC0716} button:has-text("Corregir otro paso")` },
  { rol: 'radio', nombre: 'Planeada', exacto: true },
  { sel: `${D_EDITOR} button[type=submit]` },
]
/** El jefe dice «Quién» solo de LC-16; el supervisor cambia «Quién» de LC-07 para la
 *  cascada sin motivo: eso cambia lo que dijo el jefe en OTRA fila y el servidor responde
 *  409 `cambia-a-otra-persona` (como referencia/escrituras/409-cambia-a-otra-persona.json). */
const D_HASTA_EL_409 = [
  { sel: `${D_LC0716} button:has-text("Corregir otro paso")` },
  { sel: `${D_EDITOR} select[aria-label="Quién"]`, elegir: 'op-operacion' },
  { sel: `${D_EDITOR} button:has-text("Solo a LC-16")` },
  { sel: `${D_EDITOR} button[type=submit]` },
  ...D_ROL(D_DEL_JEFE, D_A_SUP),
  { sel: `${D_LC07} button:has-text("Corregir otro paso")` },
  { sel: `${D_EDITOR} select[aria-label="Quién"]`, elegir: 'op-planeacion' },
  { sel: `${D_EDITOR} button[type=submit]` },
]
/** El operador contesta por el chat de P-201B: sello mecánico, fuga hacia afuera. */
const D_POR_EL_CHAT = [
  { nombre: 'Ver mi chat de WhatsApp' },
  { sel: `${D_CHAT} button:has-text("Sello mecánico")` },
  { sel: `${D_CHAT} button:has-text("Fuga hacia afuera")` },
]

const D_CAPTURAS = [
  // ───────────── 6D.7 Identificar · el árbol de 6 pasos ─────────────
  { archivo: '06d-sup-causa-ceiba', ruta: '#/sup/causa/ceiba/curso', elemento: D_ARBOL, marcas: [
    { n: 1, texto: 'LA CADENA DE CADA PARADA · ÁRBOL DE CAUSAS', exacto: true, lado: 'der' },
    { n: 2, texto: '5 paradas (7 filas del reporte)', caja: 'elemento' },
    { n: 3, texto: /^Paradas: falta confirmar 2 · falta un dato 1 · sin causa 2/, lado: 'der' },
    { n: 4, texto: 'POR CONFIRMAR · 2 paradas', exacto: true, lado: 'der' },
    { n: 5, sel: `${D_LC0716} header > span:first-child`, lado: 'der' },
    { n: 6, texto: 'falta confirmar', exacto: true },
    { n: 7, texto: /^Una sola raíz, P-201B:/, lado: 'der' },
    { n: 8, texto: /^TRIM lo dedujo: La falla es de la bomba P-201B/, i: 0 },
    { n: 9, texto: /^TRIM lo dedujo: P-201B mueve el agua de 18 pozos/ },
    { n: 10, texto: /^TRIM lo dedujo: El pozo dejó de producir/, i: 0 },
    { n: 11, texto: 'TRIM lo dedujo: No estaba en el programa firmado', exacto: true, i: 0 },
    { n: 12, texto: 'TRIM lo dedujo por la misma razón del paso 1', exacto: true, i: 0 },
    { n: 13, texto: 'falta la parte de P-201B', exacto: true },
    { n: 14, rol: 'button', nombre: 'Confirmar los 2', exacto: true, lado: 'arriba' },
    { n: 15, rol: 'button', nombre: 'Corregir dónde se trabó', i: 0, lado: 'arriba' },
    { n: 16, rol: 'button', nombre: 'Corregir otro paso', i: 0, lado: 'arriba' },
    { n: 17, texto: 'Queda confirmado por Nelson Ortiz · hora del sistema.', lado: 'der' },
    { n: 18, rol: 'button', nombre: 'Ver las 2 filas del reporte', i: 0, lado: 'der' },
    { n: 19, texto: 'FALTA UN DATO · 1 parada', exacto: true, lado: 'der' },
    { n: 20, sel: `${D_LC05} header > span:first-child`, lado: 'der' },
    { n: 21, texto: /^TRIM lo propone: La baja tensión tumbó solo a LC-05/ },
    { n: 22, texto: 'falta', exacto: true, i: 0 },
    { n: 23, texto: /^Las señales apuntan a la causa, no la prueban/, lado: 'der' },
    { n: 24, texto: '¿De dónde vino el corte?', exacto: true, lado: 'der' },
    { n: 25, texto: 'Después, una pregunta más.', exacto: true, lado: 'der' },
    { n: 26, rol: 'button', nombre: 'Completar lo que falta', lado: 'arriba' },
    { n: 27, texto: 'SIN CAUSA · 2 paradas (4 filas del reporte)', exacto: true, lado: 'der' },
    { n: 28, texto: 'sin causa', exacto: true, i: 0 },
    { n: 29, texto: 'Hasta que alguien diga qué pasó, no se sabe quién, dónde se trabó ni la causa.', i: 0, lado: 'der' },
    { n: 30, texto: '¿Qué lo paró?', exacto: true, i: 0, lado: 'der' },
    { n: 31, texto: 'Después, 2 preguntas más.', exacto: true, i: 0, lado: 'der' },
    { n: 32, rol: 'button', nombre: 'Completar los 6 pasos', i: 0, lado: 'der' },
    { n: 33, sel: 'main article[data-parada-anh]:has-text("LC-08") header > span:first-child', lado: 'der' },
  ] },
  { archivo: '06d-sup-causa-ceiba-filas', ruta: '#/sup/causa/ceiba/curso', elemento: D_LC0716,
    antes: [{ sel: `${D_LC0716} button:has-text("Ver las 2 filas del reporte")` }], marcas: [
    { n: 1, rol: 'button', nombre: 'Ver las 2 filas del reporte', dentro: D_LC0716, lado: 'der' },
    { n: 2, texto: '2 de oct · 05:46 a 23:59 (sigue al cierre del día) · 273 bbl', lado: 'der' },
    { n: 3, texto: '2 de oct · 05:43 a 23:59 (sigue al cierre del día) · 300 bbl', lado: 'der' },
  ] },
  { archivo: '06d-sup-causa-ceiba-corregir', ruta: '#/sup/causa/ceiba/curso', elemento: D_LC0716,
    antes: [{ sel: `${D_LC0716} button:has-text("Corregir dónde se trabó")` }], marcas: [
    { n: 1, texto: '¿Dónde se trabó? · LC-07 y LC-16', exacto: true, lado: 'der' },
    { n: 2, texto: /^Ahora: En la planta o estación · TRIM lo dedujo/, lado: 'der' },
    { n: 3, rol: 'radio', nombre: /^Afuera/, lado: 'der' },
    { n: 4, texto: /^¿Fue el yacimiento\? Lo pone producción o confiabilidad/, lado: 'der' },
    { n: 5, rol: 'button', nombre: 'Pedir a producción', lado: 'arriba' },
    { n: 6, texto: '¿Aplica a los 2 pozos de esta parada?', exacto: true, lado: 'der' },
    { n: 7, rol: 'button', nombre: 'Solo a LC-16', lado: 'der' },
    { n: 8, rol: 'button', nombre: 'Cancelar', exacto: true, lado: 'der' },
  ] },
  { archivo: '06d-oper-causa-ceiba', ruta: '#/oper/causa/ceiba/curso', marcas: [
    { n: 1, texto: 'POR CONTESTAR', exacto: true },
    { n: 2, texto: '4 paradas', caja: 'elemento' },
    { n: 3, texto: 'Conteste aquí, una pregunta a la vez. Lo técnico lo revisa su supervisor.' },
    { n: 4, texto: 'no arrancar', exacto: true, i: 0 },
    { n: 5, sel: `${D_LC05} header > span:first-child`, lado: 'der' },
    { n: 6, texto: 'falta un dato', exacto: true, i: 0 },
    { n: 7, rol: 'button', nombre: /^Lo técnico \(dónde se trabó/, lado: 'der' },
    { n: 8, texto: '¿De dónde vino el corte?', exacto: true, lado: 'der' },
    { n: 9, rol: 'button', nombre: 'Algo está mal', exacto: true, lado: 'der' },
    { n: 10, rol: 'button', nombre: 'Ver mi chat de WhatsApp', i: 0 },
    { n: 11, texto: 'DECLARADAS', exacto: true },
    { n: 12, texto: 'Cómo va la identificación del período', exacto: true },
  ] },
  { archivo: '06d-oper-causa-ceiba-telefono', ruta: '#/oper/causa/ceiba/curso', telefono: true, elemento: D_LC05, marcas: [
    { n: 1, texto: '¿De dónde vino el corte?', exacto: true, lado: 'der' },
    { n: 2, rol: 'button', nombre: 'No sé', exacto: true, dentro: D_LC05, lado: 'der' },
    { n: 3, rol: 'button', nombre: 'Algo está mal', exacto: true, lado: 'der' },
  ] },
  { archivo: '06d-sup-causa-ceiba-telefono', ruta: '#/sup/causa/ceiba/curso', telefono: true, elemento: D_LC21, marcas: [
    { n: 1, texto: '¿Qué lo paró?', exacto: true, lado: 'der' },
    { n: 2, rol: 'button', nombre: 'No sé', exacto: true, dentro: D_LC21, lado: 'der' },
    { n: 3, rol: 'button', nombre: 'Más opciones…', lado: 'der' },
    { n: 4, texto: 'Después, 2 preguntas más.', exacto: true, lado: 'der' },
    { n: 5, rol: 'button', nombre: 'Completar los 6 pasos', lado: 'der' },
  ] },
  { archivo: '06d-jefe-causa-ceiba', ruta: '#/jefe/causa/ceiba/curso', elemento: D_LC0716, marcas: [
    { n: 1, rol: 'button', nombre: 'Confirmar esta parada (2 pozos · 2 filas)', lado: 'arriba' },
    { n: 2, texto: 'Queda confirmado por Camilo Rueda · hora del sistema.', lado: 'der' },
  ] },

  // ───────────── 6D.8 WhatsApp ─────────────
  { archivo: '06d-oper-causa-ceiba-chat', ruta: '#/oper/causa/ceiba/curso', elemento: D_HILO,
    // Tocar la primera burbuja la trae a la vista: el historial arranca abajo (Telefono.tsx).
    antes: [{ nombre: 'Ver mi chat de WhatsApp' }, { sel: '[role=log] > div:first-child' }], marcas: [
    { n: 1, rol: 'button', nombre: 'Cerrar el chat', lado: 'der' },
    { n: 2, texto: 'a Jairo Peña · +57 300 555 0104', exacto: true, lado: 'der' },
    { n: 3, texto: /^TRIM · P-201B de La Ceiba paró a las 03:52\. Tiene respaldo/ },
    { n: 4, texto: /^TRIM · P-201B de La Ceiba paró el 2 de oct, 03:52\. Ninguna señal/ },
    { n: 5, rol: 'button', nombre: /^1\s*Sello mecánico/, dentro: D_CHAT },
    { n: 6, rol: 'button', nombre: /^0\s*Otra cosa/, dentro: D_CHAT },
  ] },
]

const D_ESCRITAS = [
  // ───────────── 6D.7 · contestar, corregir y el motivo ─────────────
  { archivo: '06d-oper-causa-ceiba-contestado', ruta: '#/oper/causa/ceiba/curso', elemento: D_LC05,
    antes: [{ sel: `${D_LC05} button:has-text("De este pozo")` }, { sel: `${D_LC05} button:has-text("Lo técnico")` }], marcas: [
    { n: 1, rol: 'button', nombre: /^Lo técnico/, lado: 'der' },
    { n: 2, texto: 'TRIM lo dedujo de lo que contestó Jairo Peña · 14:00', exacto: true },
    { n: 3, texto: 'TRIM lo dedujo por la misma razón del paso 1', exacto: true },
    { n: 4, texto: 'falta', exacto: true },
    { n: 5, sel: `${D_LC05} [data-contestado] li`, lado: 'der' },
    { n: 6, texto: /^¿Está bien\? No estaba programado/, lado: 'der' },
    { n: 7, texto: 'El resto lo revisa su supervisor.', exacto: true, lado: 'der' },
  ] },
  { archivo: '06d-oper-causa-ceiba-algo-mal', ruta: '#/oper/causa/ceiba/curso', elemento: D_LC05,
    antes: [{ sel: `${D_LC05} button:has-text("Algo está mal")` }], marcas: [
    { n: 1, texto: '¿Qué está mal?', exacto: true, lado: 'der' },
    { n: 2, rol: 'button', nombre: 'El pozo es otro', lado: 'der' },
    { n: 3, texto: 'Otra cosa', exacto: true, lado: 'der' },
    { n: 4, rol: 'button', nombre: 'Cancelar', exacto: true, lado: 'der' },
  ] },
  { archivo: '06d-sup-causa-ceiba-corregir-telefono', ruta: '#/sup/causa/ceiba/curso', telefono: true, elemento: '[data-hoja-inferior] [role=dialog]',
    antes: [{ sel: `${D_LC0716} button:has-text("Corregir dónde se trabó")` }], marcas: [
    { n: 1, texto: '¿Dónde se trabó? · LC-07 y LC-16', exacto: true, lado: 'der' },
    { n: 2, rol: 'radio', nombre: /^Afuera/, lado: 'der' },
    { n: 3, rol: 'button', nombre: 'Pedir a producción', lado: 'der' },
    { n: 4, texto: '¿Aplica a los 2 pozos de esta parada?', exacto: true, lado: 'der' },
    { n: 5, rol: 'button', nombre: 'Cancelar', exacto: true, lado: 'der' },
  ] },
  { archivo: '06d-jefe-causa-morichal-cascada', ruta: '#/jefe/causa/morichal/2026-05-18_2026-05-18', elemento: D_ARBOL,
    antes: [{ sel: 'main article[data-parada-anh]:has-text("por SE-2") button:has-text("Falla transformador")' }], marcas: [
    { n: 1, texto: /^Guardado en los 41 pozos/, lado: 'der' },
    { n: 2, texto: /^41 pozos · una sola raíz: SE-2/, i: 0, lado: 'der' },
    { n: 3, rol: 'button', nombre: /^Confirmar esta parada \(41 pozos/, lado: 'arriba' },
  ] },
  { archivo: '06d-sup-causa-ceiba-motivo', ruta: '#/jefe/causa/ceiba/curso', elemento: D_LC0716, antes: D_HASTA_EL_422, marcas: [
    { n: 1, texto: /^Ahora: Tanques llenos \/ capacidad limitada · corrigió Camilo Rueda/, lado: 'der' },
    { n: 2, texto: /^Cambió a «Planeada»/, lado: 'der' },
    { n: 3, texto: /^¿Por qué lo cambia\?/, lado: 'der' },
    { n: 4, rol: 'button', nombre: 'Otra razón…', lado: 'der' },
    { n: 5, texto: 'Falta el motivo: cambia algo que ya había dicho una persona.', exacto: true, lado: 'der' },
    { n: 6, rol: 'button', nombre: 'Cancelar', exacto: true, lado: 'der' },
    { n: 7, texto: 'Diga por qué lo cambia: ya lo había dicho una persona.', exacto: true, lado: 'der' },
  ] },
  { archivo: '06d-sup-causa-ceiba-motivo-409', ruta: '#/jefe/causa/ceiba/curso', elemento: D_LC07, antes: D_HASTA_EL_409, marcas: [
    { n: 1, sel: `${D_LC07} header > span:first-child`, lado: 'der' },
    { n: 2, texto: '¿Aplica a los 2 pozos de esta parada?', exacto: true, lado: 'der' },
    { n: 3, rol: 'button', nombre: 'Solo a LC-07', lado: 'der' },
    { n: 4, texto: /^¿Por qué lo cambia\?/, lado: 'der' },
    { n: 5, texto: /^Esto cambia lo que dijo otra persona en otra fila/, lado: 'der' },
  ] },
  { archivo: '06d-jefe-causa-ceiba-retiro', ruta: '#/jefe/causa/ceiba/curso', elemento: D_LC0716,
    antes: [...D_HASTA_EL_422,
      { nombre: 'Otra razón…' },
      { rol: 'textbox', nombre: 'Otra razón', escribir: 'Estaba en el programa de paradas del mes' },
      { sel: `${D_EDITOR} button[type=submit]` },
      ...D_ROL(D_DEL_SUP, D_A_JEFE)], marcas: [
    { n: 1, texto: 'faltan 2 pasos', exacto: true },
    { n: 2, texto: /^corrigió Nelson Ortiz · 14:00 · antes: No planeada/ },
    { n: 3, texto: 'falta', exacto: true, i: 0 },
    { n: 4, texto: /^antes: Tanques llenos \/ capacidad limitada, retirado por Nelson Ortiz/ },
    { n: 5, rol: 'button', nombre: 'Completar lo que falta', lado: 'arriba' },
  ] },

  // ───────────── 6D.8 · contestar por el chat ─────────────
  { archivo: '06d-oper-causa-ceiba-chat-respondido', ruta: '#/oper/causa/ceiba/curso', elemento: '[data-respondida]', antes: D_POR_EL_CHAT, marcas: [
    { n: 1, texto: /^P-201B · respondido por WhatsApp/, lado: 'der' },
    { n: 2, texto: /^Sello mecánico: fuga hacia afuera/ },
    { n: 3, texto: /^TRIM · Así queda lo que usted contestó/ },
    { n: 4, rol: 'button', nombre: /^1\s*Está bien/ },
    { n: 5, rol: 'button', nombre: /^2\s*Algo está mal/ },
    { n: 6, rol: 'button', nombre: 'Cerrar el chat', lado: 'der' },
  ] },
  { archivo: '06d-oper-causa-ceiba-chat-mal', ruta: '#/oper/causa/ceiba/curso', elemento: '[data-respondida]',
    antes: [...D_POR_EL_CHAT, { sel: `${D_CHAT} button:has-text("Algo está mal")` }], marcas: [
    { n: 1, texto: /^TRIM · Entendido\. Lo revisa su supervisor/ },
  ] },
  { archivo: '06d-sup-causa-ceiba-revisar', ruta: '#/oper/causa/ceiba/curso', elemento: 'main [data-seccion="revisar"]',
    antes: [...D_POR_EL_CHAT, { sel: `${D_CHAT} button:has-text("Algo está mal")` }, ...D_ROL(D_DEL_OPER, D_A_SUP)], marcas: [
    { n: 1, texto: 'REVISAR · 2 paradas', exacto: true, lado: 'der' },
    { n: 2, texto: 'para revisar', exacto: true, lado: 'arriba' },
    { n: 3, texto: /^Jairo Peña marcó «Algo está mal» · 14:00/, lado: 'der' },
    { n: 4, texto: /^TRIM lo dedujo: La falla es de la bomba P-201B \(sello mecánico\)/ },
  ] },
]

// ─────────────── 6D.9 Confiabilidad y 6D.10 Regulatorio ───────────────

/** El panel «CALIDAD DE LA CLASIFICACIÓN» (widgets/arbol/Calidad.tsx). */
const E_CALIDAD = 'main section:has(> div > section[aria-label="¿Dónde se trabó?: calidad"])'
/** El recuadro del paso 2 dentro del panel. */
const E_PASO2 = 'section[aria-label="¿Dónde se trabó?: calidad"]'
/** El panel «ÁRBOL DE CAUSAS · COMO LA CIRCULAR» (widgets/choke/ArbolCircular.tsx). */
const E_ARBOL = 'main section:has([data-arbol-circular])'
/** Una corrección hecha en Identificar (confiabilidad, La Ceiba, octubre): el paso 2
 *  de LC-16 (cascada de P-201B) pasa de «En la planta o estación» a «En el pozo»,
 *  solo en ese pozo; después, al riel, a Confiabilidad. Lo guardado vive en la
 *  sesión de la página: el cambio de pantalla por el riel lo conserva. */
const E_CORREGIR_LC16 = [
  { nombre: 'Corregir dónde se trabó' },
  { rol: 'radio', nombre: /^En el pozo/ },
  { nombre: 'Solo a LC-16', exacto: true },
  { nombre: 'Guardar', exacto: true },
  { nombre: 'Confiabilidad', exacto: true },
]

const E_CAPTURAS = [
  // ───────────── 6D.9 Confiabilidad · calidad de la clasificación ─────────────
  { archivo: '06d-conf-confiabilidad-ceiba', ruta: '#/conf/confiabilidad/ceiba/curso', elemento: E_CALIDAD, marcas: [
    { n: 1, texto: 'CALIDAD DE LA CLASIFICACIÓN', exacto: true, lado: 'der' },
    { n: 2, texto: '7 filas · Octubre, en curso', exacto: true },
    { n: 3, texto: 'Paso 2 · ¿Dónde se trabó?', exacto: true, lado: 'der' },
    { n: 4, rol: 'img', nombre: /^Modelo choke:/, dentro: E_PASO2, lado: 'arriba' },
    { n: 5, texto: '0 %', exacto: true, i: 0, dentro: E_PASO2 },
    { n: 6, texto: '0 de 7 filas', exacto: true, lado: 'der' },
    { n: 7, texto: '0 %', exacto: true, i: 1, dentro: E_PASO2 },
    { n: 8, texto: '0 de 3 propuestas · 4 en falta', exacto: true },
    { n: 9, texto: 'Quién', exacto: true, dentro: E_CALIDAD, lado: 'der' },
    { n: 10, texto: '4 en falta', exacto: true, i: 0, dentro: E_CALIDAD, lado: 'der' },
    { n: 11, texto: '5 en falta', exacto: true, dentro: E_CALIDAD, lado: 'der' },
    { n: 12, texto: /^Nadie corrigió una propuesta de TRIM en octubre \(en curso\)/, lado: 'der' },
    { n: 13, texto: '2 paradas · 0 corregidas · 0 %', exacto: true, lado: 'der' },
    { n: 14, texto: '1 parada · 0 corregidas · 0 %', exacto: true, lado: 'der' },
    { n: 15, texto: 'Todos los equipos de estas paradas dicen a qué pozos sirven.', exacto: true, lado: 'der' },
  ] },
  { archivo: '06d-conf-confiabilidad-ceiba-corregida', ruta: '#/conf/causa/ceiba/curso', antes: E_CORREGIR_LC16, elemento: E_CALIDAD, marcas: [
    { n: 1, texto: '14 %', exacto: true, dentro: E_PASO2 },
    { n: 2, texto: '1 de 7 filas', exacto: true, lado: 'der' },
    { n: 3, texto: '33 %', exacto: true, dentro: E_PASO2 },
    { n: 4, texto: '1 de 3 propuestas · 4 en falta', exacto: true },
    { n: 5, rol: 'img', nombre: /^La regla: choke\.topologia@3/, lado: 'der' },
    { n: 6, texto: '1 de 3 corregidas · 33 %', exacto: true },
    { n: 7, texto: 'a: En el pozo · 1', exacto: true, i: 0 },
    { n: 8, sel: 'li:has(> span[data-paradas])', i: 0, lado: 'der' },
    { n: 9, texto: 'Quién', exacto: true, dentro: E_CALIDAD, lado: 'der' },
  ] },
  { archivo: '06d-conf-confiabilidad-morichal-cerrado', ruta: '#/conf/confiabilidad/morichal/cerrado', elemento: E_CALIDAD, marcas: [
    { n: 1, texto: '63 filas · Septiembre, cerrado', exacto: true },
    { n: 2, texto: '0 de 63 filas', exacto: true, lado: 'der' },
    { n: 3, texto: '0 de 63 propuestas', exacto: true },
    { n: 4, texto: '6 en falta', exacto: true, i: 0, dentro: E_CALIDAD, lado: 'der' },
    { n: 5, texto: 'nada en falta', exacto: true, i: 0, dentro: E_CALIDAD, lado: 'der' },
    { n: 6, texto: '1 en falta', exacto: true, i: 0, dentro: E_CALIDAD, lado: 'der' },
    { n: 7, texto: '21 en falta', exacto: true, dentro: E_CALIDAD, lado: 'der' },
    { n: 8, texto: /^Nadie corrigió una propuesta de TRIM en septiembre:/, lado: 'der' },
    { n: 9, texto: '2 paradas (10 filas) · 0 corregidas · 0 %', exacto: true, lado: 'der' },
    { n: 10, texto: '1 parada (6 filas) · 0 corregidas · 0 %', exacto: true, lado: 'der' },
    { n: 11, rol: 'button', nombre: 'ver los otros 18', lado: 'der' },
  ] },
  { archivo: '06d-jefe-confiabilidad-portafolio-cerrado', ruta: '#/jefe/confiabilidad/ceiba~portafolio/cerrado', elemento: E_CALIDAD, marcas: [
    { n: 1, texto: '129 filas · Septiembre, cerrado', exacto: true },
    { n: 2, rol: 'img', nombre: /^¿Qué método es\?:/ },
    { n: 3, sel: 'li:has(> span[data-paradas])', i: 0, lado: 'der' },
    { n: 4, texto: '48 en falta', exacto: true, dentro: E_CALIDAD, lado: 'der' },
    { n: 5, rol: 'button', nombre: 'ver los otros 43', lado: 'der' },
    { n: 6, texto: /^Sus paradas tomaron el tramo de la regla por tipo de causa/, lado: 'der' },
    { n: 7, texto: '1 parada', exacto: true, i: 0, dentro: E_CALIDAD, lado: 'der' },
  ] },
  { archivo: '06d-conf-confiabilidad-ceiba-telefono', ruta: '#/conf/confiabilidad/ceiba/curso', telefono: true, elemento: E_CALIDAD, marcas: [
    { n: 1, texto: 'corregido: cuánto se equivoca la regla', exacto: true, lado: 'der' },
    { n: 2, texto: 'confirmado', exacto: true, i: 0, dentro: E_CALIDAD, lado: 'der' },
    { n: 3, texto: 'corregido', exacto: true, i: 0, dentro: E_CALIDAD, lado: 'der' },
    { n: 4, texto: '4 en falta', exacto: true, i: 0, dentro: E_CALIDAD, lado: 'der' },
  ] },

  // ───────────── 6D.10 Regulatorio · el árbol en el orden de la circular ─────────────
  { archivo: '06d-reg-regulatorio-ceiba', ruta: '#/reg/regulatorio/ceiba/curso', marcas: [
    { n: 1, texto: /No se puede publicar todavía/ },
    { n: 2, texto: 'El período incluye días sin cierre publicado.', exacto: true },
    { n: 3, texto: 'solo lectura', exacto: true },
    { n: 4, rol: 'button', nombre: 'Exportar CSV' },
    { n: 5, texto: 'ÁRBOL DE CAUSAS · COMO LA CIRCULAR', exacto: true },
    { n: 6, texto: 'modelo choke', exacto: true, dentro: E_ARBOL },
    { n: 7, sel: '[data-arbol-circular] > p > b', caja: 'elemento' },
    { n: 8, texto: '7 filas de paradas_pozo · 5 paradas', exacto: true, lado: 'arriba' },
    { n: 9, texto: '0 bbl con los 6 pasos confirmados (0 %)', exacto: true, lado: 'arriba' },
    { n: 10, sel: 'ol[aria-label="El orden de la circular"]', caja: 'elemento' },
    { n: 11, texto: 'Operador · Mantenimiento', exacto: true, dentro: E_ARBOL },
    { n: 12, sel: '[data-cadena="choke_mod"]', i: 0, lado: 'der' },
    { n: 13, sel: '[data-cadena="cau_niv2"]', i: 0, lado: 'der' },
    { n: 14, rol: 'img', nombre: /^Pérdida:/, i: 0, lado: 'der' },
    { n: 15, sel: '[data-cadena="choke_mod"]', i: 1, lado: 'der' },
    { n: 16, texto: 'Falta el detalle', exacto: true, i: 0, lado: 'der' },
    { n: 17, texto: 'Falta quién', exacto: true, lado: 'der' },
    { n: 18, texto: 'Sin identificar', exacto: true, dentro: E_ARBOL, lado: 'der' },
    { n: 19, texto: 'Falta qué pasó', exacto: true, lado: 'der' },
    { n: 20, texto: '= el diferido del libro (Σ de las paradas del período)', exacto: true, lado: 'der' },
    { n: 21, texto: 'PUNTOS DE MEDICIÓN OFICIAL', exacto: true },
    { n: 22, texto: 'TAMBIÉN EN PRODML', exacto: true },
    { n: 23, texto: 'Sin casilla todavía (declarado o sin identificar)', exacto: true },
    { n: 24, texto: 'PRODUCCIÓN DEL PERÍODO', exacto: true },
    { n: 25, texto: '1.046 bbl ±157', exacto: true },
  ] },
  { archivo: '06d-reg-regulatorio-ceiba-cerrado', ruta: '#/reg/regulatorio/ceiba/cerrado', marcas: [
    { n: 1, texto: 'Se puede publicar', exacto: true },
    { n: 2, texto: /^Factor en banda, custodia completa y lo sin identificar bajo el criterio/ },
    { n: 3, sel: '[data-arbol-circular] > p > b', caja: 'elemento' },
    { n: 4, texto: '28 filas de paradas_pozo · 18 paradas', exacto: true, lado: 'arriba' },
    { n: 5, texto: 'Operador · Mantenimiento', exacto: true, dentro: E_ARBOL },
    { n: 6, sel: '[data-cadena="choke_mod"]', i: 0, lado: 'der' },
    { n: 7, sel: '[data-cadena="pla_no_plan"]', i: 0, lado: 'der' },
    { n: 8, sel: '[data-cadena="cau_niv1"]', i: 0, lado: 'der' },
    { n: 9, sel: '[data-cadena="cau_niv2"]', i: 0, lado: 'der' },
    { n: 10, texto: 'Falta el detalle', exacto: true, i: 0, lado: 'der' },
    { n: 11, sel: '[data-cadena="cau_niv1"]', i: 1, lado: 'der' },
    { n: 12, sel: '[data-cadena="choke_mod"]', i: 1, lado: 'der' },
    { n: 13, texto: '= el diferido del libro (Σ de las paradas del período)', exacto: true, lado: 'der' },
    { n: 14, texto: '7.716 bbl ±1.157', exacto: true },
  ] },
  { archivo: '06d-reg-regulatorio-zarza-cerrado', ruta: '#/reg/regulatorio/zarza/cerrado', marcas: [
    { n: 1, texto: 'Se puede publicar', exacto: true },
    { n: 2, texto: '1 fila de paradas_pozo · 1 parada', exacto: true, lado: 'arriba' },
    { n: 3, texto: '303', exacto: true, i: 0 },
    { n: 4, sel: '[data-cadena="choke_mod"]', i: 0, lado: 'der' },
    { n: 5, sel: '[data-cadena="cau_niv2"]', i: 0, lado: 'der' },
    { n: 6, texto: '= el diferido del libro (Σ de las paradas del período)', exacto: true, lado: 'der' },
    { n: 7, texto: /^Restricción externa/ },
    { n: 8, texto: 'Sin casilla todavía (declarado o sin identificar)', exacto: true },
  ] },
  { archivo: '06d-reg-regulatorio-ceiba-telefono', ruta: '#/reg/regulatorio/ceiba/curso', telefono: true, elemento: E_ARBOL, marcas: [
    { n: 1, sel: 'ol[aria-label="El orden de la circular"] > li', i: 5, lado: 'der' },
    { n: 2, sel: '[data-cadena="cau_niv2"]', i: 0, lado: 'der' },
    { n: 3, rol: 'img', nombre: /^Pérdida:/, i: 0 },
  ] },
]

// ─────────────── 6D.11 Configuración: «Filosofía operacional» ───────────────

const K_RUTA = '#/adm/filosofia/ceiba/curso'
/** El renglón de un equipo en la lista del escritorio (su nombre empieza por el tag). */
const K_RENGLON = tag => ({ nombre: new RegExp(`^${tag} `) })
const K_PASO2 = { nombre: '2 Capacidades' }
const K_PASO3 = { nombre: '3 Ver el impacto y firmar' }
/** El cambio de la e2e (`e2e/choke-configuracion.spec.ts`): K-101 sirve solo a LC-11. */
const K_UN_POZO = [{ rol: 'radio', nombre: /^A un solo pozo/ }, { sel: 'select[aria-label="Pozo al que sirve K-101"]', elegir: 'LC-11' }]
/** Un tren de crudo menor que lo que ya pasó, sin fuente (la e2e de capacidades). */
const K_CRUDO_5000 = { sel: 'input[aria-label="Tren de crudo, bbl/d de crudo"]', escribir: '5000' }
/** Aceptar por tipo lo que TRIM dedujo: con K-101 contestado quedan 8 tipos con algo que aceptar. */
const K_ACEPTAR_TIPO = { nombre: /^Aceptar lo que TRIM dedujo para/ }
/** Una carga con un pozo que sirve a otro (C-13) y un equipo que no está en el registro. */
const K_CSV = 'equipo;pozos a los que sirve\nK-101;LC-11 LC-12\nLC-11;LC-11 LC-12\nXX-99;LC-01\nSE-2;todos'
/** Esperar a que lleguen las propuestas (el filtro dice 6 solo entonces) y volver a «Todos»: sin esto, a veces
 *  el primer toque se pierde. Cada paso de `antes` espera a que su botón exista. */
const K_LISTA = [{ nombre: 'Propuestas de TRIM 6' }, { nombre: 'Todos 36' }]
/** Esperar a que llegue la vista previa del paso 3 (es asíncrona: el generador no la espera solo). */
const K_IMPACTO_LISTO = { sel: 'dt:has-text("Qué limita hoy")' }
const K_TEL_K101 = { sel: 'select[aria-label="Ir a otro equipo"]', elegir: 'K-101' }

const K_CAPTURAS = [
  /* ───────────── 6D.11 Paso 1 · Equipos y pozos ───────────── */
  { archivo: '06d-adm-filosofia-ceiba', ruta: K_RUTA, marcas: [
    { n: 1, rol: 'tab', nombre: 'Filosofía operacional' },
    { n: 2, rol: 'heading', nombre: 'Filosofía operacional · La Ceiba' },
    { n: 3, rol: 'img', nombre: /^Modelo choke:/, lado: 'der' },
    { n: 4, texto: 'borrador · sin cambios' },
    { n: 5, sel: 'nav[aria-label="Pasos de la filosofía operacional"]', caja: 'elemento' },
    { n: 6, rol: 'button', nombre: 'Sin responder 30' },
    { n: 7, rol: 'button', nombre: 'Propuestas de TRIM 6', lado: 'abajo' },
    { n: 8, rol: 'button', nombre: 'Casos de borde 0', lado: 'abajo' },
    { n: 9, rol: 'button', nombre: 'Todos 36', lado: 'abajo' },
    { n: 10, rol: 'img', nombre: /^Sin responder y propuestas de TRIM:/, lado: 'der' },
    { n: 11, rol: 'button', nombre: 'Subir Excel o CSV' },
    { n: 12, texto: 'EQUIPOS · 36' },
    { n: 13, texto: 'POZOS: SU LEVANTAMIENTO · 18' },
    { n: 14, texto: 'Aceptar los 18', exacto: true },
    { n: 15, texto: 'sin responder', exacto: true, i: 0 },
    { n: 16, texto: 'TRIM deduce: sirve solo a LC-01 → se traba en el pozo' },
    { n: 17, texto: 'LC-01 · ELECTROSUMERGIBLE' },
    { n: 18, texto: '¿A qué pozos sirve este equipo?' },
    { n: 19, rol: 'radio', nombre: /^A un solo pozo: LC-01/, caja: 'elemento' },
    { n: 20, texto: 'propuesta de TRIM, sin aceptar', lado: 'der' },
    { n: 21, sel: '[data-pozo-propio]' },
    { n: 22, texto: 'Nadie lo ha contestado.' },
    { n: 23, texto: 'LO QUE TRIM DEDUJO DEL REGISTRO' },
    { n: 24, texto: 'Así lo deduce TRIM del registro del campo' },
    { n: 25, texto: '→ Si para, se traba en el pozo: es solo de LC-01.' },
    { n: 26, rol: 'button', nombre: /^Aceptar para LC-01/ },
    { n: 27, rol: 'button', nombre: 'Siguiente equipo' },
    { n: 28, rol: 'button', nombre: 'Siguiente: capacidades' },
  ] },
  // Un equipo compartido con propuesta de TRIM: K-101, con sus seis caídas a la vista.
  { archivo: '06d-adm-filosofia-ceiba-k101', ruta: K_RUTA, antes: [...K_LISTA, K_RENGLON('K-101'), { nombre: /^Ver las \d+ caídas/ }], marcas: [
    { n: 29, texto: 'propuesta de TRIM', exacto: true, i: 0 },
    { n: 30, rol: 'button', nombre: /^K-101 / },
    { n: 31, texto: 'Aceptar los 4', exacto: true },
    { n: 32, texto: 'dos fuentes no cuadran', exacto: true, i: 0 },
    { n: 33, texto: 'K-101 · AIRE DE INSTRUMENTOS' },
    { n: 34, sel: 'fieldset > div.grid', caja: 'elemento' },
    { n: 20, texto: 'propuesta de TRIM, sin aceptar', lado: 'der' },
    { n: 35, texto: 'Es de otro dueño, más allá de la batería', lado: 'der' },
    { n: 36, texto: 'Todavía no sé', lado: 'der' },
    { n: 37, texto: 'PROPUESTA DE TRIM', exacto: true },
    { n: 38, texto: 'Cuando cayó K-101 el 4 de ago' },
    { n: 39, texto: 'El registro dice que K-101 llega a' },
    { n: 40, texto: '→ Si para, se traba en la planta o estación: sirve a los 18 pozos.' },
    { n: 41, rol: 'button', nombre: 'Ocultar las caídas', lado: 'der' },
    { n: 42, texto: '25 de mar: 15 pozos' },
    { n: 26, rol: 'button', nombre: /^Aceptar para K-101/ },
  ] },
  // Dos fuentes que no cuadran (U2 §8.3): lo decide una persona, nunca el lote.
  { archivo: '06d-adm-filosofia-ceiba-v101', ruta: K_RUTA, antes: [...K_LISTA, K_RENGLON('V-101')], marcas: [
    { n: 32, texto: 'dos fuentes no cuadran', exacto: true, i: 0 },
    { n: 43, sel: 'p:has-text("Dos fuentes no cuadran.")', caja: 'elemento' },
    { n: 23, texto: 'LO QUE TRIM DEDUJO DEL REGISTRO' },
    { n: 26, rol: 'button', nombre: /^Aceptar para V-101/ },
  ] },
  // El caso de borde del demo (U2 §8.6): MPP-301 mueve tres pozos del clúster norte de Morichal.
  { archivo: '06d-adm-filosofia-morichal-borde', ruta: '#/adm/filosofia/morichal/curso', antes: [{ nombre: 'Propuestas de TRIM 7' }, { nombre: 'Casos de borde 1' }], marcas: [
    { n: 8, rol: 'button', nombre: 'Casos de borde 1', lado: 'abajo' },
    { n: 44, texto: 'Aceptar los 8', exacto: true },
    { n: 45, texto: 'TRIM deduce: sirve a MN-07, MN-18 y MN-33' },
    { n: 46, texto: 'caso de borde: misma locación', exacto: true },
    { n: 47, texto: 'propuesta de TRIM, sin aceptar: MN-07, MN-18, MN-33', lado: 'der' },
    { n: 48, texto: 'MPP-301 mueve MN-07, MN-18 y MN-33' },
    { n: 49, texto: 'Perfil de MPP-301 en este campo', lado: 'der' },
    { n: 50, texto: '→ Si para, se traba en la planta o estación: sirve a 3 pozos.' },
    { n: 51, texto: 'caso de borde: pozos de una misma locación', exacto: true },
  ] },

  /* ───────────── 6D.11 Paso 2 · Capacidades ───────────── */
  { archivo: '06d-adm-filosofia-ceiba-capacidades', ruta: K_RUTA, antes: [...K_LISTA, K_PASO2], marcas: [
    { n: 52, texto: 'Ninguna está firmada todavía: rigen los datos del demo.' },
    { n: 53, texto: '◄ limita', exacto: true, lado: 'der' },
    { n: 54, texto: '11.857', exacto: true },
    { n: 55, texto: 'Sale de las pruebas de los pozos' },
    { n: 56, texto: '13.000', exacto: true, i: 0 },
    { n: 57, texto: 'dato del demo, sin firmar', exacto: true, i: 0 },
    { n: 58, sel: 'input[aria-label="Tren de crudo, bbl/d de crudo"]', caja: 'elemento' },
    { n: 59, sel: 'select[aria-label="De dónde sale: Tren de crudo"]', caja: 'elemento', lado: 'der' },
    { n: 60, texto: '≈ 14.168 bbl/d de crudo' },
    { n: 61, sel: '[data-bomba="P-201A"]', caja: 'elemento' },
    { n: 62, texto: 'No se escribe el total: se escribe cada bomba con su límite, y TRIM muestra la suma.' },
    { n: 63, texto: 'Se mide', lado: 'der' },
    { n: 64, texto: 'El demo no trae la capacidad del tratamiento de agua', lado: 'der' },
    { n: 65, texto: 'Lo que admiten los inyectores, deducido del límite del cabezal' },
    { n: 66, texto: '14.000', exacto: true, i: 0 },
    { n: 67, texto: 'Es un subnivel de afuera' },
    { n: 68, sel: 'li:has-text("Sin firmar, con el dato del demo")', caja: 'elemento', lado: 'arriba' },
    { n: 69, texto: 'lo real nunca pasó la capacidad del tramo que limitaba cada día' },
    { n: 70, rol: 'button', nombre: 'Ir a la configuración técnica' },
    { n: 71, rol: 'button', nombre: 'Siguiente: ver el impacto y firmar' },
  ] },

  /* ───────────── 6D.11 En el teléfono y en solo lectura ───────────── */
  { archivo: '06d-adm-filosofia-ceiba-telefono', ruta: K_RUTA, telefono: true, antes: [...K_LISTA, K_TEL_K101], marcas: [
    { n: 103, texto: 'Equipo 21 de 36 · borrador', lado: 'der' },
    { n: 104, sel: 'select[aria-label="Ir a otro equipo"]', caja: 'elemento' },
    { n: 20, texto: 'propuesta de TRIM, sin aceptar', lado: 'der' },
    { n: 105, rol: 'button', nombre: 'Siguiente equipo' },
    { n: 106, texto: 'Aceptar lo que TRIM dedujo, por tipo de equipo', lado: 'der' },
  ] },
  { archivo: '06d-prod-filosofia-ceiba', ruta: '#/prod/filosofia/ceiba/curso', antes: [...K_LISTA, K_RENGLON('K-101')], marcas: [
    { n: 108, texto: 'Solo lectura: la prepara y la firma el administrador de la implementación.' },
    { n: 109, sel: '[role=tablist]', caja: 'elemento' },
    { n: 110, rol: 'radio', nombre: /^A todo el campo/, caja: 'elemento' },
    { n: 22, texto: 'Nadie lo ha contestado.' },
    { n: 41, rol: 'button', nombre: 'Ver las 6 caídas' },
  ] },
]

/* Las que cambian el borrador antes de capturar: contestar, escribir, firmar. */
const K_ESCRITAS = [
  { archivo: '06d-adm-filosofia-ceiba-capacidades-5000', ruta: K_RUTA, antes: [...K_LISTA, K_PASO2, K_CRUDO_5000], marcas: [
    { n: 4, texto: 'borrador · 1 cambio sin firmar' },
    { n: 72, sel: 'input[aria-label="Tren de crudo, bbl/d de crudo"]', caja: 'elemento' },
    { n: 73, texto: '¿de dónde sale este número?', i: 0, lado: 'der' },
    { n: 74, texto: 'cambia 62 % frente a lo vigente', i: 0, lado: 'der' },
    { n: 75, texto: 'por este tramo ya pasaron 11.683', i: 0, lado: 'der' },
  ] },

  /* ───────────── 6D.11 Paso 3 · Ver el impacto y firmar ───────────── */
  { archivo: '06d-adm-filosofia-ceiba-impacto', ruta: K_RUTA, antes: [...K_LISTA, K_RENGLON('K-101'), ...K_UN_POZO, K_PASO3, K_IMPACTO_LISTO], marcas: [
    { n: 4, texto: 'borrador · 1 cambio sin firmar' },
    { n: 76, texto: '1 equipo contestado' },
    { n: 77, rol: 'button', nombre: 'Ver lo que falta' },
    { n: 78, texto: 'SI FIRMA ESTA VERSIÓN', exacto: true },
    { n: 79, texto: 'los pozos → los pozos' },
    { n: 80, sel: 'li:has-text("K-101 · Sistema de aire")' },
    { n: 81, texto: '54 paradas cambiarían de tramo desde el 1 de jul:' },
    { n: 82, texto: 'pasan de «En la planta o estación» a «En el pozo»' },
    { n: 83, texto: 'Ninguna la había confirmado una persona' },
    { n: 84, texto: 'no cambia: la topología no mueve barriles' },
    { n: 85, texto: 'Topología de La Ceiba: se firma con 36 elementos' },
    { n: 86, texto: '35 equipos quedan sin contestar' },
    { n: 87, rol: 'button', nombre: 'Firmar como Hermes Leal' },
    { n: 88, texto: 'VERSIONES FIRMADAS', exacto: true },
  ] },
  // Con errores, el paso 3 dice igual lo que cambiaría (B-53).
  { archivo: '06d-adm-filosofia-ceiba-impacto-errores', ruta: K_RUTA, antes: [...K_LISTA, K_PASO2, K_CRUDO_5000, { nombre: /^3 Ver el impacto/ }, { sel: '[data-borrador-con-errores]' }], marcas: [
    { n: 89, texto: 'Borrador con errores: así quedaría.' },
    { n: 79, texto: 'los pozos → la planta o estación' },
    { n: 80, texto: 'no cambia ningún equipo' },
    { n: 81, texto: 'Ninguna parada cambia de tramo desde el 1 de jul.' },
    { n: 85, texto: 'Capacidades de La Ceiba (se firman por primera vez)' },
    { n: 86, texto: 'CORRIJA ANTES DE FIRMAR', exacto: true },
  ] },
  // La firma completa: K-101 a LC-11, lo demás aceptado por tipo y V-101 a mano.
  { archivo: '06d-adm-filosofia-ceiba-firmada', ruta: K_RUTA, antes: [
    ...K_LISTA, K_RENGLON('K-101'), ...K_UN_POZO,
    K_ACEPTAR_TIPO, K_ACEPTAR_TIPO, K_ACEPTAR_TIPO, K_ACEPTAR_TIPO, K_ACEPTAR_TIPO, K_ACEPTAR_TIPO, K_ACEPTAR_TIPO, K_ACEPTAR_TIPO,
    K_RENGLON('V-101'), { nombre: /^Aceptar para V-101/ },
    K_PASO3,
    { rol: 'textbox', nombre: 'Motivo · obligatorio', escribir: 'Topología revisada en campo con el jefe de planta' },
    { nombre: /^Firmar como/ },
    // Esperar la versión nueva en el historial (más abajo que la franja fija de la cabecera).
    { sel: 'b:text-is("Versión 2")' },
  ], marcas: [
    { n: 90, sel: 'p[role=status]', caja: 'elemento' },
    { n: 4, texto: 'borrador · sin cambios' },
    { n: 91, texto: 'No hay cambios en el borrador' },
    { n: 92, texto: 'Versión 2', exacto: true },
    { n: 93, texto: 'Topología de La Ceiba: se firma con 36 elementos' },
  ] },

  /* ───────────── 6D.11 La carga por Excel o CSV ───────────── */
  { archivo: '06d-adm-filosofia-ceiba-csv', ruta: K_RUTA, antes: [
    ...K_LISTA, { nombre: 'Subir Excel o CSV' },
    { rol: 'textbox', nombre: 'O pegue las filas copiadas de Excel', escribir: K_CSV },
    { nombre: 'Revisar', exacto: true },
    { sel: 'p:has-text("filas leídas")' },
  ], marcas: [
    { n: 94, rol: 'button', nombre: 'Descargar la plantilla' },
    { n: 95, texto: 'Subir un CSV', lado: 'der' },
    { n: 96, rol: 'textbox', nombre: 'O pegue las filas copiadas de Excel', caja: 'elemento' },
    { n: 97, rol: 'button', nombre: 'Revisar', exacto: true },
    { n: 98, texto: '4 filas leídas: 2 equipos listos, 2 filas bloquean.' },
    { n: 99, texto: 'Fila 3: LC-11 es un pozo: solo se sirve a sí mismo', lado: 'der' },
    { n: 100, texto: 'Fila 4: XX-99 no está en el registro de La Ceiba', lado: 'der' },
    { n: 101, texto: 'Con una fila que bloquea no pasa nada al borrador' },
    { n: 102, rol: 'button', nombre: 'Pasar 2 equipos al borrador', lado: 'der' },
  ] },

  /* ───────────── 6D.11 El paso 3 en el teléfono ───────────── */
  { archivo: '06d-adm-filosofia-ceiba-impacto-telefono', ruta: K_RUTA, telefono: true, antes: [...K_LISTA, K_TEL_K101, ...K_UN_POZO, K_PASO3, K_IMPACTO_LISTO], marcas: [
    { n: 80, sel: 'dt:has-text("Si falla hoy")', lado: 'der' },
    { n: 81, texto: 'Dónde se trabó', exacto: true, lado: 'der' },
    { n: 107, texto: 'La firma se hace en el escritorio' },
  ] },
]

export const CAPTURAS = [...A_CAPTURAS, ...B_CAPTURAS, ...C_CAPTURAS, ...D_CAPTURAS, ...E_CAPTURAS, ...K_CAPTURAS]
export const CAPTURAS_ESCRITAS = [...D_ESCRITAS, ...K_ESCRITAS]
