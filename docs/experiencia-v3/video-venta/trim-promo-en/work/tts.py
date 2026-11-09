"""Locución completa con Gemini TTS en UNA petición (la cuota es por modelo y por día).
Uso: tts.py <clave> <modelo> <voz> <guion.txt> <salida.wav>"""
import sys, json, base64, urllib.request, urllib.error, wave
key, model, voice, guion, out = sys.argv[1:6]
texto = open(guion, encoding="utf-8").read().strip()
estilo = "Narrate in a warm, confident, natural American English voice, like a tech startup launch video:\n"
body = {"contents":[{"parts":[{"text": estilo + texto}]}],
        "generationConfig":{"responseModalities":["AUDIO"],
          "speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":voice}}}}}
req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
      data=json.dumps(body).encode(), headers={"Content-Type":"application/json"})
try:
    r = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    print("ERR", e.code, e.read().decode()[:300]); sys.exit(1)
c = r["candidates"][0]
if "content" not in c:
    print("SIN AUDIO", c.get("finishReason")); sys.exit(2)
p = c["content"]["parts"][0]["inlineData"]
raw = base64.b64decode(p["data"])
if raw[:4] == b"RIFF":  # el modelo 3.8 ya entrega WAV con cabecera
    open(out, "wb").write(raw)
else:                   # PCM crudo 24 kHz mono (modelos 2.5 / 3.1)
    with wave.open(out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(raw)
print("ok", out, p.get("mimeType"))
