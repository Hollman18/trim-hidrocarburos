"""Genera un plano con Gemini (imagen). Uso: img.py <clave> <modelo> <prompt> <salida.png>"""
import sys, json, base64, urllib.request, urllib.error
key, model, prompt, out = sys.argv[1:5]
body = {"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"responseModalities":["IMAGE"],"imageConfig":{"aspectRatio":"16:9"}}}
req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}", data=json.dumps(body).encode(), headers={"Content-Type":"application/json"})
try:
    r = json.load(urllib.request.urlopen(req, timeout=240))
except urllib.error.HTTPError as e:
    print("ERR", e.code, e.read().decode()[:400]); sys.exit(1)
for c in r.get("candidates",[]):
    for p in c["content"]["parts"]:
        if "inlineData" in p:
            open(out,"wb").write(base64.b64decode(p["inlineData"]["data"])); print("ok", out); sys.exit(0)
print("noimg", json.dumps(r)[:400]); sys.exit(1)
