// Generates compositions/frames/01-noche.html, 03-senales.html, 09-cierre.html
import { writeFileSync } from "node:fs";
const OUT = "/Users/hollman/trim-hidrocarburos/docs/experiencia-v3/video-venta/trim-promo/compositions/frames/";
const f = (n) => n.toFixed(1);

const FONTS = `
        @font-face { font-family: "IBM Plex Sans"; src: url("assets/fonts/IBMPlexSans-SemiBold-Latin1.woff2") format("woff2"); font-weight: 600; font-style: normal; }
        @font-face { font-family: "IBM Plex Sans"; src: url("assets/fonts/IBMPlexSans-Bold-Latin1.woff2") format("woff2"); font-weight: 700; font-style: normal; }
        @font-face { font-family: "IBM Plex Mono"; src: url("assets/fonts/IBMPlexMono-Regular-Latin1.woff2") format("woff2"); font-weight: 400; font-style: normal; }
        @font-face { font-family: "IBM Plex Mono"; src: url("assets/fonts/IBMPlexMono-Medium-Latin1.woff2") format("woff2"); font-weight: 500; font-style: normal; }`;

const wrap = (id, dur, css, body, js) => `<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>${FONTS}
        #root { position: absolute; inset: 0; overflow: hidden; color: #f4f3f0; font-family: "IBM Plex Sans", sans-serif; }
${css}
      </style>
      <div id="root" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${dur}">
${body}
      </div>
      <script>
        (function () {
          window.__timelines = window.__timelines || {};
          const tl = gsap.timeline({ paused: true });
${js}
          window.__timelines["${id}"] = tl;
        })();
      </script>
    </template>
  </body>
</html>
`;

/* ------------------------------------------------------------------ */
/* Shared pump schematic (F1 + F9) — identical geometry, prefix only    */
/* ------------------------------------------------------------------ */
const CX = 960, CY = 530;
function blades() {
  return [0, 1, 2, 3, 4].map((i) => {
    const a = (i * 72 * Math.PI) / 180;
    const pts = [[0, -30], [30, -50], [46, -74], [32, -96]].map(([x, y]) => [
      CX + x * Math.cos(a) - y * Math.sin(a),
      CY + x * Math.sin(a) + y * Math.cos(a),
    ]);
    return `<path d="M${f(pts[0][0])} ${f(pts[0][1])} C${f(pts[1][0])} ${f(pts[1][1])} ${f(pts[2][0])} ${f(pts[2][1])} ${f(pts[3][0])} ${f(pts[3][1])}"/>`;
  }).join("");
}
const PIPES = [
  "M-40 770 H1240 V600 H1066",        // succión desde campo
  "M1020 372 V240 H1590 V300",         // descarga al tanque
  "M1700 620 H1960",                   // salida del tanque
];
const fins = Array.from({ length: 9 }, (_, i) => `<line x1="${410 + i * 30}" y1="454" x2="${410 + i * 30}" y2="606"/>`).join("");
const bracket = (x, y, dx, dy) => `<path d="M${x} ${y + dy * 30} V${y} H${x + dx * 30}"/>`;

function pumpCSS(p) {
  return `
        .${p}-ln { fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
        .${p}-ln .${p}-thin { stroke-width: 2; opacity: 0.45; }
        .${p}-pipe-wall { fill: none; stroke: #a9dad6; stroke-width: 18; stroke-linecap: round; stroke-linejoin: round; opacity: 0.75; }
        .${p}-pipe-core { fill: none; stroke: #101418; stroke-width: 13; stroke-linecap: round; stroke-linejoin: round; }
        .${p}-flow { fill: none; stroke: #a9dad6; stroke-width: 3.5; stroke-linecap: round; stroke-dasharray: 10 22; }
        #${p}-cam { position: absolute; inset: 0; transform-origin: 960px 530px; }
        #${p}-svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: visible; }
        #${p}-motor, #${p}-tanque, #${p}-tuberias { color: #a9dad6; }
        #${p}-bomba { color: #a9dad6; }
        #${p}-rodete { filter: drop-shadow(0 0 6px rgba(169, 218, 214, 0.45)); }
        #${p}-piloto { color: #a9dad6; filter: drop-shadow(0 0 12px currentColor); }
        #${p}-marcas { color: #c9cbcd; opacity: 0; }
        #${p}-rotulo { position: absolute; left: 1128px; top: 384px; padding: 6px 0 6px 16px; border-left: 4px solid #e0897c;
          font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 26px; letter-spacing: 0.12em; color: #e0897c;
          background: rgba(16, 20, 24, 0.85); white-space: nowrap; opacity: 0; }`;
}

function pumpSVG(p) {
  const pipes = PIPES.map((d) => `<path class="${p}-pipe-wall" d="${d}"/>`).join("") +
    PIPES.map((d) => `<path class="${p}-pipe-core" d="${d}"/>`).join("") +
    PIPES.map((d) => `<path class="${p}-flow" d="${d}"/>`).join("");
  return `
          <svg id="${p}-svg" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
            <g class="${p}-ln" style="color:#343b42"><line x1="140" y1="704" x2="1780" y2="704" stroke-dasharray="2 10"/></g>
            <g id="${p}-tuberias">${pipes}</g>
            <g id="${p}-tanque" class="${p}-ln">
              <path d="M1480 330 Q1480 300 1510 296 L1670 296 Q1700 300 1700 330 V680 H1480 Z"/>
              <line x1="1500" y1="680" x2="1500" y2="700"/><line x1="1680" y1="680" x2="1680" y2="700"/>
              <rect x="1482" y="470" width="216" height="208" fill="#a9dad6" fill-opacity="0.06" stroke="none"/>
              <path class="${p}-thin" d="M1490 470 H1690" stroke-dasharray="14 10"/>
              <line class="${p}-thin" x1="1720" y1="330" x2="1720" y2="660"/>
              <line class="${p}-thin" x1="1712" y1="470" x2="1728" y2="470"/>
            </g>
            <g id="${p}-valvula" class="${p}-ln" style="color:#a9dad6">
              <path d="M1278 220 L1300 240 L1278 260 Z M1322 220 L1300 240 L1322 260 Z" fill="#101418"/>
              <line x1="1300" y1="240" x2="1300" y2="206"/><line x1="1284" y1="206" x2="1316" y2="206"/>
            </g>
            <g class="${p}-ln" style="color:#a9dad6">
              <rect x="340" y="676" width="880" height="20" rx="6"/>
            </g>
            <g id="${p}-motor" class="${p}-ln">
              <rect x="370" y="430" width="320" height="200" rx="24"/>
              <g class="${p}-thin" style="opacity:0.6">${fins}</g>
              <rect x="690" y="472" width="36" height="116" rx="10"/>
              <rect x="470" y="400" width="90" height="30" rx="6"/>
              <line x1="420" y1="630" x2="420" y2="676"/><line x1="640" y1="630" x2="640" y2="676"/>
              <line x1="515" y1="400" x2="515" y2="372"/>
            </g>
            <g id="${p}-piloto" class="${p}-ln">
              <circle id="${p}-halo" cx="515" cy="352" r="16" style="opacity:0"/>
              <circle cx="515" cy="352" r="16" fill="currentColor" fill-opacity="0.3"/>
              <circle cx="515" cy="352" r="6" fill="currentColor" stroke="none"/>
            </g>
            <g id="${p}-bomba" class="${p}-ln">
              <line x1="726" y1="530" x2="752" y2="530"/><line x1="808" y1="530" x2="836" y2="530"/>
              <rect x="752" y="498" width="56" height="64" rx="8"/>
              <line class="${p}-thin" x1="770" y1="498" x2="770" y2="562"/><line class="${p}-thin" x1="790" y1="498" x2="790" y2="562"/>
              <circle cx="960" cy="530" r="125"/>
              <circle class="${p}-thin" cx="960" cy="530" r="104"/>
              <path d="M990 409 V372 M1050 443 V372"/>
              <line x1="978" y1="370" x2="1062" y2="370" style="stroke-width:5"/>
              <path d="M1066 586 V614" style="stroke-width:5"/>
              <line x1="912" y1="646" x2="912" y2="676"/><line x1="1008" y1="646" x2="1008" y2="676"/>
              <g id="${p}-rodete">
                <circle cx="960" cy="530" r="30"/>
                <circle cx="960" cy="530" r="9" fill="currentColor" stroke="none"/>
                ${blades()}
              </g>
            </g>
            <g id="${p}-marcas" class="${p}-ln">
              ${bracket(812, 384, 1, 1)}${bracket(1108, 384, -1, 1)}${bracket(812, 664, 1, -1)}${bracket(1108, 664, -1, -1)}
            </g>
          </svg>
          <div id="${p}-rotulo">P-201B · PARADA</div>`;
}

const GRID = `background-color: #101418; background-image: radial-gradient(circle, #343b42 1.6px, transparent 2px); background-size: 40px 40px; background-position: 20px 20px;`;
const VIGNETTE = `background: radial-gradient(ellipse 75% 70% at 50% 46%, rgba(16,20,24,0) 55%, rgba(5,7,9,0.7) 100%);`;

/* ============================== F1 ================================ */
{
  const p = "f01";
  const css = pumpCSS(p) + `
        #f01-fondo { position: absolute; inset: 0; ${GRID} }
        #f01-vineta { position: absolute; inset: 0; ${VIGNETTE} pointer-events: none; }
        #f01-reloj { position: absolute; left: 120px; top: 96px; padding: 4px 0 4px 20px; border-left: 4px solid #a9dad6; }
        #f01-reloj .f01-hora { position: absolute; left: 20px; top: 4px; font-family: "IBM Plex Mono", monospace; font-weight: 500;
          font-size: 56px; line-height: 64px; letter-spacing: 0.04em; color: #f4f3f0; white-space: nowrap; opacity: 0; }
        #f01-reloj .f01-hora span { color: #7f878e; }
        #f01-reloj-caja { width: 300px; height: 64px; }`;
  const horas = ["02:59:<span>57</span>", "02:59:<span>58</span>", "02:59:<span>59</span>", "03:00:<span>00</span>",
    "03:00:<span>01</span>", "03:00:<span>02</span>", "03:00:<span>03</span>"];
  const body = `
        <div id="f01-fondo" class="clip" data-start="0" data-duration="5.91" data-track-index="0"></div>
        <div id="f01-cam">${pumpSVG(p)}
        </div>
        <div id="f01-vineta"></div>
        <div id="f01-reloj"><div id="f01-reloj-caja"></div>
          ${horas.map((h, i) => `<div class="f01-hora" id="f01-h${i}">${h}</div>`).join("\n          ")}
        </div>`;
  const js = `
          const ORIG = "960 530";
          // Cámara: empuje lento hacia la bomba todo el frame
          tl.fromTo("#f01-cam", { scale: 1 }, { scale: 1.08, duration: 5.91, ease: "sine.inOut" }, 0);
          // Reloj 02:59:57 → 03:00:00 en 2.0, luego segundos normales
          const T = [0, 0.67, 1.33, 2.0, 3.0, 4.0, 5.0];
          T.forEach((t, i) => {
            if (i > 0) tl.set("#f01-h" + (i - 1), { opacity: 0 }, t);
            tl.set("#f01-h" + i, { opacity: 1 }, t);
          });
          tl.fromTo("#f01-reloj", { x: -16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0);
          // Rodete: 540°/s, luego desacelera y para (4.4 → 5.3)
          tl.fromTo("#f01-rodete", { rotation: 0, svgOrigin: ORIG }, { rotation: 2376, svgOrigin: ORIG, duration: 4.4, ease: "none" }, 0);
          tl.to("#f01-rodete", { rotation: 2619, svgOrigin: ORIG, duration: 0.9, ease: "power2.out" }, 4.4);
          // Flujo por las tuberías
          tl.fromTo(".f01-flow", { strokeDashoffset: 0 }, { strokeDashoffset: -484, duration: 4.4, ease: "none" }, 0);
          tl.to(".f01-flow", { strokeDashoffset: -533.5, duration: 0.9, ease: "power2.out" }, 4.4);
          tl.to(".f01-flow", { opacity: 0.35, duration: 0.6, ease: "power2.out" }, 4.8);
          // «Una bomba» (3.32): marcas de selección alrededor de la bomba
          tl.fromTo("#f01-marcas", { opacity: 0, scale: 1.18, svgOrigin: ORIG }, { opacity: 1, scale: 1, svgOrigin: ORIG, duration: 0.6, ease: "expo.out" }, 3.35);
          // «se detiene» (4.37): piloto a rojo + pulso, bomba a --frenado
          tl.to("#f01-piloto", { color: "#e0897c", duration: 0.35, ease: "power2.out" }, 4.45);
          tl.fromTo("#f01-halo", { opacity: 0.9, scale: 1, svgOrigin: "515 352" }, { opacity: 0, scale: 3, svgOrigin: "515 352", duration: 0.75, ease: "power2.out" }, 4.55);
          tl.to("#f01-bomba", { color: "#e0897c", duration: 0.8, ease: "power2.inOut" }, 4.5);
          tl.to("#f01-marcas", { color: "#e0897c", duration: 0.5, ease: "power2.out" }, 4.6);
          tl.to("#f01-rodete", { filter: "drop-shadow(0 0 0px rgba(224, 137, 124, 0))", duration: 0.8 }, 4.5);
          tl.fromTo("#f01-rotulo", { x: -14, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "power3.out" }, 5.0);
          // 5.3–5.91: el piloto late una vez más
          tl.fromTo("#f01-halo", { opacity: 0.9, scale: 1, svgOrigin: "515 352" }, { opacity: 0, scale: 3, svgOrigin: "515 352", duration: 0.55, ease: "power2.out", immediateRender: false }, 5.35);`;
  writeFileSync(OUT + "01-noche.html", wrap("f01", 5.91, css, body, js));
}

/* ============================== F9 ================================ */
{
  const p = "f09";
  const css = pumpCSS(p) + `
        #f09-fondo { position: absolute; inset: 0; ${GRID} }
        #f09-rejilla-clara { position: absolute; inset: 0; opacity: 0; background-image: radial-gradient(circle, #7f878e 1.6px, transparent 2px); background-size: 40px 40px; background-position: 20px 20px; }
        #f09-alba { position: absolute; inset: 0; opacity: 0; background: linear-gradient(to top, rgba(44, 115, 113, 0.55) 0%, rgba(44, 115, 113, 0.18) 38%, rgba(44, 115, 113, 0) 70%); }
        #f09-vineta { position: absolute; inset: 0; ${VIGNETTE} pointer-events: none; }
        #f09-texto { position: absolute; left: 0; right: 0; top: 0; height: 890px; }
        #f09-logo { position: absolute; left: 50%; top: 132px; width: 330px; height: 100px; margin-left: -165px; opacity: 0; }
        .f09-linea { position: absolute; left: 0; right: 0; text-align: center; font-weight: 700; font-size: 104px; line-height: 116px; letter-spacing: -0.02em; white-space: nowrap; }
        #f09-l1 { top: 312px; color: #f4f3f0; }
        #f09-l2 { top: 438px; color: #a9dad6; }
        .f09-pal { display: inline-block; opacity: 0; }
        #f09-cta { position: absolute; left: 50%; top: 636px; width: 760px; height: 92px; margin-left: -380px; border: 2px solid #a9dad6; border-radius: 16px;
          overflow: hidden; opacity: 0; background: rgba(16, 20, 24, 0.6); }
        #f09-cta-txt { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: "IBM Plex Mono", monospace;
          font-weight: 500; font-size: 30px; letter-spacing: 0.12em; color: #a9dad6; white-space: nowrap; }
        #f09-brillo { position: absolute; top: -20px; left: 0; width: 160px; height: 132px; background: linear-gradient(90deg, rgba(169,218,214,0) 0%, rgba(169,218,214,0.28) 50%, rgba(169,218,214,0) 100%); }
        #f09-negro { position: absolute; inset: 0; background: #000; opacity: 0; }
        /* estado inicial = estado final de F1 */
        #f09-bomba { color: #e0897c; }
        #f09-piloto { color: #e0897c; }
        #f09-marcas { opacity: 1; color: #e0897c; }
        #f09-rotulo { opacity: 1; }
        #f09-rodete { filter: drop-shadow(0 0 0px rgba(224, 137, 124, 0)); }
        .f09-flow { stroke-dashoffset: -533.5; opacity: 0.35; }`;
  const palabras = (txt) => txt.split(" ").map((w) => `<span class="f09-pal">${w}</span>`).join(" ");
  const body = `
        <div id="f09-fondo" class="clip" data-start="0" data-duration="7.41" data-track-index="0">
          <div id="f09-rejilla-clara"></div>
          <div id="f09-alba"></div>
        </div>
        <div id="f09-cam">${pumpSVG(p)}
        </div>
        <div id="f09-vineta"></div>
        <div id="f09-texto">
          <img id="f09-logo" src="assets/brand/logo_trim_light.png" alt="TRIM" />
          <div class="f09-linea" id="f09-l1">${palabras("Anticipe la falla.")}</div>
          <div class="f09-linea" id="f09-l2">${palabras("Produzca más.")}</div>
          <div id="f09-cta"><div id="f09-brillo"></div><div id="f09-cta-txt">AGENDE UN PILOTO · GOTRIM.AI</div></div>
        </div>
        <div id="f09-negro"></div>`;
  const js = `
          const ORIG = "960 530";
          // Amanece: degradé petróleo desde abajo + rejilla un poco más clara
          tl.fromTo("#f09-alba", { opacity: 0 }, { opacity: 1, duration: 3.2, ease: "sine.inOut" }, 0);
          tl.fromTo("#f09-rejilla-clara", { opacity: 0 }, { opacity: 0.35, duration: 3.2, ease: "sine.inOut" }, 0);
          // Rodete arranca (desde el ángulo final de F1) y acelera hasta 540°/s en 1.2 s, luego constante
          tl.fromTo("#f09-rodete", { rotation: 2619, svgOrigin: ORIG }, { rotation: 2943, svgOrigin: ORIG, duration: 1.2, ease: "power2.in" }, 0);
          tl.to("#f09-rodete", { rotation: 2943 + 6.21 * 540, svgOrigin: ORIG, duration: 6.21, ease: "none" }, 1.2);
          tl.to("#f09-rodete", { filter: "drop-shadow(0 0 6px rgba(169, 218, 214, 0.45))", duration: 1.0 }, 0.3);
          // Flujo vuelve a avanzar
          tl.fromTo(".f09-flow", { strokeDashoffset: -533.5, opacity: 0.35 }, { strokeDashoffset: -533.5 - 66, opacity: 1, duration: 1.2, ease: "power2.in" }, 0);
          tl.to(".f09-flow", { strokeDashoffset: -533.5 - 66 - 6.21 * 110, duration: 6.21, ease: "none" }, 1.2);
          // Bomba vuelve a petróleo claro; piloto pasa a --bien (resultado)
          tl.fromTo("#f09-bomba", { color: "#e0897c" }, { color: "#a9dad6", duration: 0.8, ease: "power2.inOut" }, 0.25);
          tl.fromTo("#f09-marcas", { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "power2.out" }, 0.3);
          tl.fromTo("#f09-rotulo", { opacity: 1 }, { opacity: 0, duration: 0.35, ease: "power2.out" }, 0.2);
          tl.fromTo("#f09-piloto", { color: "#e0897c" }, { color: "#8fbf95", duration: 0.35, ease: "power2.out" }, 0.55);
          tl.fromTo("#f09-halo", { opacity: 0.9, scale: 1, svgOrigin: "515 352" }, { opacity: 0, scale: 3.2, svgOrigin: "515 352", duration: 0.8, ease: "power2.out" }, 0.6);
          // 0.95–1.55: la cámara se aleja y el esquema baja a 25 % ANTES de que entre el texto
          tl.fromTo("#f09-cam", { scale: 1.08, opacity: 1 }, { scale: 0.86, opacity: 0.25, duration: 0.6, ease: "power2.inOut" }, 0.95);
          tl.to("#f09-cam", { scale: 0.82, duration: 5.86, ease: "none" }, 1.55);
          // «TRIM» → logo arriba
          tl.fromTo("#f09-logo", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out" }, 1.05);
          // «Anticipe la falla.» 1.5–2.7 (el esquema ya está al 25 %)
          tl.fromTo("#f09-l1 .f09-pal", { y: 46, opacity: 0, filter: "blur(8px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.7, ease: "expo.out", stagger: 0.25 }, 1.5);
          // «Produzca más.» 3.3–4.1
          tl.fromTo("#f09-l2 .f09-pal", { y: 46, opacity: 0, filter: "blur(8px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.7, ease: "expo.out", stagger: 0.3 }, 3.3);
          tl.fromTo("#f09-l2", { textShadow: "0 0 0px rgba(169,218,214,0)" }, { textShadow: "0 0 28px rgba(169,218,214,0.45)", duration: 0.8, ease: "power2.out" }, 3.6);
          // 4.6: CTA
          tl.fromTo("#f09-cta", { y: 24, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "expo.out" }, 4.6);
          tl.fromTo("#f09-brillo", { x: -200 }, { x: 800, duration: 1.1, ease: "power2.inOut" }, 5.0);
          tl.fromTo("#f09-cta", { boxShadow: "0 0 0px rgba(169,218,214,0)" }, { boxShadow: "0 0 36px rgba(169,218,214,0.35)", duration: 0.9, ease: "power2.out", immediateRender: false }, 5.1);
          // 6.6–7.41: funde a negro
          tl.fromTo("#f09-negro", { opacity: 0 }, { opacity: 1, duration: 0.75, ease: "power2.in" }, 6.6);`;
  writeFileSync(OUT + "09-cierre.html", wrap("f09", 7.41, css, body, js));
}

/* ============================== F3 ================================ */
{
  // Panel geometry: native 1040x520; big = scale 1.385 at (960,480); slot = scale 0.519
  const SLOTS = [390, 960, 1530], SCY = 480, BIG = 1.385, SMALL = 0.519;
  const card = (title, inner, extra = "") => `
            <svg viewBox="0 0 1040 520" width="1040" height="520" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
              <rect class="f03-card" x="1" y="1" width="1038" height="518" rx="24"/>
              <text class="f03-cab" x="52" y="78">${title}</text>${extra}
              ${inner}
            </svg>`;
  // A · Energía
  const A = card("ENERGÍA", `
              <g class="f03-ln" style="color:#a9dad6">
                <line x1="72" y1="250" x2="72" y2="350"/><line x1="56" y1="262" x2="88" y2="262"/>
                <line x1="72" y1="300" x2="200" y2="300"/>
                <rect x="200" y="270" width="60" height="60" rx="8"/><line x1="212" y1="318" x2="248" y2="282"/>
                <line x1="260" y1="300" x2="330" y2="300"/>
                <circle cx="380" cy="300" r="50"/><circle cx="446" cy="300" r="50"/>
              </g>
              <g id="f03-a-linea">
                <g class="f03-ln" style="color:#a9dad6"><line x1="496" y1="300" x2="880" y2="300"/>
                  <path d="M880 360 V258 L924 230 L968 258 V360 Z"/><line x1="868" y1="360" x2="980" y2="360"/></g>
                <path class="f03-flujo" d="M500 300 H872"/>
                <text class="f03-mono" x="560" y="262" fill="#a9dad6">13,8 kV</text>
              </g>
              <path class="f03-flujo" d="M76 300 H196"/>
              <g id="f03-a-corte" style="opacity:0">
                <rect x="560" y="378" width="6" height="52" fill="#d9bd6a"/>
                <text class="f03-sans" x="584" y="418" fill="#d9bd6a">corte de energía</text>
              </g>`);
  // B · Variador — waves generated in script (deterministic math)
  const B = card("VARIADOR", `
              <defs><clipPath id="f03-b-clip"><rect x="40" y="110" width="960" height="380"/></clipPath></defs>
              <line class="f03-ln" x1="48" y1="300" x2="992" y2="300" style="color:#343b42; stroke-width:2" stroke-dasharray="4 10"/>
              <g clip-path="url(#f03-b-clip)">
                <g id="f03-b-ondas">
                  <path id="f03-b-t" class="f03-ln" style="color:#7f878e"/>
                  <path id="f03-b-s" class="f03-ln" style="color:#c9cbcd"/>
                  <path id="f03-b-r" class="f03-ln" style="color:#a9dad6"/>
                </g>
              </g>
              <g id="f03-b-rot" style="opacity:0">
                <text class="f03-mono" x="988" y="470" text-anchor="end" fill="#d9bd6a">DESBALANCE</text>
              </g>`);
  // C · Motor
  const pts = [];
  for (let x = 90; x <= 700; x += 10) {
    const u = (x - 90) / 610;
    pts.push([x, 392 - 222 * Math.pow(u, 1.25) + 5 * Math.sin(x / 21) * (0.4 + u)]);
  }
  let LC = 0;
  for (let i = 1; i < pts.length; i++) LC += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const dC = "M" + pts.map(([x, y]) => `${x} ${f(y)}`).join(" L");
  const C = card("MOTOR", `
              <g class="f03-ln" style="color:#7f878e; opacity:0.6"><line x1="90" y1="120" x2="90" y2="448"/><line x1="90" y1="448" x2="980" y2="448"/></g>
              <path id="f03-c-caudal" class="f03-ln" d="M90 330 H700" style="color:#c9cbcd; stroke-dasharray:610 610"/>
              <path id="f03-c-corr" class="f03-ln" d="${dC}" style="color:#d9bd6a; stroke-dasharray:${f(LC + 2)} ${f(LC + 2)}"/>
              <circle id="f03-c-punto" cx="90" cy="392" r="9" fill="#d9bd6a" style="filter: drop-shadow(0 0 10px #d9bd6a); opacity:0"/>
              <g id="f03-c-rot1" style="opacity:0"><text class="f03-mono" x="720" y="342" fill="#c9cbcd">CAUDAL =</text></g>
              <g id="f03-c-rot2" style="opacity:0"><text class="f03-mono" x="720" y="${f(pts[pts.length - 1][1] + 12)}" fill="#d9bd6a">CORRIENTE</text>
                <path class="f03-ln" style="color:#d9bd6a" d="M972 ${f(pts[pts.length - 1][1] + 16)} V${f(pts[pts.length - 1][1] - 18)} M960 ${f(pts[pts.length - 1][1] - 6)} L972 ${f(pts[pts.length - 1][1] - 18)} L984 ${f(pts[pts.length - 1][1] - 6)}"/></g>`);
  const css = `
        #f03-fondo { position: absolute; inset: 0; ${GRID} }
        #f03-cam { position: absolute; inset: 0; transform-origin: 960px 480px; }
        .f03-panel { position: absolute; top: ${SCY - 260}px; width: 1040px; height: 520px; transform-origin: 520px 260px; opacity: 0; --f03-sw: 3.5; }
        #f03-pa { left: ${SLOTS[0] - 520}px; } #f03-pb { left: ${SLOTS[1] - 520}px; } #f03-pc { left: ${SLOTS[2] - 520}px; }
        .f03-card { fill: #1d2125; stroke: #343b42; stroke-width: 2; }
        .f03-ln { fill: none; stroke: currentColor; stroke-width: calc(var(--f03-sw) * 1px); stroke-linecap: round; stroke-linejoin: round; }
        .f03-flujo { fill: none; stroke: #a9dad6; stroke-width: calc(var(--f03-sw) * 1px + 1px); stroke-linecap: round; stroke-dasharray: 10 22; }
        .f03-cab { font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 36px; letter-spacing: 0.12em; fill: #7f878e; }
        .f03-mono { font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 34px; letter-spacing: 0.12em; }
        .f03-sans { font-family: "IBM Plex Sans", sans-serif; font-weight: 600; font-size: 42px; letter-spacing: -0.01em; }
        #f03-titulo { position: absolute; left: 0; right: 0; top: 168px; text-align: center; font-weight: 600; font-size: 64px; line-height: 76px;
          letter-spacing: -0.02em; color: #f4f3f0; white-space: nowrap; opacity: 0; }
        .f03-senal { position: absolute; top: ${SCY - 135 + 40 - 14}px; width: 28px; height: 28px; }
        .f03-senal i { position: absolute; inset: 0; border-radius: 50%; }
        .f03-dot { background: #a9dad6; box-shadow: 0 0 14px #a9dad6; transform: scale(0); }
        .f03-anillo { border: 3px solid #a9dad6; opacity: 0; }
        #f03-negro { position: absolute; inset: 0; background: #000; opacity: 0; }`;
  const senal = (i) => `<div class="f03-senal" id="f03-s${i}" style="left:${SLOTS[i] + 270 - 40 - 14}px"><i class="f03-anillo" id="f03-s${i}-a1"></i><i class="f03-anillo" id="f03-s${i}-a2"></i><i class="f03-dot" id="f03-s${i}-d"></i></div>`;
  const body = `
        <div id="f03-fondo" class="clip" data-start="0" data-duration="10.02" data-track-index="0"></div>
        <div id="f03-cam">
          <div class="f03-panel" id="f03-pa">${A}
          </div>
          <div class="f03-panel" id="f03-pb">${B}
          </div>
          <div class="f03-panel" id="f03-pc">${C}
          </div>
          ${senal(0)}
          ${senal(1)}
          ${senal(2)}
          <div id="f03-titulo">Las señales estaban ahí.</div>
        </div>
        <div id="f03-negro"></div>`;
  const js = `
          const SLOTS = ${JSON.stringify(SLOTS)}, BIG = ${BIG}, SMALL = ${SMALL};
          const ids = ["#f03-pa", "#f03-pb", "#f03-pc"];
          const bx = (i) => 960 - SLOTS[i], by = 0;
          // Ondas R S T (puras, deterministas)
          function onda(amp, fase) {
            let d = "";
            for (let x = 40; x <= 2900; x += 6) {
              const y = 300 + amp * Math.sin(((x - 40) / 280) * Math.PI * 2 + fase);
              d += (x === 40 ? "M" : " L") + x + " " + y.toFixed(1);
            }
            return d;
          }
          const ondaR = document.querySelector("#f03-b-r");
          document.querySelector("#f03-b-s").setAttribute("d", onda(80, (2 * Math.PI) / 3));
          document.querySelector("#f03-b-t").setAttribute("d", onda(80, (4 * Math.PI) / 3));
          const R = { amp: 80, fase: 0 };
          const pintaR = () => ondaR.setAttribute("d", onda(R.amp, R.fase));
          pintaR();
          // Puntos de la corriente para el punto de cabeza
          const CP = ${JSON.stringify(pts.map(([x, y]) => [x, +y.toFixed(1)]))};
          const punto = document.querySelector("#f03-c-punto");
          const C = { p: 0 };
          const pintaC = () => {
            const k = Math.min(CP.length - 1, C.p * (CP.length - 1));
            const i = Math.floor(k), t = k - i, j = Math.min(CP.length - 1, i + 1);
            punto.setAttribute("cx", (CP[i][0] + (CP[j][0] - CP[i][0]) * t).toFixed(1));
            punto.setAttribute("cy", (CP[i][1] + (CP[j][1] - CP[i][1]) * t).toFixed(1));
          };

          // Cámara: empuje lento todo el frame
          tl.fromTo("#f03-cam", { scale: 1 }, { scale: 1.04, duration: 10.02, ease: "sine.inOut" }, 0);
          // Flujo eléctrico + ondas corriendo hacia la izquierda todo el frame
          tl.fromTo("#f03-pa .f03-flujo", { strokeDashoffset: 0 }, { strokeDashoffset: -1200, duration: 10.02, ease: "none" }, 0);
          tl.fromTo("#f03-b-ondas", { x: 0 }, { x: -280 * 6, duration: 10.02, ease: "none" }, 0);

          // ---- A · Energía (0.1–1.2)
          tl.fromTo(ids[0], { x: bx(0), y: by, scale: BIG * 1.06, opacity: 0 }, { x: bx(0), y: by, scale: BIG, opacity: 1, duration: 0.45, ease: "power3.out" }, 0.05);
          // 0.5: la línea parpadea 3 veces y queda apagada un instante
          [[0.5, 0.12], [0.56, 1], [0.62, 0.12], [0.68, 1], [0.74, 0.12], [0.8, 1], [0.86, 0.1]].forEach(([t, o]) => tl.set("#f03-a-linea", { opacity: o }, t));
          tl.set("#f03-pa .f03-flujo", { opacity: 0 }, 0.86);
          tl.fromTo("#f03-a-corte", { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, 0.6);
          tl.to("#f03-a-linea", { opacity: 0.45, duration: 0.25, ease: "power2.out" }, 1.05);

          // ---- B · Variador (1.2–3.5)
          tl.to(ids[0], { scale: BIG * 0.9, opacity: 0, duration: 0.45, ease: "power2.in" }, 1.2);
          tl.fromTo(ids[1], { x: bx(1), y: by, scale: BIG * 1.08, opacity: 0 }, { x: bx(1), y: by, scale: BIG, opacity: 1, duration: 0.55, ease: "expo.out" }, 1.25);
          tl.to(R, { amp: 132, fase: 0.95, duration: 1.4, ease: "sine.inOut", onUpdate: pintaR }, 1.8);
          tl.to("#f03-b-r", { color: "#d9bd6a", duration: 0.8, ease: "power2.out" }, 2.1);
          tl.fromTo("#f03-b-rot", { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }, 2.4);

          // ---- C · Motor (3.5–6.9)
          tl.to(ids[1], { scale: BIG * 0.9, opacity: 0, duration: 0.45, ease: "power2.in" }, 3.5);
          tl.fromTo(ids[2], { x: bx(2), y: by, scale: BIG * 1.08, opacity: 0 }, { x: bx(2), y: by, scale: BIG, opacity: 1, duration: 0.55, ease: "expo.out" }, 3.55);
          tl.fromTo("#f03-c-caudal", { strokeDashoffset: 610 }, { strokeDashoffset: 0, duration: 1.0, ease: "power2.inOut" }, 3.75);
          tl.fromTo("#f03-c-rot1", { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }, 4.6);
          tl.fromTo("#f03-c-corr", { strokeDashoffset: ${f(LC + 2)} }, { strokeDashoffset: 0, duration: 2.75, ease: "none" }, 3.85);
          tl.fromTo("#f03-c-punto", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 3.85);
          tl.fromTo(C, { p: 0 }, { p: 1, duration: 2.75, ease: "none", onUpdate: pintaC }, 3.85);
          tl.fromTo("#f03-c-rot2", { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }, 6.45);

          // ---- 7.0–7.8: los tres se reducen a una fila de tres tarjetas
          ids.forEach((id, i) => {
            tl.to(id, { x: 0, y: 0, scale: SMALL, opacity: 1, "--f03-sw": 5.5, duration: 0.8, ease: "power3.inOut" }, 7.0 + (i === 2 ? 0 : 0.06 * (i + 1)));
          });
          tl.to("#f03-a-linea", { opacity: 1, duration: 0.4 }, 7.0);
          tl.set("#f03-pa .f03-flujo", { opacity: 1 }, 7.0);

          // ---- 7.8–9.3: «Las señales estaban ahí.»
          tl.fromTo("#f03-titulo", { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out" }, 7.8);
          [7.9, 8.3, 8.7].forEach((t, i) => {
            tl.fromTo("#f03-s" + i + "-d", { scale: 0 }, { scale: 1, duration: 0.35, ease: "back.out(2.5)" }, t);
            tl.to(ids[i] + " .f03-card", { stroke: "#a9dad6", duration: 0.4, ease: "power2.out" }, t);
            for (let k = 0; t + k * 0.5 < 9.4; k++) {
              tl.fromTo("#f03-s" + i + "-a" + ((k % 2) + 1), { scale: 1, opacity: 0.9 }, { scale: 3, opacity: 0, duration: 0.9, ease: "power2.out", immediateRender: false }, t + k * 0.5);
            }
          });

          // ---- 9.4–10.02: funde a negro puro
          tl.fromTo("#f03-negro", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.in" }, 9.4);`;
  writeFileSync(OUT + "03-senales.html", wrap("f03", 10.02, css, body, js));
}
console.log("ok");
