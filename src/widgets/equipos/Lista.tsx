import { useId } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { useApp, useAmbito, useRol } from '@/app/store'
import {
  useListaEquipos, FILTROS_ESTADO, NOMBRE_FILTRO, TIPOS_EQUIPO, NOMBRE_TIPO, TRENES, NOMBRE_TREN, PALABRA_CONDICION,
  type FilaEquipoTecnico, type TipoEquipo, type TrenEquipo,
} from '@/shared/api/equiposTecnico'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { Hueco, Chip } from '@/shared/ui/primitivas'
import { pantallaVisible } from '@/shared/config/producto'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { useFiltrosEquipos } from './filtros'
import { Pildoras, Tag, Marca, IrA } from './piezas'
import { useIrA } from './navegar'

/** La cifra de la fila (X5 §5.5): a la derecha, tabular, con lo que es debajo. */
function Cifra({ f }: { f: FilaEquipoTecnico }) {
  const c = f.cifra
  return (
    <span className="tabular shrink-0 text-right" data-cifra-fila>
      <b className="block text-[18px] font-bold leading-tight">
        {c.valor === null ? <span className="text-[15px] font-semibold text-[var(--tinta2)]">sin dato</span>
          : <>{c.techo ? <span className="text-[14px] font-semibold">hasta </span> : null}{n0(c.valor)}<span className="ml-1 text-[13px] font-normal text-[var(--tinta2)]">bbl/d</span></>}
      </b>
      <small className="block text-[13px] leading-snug text-[var(--tinta2)]">{c.que}{c.detalle && c.valor !== null ? ` · ${c.detalle}` : ''}</small>
    </span>
  )
}

/** Una fila de equipo (X5 §5.5): `[marca] TAG · familia · palabra … cifra ›`. La
 *  marca va solo con condición (la lista no es mixta); «sin instrumento» lleva sus
 *  corchetes y su palabra en «¿Lo vigila TRIM?». Toda la fila abre el nivel 3. */
export function FilaEquipo({ f, global, onAbrir }: { f: FilaEquipoTecnico; global: boolean; onAbrir: () => void }) {
  const nombre = `${f.condicion ? `${PALABRA_CONDICION[f.condicion]}. ` : ''}${f.equipo}${global ? `, ${f.campoNombre}` : ''}: ${f.familia}, ${f.palabra}. ${f.cifra.valor === null ? `${f.cifra.que}: sin dato` : `${f.cifra.techo ? 'hasta ' : ''}${n0(f.cifra.valor)} barriles por día ${f.cifra.que}`}. ¿Lo vigila TRIM? ${f.vigilaTexto}.`
  return (
    <button type="button" onClick={onAbrir} aria-label={nombre} data-fila-equipo={f.equipo} data-campo={f.campoId} data-condicion={f.condicion ?? ''}
      className="grid min-h-14 w-full cursor-pointer grid-cols-[18px_minmax(0,1fr)_auto_20px] items-center gap-x-3 gap-y-1 border-t border-[var(--linea2)] py-2.5 text-left first:border-t-0 hover:bg-[var(--panel2)]/60 md:grid-cols-[18px_minmax(0,1fr)_170px_150px_20px]">
      <span className="self-start pt-1">{f.condicion ? <Marca c={f.condicion} decorativa /> : null}</span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <Tag className="text-[17px]">{f.equipo}</Tag>
          {global && <span className="text-[14px] text-[var(--tinta2)]">{f.campoNombre}</span>}
          <span className="text-[15px] text-[var(--tinta2)]">{f.familia}</span>
          {f.sinRespaldo && <Chip tono="fuerte">sin respaldo</Chip>}
        </span>
        <span className="block text-[15px] leading-snug">
          {f.condicion && <span className="font-semibold">{PALABRA_CONDICION[f.condicion]} · </span>}{f.palabra}
          {f.sube && <span className="text-[var(--tinta2)]"> · {f.sube}</span>}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[14px] text-[var(--tinta2)] md:hidden">
          {!f.vigila && <MarcaCondicion c="sin-instrumento" tamano={14} decorativa />}¿Lo vigila TRIM? {f.vigilaTexto}
        </span>
      </span>
      <span className="hidden items-center gap-1.5 text-[14px] text-[var(--tinta2)] md:flex" data-vigila={f.vigila ? 'si' : 'no'}>
        {!f.vigila && <MarcaCondicion c="sin-instrumento" tamano={14} decorativa />}{f.vigilaTexto}
      </span>
      <Cifra f={f} />
      <ChevronRight aria-hidden className="size-5 text-[var(--tinta3)]" />
    </button>
  )
}

const coincide = (f: FilaEquipoTecnico, busca: string) => {
  const b = busca.trim().toLowerCase()
  return !b || f.equipo.toLowerCase().includes(b) || f.familia.toLowerCase().includes(b)
}

/** Equipos (X4 §3.6, fusión 1): todos los equipos de los campos en una lista,
 *  ordenada por estado y por «Si falla hoy», con sus filtros. El motor la arma
 *  (`/vistas/lista-equipos`); aquí solo se filtra por lo que cada fila dice de sí. */
export function ListaEquipos() {
  const ambito = useAmbito(); const rol = useRol()
  const setPantalla = useApp(s => s.setPantalla)
  const irA = useIrA()
  const v = useListaEquipos(ambito.campos.map(c => c.id))
  const { estado, tipo, tren, busca, poner } = useFiltrosEquipos()
  const idBusca = useId()
  const filas = v.filas.filter(f => f.filtros.includes(estado) && (tipo === 'todos' || f.tipos.includes(tipo))
    && (tren === 'todos' || f.tren === tren) && coincide(f, busca))
  const trenes = TRENES.filter(t => v.cuentas.tren[t] > 0)
  const verAgua = tren === 'agua' && !ambito.global && rol.pantallas.includes('agua') && pantallaVisible('agua')
  const verPozos = tren === 'pozos' && rol.pantallas.includes('pozos') && pantallaVisible('pozos')

  return (
    <div className="grid gap-3 sm:gap-4" data-lista-equipos>
      {/* Confiabilidad: el acierto del vigía, una línea arriba de Equipos (X4 §3.7). */}
      {rol.id === 'conf' && (
        <p className="rounded-[20px] bg-[var(--panel)] px-4 py-3 text-[16px] leading-snug sm:px-6" data-acierto-vigia>
          {v.vigia.frase}
          {rol.pantallas.includes('confiabilidad') && pantallaVisible('confiabilidad') && (
            <IrA className="ml-2 align-middle" onClick={() => setPantalla('confiabilidad')}>Ver el detalle</IrA>
          )}
        </p>
      )}

      <section className="grid gap-3 rounded-[20px] bg-[var(--panel)] px-4 py-4 sm:px-6" aria-label="Filtros de la lista">
        <Pildoras etiqueta="Estado" valor={estado} onCambio={e => poner({ estado: e })}
          opciones={FILTROS_ESTADO.map(k => ({ id: k, texto: NOMBRE_FILTRO[k], n: v.cuentas.estado[k] }))} />
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
      </section>

      {v.cambioHoy.map(t => <p key={t} className="px-1 text-[15px] leading-snug text-[var(--tinta2)]" data-cambio-hoy><b className="font-semibold text-[var(--tinta)]">{t.split(':')[0]}:</b>{t.slice(t.indexOf(':') + 1)}</p>)}

      <section className="rounded-[20px] bg-[var(--panel)] px-4 pb-2 pt-3 sm:px-6" aria-label={`Equipos: ${filas.length}`}>
        <header className="flex flex-wrap items-baseline justify-between gap-x-3 pb-1">
          <h2 className="text-[16px] font-semibold">{filas.length === 1 ? '1 equipo' : `${filas.length} equipos`}</h2>
          <span className="text-[13px] text-[var(--tinta2)]">por estado y, dentro de cada uno, por lo que costaría si falla hoy</span>
        </header>
        {(verAgua || verPozos) && (
          <IrA className="mb-1" onClick={() => setPantalla(verAgua ? 'agua' : 'pozos')}>{verAgua ? 'Ver la tubería del agua' : 'Ver los pozos uno por uno'}</IrA>
        )}
        <div className="hidden gap-3 pb-1 text-[13px] text-[var(--tinta2)] md:grid md:grid-cols-[18px_minmax(0,1fr)_170px_150px_20px]" aria-hidden>
          <span /><span /><span>¿Lo vigila TRIM?</span><span className="text-right">ahora o si falla hoy</span><span />
        </div>
        {filas.length === 0 && <div className="pb-3"><Hueco>Ningún equipo con estos filtros.</Hueco></div>}
        <div>
          {filas.map(f => (
            <FilaEquipo key={`${f.campoId}|${f.equipo}`} f={f} global={ambito.global}
              onAbrir={() => irA({ campoId: f.campoId, equipo: f.equipo })} />
          ))}
        </div>
      </section>

      {v.sinRegistro.length > 0 && (
        <p className={cn('px-1 text-[14px] leading-snug text-[var(--tinta2)]')} data-sin-registro>
          Del esquema de planta, sin equipo registrado en TRIM (no se mide su falla): {[...new Set(v.sinRegistro.map(x => x.nombre))].join(', ')}.
        </p>
      )}
    </div>
  )
}
