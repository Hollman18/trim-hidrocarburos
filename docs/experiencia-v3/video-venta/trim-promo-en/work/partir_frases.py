"""Parte una toma de voz completa en sus 9 frases (los párrafos de work/guion.txt).
whisper da dónde termina cada párrafo; el corte va al punto más silencioso del hueco entre párrafos,
y el inicio/fin de habla de cada trozo se mide por energía (whisper corre los bordes).
Escribe work/frases/fN.wav (48 kHz) y work/frases/frases.json con la duración de habla de cada una.
Uso: partir_frases.py <toma.wav> <idioma es|en>
"""
import difflib
import json
import os
import re
import subprocess
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

MODELO = '/Users/hollman/canal_documental/modelos/whisper/ggml-large-v3-turbo.bin'
SR = 48000
toma, idioma = sys.argv[1], sys.argv[2]
os.makedirs('work/frases', exist_ok=True)

subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', toma, '-ar', '16000', '-ac', '1', 'work/frases/t16.wav'], check=True)
subprocess.run(['whisper-cli', '-m', MODELO, '-l', idioma, '-f', 'work/frases/t16.wav', '-ml', '1', '-sow', '-oj', '-of', 'work/frases/toma'],
               check=True, capture_output=True)
os.remove('work/frases/t16.wav')
w = [s for s in json.load(open('work/frases/toma.json'))['transcription'] if s['text'].strip()]

parrafos = [p.split() for p in open('work/guion.txt', encoding='utf-8').read().strip().split('\n\n')]
guion = [(k, x) for k, p in enumerate(parrafos) for x in p]
norm = lambda x: re.sub(r"[^a-z0-9áéíóúñü']", '', x.lower())
sm = difflib.SequenceMatcher(a=[norm(x) for _, x in guion], b=[norm(s['text']) for s in w], autojunk=False)
tiempo = {}
for op, a0, a1, b0, b1 in sm.get_opcodes():
    if op in ('equal', 'replace') and a1 - a0 == b1 - b0:
        for i in range(a1 - a0):
            tiempo[a0 + i] = (w[b0 + i]['offsets']['from'] / 1000, w[b0 + i]['offsets']['to'] / 1000)

sr, x = wavfile.read(toma)
x = x.astype(float) / 32767
if x.ndim > 1:
    x = x.mean(1)
x = resample_poly(x, SR, sr)
blq = int(0.01 * SR)
rms = np.array([np.sqrt(np.mean(x[i:i + blq] ** 2)) for i in range(0, len(x), blq)])  # cada 10 ms
habla = rms > 0.012

# último índice de palabra de cada párrafo con tiempo conocido
fin_par, ini_par = [], []
for k in range(len(parrafos)):
    idx = [i for i, (kk, _) in enumerate(guion) if kk == k and i in tiempo]
    ini_par.append(tiempo[idx[0]][0]); fin_par.append(tiempo[idx[-1]][1])
cortes = [0.0]
for k in range(len(parrafos) - 1):
    a, b = int(min(fin_par[k], ini_par[k + 1]) * 100) - 60, int(max(fin_par[k], ini_par[k + 1]) * 100) + 60
    a, b = max(a, 0), min(b, len(rms) - 1)
    # el centro del tramo silencioso más largo dentro del hueco
    mejor, largo, ini = None, 0, None
    for i in range(a, b + 1):
        if not habla[i]:
            ini = i if ini is None else ini
            if i - ini + 1 > largo:
                largo, mejor = i - ini + 1, (ini + i) / 2
        else:
            ini = None
    assert mejor is not None, f'sin silencio entre frases {k + 1} y {k + 2}'
    cortes.append(mejor / 100)
cortes.append(len(x) / SR)

frases = []
for k in range(len(parrafos)):
    a, b = cortes[k], cortes[k + 1]
    ia, ib = int(a * 100), int(b * 100)
    vivos = [i for i in range(ia, min(ib, len(habla))) if habla[i]]
    on, off = vivos[0] / 100, (vivos[-1] + 1) / 100
    seg = x[int(max(a, on - 0.12) * SR):int(min(b, off + 0.25) * SR)].copy()
    n = int(0.01 * SR); seg[:n] *= np.linspace(0, 1, n); seg[-n:] *= np.linspace(1, 0, n)
    wavfile.write(f'work/frases/f{k + 1}.wav', SR, (np.clip(seg, -1, 1) * 32767).astype(np.int16))
    frases.append({'frase': k + 1, 'previo': round(min(0.12, on - a), 3), 'habla': round(off - on, 2), 'archivo': f'work/frases/f{k + 1}.wav'})
    print(f'frase {k + 1}: habla {off - on:5.2f} s')
json.dump(frases, open('work/frases/frases.json', 'w'), indent=1)
