// Pitch deck comercial TRIM → PDF 16:9 (Air, paneles, cifras de ejemplo).
//
//   node docs/backend/herramientas/armar-pitch-deck.mjs [salida.pdf]
//
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const RAIZ = resolve(dirname(new URL(import.meta.url).pathname), '../../..')
const salida = process.argv[2] ?? resolve(RAIZ, 'docs/backend/TRIM-pitch-comercial.pdf')
const htmlRuta = salida.replace(/\.pdf$/, '.html')

const font = f => pathToFileURL(resolve(RAIZ, 'public/fonts', f)).href
const logo = pathToFileURL(resolve(RAIZ, 'public/brand/logo_trim_dark.png')).href

/** Cifras de ejemplo · portafolio octubre (ilustración comercial). */
const D = {
  diferido: 2377,
  difLo: 2132,
  difHi: 2622,
  difDia: 1501,
  difMaxDia: 2300,
  valor: '114 mil USD',
  retorno: 45233,
  retUsd: '2,2 M USD',
  antes: 42017,
  durante: 2102,
  despues: 1114,
  perd: 2650,
  altoPct: 70,
  tendencia: [1534, 1070, 1557, 591, 1146, 1723, 865, 1844, 988, 1646, 1735, 1131, 1501],
  equipos: [
    { id: 'MN-41', bbl: 1083, pct: 46 },
    { id: 'P-201B', bbl: 573, pct: 24 },
    { id: 'LC-21', bbl: 247, pct: 10 },
  ],
  causa: 'P-201B · La Ceiba',
  vigia: '43 h',
}

const n0 = v => Math.round(v).toLocaleString('es-CO')

const barMeta = (val, max, label) => {
  const pct = Math.min(100, (val / max) * 100)
  return `<div class="meta-row">
    <div class="meta-top"><span class="meta-val tabular">${n0(val)}</span><span class="meta-unit">bbl/d</span></div>
    <div class="bar-track"><i style="width:${pct}%"></i></div>
    <div class="meta-foot"><span>máx. ${n0(max)}</span><span>${label}</span></div>
  </div>`
}

const sparkline = (vals, w = 280, h = 56, uid = 'a') => {
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  const pad = 4
  const coords = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2)
    return { x, y }
  })
  const pts = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const last = coords.at(-1)
  const area = `${coords[0].x},${h - pad} ${pts} ${last.x},${h - pad}`
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <defs><linearGradient id="sparkFill-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--acento)" stop-opacity=".22"/><stop offset="100%" stop-color="var(--acento)" stop-opacity="0"/></linearGradient></defs>
    <polygon points="${area}" fill="url(#sparkFill-${uid})"/>
    <polyline points="${pts}" fill="none" stroke="var(--acento)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last.x}" cy="${last.y}" r="3.5" fill="var(--acento)"/>
  </svg>`
}

const cicloCols = () => {
  const total = D.retorno
  const cols = [
    { n: '1', name: 'Antes', bbl: D.antes },
    { n: '2', name: 'Durante', bbl: D.durante, extra: `${n0(2349)} bbl/d` },
    { n: '3', name: 'Después', bbl: D.despues },
  ]
  return `<div class="ciclo-head">
    <div class="ciclo-hero tabular">${n0(D.retorno)}<small>bbl · retorno</small></div>
    <div class="ciclo-usd tabular">${D.retUsd}</div>
    <div class="ui-chip-row ciclo-chips"><span class="chip">Antes</span><span class="chip">Durante</span><span class="chip">Después</span></div>
  </div>
  <div class="ciclo-grid">${cols.map(c => {
    const pct = total > 0 ? (c.bbl / total) * 100 : 0
    return `<div class="ciclo-cell">
      <span class="ciclo-label"><b>${c.n}</b> ${c.name}</span>
      <span class="ciclo-bbl tabular">${n0(c.bbl)} <small>bbl</small></span>
      ${c.extra ? `<span class="ciclo-extra tabular">${c.extra}</span>` : ''}
      <span class="bar-track bar-sm"><i style="width:${pct}%"></i></span>
    </div>`
  }).join('')}</div>`
}

const pareto = (cap = 'Top equipos · bbl diferidos') => {
  const max = D.equipos[0].bbl
  return `<div class="ui-panel ui-panel-tight"><div class="ui-cap">${cap}</div><div class="pareto">${D.equipos.map(e => `
    <div class="pareto-row">
      <span class="pareto-id">${e.id}</span>
      <span class="bar-track bar-pareto"><i style="width:${(e.bbl / max) * 100}%"></i></span>
      <span class="pareto-bbl tabular">${n0(e.bbl)}</span>
      <span class="pareto-pct tabular">${e.pct} %</span>
    </div>`).join('')}</div></div>`
}

const mockMedido = (extra = '') => `<div class="ui-panel${extra ? ` ${extra}` : ''}">
  <div class="ui-cap">Diferido del período</div>
  <div class="ui-big tabular">${n0(D.diferido)}</div>
  <div class="ui-sub">barriles diferidos</div>
  <div class="ui-range tabular">${n0(D.difLo)}–${n0(D.difHi)} · calculado</div>
  ${barMeta(D.difDia, D.difMaxDia, 'promedio diario · diferido')}
  <div class="ui-foot tabular">${D.valor}</div>
</div>`

const mockSimulado = (compact = false) => `<div class="ui-panel ui-panel-ciclo${compact ? ' ui-panel-compact' : ''}">
  <div class="ui-cap">Prioridad en barriles</div>
  ${cicloCols()}
</div>`

const graficoBaseline = () => {
  const w = 340
  const realPct = 78
  const difPct = 22
  const y1 = 28
  const y2 = 78
  const barH = 22
  return `<div class="ui-panel ui-panel-tight">
    <div class="ui-cap">Cuenta del período</div>
    <p class="baseline-note">Potencial menos producción fiscal = <strong class="tabular">${n0(D.diferido)} bbl</strong> diferidos · ${D.valor}</p>
    <svg class="baseline-svg" viewBox="0 0 ${w} 118" width="${w}" height="118" aria-hidden="true">
      <text x="0" y="14" class="svg-label">Potencial</text>
      <rect x="0" y="${y1}" width="${w}" height="${barH}" rx="4" class="svg-track"/>
      <text x="0" y="${y2 - 6}" class="svg-label">Real (fiscal)</text>
      <rect x="0" y="${y2}" width="${w * realPct / 100}" height="${barH}" rx="4" class="svg-real"/>
      <rect x="${w * realPct / 100}" y="${y2}" width="${w * difPct / 100}" height="${barH}" rx="4" class="svg-dif"/>
      <text x="${w * realPct / 100 + 6}" y="${y2 + 15}" class="svg-tag tabular">diferido</text>
      <text x="0" y="108" class="svg-foot">Una sola cifra que cierra con el fiscal y se explica por equipo.</text>
    </svg>
    ${barMeta(D.difDia, D.difMaxDia, 'hoy · vs meta firmada')}
  </div>`
}

const pasosComoFunciona = () => {
  const steps = [
    { n: '1', t: 'Medir', d: 'Fiscal + pruebas de pozo' },
    { n: '2', t: 'Atribuir', d: 'Diferido por equipo y causa' },
    { n: '3', t: 'Anticipar', d: 'Alertas antes de la falla' },
    { n: '4', t: 'Priorizar', d: 'Barriles en juego hoy' },
    { n: '5', t: 'Actuar', d: 'Antes · Durante · Después' },
  ]
  return `<div class="ui-panel ui-panel-tight">
    <div class="ui-cap">Cadena en cinco pasos</div>
    <div class="stepper">${steps.map(s => `
      <div class="step">
        <span class="step-n tabular">${s.n}</span>
        <span class="step-t">${s.t}</span>
        <span class="step-d">${s.d}</span>
      </div>`).join('<span class="step-arrow">→</span>')}</div>
    <p class="baseline-note">Se integra con sus sistemas de planta; no sustituye el control del proceso.</p>
  </div>`
}

const graficoRoi = () => {
  const max = D.retorno
  const med = D.diferido
  const medPct = Math.max(8, (med / max) * 100)
  return `<div class="ui-panel ui-panel-tight">
    <div class="ui-cap">Costo vs oportunidad</div>
    <div class="roi-rows">
      <div class="roi-row">
        <span class="roi-lbl">Costo del período <small>contabilizado</small></span>
        <span class="bar-track bar-roi"><i class="bar-med" style="width:${medPct}%"></i></span>
        <span class="roi-val tabular">${D.valor}</span>
      </div>
      <div class="roi-row">
        <span class="roi-lbl">Oportunidad <small>priorizada</small></span>
        <span class="bar-track bar-roi"><i style="width:100%"></i></span>
        <span class="roi-val tabular">${D.retUsd}</span>
      </div>
    </div>
    <p class="baseline-note"><strong class="tabular">${n0(D.retorno)} bbl</strong> donde la intervención más vale — Antes, Durante y Después del evento.</p>
  </div>`
}

const compareSinCon = () => `<div class="compare-grid">
  <div class="ui-panel ui-panel-tight compare-col compare-antes">
    <div class="ui-cap">Sin cadena unificada</div>
    <ul class="mini-list">
      <li>SCADA, Excel y reportes por separado</li>
      <li>Parada = apagar el fuego</li>
      <li>Diferido difícil de auditar</li>
      <li>No se sabe qué equipo atender hoy</li>
    </ul>
  </div>
  <div class="ui-panel ui-panel-tight compare-col compare-desp">
    <div class="ui-cap">Con TRIM</div>
    <ul class="mini-list">
      <li>Informe auditable por equipo</li>
      <li>Alertas antes de la falla</li>
      <li>Prioridad en barriles (Antes / Durante / Después)</li>
      <li>Operación y mantenimiento con el mismo número</li>
    </ul>
  </div>
</div>`

const rolesGrid = () => `<div class="roles">
  <div class="role"><span class="role-who">Gerencia</span><span class="role-q">¿Cuánto perdimos y dónde invertir?</span><span class="role-p">Panel ejecutivo · diferido y oportunidad</span></div>
  <div class="role"><span class="role-who">Mantenimiento</span><span class="role-q">¿A qué equipo ir hoy?</span><span class="role-p">Alertas · planes preventivos</span></div>
  <div class="role"><span class="role-who">Operación</span><span class="role-q">¿Cuánto aguanta? ¿Es seguro arrancar?</span><span class="role-p">Colchón · causa · arranque</span></div>
  <div class="role"><span class="role-who">Producción</span><span class="role-q">¿El informe cierra con el fiscal?</span><span class="role-p">Diferidos · asignación · publicación</span></div>
</div>`

const slides = [
  {
    layout: 'split',
    kicker: 'TRIM · hidrocarburos',
    title: 'Menos barriles <em>diferidos</em>',
    sub: 'Prevenir paradas no planificadas · medir con custodia · decidir en barriles',
    aside: `<div class="ui-panel ui-panel-ghost">
      <div class="ui-cap">Ejemplo · portafolio</div>
      <div class="ui-big tabular">${n0(D.diferido)}</div>
      <div class="ui-sub">bbl diferidos · mes en curso</div>
      <div class="hero-stat"><span class="hero-stat-l">Oportunidad priorizada</span><b class="tabular">${n0(D.retorno)}</b><span class="hero-stat-l">bbl · ${D.retUsd}</span></div>
    </div>`,
  },
  {
    layout: 'split',
    kicker: 'El problema',
    title: 'Paradas que no estaban en el plan',
    sub: 'Cada hora parada son barriles que no entran al fiscal — y en ESP, multifásica o reinyección el impacto se multiplica.',
    bullets: [
      'Gerencia ve el impacto tarde y sin desglose por equipo.',
      'Operación y mantenimiento no priorizan con la misma cifra.',
      'El diferido cuesta defenderlo ante auditoría o fiscalización.',
    ],
    aside: graficoBaseline(),
  },
  {
    layout: 'split',
    kicker: 'La solución',
    title: 'Prevenir · medir · actuar',
    sub: 'Una cadena desde la planta hasta la decisión del activo.',
    bullets: [
      '<strong>Anticipar</strong> fallas en equipos críticos, en barriles y en horas.',
      '<strong>Medir</strong> el diferido con trazabilidad por equipo y causa.',
      '<strong>Actuar</strong> en tres momentos: antes, durante y después de la parada.',
    ],
    aside: compareSinCon(),
  },
  {
    layout: 'split',
    kicker: 'Cómo funciona',
    title: 'De la señal al barril',
    sub: 'Producción fiscal, potencial por pozo, diferido explicado y prioridad clara.',
    aside: pasosComoFunciona(),
  },
  {
    layout: 'split',
    kicker: 'El producto',
    title: 'Una plataforma, cuatro vistas',
    sub: 'Misma información para gerencia, mantenimiento, operación y producción.',
    bullets: [
      '<strong>Panel ejecutivo</strong> — diferido del período y dónde actuar.',
      '<strong>Alertas y confiabilidad</strong> — qué falla primero y cuánto cuesta.',
      '<strong>Sala de control</strong> — colchón, causa y arranque seguro.',
      '<strong>Planta</strong> — agua, severidad y pozos aguas abajo.',
    ],
    aside: `${mockMedido()}
      <div class="spark-wrap"><span class="ui-cap">Tendencia · bbl/d</span>${sparkline(D.tendencia, 320, 56, 'trend')}</div>`,
  },
  {
    layout: 'split',
    kicker: 'Propuesta de valor',
    title: 'Barriles + custodia + prevención',
    sub: 'Campos maduros o en desarrollo · tres familias de equipo · una cuenta que cierra con el fiscal.',
    bullets: [
      'Menos paradas evitables donde más barriles se pierden.',
      'Informe auditable: asignación, causas y publicación.',
      'Inversión de mantenimiento ordenada por retorno en <strong>Antes</strong>.',
      'Complementa SCADA y hojas de cálculo — no los reemplaza.',
    ],
    aside: pareto('Concentración del diferido'),
  },
  {
    layout: 'split',
    kicker: 'Palanca',
    title: 'Prevenir antes de parar',
    sub: 'Alertas con horizonte en horas; el equipo crítico lleva el barril a la mesa.',
    aside: `<div class="ui-panel">
      <div class="ui-cap">Alerta temprana · ejemplo</div>
      <div class="ui-big tabular accent">${D.vigia}</div>
      <div class="ui-sub">hasta límite · ${D.causa.split(' · ')[0]}</div>
      <div class="flow-mini"><span>Señal</span><i>→</i><span>Impacto</span><i>→</i><span>Intervenir</span></div>
      <div class="ui-stat"><span>En este momento</span><b class="tabular p1">${n0(D.perd)}</b><span>bbl/d</span></div>
    </div>`,
  },
  {
    layout: 'split',
    kicker: 'Dónde',
    title: 'Tres equipos críticos',
    sub: 'Electrosumergible · bomba multifásica · reinyección o disposición de agua.',
    bullets: [
      'Cada pozo y cada línea con la misma cadena de custodia.',
      'Alta BSW: la bomba de agua puede cerrar el activo en horas.',
      'Campo nuevo: prevención desde el primer pozo en línea.',
    ],
    aside: `<div class="equip-cards">
      <div class="eq"><span class="eq-tag">ESP</span><span class="eq-line">Pozo a pozo</span></div>
      <div class="eq"><span class="eq-tag">Multifásica</span><span class="eq-line">Cluster</span></div>
      <div class="eq"><span class="eq-tag">Reinyección</span><span class="eq-line">Tanque · agua</span></div>
    </div>`,
  },
  {
    layout: 'full-ui',
    kicker: 'Priorizar',
    title: 'Antes · Durante · Después',
    sub: 'Evitar la parada · perder menos tiempo · no repetir la misma falla.',
    ui: mockSimulado(),
  },
  {
    layout: 'split',
    kicker: 'Retorno',
    title: 'Cómo se paga la inversión',
    sub: 'El costo del período es contable; la oportunidad muestra dónde capturar barriles.',
    bullets: [
      'Cuenta clara del diferido ya ocurrido, valorado en moneda.',
      'Mapa de oportunidad por fase del evento.',
      'Implementación por etapas: fiscal, pruebas, planta y alertas.',
    ],
    aside: graficoRoi(),
  },
  {
    layout: 'split',
    kicker: 'Confianza',
    title: 'Contabilizado vs oportunidad',
    sub: 'Dos cifras distintas: lo que ya pasó y lo que aún puede moverse con acción.',
    aside: `<div class="split-ui compare">
      ${mockSimulado(true)}
      ${mockMedido('ui-panel-medido')}
    </div>`,
  },
  {
    layout: 'split',
    kicker: 'Para quién',
    title: 'Un número, cuatro roles',
    sub: 'La misma verdad del activo; cada área ve su pregunta.',
    aside: rolesGrid(),
  },
  {
    layout: 'split',
    kicker: 'Implementación',
    title: 'Maduro o en desarrollo',
    sub: 'Mismo producto; el énfasis cambia con la madurez del campo.',
    aside: `<div class="equip-cards cols2">
      <div class="eq"><span class="eq-tag">Alta BSW</span><span class="eq-line">Agua · reinyección · tiempo de colchón</span></div>
      <div class="eq"><span class="eq-tag">Campo nuevo</span><span class="eq-line">Línea base clara · alertas desde el inicio</span></div>
    </div>
    <div class="ui-panel ui-panel-tight"><div class="ui-cap">Arranque típico</div><p class="baseline-note">Medición fiscal · pruebas de pozo · electrosumergibles · líneas de transporte y agua · integración con ERP y alertas al equipo de campo.</p></div>`,
  },
  {
    layout: 'cta',
    kicker: 'Siguiente paso',
    title: 'Demostración en 20 minutos',
    sub: 'Panel ejecutivo · alertas · parada en curso · planta · planes de acción',
    cta: 'gotrim.ai',
  },
]

const shell = (s, i, inner) => `<section class="slide layout-${s.layout}" data-n="${i + 1}">
  <header><img class="logo" src="${logo}" alt="Trim"><span class="n tabular">${String(i + 1).padStart(2, '0')} / ${slides.length}</span></header>
  ${inner}
</section>`

const bulletsHtml = bullets => bullets?.length
  ? `<ul class="bullets">${bullets.map(b => `<li>${b}</li>`).join('')}</ul>`
  : ''

const render = (s, i) => {
  if (s.layout === 'cta') {
    return shell(s, i, `<div class="cta-wrap">
      <p class="kicker">${s.kicker}</p>
      <h1 class="title">${s.title}</h1>
      <p class="sub">${s.sub}</p>
      <p class="cta">${s.cta}</p>
    </div>`)
  }
  if (s.layout === 'full-ui') {
    return shell(s, i, `<div class="split">
      <div class="copy"><p class="kicker">${s.kicker}</p><h1 class="title">${s.title}</h1><p class="sub">${s.sub}</p>${bulletsHtml(s.bullets)}</div>
      <div class="aside aside-wide">${s.ui}</div>
    </div>`)
  }
  const titleClass = s.titleSize === 'sm' ? ' title-sm' : ''
  return shell(s, i, `<div class="split">
    <div class="copy">
      <p class="kicker">${s.kicker}</p>
      <h1 class="title${titleClass}">${s.title}</h1>
      <p class="sub">${s.sub}</p>
      ${bulletsHtml(s.bullets)}
    </div>
    <div class="aside">${s.aside ?? ''}</div>
  </div>`)
}

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Trim · Pitch</title>
<style>
@font-face{font-family:Air;src:url('${font('Air-Regular.woff2')}') format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:Air;src:url('${font('Air-Medium.woff2')}') format('woff2');font-weight:500;font-display:swap}
@font-face{font-family:Air;src:url('${font('Air-Semibold.woff2')}') format('woff2');font-weight:600;font-display:swap}
@font-face{font-family:Air;src:url('${font('Air-Bold.woff2')}') format('woff2');font-weight:700;font-display:swap}
@font-face{font-family:"Air Condensed";src:url('${font('AirCondensed-Semibold.woff2')}') format('woff2');font-weight:600;font-display:swap}
:root{
  color-scheme:light;
  --suelo:#c9c9c7;
  --superficie:#d6d5d2;
  --panel:#eceae7;
  --panel2:#e2e0dd;
  --elevado:#f4f3f0;
  --tinta:#1f2328;
  --tinta2:#3e444b;
  --tinta3:#4d535a;
  --linea:#b4b3b0;
  --linea2:#c8c7c4;
  --marca-1:#12287a;
  --marca-7:#50a5a9;
  --acento:#12287a;
  --acento-f:#12287a1a;
  --dato-1:#3c4148;
  --p1:#b71c1c;
  --radius:10px;
  --sombra:0 1px 2px rgb(31 35 40 / .09);
  --sombra2:0 10px 34px rgb(31 35 40 / .12);
}
*{box-sizing:border-box;margin:0;padding:0}
html{font-family:Air,system-ui,sans-serif;color:var(--tinta);font-variant-numeric:tabular-nums}
.tabular{font-variant-numeric:tabular-nums}
.slide{
  position:relative;width:1280px;height:720px;
  background:var(--suelo);
  page-break-after:always;overflow:hidden;
  padding:44px 52px 36px;display:flex;flex-direction:column;
}
.slide:last-child{page-break-after:auto}
header{display:flex;justify-content:space-between;align-items:center;position:relative;z-index:2;margin-bottom:8px}
.logo{height:26px;width:auto;opacity:.95}
.n{font-family:"Air Condensed",Air,sans-serif;font-size:12px;letter-spacing:.16em;color:var(--tinta3)}
.split{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;position:relative;z-index:2;min-height:0}
.copy{max-width:520px}
.kicker{font-family:"Air Condensed",Air,sans-serif;font-size:12px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--acento);margin-bottom:16px}
.title{font-size:56px;font-weight:700;line-height:1.05;letter-spacing:-.025em;text-wrap:balance;margin-bottom:14px}
.title em{font-style:normal;color:var(--acento)}
.sub{font-size:18px;line-height:1.4;color:var(--tinta2)}
.bullets{margin-top:18px;padding-left:1.15em;font-size:15px;line-height:1.55;color:var(--tinta2);max-width:480px}
.bullets li{margin-bottom:8px}
.bullets li::marker{color:var(--marca-1)}
.bullets strong{color:var(--tinta);font-weight:600}
.title-sm{font-size:46px}
.aside{display:flex;flex-direction:column;gap:14px;justify-content:center}
.aside-wide .ui-panel{min-height:320px}

/* ── Paneles estilo producto (tema claro) ── */
.ui-panel{
  background:var(--panel);
  border:1px solid var(--linea);border-radius:var(--radius);
  padding:20px 22px;box-shadow:var(--sombra);
}
.ui-panel-tight{padding:16px 18px}
.ui-panel-ciclo{border:1px solid var(--linea);border-left:3px solid var(--marca-1)}
.ui-panel-medido{border-style:dashed;border-color:var(--linea)}
.ui-panel-compact{padding:14px 16px}
.ui-panel-compact .ciclo-hero{font-size:26px}
.ui-panel-compact .ciclo-usd{font-size:11px}
.ui-panel-compact .ciclo-chips{margin-top:8px}
.ui-panel-compact .ciclo-chips .chip{padding:3px 8px;font-size:10px}
.ui-panel-compact .ciclo-grid{gap:8px}
.ui-panel-compact .ciclo-bbl{font-size:15px}
.ui-panel-ghost{background:var(--superficie);border:1px dashed var(--linea)}
.hero-stat{display:flex;align-items:baseline;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--linea2);font-size:12px;color:var(--tinta3)}
.hero-stat b{font-size:20px;color:var(--tinta);font-weight:700}
.hero-stat-l{font-size:11px}
.ui-cap{font-family:"Air Condensed",Air,sans-serif;font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--tinta3);margin-bottom:10px}
.ui-big{font-size:44px;font-weight:700;line-height:1;color:var(--tinta)}
.ui-big small{font-size:14px;font-weight:500;color:var(--tinta3);margin-left:6px}
.ui-big.p1{color:var(--p1)}
.ui-big.accent{color:var(--acento)}
.ui-sub{font-size:13px;color:var(--tinta2);margin-top:4px;margin-bottom:12px}
.ui-range{font-size:12px;color:var(--tinta3);margin-bottom:14px}
.ui-foot{font-size:15px;font-weight:600;color:var(--acento);margin-top:12px}
.ui-stat{display:flex;align-items:baseline;gap:8px;font-size:12px;color:var(--tinta3);margin-top:8px}
.ui-stat b{font-size:22px;color:var(--tinta);font-weight:700}
.ui-chip-row{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
.chip{font-size:11px;font-weight:600;padding:5px 10px;border-radius:999px;background:var(--panel2);color:var(--tinta2);border:1px solid var(--linea)}
.chip-sim{font-size:10px;padding:3px 8px;background:var(--acento-f);color:var(--acento);border:1px solid var(--linea2)}

.bar-track{display:block;position:relative;height:8px;border-radius:4px;background:var(--panel2);overflow:hidden;margin:8px 0;border:1px solid var(--linea)}
.bar-track i{display:block;height:100%;background:linear-gradient(90deg, var(--marca-1), var(--marca-7));border-radius:3px}
.bar-sm{height:6px;margin-top:8px}
.bar-sm i{background:var(--dato-1)}
.bar-pareto{flex:1;height:10px}
.meta-row{margin-top:4px}
.meta-top{display:flex;align-items:baseline;gap:6px}
.meta-val{font-size:22px;font-weight:700}
.meta-unit{font-size:12px;color:var(--tinta3)}
.meta-foot{display:flex;justify-content:space-between;font-size:11px;color:var(--tinta3);margin-top:6px}

.ciclo-head{margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--linea2)}
.ciclo-hero{font-size:36px;font-weight:700;line-height:1}
.ciclo-hero small{font-size:13px;font-weight:500;color:var(--tinta3);margin-left:6px}
.ciclo-usd{font-size:13px;color:var(--tinta2);margin-top:6px}
.ciclo-chips{margin-top:10px}
.ciclo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.ciclo-cell{background:var(--panel2);border-radius:8px;padding:12px 10px;border:1px solid var(--linea2)}
.ciclo-label{display:block;font-size:10px;color:var(--tinta3);margin-bottom:6px}
.ciclo-label b{color:var(--marca-1);margin-right:4px}
.ciclo-bbl{font-size:18px;font-weight:700;display:block}
.ciclo-bbl small{font-size:10px;font-weight:500;color:var(--tinta3)}
.ciclo-extra{font-size:10px;color:var(--tinta2);display:block;margin-top:2px}

.pareto{display:flex;flex-direction:column;gap:10px}
.pareto-row{display:grid;grid-template-columns:56px 1fr 52px 36px;gap:10px;align-items:center;font-size:12px}
.pareto-id{font-weight:600;color:var(--tinta)}
.pareto-bbl{text-align:right;font-weight:600}
.pareto-pct{text-align:right;color:var(--tinta3)}

.equip-cards{display:grid;gap:10px}
.equip-cards.cols2{grid-template-columns:1fr 1fr}
.eq{background:var(--panel);border:1px solid var(--linea);border-radius:10px;padding:14px 16px;box-shadow:var(--sombra)}
.eq-tag{display:block;font-weight:600;font-size:15px;margin-bottom:4px}
.eq-line{font-size:12px;color:var(--tinta3)}

.spark-wrap{background:var(--panel);border:1px solid var(--linea);border-radius:var(--radius);padding:14px 16px;box-shadow:var(--sombra)}
.flow-mini{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:12px;font-weight:600;color:var(--tinta2)}
.flow-mini i{color:var(--acento);font-style:normal}

.split-ui.compare{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:stretch}
.split-ui.compare .ui-big{font-size:32px}
.split-ui.compare .meta-val{font-size:18px}

.cta-wrap{flex:1;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;max-width:640px}
.cta{font-size:36px;font-weight:700;color:var(--acento);margin-top:28px;letter-spacing:-.02em}

.layout-cta .title{font-size:64px}

.baseline-note{font-size:12px;line-height:1.45;color:var(--tinta2);margin-top:12px}
.baseline-note strong{color:var(--tinta)}
.baseline-svg{display:block;margin:10px 0 4px;max-width:100%}
.baseline-svg .svg-label{font-size:11px;fill:var(--tinta3);font-family:Air,sans-serif}
.baseline-svg .svg-track{fill:var(--panel2);stroke:var(--linea)}
.baseline-svg .svg-real{fill:var(--dato-1)}
.baseline-svg .svg-dif{fill:var(--p1);opacity:.85}
.baseline-svg .svg-tag{font-size:10px;fill:var(--p1);font-family:Air,sans-serif;font-weight:600}
.baseline-svg .svg-foot{font-size:10px;fill:var(--tinta3);font-family:Air,sans-serif}

.stepper{display:flex;flex-wrap:wrap;align-items:flex-start;gap:6px 4px;margin-top:8px}
.step{flex:1;min-width:52px;background:var(--panel2);border:1px solid var(--linea2);border-radius:8px;padding:8px 6px;text-align:center}
.step-n{display:block;font-size:11px;font-weight:700;color:var(--marca-1);margin-bottom:4px}
.step-t{display:block;font-size:12px;font-weight:600;color:var(--tinta)}
.step-d{display:block;font-size:9px;color:var(--tinta3);margin-top:4px;line-height:1.25}
.step-arrow{align-self:center;color:var(--tinta3);font-size:14px;padding:0 2px}

.compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.compare-col .ui-cap{margin-bottom:8px}
.mini-list{margin:0;padding-left:1.1em;font-size:12px;line-height:1.5;color:var(--tinta2)}
.mini-list li{margin-bottom:6px}
.compare-desp{border-left:3px solid var(--marca-1)}

.roi-rows{display:flex;flex-direction:column;gap:14px;margin-top:8px}
.roi-row{display:grid;grid-template-columns:118px 1fr 72px;gap:10px;align-items:center}
.roi-lbl{font-size:11px;font-weight:600;color:var(--tinta);line-height:1.3}
.roi-lbl small{display:block;font-weight:500;color:var(--tinta3);font-size:10px}
.roi-val{font-size:13px;font-weight:700;text-align:right}
.bar-roi{height:10px;margin:0}
.bar-roi .bar-med{background:var(--p1)}

.roles{display:grid;gap:10px}
.role{background:var(--panel);border:1px solid var(--linea);border-radius:10px;padding:12px 14px;box-shadow:var(--sombra)}
.role-who{display:block;font-size:13px;font-weight:700;color:var(--marca-1);margin-bottom:4px}
.role-q{display:block;font-size:12px;color:var(--tinta2);margin-bottom:4px}
.role-p{display:block;font-size:11px;color:var(--tinta3)}
.ui-stat b.p1{color:var(--p1)}
</style></head><body>
${slides.map(render).join('\n')}
</body></html>`

writeFileSync(htmlRuta, html)

const nav = await chromium.launch()
try {
  const pag = await nav.newPage()
  await pag.goto(pathToFileURL(htmlRuta).href, { waitUntil: 'load' })
  await pag.pdf({
    path: salida,
    width: '1280px',
    height: '720px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  })
  console.log(`Deck PDF: ${salida} · ${slides.length} diapositivas · ${htmlRuta}`)
} finally {
  await nav.close()
}
