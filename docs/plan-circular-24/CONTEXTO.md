# Contexto común — Plan «Circular ANH 024/2026 + árbol de paradas + confiabilidad»

Lo leen TODOS los agentes antes de trabajar. Fecha de hoy: 19-oct-2026.

## El producto
TRIM Hidrocarburos (`/Users/hollman/trim-hidrocarburos`): front Vite 8 / React 19 / TS estricto, con datos de demostración. Atribuye los **barriles diferidos** a su causa y a su equipo, con foco en los equipos de alto impacto: bombas electrosumergibles (ESP), de reinyección de agua y multifásicas, en campos colombianos con 92–97 % de agua.
- Motor: `src/entities/*.ts`. Costura con el backend: `src/shared/api/*`. Contrato: `CONTRATO.md` y `src/shared/api/contrato.ts`. Casos de referencia: `referencia/`.
- Documento técnico del backend: `docs/backend/` (capítulos 01–11, anexos B y C).
- Investigación previa: `~/Downloads/TRIM-hidrocarburos/3-investigacion/`. Ahí está la entrevista previa con Edinson del 1-oct, y los archivos de confiabilidad, diferidos, HMI/ISA-101, captura de causa y roles.
- Roles del producto (ids reales de `src/entities/roles.ts`): ger = Gerente de activo · prod = Ingeniera de producción · sup = Supervisor de operaciones · oper = Operador de campo · jefe = Jefe de mantenimiento · conf = Ingeniero de confiabilidad · plan = Planeadora de mantenimiento · tec = Técnico de mantenimiento · cont = Abastecimiento y contratos · reg = Cumplimiento regulatorio · adm = Administrador de la implementación. No existe un rol «mant».
- **Ronda 1 terminada** (`investigacion/`): R1 normativa ANH (con el Schema V3.1 y el Diccionario V3.2 en `investigacion/fuentes/`), R2 choke y pérdidas, R3 métricas de confiabilidad, R4 auditoría del producto. Las rondas siguientes construyen SOBRE ellas.
- Hoy las causas se clasifican con PRODML ReasonLost en 6 categorías (`src/entities/causas.ts`), más un `TipoCausa` propio que se deduce de las señales (`src/entities/causa-senal.ts`).
- El diferido se calcula con prueba vigente × factor de asignación (`src/entities/libro.ts`, `diferido.ts`).
- Ya existe `Campo.choke`, con valores Pozos/Planta/Evacuación/Mercado según NSTA (`src/entities/tipos.ts`).
- Ya existe un catálogo ISO 14224 (`src/entities/iso14224.ts`).
- Los colores siguen ISA-101: gris lo normal, magenta el dato inválido (`src/index.css`, `src/shared/ui/Prioridad.tsx`).

## Las fuentes nuevas (primarias)
- **Circular ANH 0024 del 09-09-2026** (10 páginas): `docs/reuniones/2026-10-19-edinson-adair/circular-anh-024-2026.pdf`. Trae JSON v3.1 Formato Único Tipo U, tuplas `[Valor, Origen A|M|C, Unidad]`, balances de fluidos, nodo `paradas_pozo` con 15 campos y la matriz de 20 claves N1 con su catálogo cerrado N2. Es obligatoria desde el 1-dic-2026.
- **Árbol de paradas de pozo** (imagen): `docs/reuniones/2026-10-19-edinson-adair/arbol-paradas-pozo-anh.jpg`. El recorrido es Responsable (9) → Choke (Pozo/Planta/Exportación/Reservorio) → Diferida/Pérdida → ¿Planeada? → N1 → N2.
- **Transcript completo de la reunión del 19-oct-2026**: `docs/reuniones/2026-10-19-edinson-adair/transcript.txt`.
  - **Edinson Maestre** es ingeniero de confiabilidad y figura en «Proyectó» de la circular.
  - **Adair Gómez** es experto en automatización.
  - **Hollman Habbib** es el dueño del producto.
  - Puntos clave del transcript:
    - Edinson pide la CONVERSIÓN del árbol propio de cada operadora al árbol de la ANH. El de Ecopetrol es unas 10 veces la matriz de la ANH; las operadoras pequeñas tienen 3 o 4 ítems.
    - Edinson pide PÉRDIDAS además de diferidas, y métricas de confiabilidad MODULARES por operadora (MTTR, MTBF o logística).
    - Edinson pide que el técnico tenga su programa preventivo y predictivo, con campañas de vibración y termografía, en vez de órdenes en papel.
    - Ejemplo de choke de Edinson para un transformador: pórtico o red de media → PLANTA; distribución a las unidades de bombeo → POZO.
    - Adair: colores ISA-101 (morado = falla de comunicación, rojo = interlock, naranja/amarillo = alarma).
    - Adair: el piloto debe ser una bomba multifásica o de inyección.
- Reglas del dueño ya decididas: costo por falla = hoy, descontando el colchón; el gerente no ve el detalle técnico de bombas, ve de qué campo viene el diferido y qué equipos lo generan.

## Reglas para los agentes
- Todo en **español**. Precisión ante todo: **nunca inventar** datos, normas, números de artículo ni fórmulas.
  - Cada afirmación normativa o técnica lleva su fuente (documento + numeral/página, o URL).
  - Si algo no se pudo verificar, se marca **«NO VERIFICADO»** y se dice por qué.
- **No se toca el código** (`src/`, `scripts/`, `referencia/`). Solo se lee.
- Cada agente escribe ÚNICAMENTE su archivo de salida en `docs/plan-circular-24/`. Escribirlo **por partes, a medida que se avanza** (Write del esqueleto primero y luego Edit sección por sección): si la sesión se corta, lo escrito no se pierde.
- Si un archivo de otro agente ya existe en la carpeta, leerlo y **ser coherente** con él. Si no se está de acuerdo, escribirlo en una sección «Desacuerdos con otros agentes», citando el archivo y el punto exacto.
- Al terminar, responder con un resumen corto (≤15 líneas): lo encontrado, lo no verificado y la ruta del archivo.
