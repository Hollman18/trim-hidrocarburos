"""Música original con Lyria (Gemini API). Uso: musica.py <clave> <modelo> <prompt> <salida>"""
import sys, json, base64, urllib.request, urllib.error
key, model, prompt, out = sys.argv[1:5]
body = {"contents":[{"parts":[{"text":prompt}]}]}
req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
      data=json.dumps(body).encode(), headers={"Content-Type":"application/json"})
try:
    r = json.load(urllib.request.urlopen(req, timeout=400))
except urllib.error.HTTPError as e:
    print("ERR", e.code, e.read().decode()[:300]); sys.exit(1)
n = 0
for c in r.get("candidates", []):
    for p in c.get("content", {}).get("parts", []):
        if "inlineData" in p:
            ext = "mp3" if "mpeg" in p["inlineData"]["mimeType"] else "wav"
            f = f"{out}.{ext}" if n == 0 else f"{out}-{n}.{ext}"
            open(f, "wb").write(base64.b64decode(p["inlineData"]["data"])); print("ok", f, p["inlineData"]["mimeType"]); n += 1
        elif "text" in p:
            print("texto:", p["text"][:300])
if not n: print("sin audio", json.dumps(r)[:300]); sys.exit(1)
