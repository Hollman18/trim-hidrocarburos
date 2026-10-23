# Anexo C. Normas y referencias que usa el sistema

Solo las que el código cita y aplica. La columna «Dónde» dice el archivo o la regla; el capítulo con la fórmula, entre paréntesis.

## Medición y asignación

| Norma | Para qué se usa | Dónde |
|---|---|---|
| **Res. MME 40236 de 2022** (Ministerio de Minas y Energía de Colombia), Anexo 2 | Banda del factor de asignación según la gravedad API del crudo y el volumen (Fig. 10.2: ≤ 22,3 °API y ≥ 1.000 bpd → ±15 %; > 22,3 °API → ±5 %), tolerancia del diferido (Tabla 10, **Ecuación 22**: raíz de la suma de las incertidumbres al cuadrado), límites de entrega del crudo (BS&W ≤ 0,5 %, sal ≤ 20 PTB) | `src/entities/metrologia.ts`, `src/entities/libro.ts`, `src/shared/config/region.ts` (5A) |
| **API MPMS 13.3** (*Manual of Petroleum Measurement Standards*, cap. 13.3, incertidumbre de medición) | Presupuesto de incertidumbre propio del punto de medición: si está demostrado, reemplaza la banda regulatoria | `src/entities/metrologia.ts` (5A) |
| **ISO 5168** (incertidumbre de medición de flujo) | Ídem | `src/entities/metrologia.ts` (5A) |
| **ISO/TS 3250** (eficiencia de producción) | Definición de eficiencia: real ÷ potencial; en el modelo choke, la PE = real ÷ potencial del sistema | `src/shared/config/region.ts` (5A); `src/entities/choke-reparto.ts` (5E.4) |
| **PRODML** (Energistics) | Casillas de pérdida de producción (*ReasonLost*) para el reporte | `CONTRATO.md` «Reporte con PRODML» (anexo A) |

## El modelo choke y la clasificación ANH

| Norma | Para qué se usa | Dónde |
|---|---|---|
| **SPE-36848** (Palen y Goodwin, BP, 1996) | **La fuente del modelo choke**: la producción como una tubería en serie (reservorio → pozos → planta → exportación) en la que lo que limita es el tramo más estrecho; su modelo expandido abre cada tramo en niveles más bajos («down to at least another level e.g. ESP failure») y propone un modelo aparte para la inyección de agua. Es el modelo que **adopta la Circular ANH 0024** (C24 p. 4): sus cuatro tramos son los valores de `choke_mod` (RESERVORIO, POZO, PLANTA, EXPORTACION) | `src/entities/choke.ts`, `choke-arbol.ts`, `choke-agua.ts` (5E.1, 5E.5, 5E.6) |
| **NSTA** (North Sea Transition Authority, Reino Unido), *UKSS Production Efficiency Section Guide 2025* | **La variante británica** que volvió el modelo un reporte regulado: pozos (con el yacimiento), planta, exportación y **«Mercado»** (el terminal o el cliente no recibe, la nominación), que la ANH no tiene y en TRIM es un subnivel de afuera, nunca un quinto tramo. De ella salen el potencial del sistema (§5.3), el empate que se explica por escrito (§5.4), la capacidad instalada que no baja por una parada (p. 29) y el cierre del reparto en 2,5 % (§6.2). Su frontera pozo/planta (la red eléctrica es planta) **no** es la de TRIM, que usa el criterio dedicado/compartido de la operadora | `src/entities/choke.ts` (`dominanteDe`, `PARAMETROS_CHOKE`), `choke-reparto.ts` (5E.2, 5E.4) |
| **Patente US 8,195,401 B2** | Los escalones de la brecha (desarrollo, desempeño, disponibilidad planeada y no planeada, capacidad) | `src/entities/choke.ts` (`EscalonBrecha`) (5E.4) |
| **Circular ANH 0024 de 2026** (Agencia Nacional de Hidrocarburos), Tabla 1, y **Diccionario de Datos JSON V3.2** | Los seis pasos de la clasificación de cada fila de `paradas_pozo` (responsable, choke, impacto, planeación, N1, N2), las 20 causas N1 y los 117 detalles N2, el día operacional con corte a las 23:59:59, las dos formas de salida | `src/entities/anh-catalogo.ts`, `anh-clasificacion.ts`, `anh-paradas.ts` (5E.3, 5E.9) |
| **Res. ANH 0651** | Las 18 causas generales (`cau_gral_paro`) | `src/entities/anh-catalogo.ts` (5E.9) |

El campo `choke` del registro de campos (`Campo.choke`, «Pozos», «Planta», «Evacuación» o «Mercado»; 2.5) es solo descriptivo, lo que dice la operación: lo que limita lo calcula el motor (5E.2).

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
| **ISA-101** (interfaces humano-máquina de alto desempeño) | Lo normal en gris, el color solo para lo anormal, prioridad con color + forma + número, indicador analógico, resolución de los decimales (Tabla 7), dato inválido aparte. En la tubería del choke, todo en gris: lo que limita lleva doble contorno y la palabra, y lo que falta va en gris claro con raya discontinua | `src/shared/ui/*`, `src/index.css` (8); `src/widgets/choke/Tuberia.tsx`, `Ramas.tsx` (6D) |
| **WCAG 2.2** (accesibilidad web): 1.4.11, 1.4.13, 2.1.1, 2.4.3, 2.4.7, 2.5.8, 3.3.1 | Contraste de la forma de las marcas, globos alcanzables con teclado, foco visible, blancos de toque de 24 px, errores en texto | componentes compartidos (8.8) |

## Datos y cable

| Norma | Para qué se usa | Dónde |
|---|---|---|
| **ISO 8601** | Fechas con zona en todo el cable | `src/shared/api/cable.ts` (2.9) |
| **E.164** (UIT) | Formato de los teléfonos de WhatsApp: se guardan, viajan y se comparan así | `src/entities/usuarios.ts` (5D) |
| **Sparkplug B** sobre **MQTT** (Eclipse) | Certificado de nacimiento del borde y transporte de los datos del campo | `simulador-api/`, registro de la cadena (4) |
| **SHA-256** (FIPS 180-4) | Huella de los informes | `src/entities/informe.ts` (5D) |
| **Meta WhatsApp Cloud API**: plantillas de categoría utilidad, ventana de 24 h, webhook con `X-Hub-Signature-256` | Mensajes que inicia la empresa y respuestas | `src/entities/mensajes.ts`, anexo A «WhatsApp» (5D) |
