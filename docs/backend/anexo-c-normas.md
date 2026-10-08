# Anexo C. Normas y referencias que usa el sistema

Solo las que el código cita y aplica. La columna «Dónde» dice el archivo o la regla; el capítulo con la fórmula, entre paréntesis.

## Medición y asignación

| Norma | Para qué se usa | Dónde |
|---|---|---|
| **Res. MME 40236 de 2022** (Ministerio de Minas y Energía de Colombia), Anexo 2 | Banda del factor de asignación según la gravedad API del crudo y el volumen (Fig. 10.2: ≤ 22,3 °API y ≥ 1.000 bpd → ±15 %; > 22,3 °API → ±5 %), tolerancia del diferido (Tabla 10, **Ecuación 22**: raíz de la suma de las incertidumbres al cuadrado), límites de entrega del crudo (BS&W ≤ 0,5 %, sal ≤ 20 PTB) | `src/entities/metrologia.ts`, `src/entities/libro.ts`, `src/shared/config/region.ts` (5A) |
| **API MPMS 13.3** (*Manual of Petroleum Measurement Standards*, cap. 13.3, incertidumbre de medición) | Presupuesto de incertidumbre propio del punto de medición: si está demostrado, reemplaza la banda regulatoria | `src/entities/metrologia.ts` (5A) |
| **ISO 5168** (incertidumbre de medición de flujo) | Ídem | `src/entities/metrologia.ts` (5A) |
| **ISO/TS 3250** (eficiencia de producción) | Definición de eficiencia: real ÷ potencial | `src/shared/config/region.ts` (5A) |
| **NSTA / SPE** (*North Sea Transition Authority* y Society of Petroleum Engineers: los cuatro cuellos de botella de la producción) | El «choke» de cada campo: Pozos, Planta, Evacuación, Mercado | `src/entities/tipos.ts` (`Campo.choke`), registro de campos (2.5) |
| **PRODML** (Energistics) | Casillas de pérdida de producción (*ReasonLost*) para el reporte | `CONTRATO.md` «Reporte con PRODML» (anexo A) |

## Equipos y fallas

| Norma | Para qué se usa | Dónde |
|---|---|---|
| **ISO 14224** (datos de confiabilidad y mantenimiento de equipos de petróleo y gas) | Clases de equipo, ítems mantenibles (partes), **Tabla B.6** modos de falla, **Tabla B.2** mecanismos, **Tabla B.3** causas raíz; catálogo de daños y análisis | `src/entities/iso14224.ts`, `src/entities/catalogo.ts`, `src/entities/partes.ts` (5C) |
| **API 610** (bombas centrífugas) | Límites de vibración (Tabla 8) y de operación de bombas de la línea | `src/entities/limites.ts`, catálogo de partes (5C) |
| **API 676** (bombas de desplazamiento positivo rotativas: doble tornillo) | Instrumentos (Anexo G) y desgaste (Anexo B) de las multifásicas de tornillo | perfiles de bomba, `src/entities/partes.ts` (5C) |
| **API 682** (sistemas de sello de bombas) | Banda y alarma del sistema de sello | límites de los tags del sello (5C) |
| **API 614** (sistemas de lubricación) | Parte «lubricación» | `src/entities/partes.ts` (5C) |
| **API RP 14J** e **ISA-7.0.01** (diseño de instalaciones de producción; calidad del aire de instrumentos) | El aire de instrumentos como servicio que, si cae, para la planta | equipos de servicio (5B) |
| **API 2350** (protección contra sobrellenado de tanques) | La protección es del instrumento independiente de nivel alto-alto: **TRIM vigila, no protege** | tanques de agua (5B) |
| **SPE 219556** (Camilleri) y **SPE 146784** | La corriente del variador avisa antes que la presión y la temperatura en una electrosumergible; el gas comprimido calienta la bomba con fracción de gas alta | `src/entities/esp.ts`, `src/entities/partes.ts` (5C) |

## Alarmas, pantallas y accesibilidad

| Norma | Para qué se usa | Dónde |
|---|---|---|
| **ISA-18.2** (gestión de alarmas) | Prioridades 1/2/3, base maestra de alarmas (el punto de alarma de cada tag lo firma ingeniería de confiabilidad), una alarma no se esconde | `src/shared/ui/Prioridad.tsx`, `src/shared/ui/listaCorta.ts`, `src/entities/limites.ts` (8.4, 8.7) |
| **ISA-101** (interfaces humano-máquina de alto desempeño) | Lo normal en gris, el color solo para lo anormal, prioridad con color + forma + número, indicador analógico, resolución de los decimales (Tabla 7), dato inválido aparte | `src/shared/ui/*`, `src/index.css` (8) |
| **WCAG 2.2** (accesibilidad web): 1.4.11, 1.4.13, 2.1.1, 2.4.3, 2.4.7, 2.5.8, 3.3.1 | Contraste de la forma de las marcas, globos alcanzables con teclado, foco visible, blancos de toque de 24 px, errores en texto | componentes compartidos (8.8) |

## Datos y cable

| Norma | Para qué se usa | Dónde |
|---|---|---|
| **ISO 8601** | Fechas con zona en todo el cable | `src/shared/api/cable.ts` (2.9) |
| **E.164** (UIT) | Formato de los teléfonos de WhatsApp: se guardan, viajan y se comparan así | `src/entities/usuarios.ts` (5D) |
| **Sparkplug B** sobre **MQTT** (Eclipse) | Certificado de nacimiento del borde y transporte de los datos del campo | `simulador-api/`, registro de la cadena (4) |
| **SHA-256** (FIPS 180-4) | Huella de los informes | `src/entities/informe.ts` (5D) |
| **Meta WhatsApp Cloud API**: plantillas de categoría utilidad, ventana de 24 h, webhook con `X-Hub-Signature-256` | Mensajes que inicia la empresa y respuestas | `src/entities/mensajes.ts`, anexo A «WhatsApp» (5D) |
