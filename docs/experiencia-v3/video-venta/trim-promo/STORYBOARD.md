---
title: TRIM Hidrocarburos · Anticipe la falla
format: 1920x1080
fps: 30
duration: 70.5
mode: autonomous
voice: assets/voz/voz.wav (empieza en t=1.5 s del video)
music: original sintetizada (assets/musica/musica.wav)
captions: index (banda inferior, y > 890)
---

# Storyboard

Los tiempos «local» son segundos desde el inicio de cada frame (0 = primer cuadro del frame). Las marcas de palabra salen de la locución real: **sincronice los momentos clave a esas marcas**, no los mueva.

Cada frame es un archivo `compositions/frames/NN-nombre.html` con `data-composition-id="fNN"` y su timeline en `window.__timelines["fNN"]`. La duración del frame es exacta (columna «dura»).

| frame | archivo | inicio | dura |
|---|---|---|---|
| F1 | 01-noche.html | 0.00 | 5.91 |
| F2 | 02-alarma.html | 5.91 | 6.43 |
| F3 | 03-senales.html | 12.34 | 10.02 |
| F4 | 04-marca.html | 22.36 | 6.14 |
| F5 | 05-vigila.html | 28.50 | 9.36 |
| F6 | 06-aviso.html | 37.86 | 8.82 |
| F7 | 07-energia.html | 46.68 | 9.65 |
| F8 | 08-historial.html | 56.33 | 6.76 |
| F9 | 09-cierre.html | 63.09 | 7.41 |

---

## F1 · La noche (01-noche.html, 5.91 s)
**Voz (local):** «Son las tres de la mañana» 1.74–3.32 · «Una bomba» 3.32–4.16 · «se detiene» 4.37–5.46.
**Imagen:** planta de noche en esquema de línea. En el centro-izquierda, un patín de bomba multifásica grande (motor con aletas → acople → bomba con rodete de 5 aspas visible girando rápido), tuberías que entran y salen con flujo discontinuo avanzando, un tanque al fondo a la derecha, rejilla de puntos tenue. Reloj mono arriba a la izquierda «03:00» con segundos que corren `02:59:57 → 03:00:00` llegando a 03:00:00 en local 2.0. Cámara: empuje lento hacia la bomba durante todo el frame.
- 0.0–4.3: todo vivo; rodete girando, flujo avanzando, un piloto de estado redondo sobre el motor en `--petroleo-claro` con brillo suave.
- 4.4–5.3 («se detiene»): el rodete desacelera (ease out) y se para; el flujo se detiene; el piloto pasa a `--frenado` con un pulso de brillo; las líneas de la bomba viran a `--frenado` al 70 %. Rótulo mono pequeño junto a la bomba «P-201B · PARADA» aparece en 5.0.
- 5.3–5.91: quietud tensa, solo el piloto rojo late una vez.
**Salida:** corte seco a F2.

## F2 · La alarma (02-alarma.html, 6.43 s)
**Voz:** «Cuando suena la alarma» 0.59–1.40 · «la producción ya se está perdiendo» 1.40–3.97 · «y nadie lo vio venir» 3.97–5.83.
**Imagen:** pantalla de cuarto de control abstracta, oscura. 
- 0.5: una barra de alarma entra de golpe arriba (fondo `--frenado` al 18 %, borde izquierdo 6 px `--frenado`): «ALARMA · P-201B · bomba de transferencia · parada 03:00» en Plex Mono; parpadea 2 veces.
- 1.4–4.0: debajo, una gráfica de línea grande «Producción · bbl/d» (sin cifras en el eje; solo rejilla) que venía plana y cae en escalón tras la alarma; el área entre la línea esperada (punteada, `--tinta3`) y la real se rellena de `--frenado` al 25 % creciendo con el tiempo = «lo que se pierde».
- 3.0: rótulo grande a la izquierda: «Cada hora parada son barriles que no vuelven.» (Plex Sans 600, 56 px, raya `--frenado`).
- 4.0–5.8 («nadie lo vio venir»): una línea de tiempo fina aparece bajo la gráfica, con un marcador «ALARMA» en el punto de caída y un tramo anterior sombreado y vacío rotulado «antes: sin aviso» en `--tinta3`.
**Salida:** a 6.1 todo se apaga hacia negro (0.3 s).

## F3 · Las señales (03-senales.html, 10.02 s)
**Voz:** «Un corte de energía» 0.46–1.11 · «un variador desbalanceado» 1.11–3.54 · «un motor que pide más corriente para mover lo mismo» 3.54–6.94 · «Las señales estaban ahí» 7.78–9.32.
**Imagen:** tres paneles de esquema que aparecen uno a uno, cada uno a pantalla casi completa y luego se encogen a una fila de tres.
- 0.3–1.2 · **Energía:** subestación en línea (transformador = dos círculos entrelazados, interruptor, línea hacia la planta) rotulada «13,8 kV». En 0.5 la línea parpadea (3 cortes rápidos de opacidad) y queda apagada un instante; rótulo «corte de energía» en `--riesgo`.
- 1.2–3.5 · **Variador:** tres ondas senoidales superpuestas (fases R, S, T, trazos de 3 px en `--petroleo-claro`, `--tinta2`, `--tinta3`) que corren hacia la izquierda; una de ellas crece en amplitud y se desfasa → pasa a `--riesgo`. Rótulo mono «DESBALANCE».
- 3.5–6.9 · **Motor:** dos tendencias en la misma gráfica: «caudal» plano (`--tinta2`) y «corriente» que sube lento y sostenido (`--riesgo`). Rótulos mono «CAUDAL =» y «CORRIENTE ↑» al final de cada línea.
- 7.0–7.8: los tres paneles se reducen y se alinean en una fila de tres tarjetas.
- 7.8–9.3 («Las señales estaban ahí»): sobre cada tarjeta se enciende un punto/anillo `--petroleo-claro` que late, uno tras otro (7.9, 8.3, 8.7). Rótulo centrado arriba «Las señales estaban ahí.» (Plex Sans 600, 64 px).
- 9.4–10.02: todo funde a negro puro (silencio antes de la marca).

## F4 · La marca (04-marca.html, 6.14 s)
**Voz:** «TRIM Hidrocarburos» 0.20–1.25 · «vigila sus equipos críticos» 1.25–2.99 · «con inteligencia artificial» 2.99–5.42.
**Imagen:** negro. En 0.0 un barrido de luz `--petroleo-claro` horizontal cruza el centro y deja el logo `assets/brand/logo_trim_light.png` (396×120, blanco con alfa; mostrarlo a ~520 px de ancho) revelado con máscara de izquierda a derecha (0.1–0.8). A su derecha, separado por una raya vertical fina, «Hidrocarburos» en Plex Sans 500, 64 px, `--tinta2` (entra 0.5).
- 1.4: debajo, grande: «Anticipe la falla. Produzca más.» (Plex Sans 700, 96 px, `--tinta`; «Produzca más.» en `--petroleo-claro`), entra palabra por palabra.
- 3.1: chip mono «CON INTELIGENCIA ARTIFICIAL» con borde `--petroleo` y un brillo que lo recorre.
- Fondo: rejilla de puntos que se ilumina desde el centro con un halo `--petroleo` muy tenue.
**Salida:** corte a F5 en 6.14.

## F5 · Vigila (05-vigila.html, 9.36 s) — chip «Datos de demostración»
**Voz:** «Lee la corriente» 0.85–1.92 · «la vibración» 1.92–3.15 · «la presión» 3.15–3.73 · «y la temperatura» 3.73–4.89 · «de cada bomba y de cada motor» 4.89–5.68 · «Y sigue su tendencia» 6.08–7.28.
**Imagen:** monitor flotante con `assets/pantallas/diagnostico-mpp301.png` (2880×1800) a la derecha (≈1180 px de ancho), entrando con giro 3D que se endereza (0.0–0.8).
- A la izquierda, columna de cuatro chips mono que aparecen en sincronía con la voz: «CORRIENTE» 1.0 · «VIBRACIÓN» 2.0 · «PRESIÓN» 3.2 · «TEMPERATURA» 3.8, cada uno con un mini-trazo de señal que se dibuja a su lado.
- 4.9: rótulo «Bombas multifásicas · reinyección · motores · variadores» bajo los chips (Plex Sans 500, 30 px, `--tinta2`).
- 6.0–9.36 («sigue su tendencia»): la cámara empuja hacia la gráfica de tendencia de la captura (zona «Salud por parte», tercio central-izquierdo de la imagen, aprox. x 4–75 %, y 33–60 % de la captura) hasta que llena ~70 % del cuadro; un trazo `--riesgo` animado se dibuja encima siguiendo la tendencia hacia el límite, con un marcador mono «LÍMITE» en `--frenado`.

## F6 · El aviso (06-aviso.html, 8.82 s) — chip «Datos de demostración»
**Voz:** «Cuando algo empieza a degradarse» 0.52–2.25 · «le avisa antes de la falla» 2.25–4.28 · «Qué equipo» 4.88–5.36 · «por qué» 5.36–5.96 · «y cuántos días le quedan» 5.96–8.28.
**Imagen:** a la izquierda un teléfono con `assets/pantallas/tecnico-telefono.png` (780×1688; mostrar ~400 px de ancho) que sube desde abajo (0.2–0.9). A la derecha, monitor con `assets/pantallas/hoy-supervisor.png`.
- 2.3 («le avisa»): una notificación cae sobre el teléfono (tarjeta `--grafito`, borde izq. 6 px `--riesgo`): «TRIM · P-201B se está degradando» con un pulso en anillo; rótulo grande «Aviso antes de la falla.» arriba a la derecha.
- 4.9 / 5.4 / 6.0: tres rótulos mono que se apilan junto a la notificación, cada uno con su raya: «QUÉ EQUIPO · P-201B», «POR QUÉ · sello mecánico», «CUÁNTO LE QUEDA · días al límite».
- Cámara: leve deriva lateral todo el frame.

## F7 · Si cae la energía (07-energia.html, 9.65 s) — chip «Datos de demostración»
**Voz:** «Y si cae la energía» 0.48–1.46 · «o el aire comprimido» 1.46–3.22 · «le dice qué se va a cerrar» 3.22–5.52 · «cuántos barriles están en juego» 5.52–7.24 · «y quién tiene que actuar» 7.24–9.60.
**Imagen:** árbol de planta en esquema de línea, de arriba abajo: dos nodos de servicio arriba, «ENERGÍA 13,8 kV» (izq.) y «AIRE COMPRIMIDO» (der.), que alimentan con líneas a una fila de 4 equipos (P-201A, P-201B, P-201C, K-101; bombas con rodete, K-101 es compresor) y estos a una fila de 6 pozos (LC-07, LC-16, LC-21, LC-08, LC-02, LC-10; símbolo de cabezal de pozo). Flujo discontinuo vivo en todas las líneas.
- 0.5 («cae la energía»): el nodo ENERGÍA pasa a `--frenado` con pulso; 1.5 («aire comprimido»): el nodo AIRE parpadea en `--riesgo`.
- 3.2–5.5 («qué se va a cerrar»): el rojo se propaga por las líneas desde ENERGÍA hacia abajo (stroke que se colorea en el sentido del flujo) y los equipos y pozos dependientes (P-201B → LC-07 y LC-16) se rellenan de rojo pálido con su rótulo; su flujo se detiene. Los demás siguen vivos.
- 5.5–7.2 («cuántos barriles»): tarjeta a la derecha: «EN JUEGO» + «1.665 bbl/d» (Plex Mono 500, 72 px, `--tinta`) contando desde 0.
- 7.2–9.6 («quién tiene que actuar»): bajo la cifra, chip «RESPONSABLE · Mantenimiento» que entra con raya `--petroleo-claro`; rótulo superior «Qué se cierra · cuántos barriles · quién actúa».

## F8 · El historial (08-historial.html, 6.76 s) — chip «Datos de demostración»
**Voz:** «Cada barril diferido queda explicado» 0.78–2.75 · «Dónde» 3.37–3.69 · «por qué» 3.69–4.32 · «y cuánto le costó» 4.32–6.19.
**Imagen:** monitor grande centrado con `assets/pantallas/historial-gerente.png` (1440×812). Las columnas se revelan con una máscara de izquierda a derecha (0.3–2.6) como si se construyeran.
- 2.8: rótulo «Diferido y perdido, mes a mes.» arriba a la izquierda.
- 3.4 / 3.8 / 4.4: tres etiquetas mono que se encienden en fila bajo el título: «DÓNDE» «POR QUÉ» «CUÁNTO».
- 4.4–6.76: entra desde la derecha, en primer plano y algo inclinada, la ficha `assets/pantallas/ficha-p201b-gerente.png` recortada a su tarjeta (la tarjeta blanca ocupa aprox. x 4–27 %, y 3–98 % de la captura de 2880×1800) y se posa sobre el historial.

## F9 · El cierre (09-cierre.html, 7.41 s)
**Voz:** «TRIM» 0.61–1.14 · «Anticipe la falla» 1.14–2.69 · «Produzca más» 3.33–4.09.
**Imagen:** retoma la bomba de F1 (mismo esquema, mismo encuadre de cierre de F1), ahora amanece: la rejilla se aclara apenas con un degradé `--petroleo` desde abajo.
- 0.0–1.2: el rodete arranca y acelera; el flujo vuelve a avanzar; el piloto pasa de `--frenado` a `--bien` (es un resultado) con brillo.
- 1.2–2.0: la cámara se aleja y el esquema baja a 25 % de opacidad.
- 1.2: logo `logo_trim_light.png` centrado arriba; 1.3–2.7 «Anticipe la falla.» y 3.3–4.1 «Produzca más.» (`--petroleo-claro`), Plex Sans 700, 104 px, en dos líneas.
- 4.6: CTA mono «AGENDE UN PILOTO · GOTRIM.AI» en un botón con borde `--petroleo-claro`.
- 6.6–7.41: funde a negro.
