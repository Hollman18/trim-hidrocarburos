import { fondoTono, tonoDeEquipo, atributoTono } from '@/shared/ui/tono'
import { useId, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useApp, useAmbito, useRol } from '@/app/store'
import {
  useListaEquipos, FILTROS_ESTADO, NOMBRE_FILTRO, TIPOS_EQUIPO, NOMBRE_TIPO, TRENES, NOMBRE_TREN, PALABRA_CONDICION,
  type FilaEquipoTecnico, type TipoEquipo, type TrenEquipo,
} from '@/shared/api/equiposTecnico'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { Hueco, Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { pantallaVisible } from '@/shared/config/producto'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { CabezaConf } from './CabezaConf'
import { useSesion } from '@/shared/api/sesion'
import { perfilDe } from '@/entities/configuracion'
import { hayEquipo } from '@/app/grupos'
import { useCriticidad } from '@/shared/api/choke'
import { TareasArriba } from '@/widgets/hoy/TareasArriba'
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
    <button type="button" onClick={onAbrir} aria-label={nombre} {...(enCabeza ? { 'data-fila-primero': f.equipo } : { 'data-fila-equipo': f.equipo })} data-campo={f.campoId} data-condicion={f.condicion ?? ''} data-parado={f.parado ? 'si' : 'no'} {...atributoTono(tonoDeEquipo(f.condicion, f.parado))}
      // 28-oct · Qué atacar: la fila parada o en alarma, en rojo pálido; en marcha con atención o aviso, en amarillo pálido (la marca ISA sigue al inicio).
      className={cn('grid min-h-14 w-full cursor-pointer grid-cols-[18px_minmax(0,1fr)_auto_20px] items-center gap-x-3 gap-y-1 border-t border-[var(--linea2)] py-2.5 text-left first:border-t-0 hover:bg-[var(--panel2)]/60 md:grid-cols-[18px_minmax(0,1fr)_170px_150px_20px]',
        tonoDeEquipo(f.condicion, f.parado) && cn('rounded-[6px] px-2 hover:bg-[var(--panel2)]/0', fondoTono(tonoDeEquipo(f.condicion, f.parado))))}>
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

/** Para confiabilidad, la lista va ordenada por «Si falla hoy» (flujos.md FF-8): lo medido de más a
 *  menos, después los techos y al final lo demás, en el orden del motor. */
const grupoSiFalla = (f: FilaEquipoTecnico) => (f.cifra.que === 'si falla hoy' && f.cifra.valor !== null ? (f.cifra.techo ? 1 : 0) : 2)
const porSiFalla = (filas: readonly FilaEquipoTecnico[]) => [...filas].sort((a, b) => grupoSiFalla(a) - grupoSiFalla(b)
  || (grupoSiFalla(a) < 2 ? (b.cifra.valor ?? 0) - (a.cifra.valor ?? 0) : 0))

/** Equipos (X4 §3.6, fusión 1): todos los equipos de los campos en una lista,
 *  ordenada por estado y por «Si falla hoy», con sus filtros. El motor la arma
 *  (`/vistas/lista-equipos`); aquí solo se filtra por lo que cada fila dice de sí.
 *  Para confiabilidad abre en su respuesta (P-02): el primero de «Si falla hoy»,
 *  el acierto del vigía y dónde va el próximo instrumento (P-10); al jefe, lo que
 *  no conviene intervenir hoy. Los filtros de estado quedan a la vista; el tipo,
 *  el tren y la búsqueda, detrás de «Más filtros» (una lista que se abre, no pestañas).
 *  Al jefe y a confiabilidad, debajo de la lista, lo que era su Riesgo (K1 · P-10). */
export function ListaEquipos() {
  const ambito = useAmbito(); const rol = useRol()
  const setPantalla = useApp(s => s.setPantalla)
  const irA = useIrA()
  const v = useListaEquipos(ambito.campos.map(c => c.id))
  const gas = useCriticidad(ambito.campos.map(c => c.id)).campos.filter(c => c.campoDeGas)
  // Lo que era una subpantalla por familia (Bombas, Electrosumergibles) es un filtro: se ofrece si algún campo
  // del alcance la tiene en su perfil firmado (la misma regla que `hayEquipo`, app/grupos.ts).
  const config = useSesion(x => x.ctx.config)
  const perfiles = ambito.campos.map(c => perfilDe(config, c.id))
  const enPerfil = (t: TipoEquipo) => hayEquipo(t === 'bomba' ? 'bombas' : t === 'electrosumergible' ? 'esp' : t, perfiles)
  const { estado, tipo, tren, busca, poner } = useFiltrosEquipos()
  const idBusca = useId(), idMas = useId()
  const extras = (tipo !== 'todos' ? 1 : 0) + (tren !== 'todos' ? 1 : 0) + (busca.trim() ? 1 : 0)
  // Abiertos si al llegar ya hay uno puesto (la miga del tren vuelve con su filtro) o si llega
  // uno de afuera (la dirección de Superficie pone «Servicios y proceso»): un filtro puesto se ve.
  const [mas, setMas] = useState(extras > 0)
  const [extrasAntes, setExtrasAntes] = useState(extras)
  if (extras !== extrasAntes) { setExtrasAntes(extras); if (extras > extrasAntes) setMas(true) }
  const conf = rol.id === 'conf', jefe = rol.id === 'jefe'
  const filas = (conf ? porSiFalla(v.filas) : v.filas).filter(f => f.filtros.includes(estado) && (tipo === 'todos' || f.tipos.includes(tipo))
    && (tren === 'todos' || f.tren === tren) && coincide(f, busca))
  const trenes = TRENES.filter(t => v.cuentas.tren[t] > 0)
  const verAgua = tren === 'agua' && !ambito.global && rol.pantallas.includes('agua') && pantallaVisible('agua')
  const verPozos = tren === 'pozos' && rol.pantallas.includes('pozos') && pantallaVisible('pozos')
  const cabeza = conf && !!v.primero
  // B3 · Con la cabeza de confiabilidad, los filtros van todos detrás de «Filtrar» (borrado.md: «los 12 filtros»
  // fuera de la primera capa): la primera pantalla es la respuesta, no los filtros.
  const plegar = cabeza
  const puestos = extras + (plegar && estado !== 'todos' ? 1 : 0)
  const pildorasEstado = (
    <Pildoras etiqueta="Estado" valor={estado} onCambio={e => poner({ estado: e })}
      opciones={FILTROS_ESTADO.map(k => ({ id: k, texto: NOMBRE_FILTRO[k], n: v.cuentas.estado[k] }))} />
  )

  return (
    <div className="grid gap-3 sm:gap-4" data-lista-equipos>
      {cabeza && <CabezaConf v={v} />}
      {/* P-10: dónde va el próximo instrumento, cuando no lo dice ya el primero (su decisión: el equipo, el modo y el instrumento). */}
      {conf && v.instrumento.map(t => (
        <p key={t} className="px-1 text-[15px] leading-snug text-[var(--tinta2)]" data-decide="conf">
          <b className="font-semibold text-[var(--tinta)]">¿Dónde va el próximo instrumento?</b> {t}
        </p>
      ))}
      {/* Su Hoy se funde aquí: lo que le toca hacer, en tarjetas arriba de la lista. */}
      {conf && <TareasArriba />}
      {jefe && v.avisosTrabajo.map(a => (
        <p key={`${a.campoId}|${a.tarea}`} className="px-1 text-[15px] leading-snug text-[var(--tinta2)]" data-aviso-trabajo={a.tarea}>
          {a.texto} <span className="text-[var(--tinta3)]">El programa lo cambia el administrador en Configuración, con firma.</span>
        </p>
      ))}

      <section className="grid gap-3 rounded-[10px] bg-[var(--panel)] px-4 py-3 sm:px-6" aria-label="Filtros de la lista">
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
                opciones={[{ id: 'todos', texto: 'Todos los tipos' }, ...TIPOS_EQUIPO.filter(t => v.cuentas.tipo[t] > 0 && enPerfil(t)).map(t => ({ id: t, texto: NOMBRE_TIPO[t], n: v.cuentas.tipo[t] }))]} />
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

      {/* A-14: «Cambió hoy» ya no se repite aquí: lo dice cada fila («sube porque…») y, al jefe, su «Ojo» de Hoy. */}
      <section className="rounded-[10px] bg-[var(--panel)] px-4 pb-4 pt-5 sm:px-6" aria-label={`Equipos: ${filas.length}`}>
        <header className="flex flex-wrap items-center gap-x-1 pb-1">
          <h2 className="text-[16px] font-semibold">{filas.length === 1 ? '1 equipo' : `${filas.length} equipos`}</h2>
          <span className="text-[14px] text-[var(--tinta2)]">· {conf ? 'ordenados por «Si falla hoy»' : 'ordenados por estado'}</span>
          <Info titulo="El orden" texto={conf ? 'Por lo que costaría si falla hoy, de más a menos: primero lo calculado, después los techos («hasta») y al final lo que no tiene cifra.' : 'Por estado, de la condición más grave a ninguna (lo parado primero) y, dentro de cada estado, por lo que costaría si falla hoy. La cifra es lo que se deja de producir ahora o, si está en marcha, lo que costaría si falla hoy.'} />
        </header>
        {(verAgua || verPozos) && (
          <IrA className="mb-1" onClick={() => setPantalla(verAgua ? 'agua' : 'pozos')}>{verAgua ? 'Ver la tubería del agua' : 'Ver los pozos uno por uno'}</IrA>
        )}
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

      {/* A-13: «Qué está en riesgo» debajo de la lista se borró: repetía la cabeza, la franja y la lista. */}

      {/* B-18: un campo de gas lo dice en una frase (lo que traía Riesgo), sin una lista de ceros. */}
      {gas.map(c => <p key={c.campoId} className="px-1 text-[15px] leading-snug text-[var(--tinta2)]" data-campo-de-gas>{c.campoDeGas}</p>)}
      {v.sinRegistro.length > 0 && (
        <p className="px-1 text-[14px] leading-snug text-[var(--tinta2)]" data-sin-registro>
          Del esquema de planta, sin equipo registrado en TRIM (no se mide su falla): {[...new Set(v.sinRegistro.map(x => x.nombre))].join(', ')}.
        </p>
      )}
    </div>
  )
}
