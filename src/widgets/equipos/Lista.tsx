import { useId, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useApp, useAmbito, useRol } from '@/app/store'
import {
  useListaEquipos, FILTROS_ESTADO, NOMBRE_FILTRO, TIPOS_EQUIPO, NOMBRE_TIPO, TRENES, NOMBRE_TREN, PALABRA_CONDICION,
  type FilaEquipoTecnico, type TipoEquipo, type TrenEquipo, type VistaEquipos,
} from '@/shared/api/equiposTecnico'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { Hueco, Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { pantallaVisible } from '@/shared/config/producto'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { EnRiesgo } from '@/widgets/riesgo/EnRiesgo'
import { ID_EN_RIESGO, irAlAncla } from '@/widgets/riesgo/ancla'
import { useTelefono } from '@/shared/ui/telefono'
import { useFiltrosEquipos } from './filtros'
import { Pildoras, Tag, Marca, IrA } from './piezas'
import { useIrA } from './navegar'

/** La cifra de la fila (X5 §5.5): a la derecha, tabular, con lo que es debajo. Un
 *  pozo cerrado por otro equipo no lleva cifra propia: lo suyo va dentro de la de
 *  ese equipo, en gris (G-1b), y así la columna no cuenta dos veces lo mismo. */
function Cifra({ f, breve = false, sinTelefono = false }: { f: FilaEquipoTecnico; breve?: boolean; sinTelefono?: boolean }) {
  const c = f.cifra
  if (c.dentroDe) return (
    <span className="tabular max-w-[9.5rem] text-right md:max-w-none" data-cifra-fila data-dentro-de={c.dentroDe.equipo}>
      <small className="block text-[14px] leading-snug text-[var(--tinta2)]">{c.detalle}</small>
    </span>
  )
  return (
    // En el teléfono, la columna de la cifra no pasa de 152 px: lo que la acompaña baja de renglón y el nombre no se aprieta.
    <span className={cn('tabular max-w-[9.5rem] text-right md:max-w-none', sinTelefono && 'max-md:hidden')} data-cifra-fila>
      <b className="block whitespace-nowrap text-[18px] font-bold leading-tight">
        {c.valor === null ? <span className="text-[15px] font-semibold text-[var(--tinta2)]">sin dato</span>
          : <>{c.techo ? <span className="text-[14px] font-semibold">hasta </span> : null}{n0(c.valor)}<span className="ml-1 text-[13px] font-normal text-[var(--tinta2)]">bbl/d</span></>}
      </b>
      {/* K2 · En la cabeza, en el teléfono, sin «si falla hoy · después de 2 min de colchón»: lo dicen su título y su ⓘ. */}
      <small className={cn('block text-[13px] leading-snug text-[var(--tinta2)]', breve && 'max-md:hidden')}>{c.que}{c.detalle && c.valor !== null ? ` · ${c.detalle}` : ''}</small>
    </span>
  )
}

/** Lo que dice la cifra de una fila, para el lector de pantalla. */
const leerCifra = (c: FilaEquipoTecnico['cifra']) => c.dentroDe ? `se deja de producir ${c.detalle}`
  : c.valor === null ? `${c.que}: sin dato` : `${c.techo ? 'hasta ' : ''}${n0(c.valor)} barriles por día ${c.que}`

/** Una fila de equipo (X5 §5.5): `[marca] TAG · familia · palabra … cifra ›`. La
 *  marca va solo con condición (la lista no es mixta); «sin instrumento» lleva sus
 *  corchetes y su palabra en «¿Lo vigila TRIM?». Toda la fila abre el nivel 3.
 *  `breve`: para el gerente, «¿Lo vigila TRIM?» es «sí» o «no», sin variables de
 *  equipo (X4 §2; P-equipos-ger). */
export function FilaEquipo({ f, global, onAbrir, breve = false, enCabeza = false, esLaGrande = false }: {
  f: FilaEquipoTecnico; global: boolean; onAbrir: () => void; breve?: boolean
  /** Una de las tres de la cabeza de confiabilidad (P-02): no cuenta como fila de la lista. */
  enCabeza?: boolean
  /** K2 · Su cifra es la cifra grande de arriba: en el teléfono no se repite (queda en su nombre accesible). En la
   *  cabeza, en el teléfono, la cifra de las demás va en su segundo renglón, no en su columna. */
  esLaGrande?: boolean
}) {
  const vigila = breve ? (f.vigila ? 'sí' : 'no') : f.vigilaTexto
  const nombre = `${f.condicion ? `${PALABRA_CONDICION[f.condicion]}. ` : ''}${f.equipo}${global ? `, ${f.campoNombre}` : ''}: ${f.familia}, ${f.palabra}. ${leerCifra(f.cifra)}. ¿Lo vigila TRIM? ${vigila}.`
  return (
    <button type="button" onClick={onAbrir} aria-label={nombre} {...(enCabeza ? { 'data-fila-primero': f.equipo } : { 'data-fila-equipo': f.equipo })} data-campo={f.campoId} data-condicion={f.condicion ?? ''}
      className="grid min-h-14 w-full cursor-pointer grid-cols-[18px_minmax(0,1fr)_auto_20px] items-center gap-x-3 gap-y-1 border-t border-[var(--linea2)] py-2.5 text-left first:border-t-0 hover:bg-[var(--panel2)]/60 md:grid-cols-[18px_minmax(0,1fr)_170px_150px_20px]">
      <span className="self-start pt-1">{f.condicion ? <Marca c={f.condicion} decorativa /> : null}</span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <Tag className="text-[17px]">{f.equipo}</Tag>
          {global && <span className="text-[14px] text-[var(--tinta2)]">{f.campoNombre}</span>}
          <span className="text-[15px] text-[var(--tinta2)]">{f.familia}</span>
          {f.sinRespaldo && <Chip tono="fuerte">sin respaldo</Chip>}
        </span>
        {/* K2 · En la cabeza de confiabilidad, en el teléfono, la fila en un renglón: su condición y si TRIM la
            vigila. Lo de «sube porque…» y «se supone en marcha» ya lo dice la frase de arriba; entero, en la lista. */}
        <span className={cn('block text-[15px] leading-snug', enCabeza && 'max-md:hidden')}>
          {f.condicion && <span className="font-semibold">{PALABRA_CONDICION[f.condicion]} · </span>}{f.palabra}
          {f.sube && <span className="text-[var(--tinta2)]"> · {f.sube}</span>}
        </span>
        {enCabeza ? (
          // K2 · En el teléfono, el segundo renglón lleva solo lo que no es normal (la condición, «sin instrumento»;
          // que TRIM la vigile no se dice: gris lo normal) y su cifra, si no es la grande de arriba. Sin la columna
          // de la cifra, el nombre tiene el ancho entero y «electrosumergible» no se encima con ella a 320 px.
          (f.condicion || !f.vigila || (!esLaGrande && f.cifra.valor !== null)) && (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[14px] text-[var(--tinta2)] md:hidden" data-renglon-cabeza>
              {f.condicion && <span className="font-semibold text-[var(--tinta)]">{PALABRA_CONDICION[f.condicion]}</span>}
              {!f.vigila && <span className="inline-flex items-center gap-1.5">{f.condicion && <span aria-hidden>·</span>}<MarcaCondicion c="sin-instrumento" tamano={14} decorativa />sin instrumento</span>}
              {!esLaGrande && f.cifra.valor !== null && (
                <span className="tabular">{(f.condicion || !f.vigila) && <span aria-hidden>· </span>}<b className="text-[15px] font-bold text-[var(--tinta)]">{f.cifra.techo ? 'hasta ' : ''}{n0(f.cifra.valor)}</b> bbl/d</span>
              )}
            </span>
          )
        ) : (
          <span className="mt-0.5 flex items-center gap-1.5 text-[14px] text-[var(--tinta2)] md:hidden">
            {!f.vigila && <MarcaCondicion c="sin-instrumento" tamano={14} decorativa />}¿Lo vigila TRIM? {vigila}
          </span>
        )}
      </span>
      <span className="hidden items-center gap-1.5 text-[14px] text-[var(--tinta2)] md:flex" data-vigila={f.vigila ? 'si' : 'no'}>
        {!f.vigila && <MarcaCondicion c="sin-instrumento" tamano={14} decorativa />}{vigila}
      </span>
      <Cifra f={f} breve={enCabeza} sinTelefono={enCabeza} />
      <ChevronRight aria-hidden className="size-5 text-[var(--tinta3)] max-md:col-start-4" />
    </button>
  )
}

const coincide = (f: FilaEquipoTecnico, busca: string) => {
  const b = busca.trim().toLowerCase()
  return !b || f.equipo.toLowerCase().includes(b) || f.familia.toLowerCase().includes(b)
}

/** P-02 · La respuesta de confiabilidad, arriba de todo (X4 §3.4; X5 §5.1): el
 *  primero de «Si falla hoy» como cifra grande (bbl/d, D-2), la frase del motor
 *  y los tres primeros de la lista, cada uno con «›» a su nivel 3. Lo arma el
 *  motor (`primero`): aquí solo se pinta. */
function Primero({ v, global }: { v: VistaEquipos; global: boolean }) {
  const irA = useIrA()
  const id = useId()
  const p = v.primero
  if (!p) return null
  return (
    <section aria-label="Si falla hoy, lo primero" data-primero className="rounded-[20px] bg-[var(--panel)] px-5 pb-2 pt-4 sm:px-7 sm:pt-5">
      <div role="group" aria-labelledby={`${id}-cifra ${id}-unidad ${id}-frase`}>
        {/* K2 · «Si falla hoy»: que es lo primero ya lo dicen la cifra y «Ataque primero…». */}
        <p className="text-[17px] text-[var(--tinta2)]">Si falla hoy</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
          <b id={`${id}-cifra`} className="tabular text-[48px] font-bold leading-[1] tracking-[-.03em] sm:text-[54px]" data-cifra>{n0(p.valor)}</b>
          <span id={`${id}-unidad`} className="text-[20px] text-[var(--tinta2)]">barriles por día</span>
        </p>
        <p id={`${id}-frase`} className="mt-2 text-[19px] font-medium leading-snug" data-frase>{p.frase}</p>
        {/* K2 · El colchón («después de 2 min de colchón») es una salvedad de la cifra: va a su ⓘ. */}
        <p className="mt-1 flex items-center gap-1.5 text-[15px] text-[var(--tinta2)]" data-calidad-primero>
          calculado{p.detalle && <Info titulo="Si falla hoy" texto={`Lo que se dejaría de producir si falla hoy, ${p.detalle}.`} />}
        </p>
      </div>
      <div className="mt-2" data-primeros>
        {p.filas.map(f => <FilaEquipo key={`${f.campoId}|${f.equipo}`} f={f} global={global} enCabeza esLaGrande={!f.cifra.techo && f.cifra.valor === p.valor}
          onAbrir={() => irA({ campoId: f.campoId, equipo: f.equipo })} />)}
      </div>
    </section>
  )
}

/** Equipos (X4 §3.6, fusión 1): todos los equipos de los campos en una lista,
 *  ordenada por estado y por «Si falla hoy», con sus filtros. El motor la arma
 *  (`/vistas/lista-equipos`); aquí solo se filtra por lo que cada fila dice de sí.
 *  Para confiabilidad abre en su respuesta (P-02): el primero de «Si falla hoy»,
 *  el acierto del vigía y dónde va el próximo instrumento (P-10); al jefe, lo que
 *  no conviene intervenir hoy. Los filtros de estado quedan a la vista; el tipo,
 *  el tren y la búsqueda, detrás de «Más filtros» (una lista que se abre, no pestañas).
 *  Al jefe y a confiabilidad, debajo de la lista, lo que era su Riesgo (K1 · P-10). */
export function ListaEquipos() {
  const ambito = useAmbito(); const rol = useRol(); const telefono = useTelefono()
  const setPantalla = useApp(s => s.setPantalla)
  const irA = useIrA()
  const v = useListaEquipos(ambito.campos.map(c => c.id))
  const { estado, tipo, tren, busca, poner } = useFiltrosEquipos()
  const idBusca = useId(), idMas = useId()
  const extras = (tipo !== 'todos' ? 1 : 0) + (tren !== 'todos' ? 1 : 0) + (busca.trim() ? 1 : 0)
  // Abiertos si al llegar ya hay uno puesto (la miga del tren vuelve con su filtro) o si llega
  // uno de afuera (la dirección de Superficie pone «Servicios y proceso»): un filtro puesto se ve.
  const [mas, setMas] = useState(extras > 0)
  const [extrasAntes, setExtrasAntes] = useState(extras)
  if (extras !== extrasAntes) { setExtrasAntes(extras); if (extras > extrasAntes) setMas(true) }
  const filas = v.filas.filter(f => f.filtros.includes(estado) && (tipo === 'todos' || f.tipos.includes(tipo))
    && (tren === 'todos' || f.tren === tren) && coincide(f, busca))
  const trenes = TRENES.filter(t => v.cuentas.tren[t] > 0)
  const verAgua = tren === 'agua' && !ambito.global && rol.pantallas.includes('agua') && pantallaVisible('agua')
  const verPozos = tren === 'pozos' && rol.pantallas.includes('pozos') && pantallaVisible('pozos')
  const conf = rol.id === 'conf', jefe = rol.id === 'jefe'
  const cabeza = conf && !!v.primero
  // K2 · Con la cabeza de confiabilidad, en el teléfono, también el estado va detrás de «Filtrar ▾» (P-02:
  // «los filtros, plegados en un desplegable»): la primera pantalla es la respuesta, no los filtros.
  const plegar = cabeza && telefono
  const puestos = extras + (plegar && estado !== 'todos' ? 1 : 0)
  const pildorasEstado = (
    <Pildoras etiqueta="Estado" valor={estado} onCambio={e => poner({ estado: e })}
      opciones={FILTROS_ESTADO.map(k => ({ id: k, texto: NOMBRE_FILTRO[k], n: v.cuentas.estado[k] }))} />
  )

  return (
    <div className="grid gap-3 sm:gap-4" data-lista-equipos>
      {cabeza && <Primero v={v} global={ambito.global} />}

      {/* Confiabilidad: el acierto del vigía, una línea arriba de Equipos (X4 §3.7). */}
      {conf && (
        <p className="rounded-[20px] bg-[var(--panel)] px-4 py-3 text-[16px] leading-snug sm:px-6" data-acierto-vigia>
          {v.vigia.frase}
          {rol.pantallas.includes('confiabilidad') && pantallaVisible('confiabilidad') && (
            <IrA className="ml-2 align-middle" onClick={() => setPantalla('confiabilidad')}>Ver el detalle</IrA>
          )}
        </p>
      )}

      {/* P-10: lo que cada rol decide con «Si falla hoy» (U2 §6.4), arriba de la lista. */}
      {conf && v.instrumento.map(t => (
        <p key={t} className="px-1 text-[15px] leading-snug text-[var(--tinta2)]" data-decide="conf">
          <b className="font-semibold text-[var(--tinta)]">¿Dónde va el próximo instrumento?</b> {t}
        </p>
      ))}
      {jefe && v.noIntervenir.map(t => <p key={t} className="px-1 text-[15px] leading-snug text-[var(--tinta2)]" data-decide="jefe">{t}</p>)}
      {jefe && v.avisosTrabajo.map(a => (
        <p key={`${a.campoId}|${a.tarea}`} className="px-1 text-[15px] leading-snug text-[var(--tinta2)]" data-aviso-trabajo={a.tarea}>
          {a.texto} <span className="text-[var(--tinta3)]">El programa lo cambia el administrador en Configuración, con firma.</span>
        </p>
      ))}

      <section className="grid gap-3 rounded-[20px] bg-[var(--panel)] px-4 py-3 sm:px-6" aria-label="Filtros de la lista">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {!plegar && pildorasEstado}
          <button type="button" aria-expanded={mas} aria-controls={idMas} onClick={() => setMas(x => !x)} data-mas-filtros
            className="inline-flex min-h-10 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-3 text-[15px] font-semibold text-[var(--tinta)] hover:bg-[var(--panel2)]">
            {plegar ? 'Filtrar' : 'Más filtros'}{puestos > 0 && <span className="tabular font-normal text-[var(--tinta2)]">({puestos})</span>}
            <ChevronDown aria-hidden className={cn('size-4 text-[var(--tinta2)] transition-transform duration-[120ms]', mas && 'rotate-180')} />
          </button>
        </div>
        {mas && (
          <div id={idMas} className="grid gap-3" data-mas-filtros-abiertos>
            {plegar && pildorasEstado}
            <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
              <Pildoras<TipoEquipo | 'todos'> etiqueta="Tipo" valor={tipo} onCambio={t => poner({ tipo: t })}
                opciones={[{ id: 'todos', texto: 'Todos los tipos' }, ...TIPOS_EQUIPO.filter(t => v.cuentas.tipo[t] > 0).map(t => ({ id: t, texto: NOMBRE_TIPO[t], n: v.cuentas.tipo[t] }))]} />
              <Pildoras<TrenEquipo | 'todos'> etiqueta="Tren" valor={tren} onCambio={t => poner({ tren: t })}
                opciones={[{ id: 'todos', texto: 'Todos los trenes' }, ...trenes.map(t => ({ id: t, texto: NOMBRE_TREN[t], n: v.cuentas.tren[t] }))]} />
            </div>
            <label htmlFor={idBusca} className="flex max-w-[360px] items-center gap-2 rounded-full bg-[var(--panel2)] px-3.5 shadow-[inset_0_0_0_1px_var(--linea)] focus-within:shadow-[inset_0_0_0_2px_var(--foco)]">
              <Search aria-hidden className="size-4 shrink-0 text-[var(--tinta2)]" />
              <span className="sr-only">Buscar por tag</span>
              <input id={idBusca} type="search" value={busca} onChange={e => poner({ busca: e.target.value })} placeholder="Buscar por tag: P-201B"
                className="min-h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--tinta3)]" />
            </label>
          </div>
        )}
      </section>

      {/* «Cambió hoy»; a confiabilidad ya se lo dice su frase de arriba («hoy valen más») y cada fila («sube porque…»). */}
      {!cabeza && v.cambioHoy.map(t => <p key={t} className="px-1 text-[15px] leading-snug text-[var(--tinta2)]" data-cambio-hoy><b className="font-semibold text-[var(--tinta)]">{t.split(':')[0]}:</b>{t.slice(t.indexOf(':') + 1)}</p>)}

      <section className="rounded-[20px] bg-[var(--panel)] px-4 pb-4 pt-5 sm:px-6" aria-label={`Equipos: ${filas.length}`}>
        <header className="flex flex-wrap items-center gap-x-1 pb-1">
          <h2 className="text-[16px] font-semibold">{filas.length === 1 ? '1 equipo' : `${filas.length} equipos`}</h2>
          <span className="text-[14px] text-[var(--tinta2)]">· ordenados por estado</span>
          <Info titulo="El orden" texto="Por estado, de la condición más grave a ninguna (lo parado primero) y, dentro de cada estado, por lo que costaría si falla hoy. La cifra es lo que se deja de producir ahora o, si está en marcha, lo que costaría si falla hoy." />
        </header>
        {(verAgua || verPozos) && (
          <IrA className="mb-1" onClick={() => setPantalla(verAgua ? 'agua' : 'pozos')}>{verAgua ? 'Ver la tubería del agua' : 'Ver los pozos uno por uno'}</IrA>
        )}
        {/* K1 · P-10: lo que era Riesgo va debajo de la lista; al jefe, el enlace lleva ahí y le pasa el foco. A
            confiabilidad no: su cabeza ya abre en «Si falla hoy» y Equipos es su inicio (el teléfono no suma palabras). */}
        {jefe && <IrA className="mb-1" onClick={() => irAlAncla(ID_EN_RIESGO)} data-ir-en-riesgo>Ver qué está en riesgo</IrA>}
        <div className="hidden gap-3 pb-1 text-[13px] text-[var(--tinta2)] md:grid md:grid-cols-[18px_minmax(0,1fr)_170px_150px_20px]" aria-hidden>
          <span /><span /><span>¿Lo vigila TRIM?</span><span /><span />
        </div>
        {filas.length === 0 && <div className="pb-3"><Hueco>Ningún equipo con estos filtros.</Hueco></div>}
        <div>
          {filas.map(f => (
            <FilaEquipo key={`${f.campoId}|${f.equipo}`} f={f} global={ambito.global}
              onAbrir={() => irA({ campoId: f.campoId, equipo: f.equipo })} />
          ))}
        </div>
      </section>

      {/* K1 · P-10: Riesgo del jefe y de confiabilidad, fundido aquí (X4 §3.6): nada de lo que traía se pierde. */}
      {(conf || jefe) && <EnRiesgo rol={conf ? 'conf' : 'jefe'} />}

      {v.sinRegistro.length > 0 && (
        <p className="px-1 text-[14px] leading-snug text-[var(--tinta2)]" data-sin-registro>
          Del esquema de planta, sin equipo registrado en TRIM (no se mide su falla): {[...new Set(v.sinRegistro.map(x => x.nombre))].join(', ')}.
        </p>
      )}
    </div>
  )
}
