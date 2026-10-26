# X5 · Presupuesto de color (X2 §6, C3): qué parte de la imagen lleva color (croma OKLCH > 0,035),
# separado en índigo de marca y colores de estado. Mismo método que X1 (medir-color.py).
import sys, math
from PIL import Image
def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def oklch(r, g, b):
    r, g, b = lin(r), lin(g), lin(b)
    l = (0.4122214708*r + 0.5363325363*g + 0.0514459929*b) ** (1/3)
    m = (0.2119034982*r + 0.6806995451*g + 0.1073969566*b) ** (1/3)
    s = (0.0883024619*r + 0.2817188376*g + 0.6299787005*b) ** (1/3)
    L = 0.2104542553*l + 0.793617785*m - 0.0040720468*s
    a = 1.9779984951*l - 2.428592205*m + 0.4505937099*s
    bb = 0.0259040371*l + 0.7827717662*m - 0.808675766*s
    return L, math.hypot(a, bb), (math.degrees(math.atan2(bb, a)) + 360) % 360
for f in sys.argv[1:]:
    im = Image.open(f).convert('RGB')
    im = im.resize((im.width // 2, im.height // 2))
    n = im.width * im.height
    cnt = {'índigo (marca)': 0, 'estado (rojo, naranja, amarillo)': 0, 'estado (morado)': 0, 'otro': 0}
    cache = {}
    for px in im.getdata():
        if px not in cache:
            L, C, h = oklch(*px)
            if C < 0.035: k = None
            elif 240 <= h <= 285: k = 'índigo (marca)'
            elif h <= 110 or h >= 345: k = 'estado (rojo, naranja, amarillo)'
            elif 290 <= h < 345: k = 'estado (morado)'
            else: k = 'otro'
            cache[px] = k
        if cache[px]: cnt[cache[px]] += 1
    est = cnt['estado (rojo, naranja, amarillo)'] + cnt['estado (morado)']
    print(f.split('/')[-1], f'· estado {100*est/n:.2f} % · índigo {100*cnt["índigo (marca)"]/n:.1f} % · otro {100*cnt["otro"]/n:.2f} %')
