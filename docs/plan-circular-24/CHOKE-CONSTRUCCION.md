# Construcción del choke completo dentro del árbol de paradas

**21-oct-2026 · Orden del dueño:** «implementémoslo completo, no a medias, 100 % completo, que se ajuste a nuestro software», muy amigable y entendible para cualquiera, teniendo en cuenta lo que mandó Edinson.

**Alcance:**
- Las piezas 1–11 de `CHOKE-COMPLETO.md`.
- El árbol de 6 pasos de Edinson (Circular 024: responsable → choke → diferida/pérdida → planeada → N1 → N2), con el choke como paso 2.
- Queda fuera solo la pieza 12, la salida en JSON a la ANH: es valor agregado (`PLAN-MAESTRO.md` §5, carril aparte).

**Lo que manda:**
- Norte: productividad = bajar barriles diferidos y perdidos prediciendo las bombas críticas.
- Criterio único de Edinson: dedicado = pozo, compartido = planta (`CHOKE-COMPLETO.md` §2).
- Vocabulario de `P1-producto.md` §1.
- Experiencia de `U2-choke-experiencia.md` (en curso) y `U1-experiencia.md`.

## Reglas para todos los agentes

1. **Al lado, nunca encima.**
   - `TipoCausa`, `libro.ts`, `diferido.ts` y `causa-senal.ts` no cambian de significado. Solo se leen; si hace falta, se exportan funciones nuevas sin tocar las existentes.
   - Los 122 casos de `referencia/` siguen verdes sin regenerarse.
   - Las 334 comprobaciones de `verificar-libro` siguen verdes.
2. **Cada agente toca solo los archivos que le tocan** (tabla de abajo). Si necesita cambiar un archivo de otro, lo pide por escrito en su informe y no lo edita.
3. **Pruebas en cada entrega:** `npx tsc -b` (nunca `--noEmit`), `npx oxlint src`, `npm test` completo. Con pantallas, también las e2e nuevas. No se corre `npm i`. No se edita mientras corren las e2e de otro.
4. **Los datos del demo nunca se inventan con apariencia real.**
   - La topología («a qué pozos sirve») sale de lo que ya existe: `Pozo.alimentador`, los miembros de `CAMPO_PLANTA` y los perfiles de bombas.
   - Si un número no existe en el demo, se agrega como dato de demo explícito, con un comentario de dónde sale.
5. **Las fórmulas viven en el motor** (`src/entities/`). Las pantallas solo leen, por `src/shared/api/*` (regla de oxlint del repo).
6. **Escribir por partes y commitear nada.** El commit lo hace el coordinador al final de cada tanda, con las pruebas verdes.

## Interfaces compartidas (para que las tandas encajen)

`src/entities/choke.ts` (dueño: E1). Nombres de `P1-producto.md` §1.6–1.7:

```ts
export type ChokeAnh = 'reservorio' | 'pozo' | 'planta' | 'exportacion'      // choke de la parada (paso 2)
export type ChokeCampo = 'pozos' | 'planta' | 'exportacion'                    // dominante del campo (pozos incluye reservorio)
export interface ChokeDeElemento {                                             // topología, firmada (Config.topologia: es operativa, no regulatoria)
  elemento: string
  choke: ChokeAnh                                                              // DERIVADO del alcance, se guarda para auditoría
  alcance: 'dedicado' | 'compartido' | 'frontera' | 'tercero'
  pozos?: string[]                                                             // «¿a qué pozos sirve?»
}
/** Choke de una parada desde su causa: origen + dedicado/compartido + raíz de la cascada.
 *  null = la señal no lo decide (externo, clima, orden público, yacimiento): se le pregunta a una persona. */
export function chokeDeCausa(causa: Causa, campoId: string, ctx: Contexto): { choke: ChokeAnh; porque: string; elemento?: string; servidos?: number; pregunta?: string } | null
// `pregunta`: TRIM propone, pero falta un dato que solo sabe una persona (p. ej. «¿el oleoducto estaba recibiendo?»)
export function potencialesDelCampo(campoId: string, t: number, ctx: Contexto): { pozos: number; planta: number; exportacion: number; dominante: ChokeCampo; empate: boolean; holgura: Record<ChokeCampo, number> }
export function brechaPorChoke(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto): { porChoke: Record<ChokeAnh | 'sin-asignar', number>; porEscalon: Record<EscalonBrecha, number>; sinExplicar: number; cuadra: boolean }
```

`EscalonBrecha` = `'desarrollo' | 'desempeno' | 'disponibilidad-planeada' | 'disponibilidad-no-planeada' | 'capacidad'` (`CHOKE-COMPLETO.md` §7).

## Tandas, agentes y archivos

| Tanda | Agente | Qué construye | Archivos que puede tocar |
|---|---|---|---|
| **0** | U2 (UX) | Diseño de la experiencia del choke | `docs/plan-circular-24/U2-choke-experiencia.md` |
| **1 · Motor** | **E1 · choke** | Piezas 1–10 del motor, todas: los cuatro tramos y sus palabras, la topología con su derivación (`alcance` → `choke`) y los datos del demo, potenciales calculados (pozos = Σ prueba vigente × factor, la misma base del libro; planta = `trenesEnCrudo` con la capacidad instalada; exportación), dominante y empate, `chokeDeCausa` (origen, cascada, tanques llenos, parcial, tramos), brecha por choke y por escalón con identidad exacta frente al libro (incluida la brecha estructural cuando el dominante no es pozos), PE y PE no planeada, la tubería del agua (`choke-agua.ts`), «si falla hoy» para todos los equipos (`criticidad.ts`), serie diaria y cambio de dominante. Secciones nuevas al final de `verificar-libro` | nuevos `src/entities/choke.ts`, `choke-agua.ts`, `criticidad.ts`, `src/entities/datos/topologia.ts`; `src/entities/planta.ts` y `configuracion.ts` (solo agregar: `Config.topologia`); `scripts/verificar-libro.mjs` (secciones nuevas al final) |
| **1 · Motor** | **E3 · árbol** (en paralelo con E1) | El árbol de 6 pasos: catálogo (20 N1, 117 N2 del Anexo A de P1, 9 responsables, formas de salida circular y Diccionario), `ClasificacionAnh` con procedencia y coherencia bloqueada, `proponerClasificacion` con `REGLAS_ANH` v1 (el paso 2 llama a `chokeDeCausa` de E1: primero hace lo que no depende de E1), confirmación por paso, `ParadaAnh` (partición por día operacional, abiertas al corte, parciales y disparos). Sus pruebas en un archivo propio | nuevos `src/entities/anh-catalogo.ts`, `anh-clasificacion.ts`, `anh-paradas.ts`, `src/entities/datos/anh-catalogo.ts`, `scripts/verificar-arbol.mjs` |
| **2 · Contrato** | **C1 · contrato** | Vistas y escrituras del choke y del árbol: `contrato.ts` (códecs), `CONTRATO.md`, `src/shared/api/choke.ts` y `arbol.ts`, simulador de la API, SQL (`docs/backend/sql/esquema.sql`, `tablas.json`), `verificar-contrato`, y las familias nuevas de `referencia/` (`choke/`, `agua-choke/`, `anh/`), que comparan endpoints | esos archivos, `scripts/referencia.mjs`, `referencia/indice.json` |
| **3 · Pantallas** | **P1-UI · producción** | La tubería del campo, la escalera, la PE y la tubería del agua en Producción, Planta y Agua | `src/widgets/choke/*` (nuevo), `src/pages/Produccion.tsx`, `Planta.tsx`, `Agua.tsx` |
| **3 · Pantallas** | **P2-UI · gerente, turno y criticidad** | Gerente: dónde se trabó cada campo. Supervisor: «Hoy limita». Confiabilidad y jefe: «si falla hoy» | `src/widgets/resumen/*`, `src/pages/Turno.tsx`, `Riesgo.tsx`, `Confiabilidad.tsx` |
| **3 · Pantallas** | **P3-UI · el árbol en Identificar** | La cadena de 6 pasos con «¿Dónde se trabó?» y confirmación por paso | `src/pages/Causa.tsx`, `src/widgets/whatsapp/*` |
| **3 · Pantallas** | **P4-UI · configuración** | Topología («¿a qué pozos sirve este equipo?»), capacidades, vista previa del impacto y firma | `src/pages/Configuracion.tsx`, `src/widgets/configuracion/*` |
| **4 · QA** | **Q1 · QA adversarial** | Pruebas del motor contra la especificación, e2e por rol (incluido: el gerente no ve códigos; al operador nunca se le pide el tramo), auditor de accesibilidad y colores ISA-101, capturas y revisión visual | `e2e/*` (nuevos), lectura de todo |
| **5 · Documento** | **D1 · documento backend** | Capítulo nuevo del choke y del árbol, anexo C corregido (SPE-36848 y NSTA), glosario, `07-api`, `09-verificacion`, `10-pendientes`, capturas, PDF y Excel | `docs/backend/*` |

**Cambio de vocabulario (21-oct):** la topología del choke vive en `Config.topologia` y no en `Config.anh.chokes` (P1 §1.6), porque el choke ahora es operativo (el norte) y no solo regulatorio.

Al cerrar cada tanda: `npm test` completo, e2e, revisión del coordinador y un commit por tanda (hollkey18, sin push).
