# 5C · Salud de los equipos y el vigía: anticipar la falla

Capítulo del documento técnico del backend de TRIM Hidrocarburos. Cubre cómo el servidor convierte
las series del historiador de cada instrumento en un **pronóstico de cruce de la alarma** (el
vigía), cómo agrupa esos pronósticos **por parte** del equipo (el ítem mantenible de ISO 14224)
con su prioridad ISA-18.2, cómo se ve todo esto en las bombas de reinyección y en las
electrosumergibles, y cómo se **califica si el vigía acierta**.

Por qué importa para el negocio: con cortes de agua de 93 % a 97 % en los tres campos, una bomba de reinyección
que se para sin respaldo suficiente llena el tanque de agua y obliga a cerrar pozos; una electrosumergible que falla
se lleva todo el crudo de su pozo por días (en Morichal, 17,4 días fuera en promedio en la historia; desde la puesta en marcha de TRIM, de 2 a 5 días). Anticipar la
parte que va a fallar con horas o días de margen es lo que permite intervenir antes (orden
predictiva en SAP) y bajar el diferido del alto impacto.

| Archivo | Sección |
|---|---|
| [01-serie-limites-estado.md](01-serie-limites-estado.md) | La serie de un tag (`desde`, `pasoH`, `valores` con `null`), cadencia vs paso, huecos; el límite de cada tag (banda normal, alarma, de dónde salen, quién firma); estado de un dispositivo y prioridad; dato inválido (sin señal) y procedencia |
| [02-vigia.md](02-vigia.md) | Mínimos cuadrados con error estándar; `pronostico` (cruza / cruzado / sin tendencia / sin límite / no atribuible), fórmulas y orden de reglas; qué se proyecta (mecanismos B.2); horizonte de 90 días y «tendencia lenta»; formato de horas (una regla con el motor: `textoHoras`); el dibujo; panel VIGÍA; «Próxima en fallar» |
| [03-salud-por-parte.md](03-salud-por-parte.md) | Catálogo de partes por familia (inyección, multifásica, electrosumergible) con el papel de cada variable (anuncia / la daña / confirma); estados de la parte; prioridad ISA-18.2; orden y peor parte; frases («la daña:», «alarma en N h · rango»; el `motivo` del riesgo con `textoHoras`); instrumento con `valor: null`; placa, detalle, operación vs ingeniería; riesgo |
| [04-electrosumergibles.md](04-electrosumergibles.md) | Variador y sensor de fondo; ajustes de protección; lecturas con el motor parado; salud de la ESP (MN-07 en 4 h; la parada por su propia falla sale «falló»: MN-41); disparo (< 24 h) vs falla; MTBF solo con ≥ 2 fallas; horas fuera; la flota (cifras, tabla, % por parte); confiabilidad por familia |
| [05-aciertos.md](05-aciertos.md) | Registro de predicciones; calificación (acierto, intervenida, falsa alarma, seguimiento); fallas vistas (vigilada, sin instrumento, sin parte, fuera de perfil); tasas, anticipación; lo que es demo y lo que hace el backend real; cruce con órdenes SAP |
| [06-catalogo-danos.md](06-catalogo-danos.md) | Clase del catálogo; parte → modo (B.6) → mecanismo (B.2) → causa raíz (B.3) ↔ catálogos SAP B/C/5; «qué vio» por parte, palabras de campo, «Otra cosa» con texto; mecanismo sugerido; validaciones |
| [07-huecos-y-dudas.md](07-huecos-y-dudas.md) | Inconsistencias del código y decisiones pendientes para el backend |

**Datos de ejemplo.** Todos los números salen de correr el motor del demo (`src/entities/*`) con
`AHORA = 2026-10-02T14:00-05:00`, período «Mes en curso» (1–2 de octubre de 2026) salvo que se diga
otro, y los insumos de `INSUMOS_DEMO`. Campo de referencia: **Morichal** (P-201B de reinyección en
marcha con la succión cayendo, MPP-301 multifásica, 41 electrosumergibles).

Cifras clave del demo que este capítulo explica:

| Cifra | Valor | Dónde |
|---|---|---|
| Presión de succión de P-201B (PI-2010), Morichal | 8,8 psi, banda > 10, alarma 8; cruza en **43 h · 41–45 h** | placa, VIGÍA, Próxima en fallar, riesgo |
| Corriente de la ESP de MN-07 | 329,4 A, banda 224,4–295,7, alarma 330; cruza en **4 h** | flota ESP, detalle del pozo, riesgo |
| Filtro de MPP-301 (PDT-3011) | 9,6 psi, banda < 8, alarma 12; **5,2 d · 4,7–5,7 d** | placa, VIGÍA |
| ¿Acierta el vigía? Morichal | **1 de 3** (33 % · 2 falsas alarmas; 3 intervenidas, sin calificar: MN-05 y MN-16 se cambiaron antes de fallar); fallas anticipadas **1 de 4**; anticipación **4,0 d**; **4** en seguimiento, la primera vence 2 de oct, 17:57 | Confiabilidad |
| Flota ESP Morichal | En falla 1 de 41 (684 bbl/d); con aviso 3 (1.643 bbl/d en juego); entre fallas **1.670 d** (9 fallas · 266 disparos) | Electrosumergibles |
| MN-41 (Morichal), parada por falla a tierra desde el 25-sep | Aislamiento del motor y del cable **falló** (P1); GU-07 y GU-09 ya volvieron (GU-07 produce con el aislamiento ya en alarma) | flota ESP, detalle del pozo, Pozos |
