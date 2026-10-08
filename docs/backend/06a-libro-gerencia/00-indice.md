# 6A · El libro y la gerencia: pantalla por pantalla

Resumen, Diferidos, Producción, Configuración, Mi perfil y Conectores, con capturas anotadas del demo (`AHORA = 2026-10-02T14:00-05:00`). Cada número de una captura remite a la fila del mismo número en la tabla de su pantalla (la numeración es por pantalla; las variantes reusan el número de la fila que explican). Las fórmulas están en los capítulos del motor —**5A** libro, **5B** paradas y agua, **5C** salud y vigía, **5D** entradas y salidas—: aquí se remite a la ficha y se da el valor exacto de la captura, el texto según el valor (con archivo:línea) y el endpoint → campo (capítulo 7). Todos los números salieron de correr el motor (`scripts/.doc-F-*.mjs`, ya borrados) o de la pantalla generada.

| Archivo | Pantalla | Roles | Capturas (en `../img/`) |
|---|---|---|---|
| [01-resumen.md](01-resumen.md) | 6A.1 Resumen del activo | gerente (decisión) | `ger-resumen-portafolio`, `ger-resumen-ceiba`, `ger-resumen-morichal-trimestre`; globos `ger-resumen-ceiba-globo-cierre`, `ger-resumen-ceiba-globo-rango`, `ger-resumen-portafolio-globo-servicios` |
| [02-diferidos.md](02-diferidos.md) | 6A.2 Libro de diferidos | gerente; producción, mantenimiento, confiabilidad | `ger-diferidos-ceiba`, `ger-diferidos-ceiba-cerrado`, `ger-diferidos-portafolio-doce`, `prod-diferidos-ceiba`, `jefe-diferidos-portafolio`, `conf-diferidos-morichal`; globos `prod-diferidos-ceiba-globo-cifra`, `-globo-rango`, `-globo-identificado`, `-globo-factor` |
| [03-produccion.md](03-produccion.md) | 6A.3 Producción contra plan (y cotejo con la asignación oficial) | gerente; producción | `ger-produccion-ceiba`, `prod-produccion-ceiba`, `prod-produccion-ceiba-cerrado`, `prod-produccion-palmar-doce`, `prod-produccion-portafolio-ytd`, `prod-produccion-asignacion-cotejo`*, `prod-produccion-asignacion-errores`*; globos `prod-produccion-ceiba-globo-dia`, `-globo-meta` |
| [04-configuracion.md](04-configuracion.md) | 6A.4 Metas, accesos y configuración | gerente; administrador | `ger-configuracion-ceiba`, `ger-configuracion-firma`*, `ger-configuracion-firmada`*, `ger-configuracion-plan`*, `ger-configuracion-plan-borrador`*, `ger-configuracion-accesos`, `ger-configuracion-invitar-errores`*, `adm-configuracion-ceiba`, `adm-configuracion-metas`, `adm-configuracion-cambio`*, `adm-configuracion-morichal` |
| [05-perfil.md](05-perfil.md) | 6A.5 Mi perfil | todos | `adm-perfil-ceiba`, `jefe-perfil-ceiba-oscuro`, `adm-perfil-globo-foco` |
| [06-conectores.md](06-conectores.md) | 6A.6 Conectores y tags del campo | administrador | `adm-conectores-ceiba`, `adm-conectores-ceiba-inscribir`, `adm-conectores-morichal` |
| [07-huecos.md](07-huecos.md) | 6A.7 Huecos y dudas | — | — |

\* Capturas que necesitan escribir en una caja (pegar un CSV, editar una meta, un motivo): están en `CAPTURAS_ESCRITAS`, con pasos `escribir` y `elegir` que el generador sabe hacer.

**Cómo se regeneran** (desde la raíz del repositorio):

```bash
npm run pantallazos:doc -- --solo ger-   # o prod-, jefe-, conf-, adm-
npm run pantallazos:doc -- --capturas docs/backend/capturas/06a-libro-gerencia.mjs
```

Las 42 salen así, las 8 escritas incluidas.

## Lo que hay que llevarse de este capítulo (para el servidor)

- **Un solo libro por período** (`GET /api/vistas/diferidos`) alimenta el Resumen, el encabezado de Diferidos, la cabecera de Producción y todos los Paretos; la serie mensual alimenta Tendencia, Mes a mes, el factor y el cuadre mensual. El front solo divide por días, compara contra la meta y formatea.
- **«Ahora» no depende del período**: perdiéndose ahora, causa mayor, en riesgo (`/vistas/riesgo`, `/vistas/estado`), el real del último día (`ayer`), «antes → con TRIM» y «mantenimiento proactivo» (desde la puesta en marcha) son iguales en cualquier período.
- **El sello sale de los códigos de `motivos`**, nunca de su frase; la frase la redacta el servidor y se muestra tal cual en los globos y en el papel.
- **Las marcas de prioridad del Pareto por equipo vienen de `/vistas/equipos-hoy`** (severidad de hoy), no del libro.
- **Lo que se escribe a mano tiene su regla en los dos lados**: el front avisa (diferencias, validación, lectura del CSV y del presupuesto) y el servidor decide; sus 422 son los textos que la pantalla muestra.
- **Fijos del front que el servidor tendrá que dar**: estado de las conexiones SAP/WhatsApp, hora de sincronización, número de WhatsApp de la operación, fecha de puesta en marcha (07-huecos.md §B).
