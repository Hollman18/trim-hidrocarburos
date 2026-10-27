#!/bin/zsh
# M4 · Renderiza todas las imágenes de la v3 con un solo navegador (scripts/lote.mjs).
# Abre los HTML por file://: no levanta servidores. Uso: zsh renderizar-todo.sh
set -e
cd "${0:A:h}/../.."   # → docs/experiencia-v3/imagenes
python3 - <<'PY'
import json
N={'d1':'grafito','d2':'consola-blanca','d3':'sala'}
J=[]
def t(html,png,w,h,q,completa=False):
    J.append(dict(html=f'fuente/{html}.html',png=png,ancho=w,alto=h,query=q,completa=completa,revision=f'fuente/datos/revision/{png[:-4]}.json'))
for d,nom in N.items():
    for rol in ['ger','sup','oper','jefe']:
        t(rol,f'{d}-{nom}-{rol}-escritorio-claro.png',1440,900,f'dir={d}&tema=claro&vista=escritorio')
        t(rol,f'{d}-{nom}-{rol}-telefono-claro.png',390,844,f'dir={d}&tema=claro&vista=telefono')
    t('p201b',f'{d}-{nom}-p201b-escritorio-claro.png',1440,900,f'dir={d}&tema=claro&vista=escritorio')
    t('ger',f'{d}-{nom}-ger-escritorio-noche.png',1440,900,f'dir={d}&tema=noche&vista=escritorio')
# La dirección recomendada (Grafito): prod, reg, el gerente con «Antes · Durante · Después» y el nivel 3 de noche.
for rol in ['prod','reg']:
    t(rol,f'd1-grafito-{rol}-escritorio-claro.png',1440,900,'dir=d1&tema=claro&vista=escritorio')
    t(rol,f'd1-grafito-{rol}-telefono-claro.png',390,844,'dir=d1&tema=claro&vista=telefono')
t('ger','d1-grafito-ger-momentos-escritorio-claro.png',1440,900,'dir=d1&tema=claro&vista=escritorio&momentos=1')
t('ger','d1-grafito-ger-momentos-telefono-claro.png',390,844,'dir=d1&tema=claro&vista=telefono&momentos=1')
t('p201b','d1-grafito-p201b-escritorio-noche.png',1440,900,'dir=d1&tema=noche&vista=escritorio')
t('kit','lamina-kit-scada.png',1600,900,'tema=claro',True)
t('comparacion','lamina-tres-direcciones.png',1800,900,'',True)
json.dump(J,open('fuente/datos/trabajos.json','w'),indent=1)
PY
mkdir -p fuente/datos/revision
node fuente/scripts/lote.mjs fuente/datos/trabajos.json > fuente/datos/revision/resumen.json
python3 -c "
import json
for r in json.load(open('fuente/datos/revision/resumen.json')):
    malo = r['errores'] or r['chicos'] or r['pisan'] or r['c32'] > 1 or (r['c20'] > 4 and 'lamina' not in r['png'])
    print(('REVISAR ' if malo else 'ok      ') + r['png'], r['pisan'][:2] if r['pisan'] else '', 'c32', r['c32'], 'c20', r['c20'])"
