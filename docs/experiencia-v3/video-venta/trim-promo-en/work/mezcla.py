"""Mezcla final en PCM: voz + música (agachada bajo la voz) + efectos, en UNA pista.
Se codifica una sola vez al renderizar (nunca pegar trozos ya codificados en AAC).
Uso: mezcla.py <salida.wav>
"""
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly


def media_movil(x, n):
    """Media móvil centrada con suma acumulada (np.convolve con ventanas largas tarda minutos)."""
    c = np.concatenate([[0.0], np.cumsum(x)])
    i = np.arange(len(x))
    lo = np.clip(i - n // 2, 0, len(x)); hi = np.clip(i + n - n // 2, 0, len(x))
    return (c[hi] - c[lo]) / np.maximum(hi - lo, 1)

SR = 48000
DUR = 72.14  # = work/escenas.json «total»
N = int(DUR * SR)
VOZ_INICIO = 0.0  # la voz ya viene colocada en sus escenas (work/colocar_voz.py)


def leer(ruta):
    sr, x = wavfile.read(ruta)
    x = x.astype(float) / 32767
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    if sr != SR:
        x = resample_poly(x, SR, sr, axis=0)
    out = np.zeros((N, 2))
    out[: min(N, len(x))] = x[:N]
    return out


voz_cruda = leer('assets/voz/voz.wav')
voz = np.zeros((N, 2))
i0 = int(VOZ_INICIO * SR)
voz[i0:] = voz_cruda[: N - i0]
musica = leer('assets/musica/musica.wav')
sfx = leer('assets/sfx/sfx.wav')

# Envolvente de la voz (ataque 30 ms, caída 350 ms) para agachar la música mientras habla.
v = np.abs(voz[:, 0])
blq = 480  # 10 ms
rms = np.sqrt(media_movil(v ** 2, blq))
habla = (rms > 0.01).astype(float)
env = np.zeros(N)
a = 1 - np.exp(-1 / (0.03 * SR)); r = 1 - np.exp(-1 / (0.35 * SR))
e = 0.0
paso = 48  # recorrer cada 1 ms y luego interpolar: suficiente y rápido
for k in range(0, N, paso):
    objetivo = habla[k]
    coef = 1 - (1 - (a if objetivo > e else r)) ** paso
    e += (objetivo - e) * coef
    env[k:k + paso] = e

# Nivel base de la música por tramo (la tensión pesa más; bajo la voz del producto, discreta).
t = np.arange(N) / SR
base = np.where(t < 22.36, 0.55, np.where(t < 64.73, 0.31, 0.12))
base = np.where(t >= 69.4, 0.5, base)  # la voz terminó: el acorde final sube
transicion = media_movil(base, SR // 5)  # sin escalones
g_musica = transicion * (1 - 0.5 * env)

# La voz se lleva a un nivel fijo mientras habla (−19 dBFS RMS): así las dos tomas (ES/EN) quedan
# igual de presentes frente a la música, aunque Gemini entregue una más baja que otra.
nivel = np.sqrt(np.mean(voz[habla > 0, 0] ** 2))
voz = voz * (10 ** (-19 / 20) / nivel)
mezcla = voz + musica * g_musica[:, None] + sfx * 0.42
mezcla = mezcla / (np.max(np.abs(mezcla)) + 1e-9) * 0.9
wavfile.write(sys.argv[1], SR, (mezcla * 32767).astype(np.int16))
print('ok', sys.argv[1])
