#!/bin/zsh
# Rehace todo el audio de un proyecto: música, efectos, mezcla PCM y normalización a −16 LUFS.
# Uso (desde la carpeta del proyecto): work/audio.sh <es|en>
set -e
V=/Users/hollman/trim-hidrocarburos/docs/experiencia-v3/video-venta/trim-promo/work/.venv/bin/python
$V work/musica_trim.py assets/musica/musica.wav
$V work/sfx_trim.py assets/sfx/sfx.wav "$1"
$V work/mezcla.py work/mezcla-cruda.wav
J=$(ffmpeg -hide_banner -i work/mezcla-cruda.wav -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
M=$(echo "$J" | python3 -c "import json,sys;d=json.load(sys.stdin);print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
ffmpeg -v error -y -i work/mezcla-cruda.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11:${M}:linear=true" -ar 48000 assets/mezcla/mezcla.wav
ffmpeg -hide_banner -i assets/mezcla/mezcla.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1
