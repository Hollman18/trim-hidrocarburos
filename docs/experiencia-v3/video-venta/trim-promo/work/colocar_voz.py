"""Coloca las 9 frases de la voz (work/frases/fN.wav, de partir_frases.py) en su escena según
work/escenas.json, y escribe assets/voz/voz.wav con la duración total del video.
Luego transcribe cada frase suelta para tener tiempos por palabra fiables (work/voz-palabras.json).
Uso: colocar_voz.py <idioma es|en>
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

MODELO = '/Users/hollman/canal_documental/modelos/whisper/ggml-large-v3-turbo.bin'
SR = 48000
idioma = sys.argv[1]
esc = json.load(open('work/escenas.json'))
frases = json.load(open('work/frases/frases.json'))
out = np.zeros(int(esc['total'] * SR))
palabras = []
for fr, f in zip(esc['frames'], frases):
    _, seg = wavfile.read(f['archivo'])
    seg = seg.astype(float) / 32767
    t0 = fr['inicio'] + fr['voz'] - f['previo']          # el trozo trae un respiro antes de la primera sílaba
    i = int(t0 * SR)
    fin = t0 + len(seg) / SR
    tope = fr['inicio'] + fr['dura']
    print(f"{fr['id']}: habla {fr['inicio'] + fr['voz']:6.2f} → {fin:6.2f}  (frame termina {tope:6.2f})")
    assert fin <= tope + 0.05, f"la frase de {fr['id']} no cabe en su escena"
    out[i:i + len(seg)] += seg
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f['archivo'], '-ar', '16000', '-ac', '1', 'work/frases/t16.wav'], check=True)
    subprocess.run(['whisper-cli', '-m', MODELO, '-l', idioma, '-f', 'work/frases/t16.wav', '-ml', '1', '-sow', '-oj', '-of', 'work/frases/p'],
                   check=True, capture_output=True)
    for s in json.load(open('work/frases/p.json'))['transcription']:
        if s['text'].strip():
            s['offsets'] = {'from': s['offsets']['from'] + round(t0 * 1000), 'to': s['offsets']['to'] + round(t0 * 1000)}
            s['frame'] = fr['id']
            palabras.append(s)
for tmp in ('work/frases/t16.wav', 'work/frases/p.json'):
    os.remove(tmp)
wavfile.write('assets/voz/voz.wav', SR, (np.clip(out, -1, 1) * 32767).astype(np.int16))
json.dump({'transcription': palabras}, open('work/voz-palabras.json', 'w'), ensure_ascii=False)
print('ok assets/voz/voz.wav ·', len(palabras), 'palabras')
