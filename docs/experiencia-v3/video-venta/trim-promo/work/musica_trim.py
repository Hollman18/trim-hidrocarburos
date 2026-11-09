"""Música original del video de TRIM Hidrocarburos. Todo sintetizado: sin licencias.
Tres partes alineadas al montaje (tiempos del video, en segundos):
  A  0,00–22,36  tensión: dron grave en re menor, pulso de bajo filtrado, tic de reloj.
                 Se vacía en 4,4–5,9 (la bomba se detiene) y crece con un riser hasta el negro de 21,6.
  B  22,36–64,73 la marca y el producto: golpe en 22,36, luego 110 BPM con bombo, palmas, bajo,
                 arpegio brillante y colchón en re mayor (Re–La–Sim–Sol). Ligera bajo la voz.
  C  64,73–72,14 cierre: platillo y relleno pleno, acorde final que se apaga al final.
Uso: musica_trim.py <salida.wav>
"""
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
DUR = 72.14                      # = work/escenas.json «total»
N = int(DUR * SR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(2026)  # fijo: el mismo resultado en cada corrida

hz = lambda m: 440 * 2 ** ((m - 69) / 12)
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


def sierra(f, t, desafino=(0.0,)):
    """Sierra con varias voces levemente desafinadas (supersaw suave)."""
    x = np.zeros_like(t)
    for d in desafino:
        ph = (f * (1 + d) * t) % 1.0
        x += 2 * ph - 1
    return x / len(desafino)


def env(t, a=0.01, r=0.3, d=None):
    d = t[-1] if d is None else d
    return np.minimum(1, t / max(a, 1e-4)) * np.clip((d - t) / max(r, 1e-4), 0, 1)


def pad(ms, d, g=0.05, corte=1400, a=1.2):
    t = T(d)
    x = sum(sierra(hz(m), t, (-0.004, 0.0, 0.005)) for m in ms)
    return lp(lp(x, corte), corte) * env(t, a, 0.9) * g


def pluck(m, d=0.5, v=1.0, brillo=5200):
    t = T(d)
    x = sum(a * np.sin(2 * np.pi * hz(m) * k * t) * np.exp(-t * (4 + 3 * k)) for k, a in [(1, 1), (2, .45), (3, .22), (5, .08)])
    return lp(x * np.minimum(1, t / 0.002) * v, brillo)


def bajo(m, d, g=0.3, corte=300):
    t = T(d)
    x = sierra(hz(m), t, (-0.003, 0.003)) * 0.6 + np.sin(2 * np.pi * hz(m) * t)
    return lp(x * env(t, 0.005, 0.06), corte) * g


def bombo(g=1.0):
    t = T(0.45)
    return np.sin(2 * np.pi * (120 * np.exp(-t * 20) + 42) * t) * np.exp(-t * 6.5) * g


def palma():
    t = T(0.2)
    x = np.zeros_like(t)
    for k, off in enumerate((0, 0.009, 0.018)):  # tres golpes muy juntos: palmas reales
        i = int(off * SR)
        x[i:] += rng.uniform(-1, 1, len(t) - i) * np.exp(-t[: len(t) - i] * 30)
    return bp(x, 900, 5000)


def hat(abierto=False):
    t = T(0.3 if abierto else 0.09)
    return hp(rng.uniform(-1, 1, len(t)), 7500) * np.exp(-t * (13 if abierto else 70))


def tic():
    t = T(0.03)
    return bp(rng.uniform(-1, 1, len(t)), 2500, 6000) * np.exp(-t * 180)


def platillo(d=2.2):
    t = T(d)
    return hp(rng.uniform(-1, 1, len(t)), 4500) * np.exp(-t * 1.8)


def riser(d):
    t = T(d)
    ruido = hp(rng.uniform(-1, 1, len(t)), 600) * (t / d) ** 2.2
    tono = np.sin(2 * np.pi * (80 + 600 * (t / d) ** 2) * t) * (t / d) ** 3 * 0.4
    return lp(ruido, 7000) + tono


def subida(d):
    """Golpe grave con caída de tono: el impacto de la marca."""
    t = T(d)
    return np.sin(2 * np.pi * (70 * np.exp(-t * 2.5) + 30) * t) * np.exp(-t * 1.6)


BPM = 110
NEG = 60 / BPM
COMP = 4 * NEG

# ── A · Tensión (0 – 22,36) ─────────────────────────────────────────────
MARCA = 22.36
PARADA = (4.45, 5.91)  # la bomba se detiene: la música se vacía

mez(pad([38, 45, 50], 4.6, 0.05, corte=500, a=1.5), 0.0)           # dron inicial (re)
mez(pad([38, 45, 50, 53], 16.6, 0.05, corte=650, a=0.3), 5.91)      # vuelve con la alarma, menor
t = 0.4
k = 0
while t < 21.6:
    if not (PARADA[0] <= t < PARADA[1]):
        acento = 1.0 if k % 2 == 0 else 0.6
        sube = 1 + 0.9 * max(0, (t - 12.3) / 9.3)                     # F3 empuja la tensión
        mez(bajo(26 if (k // 8) % 2 == 0 else 27, NEG / 2 * 0.9, 0.22 * acento * min(sube, 1.6), corte=180 + 220 * (sube - 1)), t)
        if k % 2 == 0:
            mez(tic(), t, 0.05 * sube, pan=0.25 if k % 4 == 0 else -0.25)
    t += NEG / 2
    k += 1
# latido grave en el instante de la parada
mez(bombo(0.55), 4.62)
mez(lp(subida(1.4), 200), 4.62, 0.25)
# riser hacia el negro, y silencio seco antes de la marca
mez(riser(2.6), 21.6 - 2.6, 0.32)

# ── B · La marca y el producto (22,36 – 63,09) ──────────────────────────
mez(subida(2.5), MARCA, 0.55)
mez(platillo(3.0), MARCA, 0.30)
mez(bombo(1.0), MARCA)
ACORDES = [[62, 66, 69], [57, 61, 64], [59, 62, 66], [55, 59, 62]]   # Re – La – Sim – Sol
BAJOS = [38, 33, 35, 31]
CIERRE = 64.73                   # inicio de F9 en work/escenas.json
nb = int((CIERRE - MARCA) / NEG)
for b in range(nb):
    t0 = MARCA + b * NEG
    a = ACORDES[(b // 4) % 4]
    entrada = b >= 4                         # un compás solo con colchón y arpegio: la marca respira
    if b % 4 == 0:
        mez(pad(a, COMP + 0.3, 0.032, corte=1800, a=0.25), t0)
        mez(bajo(BAJOS[(b // 4) % 4], COMP * 0.95, 0.26 if entrada else 0.14, corte=260), t0)
    for j in range(2):                       # arpegio en corcheas, registro alto (no tapa la voz)
        m = [a[0], a[2], a[1] + 12, a[2]][(b * 2 + j) % 4] + 12
        mez(pluck(m, 0.45, 0.8), t0 + j * NEG / 2, 0.075, pan=0.4 if j else -0.4)
    if entrada:
        mez(bombo(0.75), t0)
        if b % 2 == 1:
            mez(palma(), t0, 0.16)
        mez(hat(), t0 + NEG / 2, 0.06, pan=0.2)
        if b % 8 == 7:
            mez(hat(True), t0 + NEG / 2, 0.05, pan=-0.2)

# ── C · Cierre (63,09 – 70,5) ──────────────────────────────────────────
mez(platillo(3.0), CIERRE, 0.32)
mez(subida(1.6), CIERRE, 0.35)
FINAL = CIERRE + 8 * NEG                     # el acorde final cae en el pulso
nc = int((FINAL - CIERRE) / NEG)
for b in range(nc):
    t0 = CIERRE + b * NEG
    a = ACORDES[(b // 4) % 4]
    mez(bombo(0.85), t0)
    if b % 2 == 1:
        mez(palma(), t0, 0.2)
    mez(hat(), t0 + NEG / 2, 0.07)
    if b % 4 == 0:
        mez(pad(a, COMP + 0.3, 0.045, corte=2600, a=0.1), t0)
        mez(bajo(BAJOS[(b // 4) % 4], COMP * 0.95, 0.3, corte=300), t0)
    for j in range(2):
        m = [a[0], a[2], a[1] + 12, a[2]][(b * 2 + j) % 4] + 12
        mez(pluck(m, 0.45, 0.9), t0 + j * NEG / 2, 0.1, pan=0.4 if j else -0.4)
for m in ACORDES[0]:
    mez(pluck(m + 12, 3.0, 0.9), FINAL, 0.16)
    mez(pad([m], DUR - FINAL, 0.06, corte=2200, a=0.05), FINAL)
mez(bajo(38, DUR - FINAL, 0.3), FINAL)
mez(platillo(3.0), FINAL, 0.28)
mez(bombo(1.0), FINAL)

# ── Salida ──────────────────────────────────────────────────────────────
x = np.stack([L, R], 1)
cola = int(1.6 * SR)
x[-cola:] *= np.linspace(1, 0, cola)[:, None] ** 1.5
x[: int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))[:, None]
x = np.tanh(x * 1.2) / np.tanh(1.2)          # suave saturación: pega la mezcla
x = x / (np.max(np.abs(x)) + 1e-9) * 0.89
wavfile.write(sys.argv[1], SR, (x * 32767).astype(np.int16))
print('ok', sys.argv[1], f'{DUR}s')
