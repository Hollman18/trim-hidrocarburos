"""Tiempos por palabra de la voz en inglés: whisper sobre CADA frase suelta (en la pista completa, con
silencios largos, whisper corre las primeras palabras de cada frase hacia atrás) y se suman los inicios.
Escribe work/voz-palabras.json con el mismo formato que whisper-cli.
Uso: palabras_por_frase.py
"""
import json
import subprocess

MODELO = '/Users/hollman/canal_documental/modelos/whisper/ggml-large-v3-turbo.bin'
inicios = json.load(open('work/frases/inicios.json'))
todas = []
for k, ini in enumerate(inicios, 1):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'work/frases/f{k}.wav', '-ar', '16000', '-ac', '1', 'work/frases/t16.wav'], check=True)
    subprocess.run(['whisper-cli', '-m', MODELO, '-l', 'en', '-f', 'work/frases/t16.wav', '-ml', '1', '-sow', '-oj', '-of', f'work/frases/f{k}'],
                   check=True, capture_output=True)
    for s in json.load(open(f'work/frases/f{k}.json'))['transcription']:
        if s['text'].strip():
            s['offsets'] = {'from': s['offsets']['from'] + round(ini * 1000), 'to': s['offsets']['to'] + round(ini * 1000)}
            todas.append(s)
json.dump({'transcription': todas}, open('work/voz-palabras.json', 'w'), ensure_ascii=False)
print('ok', len(todas), 'palabras')
