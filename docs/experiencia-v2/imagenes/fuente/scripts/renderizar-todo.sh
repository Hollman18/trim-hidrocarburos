#!/bin/sh
# X5 · Vuelve a renderizar las 7 imágenes desde su HTML (escala 2, sin servidor: file://).
cd "$(dirname "$0")/.." || exit 1
R="node scripts/render.mjs"; F="$PWD"; O="$PWD/.."
$R "$F/1-planta-viva-escritorio.html" "$O/1-planta-viva-escritorio-claro.png" 1440 900
$R "$F/2-planta-viva-telefono.html" "$O/2-planta-viva-telefono.png" 1440 1060
$R "$F/3a-hoy-supervisor-escritorio.html" "$O/3a-hoy-supervisor-escritorio.png" 1440 900
$R "$F/3b-hoy-supervisor-telefono.html" "$O/3b-hoy-supervisor-telefono.png" 1000 1060
$R "$F/4-p201b-nivel3-escritorio.html" "$O/4-p201b-nivel3-escritorio.png" 1440 900
$R "$F/5-operador-telefono.html" "$O/5-operador-por-contestar-telefono.png" 1000 1060
$R "$F/1-planta-viva-escritorio.html" "$O/6-planta-viva-escritorio-oscuro.png" 1440 900 tema=oscuro
$R "$F/7-lamina-resumen.html" "$O/7-lamina-resumen.png" 1604 1664
