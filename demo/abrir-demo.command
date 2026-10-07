#!/bin/bash
# Doble clic para ver el demo. Abre el navegador y deja esta ventana abierta;
# al cerrarla con Control + C se apaga el demo.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Hace falta Node.js para ver el demo: https://nodejs.org"
  read -r -p "Pulse intro para cerrar." _
  exit 1
fi
PUERTO="${PUERTO:-4173}"
export PUERTO
node servidor.mjs &
SERVIDOR=$!
# Al salir se apaga el servidor, si sigue vivo (si ya murió no hay nada que apagar).
trap 'if kill -0 "$SERVIDOR" 2>/dev/null; then kill "$SERVIDOR"; fi' EXIT
# Se abre el navegador cuando el servidor RESPONDE, no tras una espera a ciegas:
# si el puerto está ocupado o Node falla, se dice aquí en vez de abrir una página en blanco.
for _ in $(seq 1 50); do
  if ! kill -0 "$SERVIDOR" 2>/dev/null; then
    echo "El demo no arrancó (¿el puerto $PUERTO está ocupado? Pruebe: PUERTO=4174 ./abrir-demo.command)."
    read -r -p "Pulse intro para cerrar." _
    exit 1
  fi
  if curl -fsS -o /dev/null "http://127.0.0.1:$PUERTO/"; then
    open "http://127.0.0.1:$PUERTO"
    wait "$SERVIDOR"
    exit $?
  fi
  sleep 0.2
done
echo "El demo no respondió en 10 segundos."
read -r -p "Pulse intro para cerrar." _
exit 1
