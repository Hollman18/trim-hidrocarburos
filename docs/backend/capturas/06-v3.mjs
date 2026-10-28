// Capturas del capítulo 6 · Las pantallas de la v3 por rol (28-oct-2026): lo que hay hoy, no lo que había.
// Se describen en docs/backend/06-pantallas-v3.md. Las de las secciones 6A–6D que muestran pantallas que la v3
// borró quedan como histórico (cada archivo dice RETIRADO arriba).
export const CAPTURAS = [
  { archivo: 'v3-ger-planta-viva', ruta: '#/ger/planta-viva/ceiba~portafolio/curso', marcas: [
    { n: 1, texto: '2.650', exacto: true },
    { n: 2, rol: 'button', nombre: 'Ver P-201B' },
    { n: 3, sel: 'main section[aria-label="Producción por día"]', caja: 'elemento' },
    { n: 4, sel: 'main section[aria-label="Cierre del mes"]', caja: 'elemento' },
    { n: 5, texto: 'Producido · diferido · perdido', exacto: true },
    { n: 6, sel: 'main [data-funcionando] [data-funcionando-mes]', caja: 'elemento' },
    { n: 7, sel: '[data-franja]', caja: 'elemento', lado: 'abajo' },
  ] },
  { archivo: 'v3-prod-planta-viva', ruta: '#/prod/planta-viva/ceiba/curso', marcas: [
    { n: 1, texto: '9.394', exacto: true, i: 0 },
    { n: 2, rol: 'button', nombre: 'Confirmar las 2' },
    { n: 3, texto: 'Si falla hoy', exacto: true, i: 0 },
  ] },
  { archivo: 'v3-sup-hoy', ruta: '#/sup/hoy/ceiba/curso', marcas: [
    { n: 1, texto: 'Paradas por confirmar', exacto: true },
    { n: 2, rol: 'button', nombre: 'Confirmar las 2' },
    { n: 3, rol: 'button', nombre: 'Registrar una pérdida' },
    { n: 4, texto: 'Orden de cierre.', exacto: true },
    { n: 5, texto: /^Mi turno/, i: 0 },
  ] },
  { archivo: 'v3-oper-hoy', ruta: '#/oper/hoy/ceiba/curso', telefono: true, marcas: [
    { n: 1, texto: 'Pregunta', exacto: true },
    { n: 2, texto: '¿Qué parte se dañó?', exacto: true },
    { n: 3, texto: 'Sello mecánico', exacto: true },
  ] },
  { archivo: 'v3-jefe-hoy', ruta: '#/jefe/hoy/ceiba/curso', marcas: [
    { n: 1, texto: 'Avisan', exacto: true },
    { n: 2, texto: /^Espera/, i: 0 },
    { n: 3, rol: 'button', nombre: 'Ver la orden' },
    { n: 4, texto: 'Ojo:', exacto: true },
  ] },
  { archivo: 'v3-conf-equipos', ruta: '#/conf/equipos/ceiba', marcas: [
    { n: 1, texto: 'Si falla hoy', exacto: true, i: 0 },
    { n: 2, rol: 'button', nombre: 'Abrir P-201A' },
    { n: 3, sel: 'main [data-fila-equipo][data-tono="frenado"]', caja: 'elemento' },
    { n: 4, sel: 'main [data-fila-equipo][data-tono="riesgo"]', caja: 'elemento' },
  ] },
  { archivo: 'v3-tec-hoy', ruta: '#/tec/hoy/ceiba/curso', telefono: true, marcas: [
    { n: 1, texto: 'cosas', exacto: true, i: 0 },
    { n: 2, rol: 'button', nombre: 'Contestar', exacto: true },
  ] },
  { archivo: 'v3-adm-configurar', ruta: '#/adm/configuracion/ceiba/curso', marcas: [
    { n: 1, texto: 'de 6 pasos listos', exacto: true },
    { n: 2, rol: 'button', nombre: 'Seguir el paso' },
  ] },
  { archivo: 'v3-traza-planta', ruta: '#/ger/planta-viva/ceiba~portafolio/curso', completa: false,
    antes: [{ sel: '[data-balance] [data-tramo-balance="planta"] button' }], marcas: [
      { n: 1, sel: '[data-traza] li[data-nodo] > p', caja: 'elemento' },
      { n: 2, sel: '[data-traza] [data-parada-balance="LC-16"]', caja: 'elemento' },
      { n: 3, texto: 'Nadie ha registrado una pérdida en este tramo.', dentro: '[data-traza]' },
    ] },
  // 28-oct · El historial del diferido y del perdido (GET /api/vistas/historial): mes a mes del gerente y los 14 turnos del supervisor.
  { archivo: 'v3-historial-gerente', ruta: '#/ger/planta-viva/ceiba~portafolio/curso', completa: false,
    antes: [{ sel: 'main [data-historial="mes"] h2' }], marcas: [
      { n: 1, sel: 'main [data-historial="mes"] [data-periodo="2026-10"]', caja: 'elemento' },
      { n: 2, sel: 'main [data-historial="mes"] [data-fondo="bien"]', caja: 'elemento' },
      { n: 3, sel: 'main [data-historial="mes"] [data-historial-perdido]', caja: 'elemento' },
    ] },
  { archivo: 'v3-historial-supervisor', ruta: '#/sup/hoy/ceiba/curso', completa: false,
    antes: [{ sel: 'main [data-historial="turno"] h2' }], marcas: [
      { n: 1, sel: 'main [data-historial="turno"] [data-periodo]', caja: 'elemento' },
      { n: 2, sel: 'main [data-historial="turno"] [data-historial-perdido]', caja: 'elemento' },
    ] },
  { archivo: 'v3-diagnostico-mpp301', ruta: '#/conf/equipos/morichal/MPP-301/diagnostico', marcas: [
    { n: 1, texto: 'Cómo está y por qué', exacto: true },
    { n: 2, texto: 'Filtro de entrada', exacto: true, i: 0 },
    { n: 3, sel: 'main svg [data-zona-tono="frenado"]', caja: 'elemento' },
    { n: 4, sel: 'main svg [data-zona-tono="riesgo"]', caja: 'elemento' },
    { n: 5, texto: 'Qué la anuncia', exacto: true, i: 0 },
  ] },
]
