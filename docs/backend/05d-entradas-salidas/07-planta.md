# 5D.7 · Planta: el esquema por campo y sus cambios

El esquema de planta es la **topología** de cada campo: su tronco (pozos → manifold → separador), sus tres trenes (gas, crudo, agua) y sus servicios industriales (energía, aire de instrumentos). **No cambia ningún cálculo de barriles**: sirve para ver dónde está cada equipo, qué captura datos, qué falta por instrumentar y qué tubería se quedó sin flujo cuando un equipo se detuvo. En el tren de agua está la bomba de reinyección y su tanque: si la bomba para, la tubería aguas abajo queda «sin flujo» y el nivel del tanque solo puede subir.

**No hay coordenadas a mano**: cada campo declara **qué tiene** y `armar()` calcula dónde va cada cosa. Agregar un pozo, un tanque o una máquina cambia el dibujo solo.

Código: `src/entities/planta.ts` (613 líneas), `src/pages/Planta.tsx` (566), `src/widgets/configuracion/Esquema.tsx`, `src/app/store.ts:289-297` (`usePlanta`), `src/shared/api/escrituras.ts:450-479` (`cambiarPlanta`).

---

## 1. El modelo

```ts
// src/entities/planta.ts:9-62, 572-579 (resumido)
type Corriente = 'multi' | 'crudo' | 'gas' | 'agua' | 'elec' | 'aire'
type Simbolo = 'pozos'|'manifold'|'separador'|'depurador'|'tratador'|'tanque'|'medicion'|'compresor'|'bomba'|'inyeccion'|'tea'|'subestacion'|'aire'|'salida'
interface Miembro { id; etiqueta; equipo? /* equipo del catálogo: sin él, configurado pero sin instrumentar */; pie?; nivelDe?: { tag; tope }; fluido?: Corriente; pmo? /* punto de medición oficial */ }
interface Elemento extends Miembro { simbolo: Simbolo; rama? /* cuelga y no continúa la cadena: la tea */; miembros?: Miembro[]; restantes?: { cuantos; etiqueta } }
interface PlantaCampo { tronco; gas; crudo; agua; servicios: Elemento[]; caudales: Caudales; chokes: Chokes; nota: string }
interface CambioPlanta { id: number; fecha; por; campo; cambio /* texto */ }
```

| Campo | Tronco | Gas | Crudo | Agua | Servicios | Nota |
|---|---|---|---|---|---|---|
| ceiba | pozos (LC-14 ESP, LC-09 ESP, LC-21 bombeo mecánico + 15 «en la pantalla de pozos»), manifold, separador V-101 | depurador, tea (rama), compresor C-401, gas a venta | tratador H-302, tanques (TK-102 · PMO-02 instrumentado, TK-101 respaldo sin instrumentar), LACT-01 (PMO-01), oleoducto | bomba de reinyección P-201B, tanque de agua, pozos inyectores | SE-2, K-101 | «La bomba que mueve el agua no tiene respaldo: si para, el tanque se llena y se cierran los pozos. Es el cuello de botella del campo.» |
| morichal | pozos (4 ESP + 37), **MPP-301 multifásica**, manifold, separador | igual que ceiba | tanques TK-102, TK-101, TK-103 (PMO-03 sin instrumentar) | P-201B, tanque, inyectores | SE-2, K-101 | «Manda el levantamiento: 41 pozos con bomba electrosumergible. El compresor de gas, sin respaldo, ya cerró pozos cuando paró.» |
| guacamayo | pozos (2 ESP + 10), manifold, separador | depurador, tea (sin compresor ni venta) | tratador, TK-102, LACT, oleoducto (nominación restringida) | P-201B, tanque, inyectores | SE-2, K-101 | «Sin compresión: el gas va a consumo propio y el excedente a tea…» |
| palmar | pozos (2 bombeo mecánico + 5), manifold, **separador de agua libre** | **ninguno** | tratador, TK-102, LACT, oleoducto | P-201B, tanque, inyectores | SE-2, K-101 | «Campo chico de bombeo mecánico, sin tren de gas, con holgura en crudo y agua.» |
| zarza | pozos de gas (2 + 7), manifold, separador | depurador, tea, compresor, gas a venta (nominación por debajo) | tanque de condensado TK-102, LACT, oleoducto | P-201B, tanque, inyectores | SE-2, K-101 | «Campo de gas: … Su restricción típica es comercial (la nominación del comprador)…» |

Cada campo trae además `caudales` (crudo, agua, gas y sus capacidades) y `chokes` (los cuatro cuellos de botella NSTA/SPE: pozos, planta, evacuación, mercado), que son de la ficha del campo, no de este capítulo.

**Quién lo entrega.** Servidor: `GET /api/catalogo` → `campos[campo].planta` (un campo sin esquema **no** trae `planta`: hueco, nunca la de otro campo). Los cambios: `GET /api/planta/cambios` (arranque).

---

## 2. La pantalla de Planta

### Equipos que capturan datos y configurados sin datos

**Qué es.** El conteo y las dos listas que dicen cuánto de lo configurado está de verdad midiendo.

**Dónde se ve.** `#/{prod|conf|adm}/planta/{campo}/…`, panel «ESQUEMA DE PLANTA» (extra = destino del gas, p. ej. «gas a venta»): «**{n} de {total}**» con casillas, leyenda «captura datos» (caja llena) / «configurado, sin datos» (caja punteada), y las listas «capturan» y «CONFIGURADOS SIN DATOS».

**Fórmula.** Se recorren todos los elementos y miembros (tronco, gas, crudo, agua, servicios), salvo el grupo de pozos (cada pozo tiene su propio controlador) y lo que es solo proceso o límite de batería (`salida`, `manifold`, `tea`, `inyeccion`, `pozos`):

$$ \text{captura}(e) \iff e.\text{equipo existe hoy} \land e.\text{instrumentado} \land \exists\, d \in e.\text{dispositivos}: d.\text{estado} \ne \text{«sin señal»} $$

El **tanque de agua** (`tanqueAgua`) se resuelve por la configuración firmada: el tanque de la bomba de **reinyección** del campo (`tanqueDe(config, campo, bomba)`); captura si `/vistas/campos/:campo/ahora` trae su nivel; si el tanque está configurado pero sin lectura → «sin señal · {tagNivel}». Lo demás sin datos dice «sin señal» (equipo sin lectura) o «sin instrumento» (sin equipo asociado).

**Ejemplo con los datos del demo.** (Corrido con el estado de AHORA.)

| Campo | Capturan / total | Sin datos | Tanque de agua |
|---|---|---|---|
| La Ceiba | **9 de 11** | depurador (sin instrumento), TK-101 (sin instrumento) | TK-AG-CE, LT-2012 = 89,6 % (alto-alto 90 %), bomba P-201B **detenida** (severidad 1) |
| Morichal Norte | 10 de 13 | depurador, TK-101, TK-103 | TK-AG-MN 61,8 % |
| Guacamayo | 8 de 9 | depurador | TK-AG-GU 42,3 % |
| El Palmar | 7 de 7 | — | (sin tanque de agua configurado) |
| La Zarza | 7 de 8 | depurador | (sin tanque de agua configurado) |

**Casos borde.** El tanque de agua sube a la lista visible (nunca detrás de «ver más») si está a menos de 10 puntos de su alto-alto (90 % → 80 %) **o si la bomba que lo vacía está detenida** (entonces solo puede subir): La Ceiba hoy cumple las dos. Nivel ≥ alto-alto → severidad 1 (P1 ◆ alarma).

**Qué texto se muestra según el valor.** Gris es normal; el color aparece solo con condición anormal, siempre con su forma (ISA-101). Un equipo en marcha y sin nada anormal lleva **solo su código**; en marcha con algo, lo que acompaña («degradado», «succión cayendo»); detenido o sin lectura, el estado entero. Pie de caja recortado a 24 caracteres.

**Quién lo calcula.** Front (sobre `GET /api/vistas/equipos-hoy`, `GET /api/vistas/campos/:campo/ahora` y el catálogo).

**Referencia.** `src/pages/Planta.tsx:36-155`.

### Tuberías «sin flujo»

**Qué es.** Una tubería (línea entre dos nodos) se pinta quieta (`detenido`, opacidad baja) cuando el equipo de aguas arriba **o** el de aguas abajo está detenido (`marcha = detenido`); un conjunto (cluster de pozos, tanques) **no** se detiene porque falle un miembro.

**Qué texto se muestra.** Globo de la tubería: «{Corriente} · {de} → {a}», filas «Corriente», «Viene de», «Va a», «Caudal ahora» (crudo y agua en bbl/d de ahora; gas: «gas sin medición»; sin medidor: «sin medidor en línea»), «Estado: sin flujo | corriendo»; pista «Sin flujo: el equipo de aguas arriba está detenido.». El rótulo de caudal de cada corriente va en su tubería más a la derecha que esté corriendo. En La Ceiba hoy (P-201B detenida) salen quietas las tres tuberías que tocan la bomba (separador → bomba, tratador → bomba y bomba → tanque de agua); la que sale de la bomba lleva además el aviso «SIN FLUJO» junto al equipo (en vez del rótulo de caudal) con la marca de su severidad. Los caudales de ahora (`/vistas/campos/ceiba/ahora`) son 0 bbl/d de crudo y 0 de agua.

### Perfil sin gas (y gas que no se vende)

`usePlanta` aplica el **perfil firmado** antes de dibujar (`store.ts:289-297`):

$$ \text{gas}=\text{no} \Rightarrow \text{tren de gas vacío}; \qquad \text{gas} \ne \text{venta} \Rightarrow \text{se quita la salida «Gas a venta»} $$

El texto bajo el panel dice «Este campo no tiene tren de gas.» (gas = no) o «El gas no se mide en esta fase.». Corrido: El Palmar (`gas: no`) arma solo las bandas «Tren de crudo» y «Tren de agua» (sin reservar el carril de gas: el crudo sube); Guacamayo (`consumo`) no tiene salida de venta en su esquema. En Configuración, el perfil avisa si no cuadra con el esquema (5D.2 §4).

---

## 3. Cambios del esquema (`POST /api/planta/cambios`)

### Aplicar un cambio (`aplicarCambioPlanta`)

**Qué es.** El administrador registra pozos, tanques o máquinas en el esquema. Se manda **la operación**, no la planta entera, y el servidor la aplica con estas mismas reglas sobre la planta que él tiene.

**Dónde se ve.** Configuración → «Configuración técnica» → «Esquema de planta» (desplegable «topología · no cambia cálculos»), con un panel por conjunto («{n} configurados», formulario «Nombre · p. ej. LC-22 · ESP» + «Equipo instrumentado» + «Agregar») y uno por tren («{n} elementos», formulario tipo + nombre opcional + equipo + «Montar»; papelera por elemento). Panel «CAMBIOS DEL ESQUEMA» (extra = cantidad): «{por} {cambio} · {fechaHora}», del más nuevo al más viejo. Solo edita quien tiene `conector:configurar`; sin esquema: «Este campo no tiene esquema de planta registrado.».

**Fórmula (operaciones y reglas).**

| `tipo` | Cuerpo | Regla | Rechazo (texto exacto) | Texto del historial |
|---|---|---|---|---|
| `agregar-miembro` | `{ grupo, miembro: Miembro }` | id no vacío; id **único en todo el campo** (elementos y miembros de todos los trenes); el grupo existe y es un conjunto (tiene `miembros`) | «Escriba el nombre: de él sale el identificador.» · «Ya hay un elemento {id} en este campo: use otro nombre.» · «Ese conjunto no existe en este campo.» | «agregó {etiqueta} ({id}) a {grupo}» |
| `quitar-miembro` | `{ grupo, miembro: id }` | el miembro está en ese conjunto | «{id} no está en ese conjunto.» | «quitó {id} de {grupo}» |
| `agregar-elemento` | `{ tren, elemento: Elemento }` | id único en el campo | «Ya hay un elemento {id} en este campo.» | «montó {etiqueta} ({id}) en el tren {tren}» |
| `quitar-elemento` | `{ tren, id }` | el elemento está en ese tren | «{id} no está en ese tren.» | «quitó {id} del tren {tren}» |

Secuencia del servidor (`escrituras.ts:456-479`): `conector:configurar` («El esquema de planta lo edita el administrador de la implementación.», 403) → persona activa (403) → campo asignado («Ese campo no lo tiene asignado.», 403) → el campo tiene esquema («Ese campo no tiene esquema de planta.», 404) → `aplicarCambioPlanta` (rechazo: 409 si el id está repetido, 422 si el elemento o el conjunto no está) → guardar `CambioPlanta { id consecutivo, fecha, por: "{nombre} · {rol}", campo, cambio: texto }` → `{ datos: { planta, cambio } }`.

En pantalla, el id de un miembro sale del primer tramo del nombre (`idLimpio`: «LC-22 · ESP» → `LC-22`, mayúsculas, espacios a guiones, solo `A-Z0-9-`, 14 caracteres); el de un elemento nuevo, `{símbolo}-{Date.now() en base 36}`; la tea va como `rama`; un tanque del tren de agua lleva `fluido: agua` y uno del de crudo `crudo`. Tipos que se pueden montar por tren: gas (depurador, compresor, tea, gas a venta), crudo (tratador, tanque, LACT, oleoducto), agua (bomba de reinyección, tanque de agua, pozos inyectores), servicios (subestación, sistema de aire). El tronco no se edita desde la pantalla.

**Ejemplo con los datos del demo.** (Corrido sobre el esquema de La Ceiba.) Agregar `LC-30 · ESP` a `pozos` → «agregó LC-30 · ESP (LC-30) a pozos»; agregar `LC-14` → «Ya hay un elemento LC-14 en este campo: use otro nombre.»; id en blanco → «Escriba el nombre: de él sale el identificador.»; agregar un miembro a `manifold` → «Ese conjunto no existe en este campo.»; quitar `LC-21` → «quitó LC-21 de pozos»; quitar `LC-99` → «LC-99 no está en ese conjunto.»; montar `filtro` «Filtro de cáscara de nuez» en agua → «montó Filtro de cáscara de nuez (filtro) en el tren agua»; montar otro `bomba` → «Ya hay un elemento bomba en este campo.»; quitar `tea` del gas → «quitó tea del tren gas»; quitar `bomba` del gas → «bomba no está en ese tren.».

**Casos borde.**
- **Sin motivo.** A diferencia de la configuración firmada, los accesos y la asignación oficial, un cambio de planta **no lleva motivo** en el cuerpo ni en el historial (`CambioPlanta` no tiene `motivo`). Ver «Huecos y dudas».
- **Sin versión base.** No hay `base` como en la configuración: dos administradores editando a la vez se aplican en orden de llegada; como se manda la operación (no la planta entera), no se pisan, pero un «quitar» puede fallar si el otro ya quitó (422).
- El servidor no debería aceptar quitar del tronco el separador ni elementos que dejan la topología inconexa; el front no lo ofrece, pero `aplicarCambioPlanta` lo permite (`quitar-elemento` con `tren: 'tronco'`).
- Ids que vienen del cliente: el servidor puede reemplazar el de un elemento nuevo por uno suyo (el del miembro sí es el nombre del pozo).

**Quién lo calcula y por dónde viaja.** Servidor (`aplicarCambioPlanta` está en «Los dos»). Tabla `cambio_planta` (clave `id`; solo se inserta; **la planta vigente es el resultado** de aplicar los cambios sobre la de arranque del catálogo). El front copia a su sesión la `planta` y el `cambio` que devuelve el servidor.

**Referencia.** `src/entities/planta.ts:562-613`; `src/widgets/configuracion/Esquema.tsx`; `CONTRATO.md` · «`POST /api/planta/cambios`».
