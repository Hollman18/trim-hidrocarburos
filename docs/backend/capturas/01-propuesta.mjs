// Capturas del capítulo 1: el caso de P-201B, de la parada a la gerencia.
export const CAPTURAS = [
  { archivo: 'cap1-ceiba-p201b-detalle', ruta: '#/conf/bombas/ceiba/curso', antes: [{ sel: '[aria-label*="Abrir el detalle"]' }], marcas: [
    { n: 1, texto: /^respaldo [\d.]+ bbl\/d$/, lado: 'abajo' },
    { n: 2, texto: '573 bbl', exacto: true },
    { n: 3, texto: /1\.665\s*bbl\/d/, i: 0 },
    { n: 4, texto: '4.593 bbl', exacto: true },
    { n: 5, texto: 'No arrancar hasta identificar el daño' },
    { n: 6, texto: 'POZOS QUE CERRÓ · 2' },
    { n: 7, texto: /^colchón 1,8 h · aguantó 1,8 h/ },
    { n: 8, texto: '3.390 bbl', exacto: true },
    { n: 9, texto: '44.100 bbl/d', exacto: true },
    { n: 10, texto: 'Primer pozo cerrado' },
    { n: 11, texto: 'Sin primera alarma y sin firma', lado: 'izq' },
  ] },
  { archivo: 'cap1-morichal-p201b-detalle', ruta: '#/conf/bombas/morichal/curso', antes: [{ sel: '[aria-label="Abrir el detalle de Bomba multietapa de transferencia de agua"]' }], marcas: [
    { n: 1, texto: /^respaldo [\d.]+ bbl\/d$/, lado: 'abajo' },
    { n: 2, texto: '783 bbl/d', exacto: true, i: 0 },
    { n: 3, texto: /^nivel LT-2012/ },
    { n: 4, texto: '16.920 bbl', exacto: true },
    { n: 5, texto: '40.400 bbl/d', exacto: true },
    { n: 6, texto: /^10,\d\s*h/ },
    { n: 7, rol: 'heading', nombre: 'ORDEN DE CIERRE' },
    { n: 8, texto: /bbl\/d menos/ },
  ] },
  { archivo: 'cap1-resumen-portafolio', ruta: '#/ger/resumen/ceiba~portafolio/curso', marcas: [
    { n: 1, texto: '2.377', exacto: true },
    { n: 2, texto: /bbl · calculado$/ },
    { n: 3, texto: /^[\d.]+ bbl\/d$/, i: 0 },
    { n: 4, texto: /^(P-201B · La Ceiba|MN-41 · Morichal Norte)$/ },
    { n: 5, rol: 'heading', nombre: 'POR EQUIPO' },
  ] },
]
