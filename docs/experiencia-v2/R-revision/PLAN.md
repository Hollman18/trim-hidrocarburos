# Tanda 3 · Revisión total (ejecución de PROMPT-REVISION-UX.md)

**26-oct-2026 · Coordinador.** El dueño pidió ejecutar `docs/experiencia-v2/PROMPT-REVISION-UX.md` «100 % hasta que quede listo». Arranca cuando la tanda 2 (C4 Equipos, C5 Resultados) esté cerrada y en `main`.

El prompt es el encargo; este archivo dice **quién hace qué**. Todos leen el prompt completo y `CONSTRUCCION.md`.

## Fases y equipo (como mucho 4 agentes a la vez)

### Fases 1 y 2 · Medir y encontrar (sin tocar `src/`, `e2e/` ni `scripts/`; cada uno escribe solo en `R-revision/`)

| Agente | Dimensiones del prompt | Escribe |
|---|---|---|
| **R1 · Medición y texto** | §4 (menos texto) y la medición de §12.1: el guion que cuenta palabras visibles (viewport y página), cifras visibles, cifras grandes y desbordes por ruta, rol, ancho y tema; capturas «antes»; el glosario de «un nombre, una cifra»; la propuesta de texto nuevo por pantalla (lo que sale de la primera capa y a dónde va) | `medicion.md`, `glosario.md`, `hallazgos-texto.md`, `herramientas/` (guiones) y `capturas/antes/` |
| **R2 · UI y producto** | §5 (UI al píxel contra X5 y las imágenes) y §6 (los 10 segundos por rol, los toques por tarea y los casos borde) | `hallazgos-ui.md`, `hallazgos-producto.md` y `roles/<rol>.md` |
| **R3 · ISA-101 y gráficos** | §7 (las 44 comprobaciones de X2 por pantalla) y §8 (el inventario y el QA de cada gráfico, con los cuadres contra el motor) | `isa-101.md`, `graficos.md` y `hallazgos-isa-graficos.md` |
| **R4 · Accesibilidad y frontend** | §9 (WCAG 2.2 AA) y §10 (consola, CSP, rendimiento, PDF, direcciones y las dos fuentes de datos) | `hallazgos-a11y-frontend.md` |

Cada uno usa **su propio Vite** (R1 5181, R2 5182, R3 5183, R4 5184) y lo apaga por su PID. Nadie edita código en estas fases, así que no hay recargas cruzadas.

### Fase 3 · Verificar (adversarial)

**V1 y V2** se reparten los hallazgos: V1 toma texto, UI y producto; V2 toma ISA-101, gráficos, accesibilidad y frontend.

Por cada hallazgo, el verificador intenta **refutarlo**:
- ¿lo reproduce?
- ¿contradice al dueño, a X5, a X2 o a X4?
- ¿arreglarlo rompe una función?

Marca **confirmado** (con su severidad S1/S2/S3) o **refutado** (con su porqué). El resultado va en `hallazgos.md`, que es la lista única para arreglar.

### Fase 4 · Arreglar (con dueños de archivos)

| Agente | Arregla en |
|---|---|
| **F1 · Armazón, Hoy y lo común** | `src/index.css`, `App.tsx`, `Riel`, `Cabecera`, `Franja`, `MenuPerfil`, `Onboarding`, `src/shared/ui/*` y `src/shared/brand/*`; Hoy (`pages/Hoy.tsx`, `widgets/hoy/*`, `entities/hoy.ts`); Turno, Trabajo, Causa y `widgets/arbol|whatsapp/*` |
| **F2 · La planta viva y Resultados** | `pages/PlantaViva.tsx`, `widgets/plantaviva/*`, `entities/planta-viva.ts`; Resultados, Diferidos, Producción, Confiabilidad, Mantenimiento, Resumen, Riesgo, Regulatorio, Evidencia y `widgets/resultados|diferidos|produccion|confiabilidad|ciclo|resumen|riesgo|choke|informe/*` |
| **F3 · Equipos y niveles técnicos** | Equipos, Bombas, Esp, Pozos, Equipo, Planta, Agua, `widgets/equipos|bombas|equipo|pozos|planta/*`, `PanelEquipo`, `Analogico` y `Sparkline`; Configuración, Filosofía, Conectores, Perfil y `widgets/configuracion|conectores|sap/*` |
| **F4 · Pruebas y auditor** | `e2e/auditor.spec.ts` y `e2e/auditoria/*`, con las reglas nuevas de §11 (SVG bajo 12 px, SVG recortado, más de 5 cifras en el teléfono, más de una cifra grande, color sin forma ni palabra, pestañas horizontales, presupuesto de palabras); los e2e nuevos de comportamiento; el glosario como prueba (`verificar-libro`) |

- Cada fixer puede tocar el **motor de sus pantallas**, con su prueba.
- Archivos compartidos (`contrato.ts`, `CONTRATO.md` y `scripts/verificar-*.mjs`): cada uno trabaja en su sección y vuelve a leer antes de editar.
- **Nadie corre la suite completa mientras otro edita.** Cada uno puede correr solo sus specs contra su Vite.

### Fase 5 · QA total y cierre (coordinador)

- tsc, oxlint y npm test;
- la suite completa en todos los proyectos (`caffeinate -dims`);
- el auditor extendido;
- las capturas «después», lado a lado con las imágenes y con las «antes»;
- `qa-final.md` y la tabla antes/después;
- commit y push;
- el paquete y el demo de 4173 reiniciado por su PID;
- el resumen al dueño.

## Estado

- [ ] Tanda 2 cerrada (C4, C5)
- [ ] Fases 1–2 (R1–R4)
- [ ] Fase 3 (V1, V2)
- [ ] Fase 4 (F1–F4)
- [ ] Fase 5
