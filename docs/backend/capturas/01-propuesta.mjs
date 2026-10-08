// Capturas del capítulo 1: el caso de P-201B, de la parada a la gerencia.
export const CAPTURAS = [
  { archivo: 'cap1-ceiba-p201b-detalle', ruta: '#/conf/bombas/ceiba/curso', antes: [{ sel: '[aria-label*="Abrir el detalle"]' }], marcas: [
    { n: 1, texto: 'sin respaldo', exacto: true, lado: 'abajo' },
    { n: 2, texto: '2.570 bbl', exacto: true },
    { n: 3, texto: /11\.059\s*bbl\/d/, i: 0 },
    { n: 4, texto: '18.075 bbl', exacto: true },
    { n: 5, texto: 'No arrancar hasta identificar el daño' },
    { n: 6, texto: 'POZOS QUE CERRÓ · 17' },
    { n: 7, texto: 'colchón 4,3 h · aguantó 4,2 h' },
    { n: 8, texto: '3.400 bbl', exacto: true },
    { n: 9, texto: '19.190 bbl/d', exacto: true },
    { n: 10, texto: 'Primer pozo cerrado' },
    { n: 11, texto: 'Sin primera alarma y sin firma', lado: 'izq' },
  ] },
  { archivo: 'cap1-morichal-p201b-detalle', ruta: '#/conf/bombas/morichal/curso', antes: [{ sel: '[aria-label="Abrir el detalle de Bomba multietapa de transferencia de agua"]' }], marcas: [
    { n: 1, texto: 'respaldo 15.100 bbl/d' },
    { n: 2, texto: '1.671 bbl/d', exacto: true, i: 0 },
    { n: 3, texto: /^nivel LT-2012/ },
    { n: 4, texto: '5.076 bbl', exacto: true },
    { n: 5, texto: '6.395 bbl/d', exacto: true },
    { n: 6, texto: /^19,0\s*h/ },
    { n: 7, rol: 'heading', nombre: 'ORDEN DE CIERRE' },
    { n: 8, texto: '872 bbl/d menos' },
    { n: 9, texto: 'evitable en orden: 4.762 bbl' },
  ] },
  { archivo: 'cap1-resumen-portafolio', ruta: '#/ger/resumen/ceiba~portafolio/curso', marcas: [
    { n: 1, texto: '6.232', exacto: true },
    { n: 2, texto: '5.729–6.734 bbl · calculado' },
    { n: 3, texto: '13.217 bbl/d' },
    { n: 4, texto: 'P-201B · La Ceiba', exacto: true },
    { n: 5, texto: '2.570', exacto: true },
  ] },
]
