# Correcciones del QA adversarial (tanda 5)

**22-oct-2026 · Coordinador.**

Entrada: `QA-A-motor.md` (15 hallazgos), `QA-B-experiencia.md` (54) y `QA-C-contrato-seguridad.md` (29). Cada agente lee los informes completos: cada hallazgo trae su prueba y su arreglo sugerido. Aquí van las DECISIONES y QUIÉN arregla qué.

Norte: bajar los barriles diferidos y perdidos de las paradas NO planificadas de los equipos críticos. El árbol de causas cuelga del choke. El reporte a la ANH es valor agregado. El motor calcula y la pantalla pinta.

## Decisiones del coordinador

**D1 · Lo que dicen las personas se guarda por PASO, solo por inserción, y nunca se borra ni se copia a nombre de otro** (C-01, C-02, C-03, C-05, C-06, B-04).
- **Una escritura guarda solo los pasos que esta persona dijo en esta petición**, con su nombre y su hora.
  - El alcance es una fila o un evento.
  - «Para la cascada» = una escritura por evento de la cascada. El cuerpo trae los `ids` que la pantalla mostró, y el servidor escribe solo en esos; si la raíz trae más, responde 409.
- **Lo que rige en una fila, paso por paso:** lo más reciente dicho por una persona entre la clave de la fila y la de su evento. Si no hay nada, lo que propone TRIM. El tramo de exceso solo usa lo suyo.
  - Es la regla que el SQL ya casi tiene (`v_clasificacion_fuente` + el trigger): se ajusta a «por paso, lo más reciente».
  - `guardarClasificacion` (TS) se reescribe con esta regla.
- **Si la escritura cambiaría lo que OTRA persona dijo en otra fila o evento:** 409, diciendo cuáles, salvo que traiga motivo. En ese caso queda registrado como corrección con motivo.
- **Cuando un cambio invalida lo que dijo otra persona** (por ejemplo, «¿Planeada?» deja incoherente su causa), no desaparece nada:
  - se pide motivo;
  - el paso invalidado queda con procedencia nueva `retirado` (quién y motivo), que lo devuelve a lo que propone TRIM.
- **La revisión («Algo está mal», «Pedir a producción») y la respuesta de campo nunca tocan pasos.** La única excepción es el paso que la respuesta determina; ese queda `declarado` a nombre de quien contestó, y ningún otro paso dice «confirmó» (B-04).
- **El yacimiento y la marca de lote nunca se copian a otro pozo.**

**D2 · `desc_evid` nunca lleva texto libre de una persona** (C-04). Se arma solo con lo estructurado (la evidencia de TRIM y los roles). El texto libre se queda adentro (motivo, porqué) y no viaja a la ANH ni a ningún informe o exportación.

**D3 · El potencial de los pozos para el choke = Σ de la prueba vigente** (× un factor de medición fijo y firmado, por defecto 1), nunca el factor de asignación del mes (QA-A-02).
- Se usa para lo que limita, la holgura, lo estructural y la PE.
- El libro sigue valorando el diferido con su factor: son dos preguntas distintas. El ⓘ de «Los pozos» lo dice.
- Revisa con cuidado: cambia cifras de pantalla y de referencia.

**D4 · El indicador del norte tiene UNA sola cifra en el motor** (QA-A-03): el escalón `disponibilidad-no-planeada`, calculado por fila con la clasificación vigente.
- Lo leen todas las vistas: la tubería, Diferidos, el gerente, el mes a mes y la línea base.
- `Libro.noPlaneado` se rotula «no programado (libro)».
- Lo sin identificar NO cuenta como no planeado.
- La planeación de la ANH (paso 4) se queda en Regulatorio con su rótulo.

**D5 · Cuando el tramo de una parada no se sabe** (`chokeDeCausa` da `null`), el escalón sale de la causa (QA-A-05). El tramo sigue «sin identificar».

**D6 · «Si falla hoy»** (QA-A-04, B-06):
- LACT-01, TK-102 y C-401 → `bpd: null` con su motivo (U2 §6.3);
- un equipo con respaldo → 0 mientras el respaldo esté bien;
- las estimaciones (techos) en su propio grupo, después de las cifras medidas;
- los campos de gas, aparte;
- P-201A y P-201C quedan donde les toca.

**D7 · Rendimiento** (QA-A-15): ningún cálculo de más de 300 ms en el hilo principal con la CPU normal. Se calcula una vez por contexto y período, se guarda en memoria y se invalida con la versión de lo guardado.

## Quién arregla qué

| Agente | Cuándo | Hallazgos | Archivos |
|---|---|---|---|
| **F2-A · escrituras, persistencia, SQL, privacidad y contrato** | Fase 1, en paralelo con F2-B | C-01 a C-07, C-10, C-11 a C-28 (menos C-08); B-04, B-05, B-33 (WhatsApp) | `src/shared/api/escrituras.ts`, `arbol.ts`, `contrato.ts`; `src/entities/anh-paradas.ts`, `anh-clasificacion.ts`, `anh-calidad.ts`, `roles.ts`; `src/widgets/whatsapp/*`; `src/app/store.ts`; `CONTRATO.md`; `docs/backend/sql/*`; `scripts/verificar-contrato.mjs`, `verificar-arbol.mjs` |
| **F2-B · motor del choke y números** | Fase 1, en paralelo con F2-A | QA-A-01 a QA-A-15; C-08, C-09, C-29; la parte de motor de B-06, B-11, B-12, B-14, B-16, B-17, B-18 y B-22 | `src/entities/choke.ts`, `choke-arbol.ts`, `criticidad.ts`, `capacidades.ts`, `choke-agua.ts`, `choke-config.ts`; `src/shared/api/choke.ts`; `scripts/verificar-libro.mjs`; `scripts/referencia.mjs` y `referencia/*` (regenera AL FINAL, cuando el coordinador le avise que F2-A terminó) |
| **F2-C · experiencia** | Fase 2, sola, cuando terminen F2-A y F2-B | Todos los de QA-B que quedan (B-01 a B-54) y lo que F2-A o F2-B pidan a pantalla | `src/pages/*`, `src/widgets/*`, `src/index.css`, `Onboarding`, e2e |

## Reglas
- Al lado, nunca encima. Nada inventado.
- Cada arreglo lleva su prueba, y la prueba falla sin el arreglo: se prueba el resultado, no el mecanismo.
- Al terminar: `npx tsc -b` (nunca `--noEmit`), `npx oxlint src` y `npm test`. Las e2e completas las corre el coordinador al cierre de cada fase.
- **NUNCA editar archivos mientras corren unas e2e:** Tailwind v4 recarga las páginas y el auditor ve pantallas vacías.
- No `npm i`. No commits: los hace el coordinador.
- Marca en este archivo, debajo de tu fila, cada hallazgo como hecho (con el archivo), decidido distinto (con el porqué) o fuera de alcance (con el porqué).
