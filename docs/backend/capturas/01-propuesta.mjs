// Capturas del capítulo 1: el caso de P-201B, de la parada a la gerencia (v3, 28-oct-2026).
// La v3 borró las pantallas Bombas y Resumen (docs/experiencia-v3/borrado.md A-15, A-16): la misma parada se ve
// en la ficha del gerente (modal), en el nivel 3 de confiabilidad y en La planta viva del portafolio.
const FICHA = '[data-ficha-ejecutiva]'
export const CAPTURAS = [
  { archivo: 'cap1-ceiba-p201b-detalle', ruta: '#/ger/planta-viva/ceiba/curso/P-201B', completa: false, marcas: [ // sin crecer la ventana: el modal se ve entero hasta «Qué se está haciendo»; planes y SAP quedan debajo

    { n: 1, texto: /^1\.665\s*bbl\/d$/, dentro: `${FICHA} section[aria-label="Ahora"]` },
    { n: 2, texto: 'pozos cerrados', exacto: true, dentro: FICHA },
    { n: 3, texto: 'No arrancar hasta identificar qué se dañó', dentro: FICHA },
    { n: 4, texto: /^573\s*bbl$/, dentro: `${FICHA} section[aria-label="Le ha costado"]` },
    { n: 5, texto: /^38\.838\s*bbl$/, dentro: `${FICHA} section[aria-label="Le ha costado"]` },
    { n: 6, sel: `${FICHA} [data-reparto]` },
    { n: 7, texto: /4\.593 bbl por falla/, dentro: FICHA },
    { n: 8, texto: /^P-201A y P-201C en paralelo, con 30\.100 bbl\/d libres/, dentro: FICHA },
  ] },
  { archivo: 'cap1-morichal-p201b-detalle', ruta: '#/conf/equipos/morichal/P-201B', marcas: [
    { n: 1, texto: /^Si falla hoy: 783 bbl\/d después de 10,1 h de colchón/ },
    { n: 2, texto: '61,8 %', exacto: true },
    { n: 3, texto: '16.920 bbl', exacto: true },
    { n: 4, texto: '40.400 bbl/d', exacto: true },
    { n: 5, texto: '10,1 h (9,0 h a 11,1 h)', exacto: true },
    { n: 6, texto: 'Orden de cierre', exacto: true },
    { n: 7, texto: /439 bbl\/d menos que parejo/ },
  ] },
  { archivo: 'cap1-resumen-portafolio', ruta: '#/ger/planta-viva/ceiba~portafolio/curso', marcas: [
    { n: 1, texto: '2.650', exacto: true },
    { n: 2, rol: 'button', nombre: 'Ver P-201B' },
    { n: 3, texto: '64.147', exacto: true },
    { n: 4, texto: '2.376', exacto: true },
    { n: 5, texto: 'sin registro', exacto: true, i: 0 },
    { n: 6, texto: 'Sin identificar', exacto: true },
  ] },
]
