# plan · Planeadora de mantenimiento · ficha de valor (rol apagado)

**Lo necesario** de este rol está en `../necesario-por-rol.md` §7. **Recomendación: sigue apagada, no se borra.**

## 1. Su trabajo, en una frase

Que cada trabajo de la semana tenga su repuesto y su gente antes de que llegue la falla.
- Edinson: «esa pérdida de tiempo en la distribución de órdenes físicas… ese documentador o esa área de planeación para cerrar todas las órdenes» [T 22:34].
- [PM §2.3]: «La cifra clave es “¿alcanza?”».

## 2. Su pregunta y su decisión

- **Pregunta:** ¿qué programo esta semana y qué repuesto pido ya? [X4 §2]
- **Decisión:** pedir el repuesto o mover el trabajo.

## 3. Lo que ve hoy

**Nada propio.** El rol está declarado en `roles.ts` (Hoy, Equipos, Resultados, la ficha del equipo y Confiabilidad) pero apagado en el primer producto (`ROLES_V2`, `shared/config/producto.ts`).
- `#/plan/hoy/ceiba/curso` abre **la vista de producción** (Marcela Ríos) sin decir que cambió de persona [P-17]. Medido: las mismas 82 palabras y 55 cifras de producción.
- El motor ya tiene piezas de la planeadora: «Ojo: no intervenir hoy» le llega en Hoy (`hoy.ts`, rama `jefe || plan`), y `repuestosDe()` trae el stock, el mínimo y el plazo.

| Elemento | Dónde | Quién lo pidió | Qué decisión habilita | Frecuencia | Si se borra… | Veredicto |
|---|---|---|---|---|---|---|
| La vista de producción al entrar por `#/plan/…` | Todas | Nadie: es el respaldo de `rolPorId` | Ninguna; confunde | — | — | **B**: tiene que decir «Este rol todavía no está disponible» [P-17] |
| `roles.ts`: sus pantallas declaradas | Código | X4 §3.2 | — | — | — | Quedan apagadas |

## 4. Lo necesario, y por qué no se enciende

- **El número principal** (repuestos que no llegan antes de la falla anunciada) **falta en el motor**: el cruce de `repuestosDe()` (`plazoDias`) con la anticipación del vigía no existe.
- **Sus dos acciones** (pedir el repuesto y mover un trabajo) no tienen escritura.
- Encenderla hoy sería mostrar una pantalla que no responde su pregunta.
- **Se enciende** con el programa del técnico y la cifra «¿alcanza?» (F3–F4 [PM §5]).

## 5. Sus 3 tareas (cuando exista)

| Tarea | Hoy | Después |
|---|---|---|
| Ver qué repuesto no alcanza | No existe | Inicio. **0 toques** |
| Pedir el repuesto | No existe (afuera, en SAP) | **1 toque**. Falta en el motor |
| Mover un trabajo del programa | No existe | **1 toque**. Falta en el motor |

## 6. Lo que se le borra

- El salto silencioso a la vista de producción [P-17].

## 7. Hoy contra lo necesario

No aplica: no se ofrece. Cuando se encienda, se mide con el mismo guion.
