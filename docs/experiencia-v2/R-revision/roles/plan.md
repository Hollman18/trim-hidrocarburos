# plan · Planeadora de mantenimiento (v2)

**Pregunta (X4 §2):** «¿Qué programo esta semana y qué repuesto pido ya?»
**En el primer producto no se ofrece** (`ROLES_V2`, `src/shared/config/producto.ts`).

## Lo que se ve
- `#/plan/hoy/ceiba/curso` abre `#/prod/hoy/ceiba/curso`: la vista de **producción** (Marcela Ríos), con sus tarjetas («2 cosas le tocan hoy · Primero confirmar 2 paradas iguales»), **sin decir** que cambió de persona (P-17).
- El motor ya tiene a la planeadora: «Ojo: no intervenir hoy» le llega en Hoy (`entities/hoy.ts:655`). Cuando se encienda, su Hoy está listo para revisarse con este mismo guion.

## La prueba de los 10 segundos
- No aplica en el MVP.

## Hallazgos
- P-17 (S3).
