---
workflow: product-launch-video
flow: automation
storyboard: no
mode: autonomous
message: "TRIM anticipa la falla de los equipos críticos de superficie y avisa qué se cierra cuando cae la energía: anticipe la falla, produzca más."
destination: presentación de venta / web
aspect: 1920x1080
language: en (American English) — versión en inglés de ../trim-promo
audience: operadoras de petróleo — gerentes de activo, mantenimiento, confiabilidad, producción
length: 60-70s
angle: problema (la bomba que se para sin aviso) → señales → TRIM → vigila / avisa / energía / historial → cierre
VO_MODE: verbatim (guion de ../PROMPT-VIDEO.md, escenas 5 y 6 ajustadas a lo que hace el producto)
---

# Brief

**Versión en inglés.** Mismas escenas, música y efectos que `../trim-promo`; voz nueva (Gemini, Charon) partida en sus 9 frases y colocada en cada escena (`work/colocar_voz.py`), tiempos por frase (`work/palabras_por_frase.py`), textos en pantalla traducidos y señales de F5/F6/F8/F9 ajustadas a la voz en inglés. El nombre del producto se deja «TRIM Hidrocarburos»; el lema: «Predict failure. Produce more.» Las capturas del producto siguen en español (son las pantallas reales).

Fuente: `../PROMPT-VIDEO.md` (el usuario pidió «Procede a hacer el video con el prompt»).

## Decisiones de esta corrida (autónoma)
- Voz: Gemini TTS `gemini-3.1-flash-tts-preview`, voz Charon, una sola petición (`work/tts.py`). 65,7 s.
- Sin saldo en Kie (6,5 créditos) ni cupo gratis de imagen/música en Gemini: los planos de planta son
  esquemas de línea animados (estilo SCADA del propio producto) en lugar de fotos generadas, y la música
  es original sintetizada (`work/musica_trim.py`) con efectos sintetizados (`work/sfx_trim.py`).
- Mezcla en PCM y una sola pista (`work/mezcla.py` → `assets/mezcla/mezcla.wav`, −16 LUFS).
- Subtítulos desde el guion, tiempos de whisper (`work/subtitulos.py`).
- Escena 5: «…y sigue su tendencia» (el vigía proyecta la tendencia contra el límite).
  Escena 6: «…y cuántos días le quedan» (el vigía da los días para cruzar el límite, con rango).
- Cifras en pantalla: solo las de las capturas de demostración (P-201B, 1.665 bbl/d), con el chip «Datos de demostración».
