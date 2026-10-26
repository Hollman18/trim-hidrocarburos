// X5 · Marcas de estado (X2 §4.2: color + forma + número) e íconos de línea (estilo lucide, ISC).
// Prototipo para mirar: no es código del producto. Solo pinta cadenas propias (sin datos de afuera).
const NUM = 'font-family="Air" font-weight="700" font-size="7.8" text-anchor="middle"'
const MK = {
  // Interlock: candado (solo con primera alarma registrada o disparo del lazo de seguridad).
  interlock: t => `<svg class="mk" width="${t}" height="${t}" viewBox="0 0 14 14" role="img" aria-label="Interlock"><rect x="2.5" y="6" width="9" height="7" rx="1.2" fill="var(--interlock)"/><path d="M4.6 6 V4.4 a2.4 2.4 0 0 1 4.8 0 V6" fill="none" stroke="var(--interlock)" stroke-width="1.6"/></svg>`,
  // Alarma (prioridad 1): rombo naranja con «1».
  p1: t => `<svg class="mk" width="${t}" height="${t}" viewBox="0 0 14 14" role="img" aria-label="Prioridad 1, alarma"><path d="M7 0.5 L13.5 7 L7 13.5 L0.5 7 Z" fill="var(--p1)"/><text x="7" y="9.75" ${NUM} fill="var(--marca-num)">1</text></svg>`,
  // Atención (prioridad 2): triángulo amarillo con trazo oscuro y «2».
  p2: t => `<svg class="mk" width="${t}" height="${t}" viewBox="0 0 14 14" role="img" aria-label="Prioridad 2, atención"><path d="M7 1 L13.4 12.7 L0.6 12.7 Z" fill="var(--p2)" stroke="var(--marca-trazo)" stroke-width="1" stroke-linejoin="round"/><text x="7" y="11.4" ${NUM} fill="var(--marca-trazo)">2</text></svg>`,
  // Aviso (prioridad 3): cuadrado amarillo con trazo oscuro y «3».
  p3: t => `<svg class="mk" width="${t}" height="${t}" viewBox="0 0 14 14" role="img" aria-label="Prioridad 3, aviso"><rect x="1.4" y="1.4" width="11.2" height="11.2" rx="1.2" fill="var(--p3)" stroke="var(--marca-trazo)" stroke-width="1"/><text x="7" y="9.8" ${NUM} fill="var(--marca-trazo)">3</text></svg>`,
  // Sin comunicación: círculo punteado morado (el valor pasa a «---»).
  sincom: t => `<svg class="mk" width="${t}" height="${t}" viewBox="0 0 14 14" role="img" aria-label="Sin comunicación"><circle cx="7" cy="7" r="5.2" fill="none" stroke="var(--sincom)" stroke-width="1.6" stroke-dasharray="2.2 1.6"/></svg>`,
  // Dato inválido: el mismo círculo punteado, con raya.
  invalido: t => `<svg class="mk" width="${t}" height="${t}" viewBox="0 0 14 14" role="img" aria-label="Dato inválido"><circle cx="7" cy="7" r="5.2" fill="none" stroke="var(--sincom)" stroke-width="1.6" stroke-dasharray="2.2 1.6"/><path d="M3.3 10.7 L10.7 3.3" stroke="var(--sincom)" stroke-width="1.6"/></svg>`,
  // Falta: rectángulo de contorno discontinuo, gris.
  falta: t => `<svg class="mk" width="${t}" height="${t}" viewBox="0 0 14 14" role="img" aria-label="Falta"><rect x="1.5" y="3" width="11" height="8" rx="1" fill="none" stroke="var(--tinta3)" stroke-width="1.4" stroke-dasharray="2 1.5"/></svg>`,
  // Sin instrumento: corchetes, gris.
  sininst: t => `<svg class="mk" width="${t}" height="${t}" viewBox="0 0 14 14" role="img" aria-label="Sin instrumento"><path d="M4.5 2 H2.2 V12 H4.5 M9.5 2 H11.8 V12 H9.5" fill="none" stroke="var(--tinta3)" stroke-width="1.5"/></svg>`,
  // Medido a mano (campaña): reloj, gris.
  campana: t => `<svg class="mk" width="${t}" height="${t}" viewBox="0 0 14 14" role="img" aria-label="Medido a mano"><circle cx="7" cy="7" r="5.2" fill="none" stroke="var(--tinta3)" stroke-width="1.4"/><path d="M7 4 V7 H9.5" fill="none" stroke="var(--tinta3)" stroke-width="1.4"/></svg>`,
  // Anticipa (fuera del tiempo de respuesta): flecha, gris.
  anticipa: t => `<svg class="mk" width="${t}" height="${t}" viewBox="0 0 14 14" role="img" aria-label="Anticipa"><path d="M2 7 H11 M8 4 L11 7 L8 10" fill="none" stroke="var(--tinta3)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Normal (solo en listas mixtas): punto gris.
  normal: t => `<svg class="mk" width="${t}" height="${t}" viewBox="0 0 14 14" role="img" aria-label="Normal"><circle cx="7" cy="7" r="2.6" fill="var(--tinta3)"/></svg>`,
  // Bloqueo de procedimiento («No arrancar hasta identificar»): círculo con barra, en tinta.
  bloqueo: t => `<svg class="mk" width="${t}" height="${t}" viewBox="0 0 14 14" role="img" aria-label="No arrancar"><circle cx="7" cy="7" r="5.6" fill="none" stroke="var(--tinta)" stroke-width="1.7"/><path d="M3.1 10.9 L10.9 3.1" stroke="var(--tinta)" stroke-width="1.7"/></svg>`,
}
// Íconos de línea 24 × 24, trazo 1,75: los de lucide (ISC), salvo «planta», que es propio (un tubo que se angosta).
const L = (d, t = 22, sw = 1.75) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
const IC = {
  hoy: t => L('<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>', t),
  planta: t => L('<path d="M2 8h6c1.5 0 2 2.5 3.5 2.5h1C14 10.5 14.5 8 16 8h6"/><path d="M2 16h6c1.5 0 2-2.5 3.5-2.5h1c1.5 0 2 2.5 3.5 2.5h6"/>', t),
  equipos: t => L('<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>', t),
  resultados: t => L('<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>', t),
  ayuda: t => L('<circle cx="12" cy="12" r="9.5"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>', t),
  plegar: t => L('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>', t),
  desplegar: t => L('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>', t),
  abajo: t => L('<path d="m6 9 6 6 6-6"/>', t, 2),
  derecha: t => L('<path d="m9 18 6-6-6-6"/>', t, 2),
  izquierda: t => L('<path d="m15 18-6-6 6-6"/>', t, 2),
  camara: t => L('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>', t),
  compartir: t => L('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>', t),
  mensaje: t => L('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', t),
  check: t => L('<path d="M20 6 9 17l-5-5"/>', t, 2),
}
function pintar(raiz = document) {
  for (const el of raiz.querySelectorAll('[data-mk]')) el.innerHTML = MK[el.dataset.mk](+el.dataset.t || 16)
  for (const el of raiz.querySelectorAll('[data-ic]')) el.innerHTML = IC[el.dataset.ic](+el.dataset.t || 22)
}
// Cifras como en campo: punto de miles, coma decimal.
const n0 = v => Math.round(v).toLocaleString('es-CO')
const n1 = v => v.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
// El tema se escoge por la dirección (?tema=oscuro), para renderizar la misma página en los dos.
if (new URLSearchParams(location.search).get('tema') === 'oscuro') document.documentElement.dataset.tema = 'oscuro'
