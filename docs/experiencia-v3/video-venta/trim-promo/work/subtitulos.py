"""Genera compositions/subtitulos.html: subtítulos palabra por palabra.
El TEXTO sale del guion (work/guion.txt), nunca de lo que oyó whisper; whisper solo da los TIEMPOS
(work/voz-palabras.json, transcrito frase por frase).
Uso: subtitulos.py
"""
import difflib
import html
import json
import re

VOZ_INICIO = 0.0      # la voz ya viene colocada en sus escenas (work/colocar_voz.py)
MAX_PALABRAS = 9      # una línea, legible de un vistazo
COLA = 0.35           # el grupo se queda en pantalla tras su última palabra

tiempos = [s for s in json.load(open('work/voz-palabras.json'))['transcription'] if s['text'].strip()]
palabras = open('work/guion.txt', encoding='utf-8').read().split()

# Whisper a veces parte o inventa palabras («3» por «tres», palabras repetidas al final): se alinea
# su lista con la del guion y cada palabra del guion toma el tiempo de su pareja.
norm = lambda x: re.sub(r"[^a-z0-9áéíóúñü']", '', x.lower())
sm = difflib.SequenceMatcher(a=[norm(p) for p in palabras], b=[norm(t['text']) for t in tiempos], autojunk=False)
pareja = {}
for op, a0, a1, b0, b1 in sm.get_opcodes():
    if op in ('equal', 'replace') and a1 - a0 == b1 - b0:
        for k in range(a1 - a0):
            pareja[a0 + k] = tiempos[b0 + k]
assert len(pareja) == len(palabras), f'{len(palabras) - len(pareja)} palabras del guion sin tiempo'
items = [(p, pareja[i]['offsets']['from'] / 1000 + VOZ_INICIO, pareja[i]['offsets']['to'] / 1000 + VOZ_INICIO)
         for i, p in enumerate(palabras)]

# Grupos: se corta en fin de frase o coma, o al llegar al máximo de palabras; nunca se deja
# una palabra de enlace («el», «para», «que»…) colgando al final de la línea.
ENLACE = {'el', 'la', 'los', 'las', 'de', 'del', 'para', 'o', 'y', 'a', 'que', 'se', 'va', 'un', 'una', 'en', 'le', 'su', 'sus', 'lo'}
grupos, actual = [], []
for it in items:
    if it[0].lower() in ('y', 'para') and len(actual) >= 4:   # «y quién…», «para mover…» empiezan línea
        grupos.append(actual); actual = []
    actual.append(it)
    fin_frase = it[0][-1] in '.:?!'
    coma = it[0][-1] == ',' and len(actual) >= 3
    if fin_frase or coma:
        grupos.append(actual); actual = []
    elif len(actual) >= MAX_PALABRAS:
        k = len(actual)
        while k > 3 and actual[k - 1][0].lower() in ENLACE:
            k -= 1
        grupos.append(actual[:k]); actual = actual[k:]
if actual:
    grupos.append(actual)

marcas, js = [], []
for gi, g in enumerate(grupos):
    ini = g[0][1]
    fin = g[-1][2] + COLA
    if gi + 1 < len(grupos):
        fin = min(fin, grupos[gi + 1][0][1] - 0.02)
    spans = ''.join(f'<span class="p" id="sub-g{gi}-p{pi}">{html.escape(p)}</span> ' for pi, (p, _, _) in enumerate(g))
    marcas.append(f'        <div class="grupo" id="sub-g{gi}">{spans.strip()}</div>')
    js.append(f'      tl.set("#sub-g{gi}", {{ opacity: 1 }}, {ini:.3f});')
    for pi, (_, a, _) in enumerate(g):
        js.append(f'      tl.fromTo("#sub-g{gi}-p{pi}", {{ opacity: 0.18, y: 6 }}, {{ opacity: 1, y: 0, duration: 0.14, ease: "power2.out" }}, {max(a, ini):.3f});')
    js.append(f'      tl.to("#sub-g{gi}", {{ opacity: 0, duration: 0.12 }}, {fin - 0.12:.3f});')

doc = f'''<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
        @font-face {{ font-family: "IBM Plex Sans"; src: url("assets/fonts/IBMPlexSans-Medium-Latin1.woff2") format("woff2"); font-weight: 500; }}
        #root {{ position: absolute; inset: 0; pointer-events: none; }}
        #sub-banda {{ position: absolute; left: 0; right: 0; bottom: 64px; display: flex; justify-content: center; }}
        .grupo {{
          position: absolute; bottom: 0; opacity: 0; white-space: nowrap;
          font-family: "IBM Plex Sans", sans-serif; font-weight: 500; font-size: 46px; line-height: 1.2;
          color: #f4f3f0; letter-spacing: -0.005em;
          background: rgba(16, 20, 24, 0.74); border: 1px solid rgba(169, 218, 214, 0.16);
          padding: 12px 30px 14px; border-radius: 16px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
        }}
        .p {{ display: inline-block; }}
      </style>
      <div id="root" data-composition-id="subtitulos" data-width="1920" data-height="1080">
        <div id="sub-banda">
{chr(10).join(marcas)}
        </div>
      </div>
      <script>
      const tl = gsap.timeline({{ paused: true }});
{chr(10).join(js)}
      window.__timelines["subtitulos"] = tl;
      </script>
    </template>
  </body>
</html>
'''
open('compositions/subtitulos.html', 'w', encoding='utf-8').write(doc)
print('ok', len(grupos), 'grupos')
for g in grupos:
    print(f'{g[0][1]:6.2f}  ' + ' '.join(p for p, _, _ in g))
