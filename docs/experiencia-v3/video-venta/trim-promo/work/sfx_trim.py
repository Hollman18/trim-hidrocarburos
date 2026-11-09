"""Pista de efectos del video de TRIM (una sola pista de 70,5 s, todo sintetizado).
Cada efecto va en el tiempo del video donde ocurre su imagen (ver STORYBOARD.md).
Los tiempos se escriben por escena: en('fNN', segundo local) usa work/escenas.json, y las marcas
que dependen de la voz cambian por idioma (MARCAS).
Uso: sfx_trim.py <salida.wav> <idioma es|en>
"""
import json
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
ESC = {f['id']: f for f in json.load(open('work/escenas.json'))['frames']}
DUR = json.load(open('work/escenas.json'))['total']
IDIOMA = sys.argv[2]
N = int(DUR * SR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

T = lambda d: np.arange(int(d * SR)) / SR
lp = lambda x, f: sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
hp = lambda x, f: sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
bp = lambda x, a, b: sosfilt(butter(2, [a, b], 'band', fs=SR, output='sos'), x)


def mez(x, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i < 0:
        return
    x = x[: N - i]
    L[i:i + len(x)] += x * g * (1 - max(0, pan))
    R[i:i + len(x)] += x * g * (1 + min(0, pan))


def motor(d, f0, f1=None, curva=1.0):
    """Zumbido de motor eléctrico + giro de la bomba. f0→f1 = frecuencia de giro (Hz) en el tiempo."""
    t = T(d)
    f1 = f0 if f1 is None else f1
    k = (t / d) ** curva
    f = f0 + (f1 - f0) * k
    fase = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(fase * 2) * 0.5 + np.sin(fase * 4) * 0.25 + np.sin(fase * 6) * 0.12   # armónicos de red
         + np.sin(fase * 5) * 0.18)                                                   # paso de aspas (5 aspas)
    roce = bp(rng.uniform(-1, 1, len(t)), 300, 2500) * 0.12 * (f / max(f0, f1, 1))   # aire y rodamiento
    return lp(x + roce, 3000)


def clic(g=1.0):
    t = T(0.05)
    return (hp(rng.uniform(-1, 1, len(t)), 2000) * np.exp(-t * 160) + np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 120) * 0.5) * g


def bip(f=1320, d=0.16):
    t = T(d)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2 * t)
    return x * np.minimum(1, t / 0.004) * np.clip((d - t) / 0.03, 0, 1)


def chispa(d=0.25):
    t = T(d)
    x = rng.uniform(-1, 1, len(t)) * (rng.uniform(0, 1, len(t)) > 0.85)
    zumbido = np.sin(2 * np.pi * 120 * t) * 0.4
    return bp(x, 1500, 9000) * np.exp(-t * 10) + zumbido * np.exp(-t * 8)


def apagon(d=1.2):
    """Caída de energía: zumbido de 60 Hz que se hunde y se corta."""
    t = T(d)
    f = 120 * (1 - 0.7 * (t / d) ** 0.6)
    fase = 2 * np.pi * np.cumsum(f) / SR
    return lp(np.sin(fase) + 0.4 * np.sin(fase * 3), 900) * np.exp(-t * 2.5)


def barrido(d=0.6, sube=True):
    t = T(d)
    ruido = rng.uniform(-1, 1, len(t))
    f = np.linspace(400, 5000, len(t)) if sube else np.linspace(5000, 400, len(t))
    y = np.zeros_like(ruido)
    # filtro pasa-banda que se desplaza, por bloques
    blq = 960
    for i in range(0, len(t), blq):
        c = f[i]
        y[i:i + blq] = bp(ruido[i:i + blq + 200], c * 0.6, min(c * 1.6, 20000))[: len(y[i:i + blq])]
    return y * np.sin(np.pi * t / d) ** 2


def pop(f=900):
    t = T(0.08)
    return np.sin(2 * np.pi * (f + 600 * np.exp(-t * 60)) * t) * np.exp(-t * 45)


def ping():
    t = T(1.2)
    return (np.sin(2 * np.pi * 1568 * t) * np.exp(-t * 4) + 0.5 * np.sin(2 * np.pi * 2093 * t) * np.exp(-t * 5)
            + 0.3 * np.sin(2 * np.pi * 3136 * t) * np.exp(-t * 7))


def brillo(d=1.0):
    t = T(d)
    x = sum(np.sin(2 * np.pi * f * t + i) * np.exp(-t * (3 + i)) for i, f in enumerate((2637, 3136, 3951, 5274)))
    return x * np.minimum(1, t / 0.01) * 0.3

def en(fid, local):
    return ESC[fid]['inicio'] + local


# Marcas que siguen a la voz (segundo local de cada frame), por idioma.
MARCAS = {
    'es': {'chip_ia': 4.45, 'chips': (1.0, 2.0, 3.2, 3.8), 'ping': 2.55, 'rotulos6': (4.1, 5.1, 6.1),
           'rotulos8': (3.55, 4.2, 5.1), 'ficha': 5.0},
    'en': {'chip_ia': 4.75, 'chips': (1.4, 2.2, 3.25, 4.0), 'ping': 2.2, 'rotulos6': (4.1, 5.5, 6.2),
           'rotulos8': (3.3, 4.15, 5.5), 'ficha': 5.4},
}[IDIOMA]

# F1 · la bomba de noche y su parada
mez(motor(4.45, 24) * np.minimum(1, T(4.45) / 0.8), en('f01', 0.0), 0.32)
mez(motor(1.1, 24, 0.5, curva=0.6) * np.clip((1.1 - T(1.1)) / 0.4, 0, 1), en('f01', 4.45), 0.32)
mez(clic(1.0), en('f01', 4.45), 0.5)
mez(clic(0.6), en('f01', 5.0), 0.3, pan=0.2)          # «P-201B · PARADA»

# F2 · la alarma
for l in (0.5, 0.84, 1.18):
    mez(bip(1320), en('f02', l), 0.16, pan=-0.1)
mez(barrido(0.5), en('f02', 2.89), 0.06)              # la gráfica cae

# F3 · las señales
mez(barrido(0.5), en('f03', -0.14), 0.08)
for l in (0.5, 0.64, 0.81):
    mez(chispa(), en('f03', l), 0.22)
mez(apagon(1.0), en('f03', 0.56), 0.3)
mez(barrido(0.45), en('f03', 1.06), 0.07, pan=-0.3)
mez(barrido(0.45), en('f03', 3.36), 0.07, pan=0.3)
mez(barrido(0.7, sube=False), en('f03', 6.86), 0.08)
for l in (7.9, 8.3, 8.7):                              # los anillos que se encienden
    mez(pop(700), en('f03', l), 0.12)

# F4 · la marca
mez(brillo(1.2), en('f04', 0.04), 0.22)
mez(pop(1100), en('f04', MARCAS['chip_ia']), 0.1)     # chip «con inteligencia artificial»

# F5 · vigila
mez(barrido(0.5), en('f05', -0.1), 0.06)
for l in MARCAS['chips']:
    mez(pop(1000), en('f05', l), 0.11, pan=-0.2)
mez(barrido(0.9), en('f05', 6.9), 0.05)               # la cámara entra a la tendencia

# F6 · el aviso
mez(barrido(0.5), en('f06', -0.06), 0.06)
mez(ping(), en('f06', MARCAS['ping']), 0.18, pan=-0.2)
for l in MARCAS['rotulos6']:
    mez(pop(900), en('f06', l), 0.1, pan=0.2)

# F7 · si cae la energía (todo dentro de la planta)
mez(barrido(0.5), en('f07', -0.08), 0.06)
mez(apagon(1.4), en('f07', 0.8), 0.32)
mez(chispa(0.3), en('f07', 0.8), 0.2)
mez(bip(988, 0.12), en('f07', 1.4), 0.1)              # aire comprimido en riesgo
mez(bip(988, 0.12), en('f07', 1.6), 0.1)
mez(motor(1.6, 24, 0.5, curva=0.6) * np.clip((1.6 - T(1.6)) / 0.5, 0, 1), en('f07', 3.6), 0.12)  # la P-201B se para
mez(barrido(1.6), en('f07', 3.3), 0.05)               # el rojo se propaga
for i in range(12):                                    # la cifra cuenta
    mez(clic(0.35), en('f07', 5.7) + i * 0.14, 0.12, pan=0.3)
mez(pop(1200), en('f07', 7.2), 0.12)                  # chip «responsable»

# F8 · el historial
mez(barrido(0.5), en('f08', -0.08), 0.06)
for l in MARCAS['rotulos8']:
    mez(pop(900), en('f08', l), 0.1)
mez(barrido(0.5), en('f08', MARCAS['ficha']), 0.07, pan=0.4)   # entra la ficha

# F9 · el cierre
mez(motor(1.3, 0.5, 24, curva=0.5) * np.minimum(1, T(1.3) / 0.3), en('f09', 0.0), 0.2)
mez(motor(3.0, 24) * np.clip((3.0 - T(3.0)) / 2.0, 0, 1), en('f09', 1.3), 0.11)
mez(brillo(1.0), en('f09', 1.21), 0.18)               # el piloto vuelve a verde
mez(pop(1300), en('f09', 4.61), 0.12)                 # el botón del piloto

x = np.stack([L, R], 1)
x = np.tanh(x * 1.1) / np.tanh(1.1)
x = x / (np.max(np.abs(x)) + 1e-9) * 0.7
wavfile.write(sys.argv[1], SR, (x * 32767).astype(np.int16))
print('ok', sys.argv[1])
