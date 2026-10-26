import { useState } from 'react'
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { useRol } from '@/app/store'
import { useProcedencia } from '@/shared/api/procedencia'
import { limiteDelTag } from '@/shared/api/catalogo'
import { pasos, garantias, tecnico } from '@/entities/cadena'
import type { Dispositivo, Capacidad } from '@/entities/tipos'
import { sinLectura } from '@/shared/lib/formato'
import { Hueco, Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { cn } from '@/shared/lib/cn'
import { desplazable } from '@/shared/ui/alFinal'

/** Seis palabras o menos: cabe a la vista sin volverse frase. */
const corto = (t: string) => t.trim().split(/\s+/).length <= 6

/** De dónde sale un número. Todo lo que se muestra aquí viene del registro
 *  de la cadena de datos: esta pantalla no sabe de protocolos ni de tablas. */
export function CadenaDato({ campoId, disp, equipoNombre, norma, onVolver }: {
  campoId: string
  disp: Dispositivo
  equipoNombre: string
  norma: string
  onVolver: () => void
}) {
  const rol = useRol()
  const capacidades = (Object.entries(rol.puede) as Array<[Capacidad, boolean]>)
    .filter(([, v]) => v).map(([k]) => k)
  const r = useProcedencia(campoId, disp.tag, capacidades)
  const [verTecnico, setVerTecnico] = useState(rol.puede['conector:configurar'])

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <button onClick={onVolver}
        className="mb-2.5 flex cursor-pointer items-center gap-1.5 text-[14px] text-[var(--tinta2)] hover:text-[var(--tinta)]">
        <ChevronLeft className="size-3.5" /> Dispositivos
      </button>
      <h3 className="text-[16px] font-semibold">De dónde sale · {disp.tag}</h3>
      <p className="mt-1 text-[14px] text-[var(--tinta2)]">
        <b>{disp.tipo}</b> · {equipoNombre}
      </p>

      {r.estado === 'cargando' && (
        <div className="mt-3 grid gap-3" aria-busy>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="grid grid-cols-[22px_1fr] gap-2.5">
              <span className="size-[22px] rounded-full bg-[var(--panel2)]" />
              <span className="grid gap-1.5">
                <span className="h-2 w-24 rounded bg-[var(--panel2)]" />
                <span className="h-3 w-3/4 rounded bg-[var(--panel2)]" />
              </span>
            </div>
          ))}
        </div>
      )}

      {r.estado === 'sin-registro' && (
        <div className="mt-3">
          <Hueco>
            <span className="flex flex-wrap items-center gap-x-1">
              <b>{disp.tag} sin registro de cadena</b>
              <Info titulo="Sin registro" texto={`${disp.tag} no está en el registro de la cadena de datos. Queda registrado solo cuando el borde se presenta con ese tag, o al declararlo en la configuración del campo.`} />
            </span>
          </Hueco>
        </div>
      )}

      {r.estado === 'error' && (
        <div className="mt-3">
          <Hueco>No se pudo consultar el registro: {r.mensaje}.</Hueco>
        </div>
      )}

      {r.estado === 'ok' && (
        <>
          {r.datos.instrumento.mapeo === 'pendiente' && (
            <div className="mt-2.5">
              <Hueco>
                <span className="flex flex-wrap items-center gap-x-1">
                  <b>Tag sin equipo asociado</b>
                  <Info titulo="Sin equipo" texto="Este tag llegó del borde y todavía no está asociado a un equipo. Se asocia desde la configuración del campo." />
                </span>
              </Hueco>
            </div>
          )}

          <ol className="mt-3 list-none p-0">
            {pasos(r.datos, sinLectura(disp), limiteDelTag(campoId, disp.tag)).map((p, i, a) => (
              <li key={p.titulo} className="grid grid-cols-[22px_1fr] gap-2.5 pb-3">
                <span className="flex flex-col items-center">
                  <span className={cn('font-cond grid size-[22px] shrink-0 place-items-center rounded-full border text-[12px] font-semibold',
                    p.calculo ? 'border-[var(--tinta2)] bg-[var(--panel)] text-[var(--tinta)]'
                      : 'border-[var(--linea)] text-[var(--tinta3)]')}>{i + 1}</span>
                  {i < a.length - 1 && <span className="mt-1 w-px flex-1 bg-[var(--linea)]" />}
                </span>
                <span>
                  <small className="font-cond block text-[12px] font-semibold tracking-[.11em] text-[var(--tinta3)]">
                    {p.titulo.toUpperCase()}
                  </small>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1">
                    <b className={cn('text-[15px] leading-tight', p.calculo && 'font-mono text-[14px]')}>{p.valor}</b>
                    {p.detalle && !corto(p.detalle) && <Info titulo={p.titulo} texto={p.detalle} />}
                  </span>
                  {/* Un detalle corto (el límite, «cada 47 s») se lee a la vista; uno largo, en su ⓘ. */}
                  {p.detalle && corto(p.detalle) && <span className="mt-0.5 block text-[13px] text-[var(--tinta2)]">{p.detalle}</span>}
                </span>
              </li>
            ))}
          </ol>

          <section className="rounded border border-[var(--linea2)] bg-[var(--panel)] p-2.5">
            <h4 className="font-cond mb-1.5 text-[12px] font-semibold tracking-[.11em] text-[var(--tinta3)]">
              CADENA DE CUSTODIA
            </h4>
            {garantias(r.datos).map(g => (
              <div key={g.titulo} className="flex flex-wrap items-center gap-x-2 border-b border-[var(--linea2)] py-1.5 text-[14px] leading-relaxed last:border-0">
                <ShieldCheck className="size-3.5 shrink-0 text-[var(--tinta2)]" />
                <b>{g.titulo}</b>
                {corto(g.valor) ? <span className="text-[var(--tinta2)]">{g.valor}</span> : <Info titulo={g.titulo} texto={g.valor} />}
              </div>
            ))}
          </section>

          {r.datos.tecnico ? (
            <section className="mt-2.5">
              <button onClick={() => setVerTecnico(v => !v)} aria-expanded={verTecnico}
                className="flex w-full cursor-pointer items-center gap-2 rounded border border-[var(--linea2)] bg-[var(--panel)] px-2.5 py-2 text-left hover:bg-[var(--elevado)]">
                <ChevronRight className={cn('size-3.5 shrink-0 text-[var(--tinta3)] transition-transform', verTecnico && 'rotate-90')} />
                <span className="min-w-0 flex-1">
                  <b className="block text-[14px]">Transporte y almacenamiento</b>
                </span>
                <Chip>borde {r.datos.tecnico.gateway.id}</Chip>
              </button>
              {verTecnico && (
                <div {...desplazable('Cadena técnica del dato')} className="mt-1.5 overflow-x-auto rounded border border-[var(--linea)] bg-[var(--panel)]">
                  <table className="w-full border-collapse text-left text-[14px]">
                    <tbody>
                      {tecnico(r.datos).map(p => (
                        <tr key={p.titulo} className="border-b border-[var(--linea2)] align-top last:border-0">
                          <td className="whitespace-nowrap px-2.5 py-2 font-medium text-[var(--tinta2)]">{p.titulo}</td>
                          <td className="px-2.5 py-2">
                            <span className="flex flex-wrap items-center gap-x-1">
                              <b className="font-mono text-[13px]">{p.valor}</b>
                              {p.detalle && <Info titulo={p.titulo} texto={p.detalle} />}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (
            <p className="mt-2.5 flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta3)]">
              Transporte y almacenamiento: sin acceso
              <Info titulo="Transporte y almacenamiento" texto="El detalle de transporte y almacenamiento lo entrega el servidor solo a quien tiene la capacidad de configurar conectores." />
            </p>
          )}

          <p className="mt-2.5 flex flex-wrap items-center text-[13px]"><Info rotulo="norma" titulo="Norma de referencia del equipo" texto={norma} /></p>
        </>
      )}
    </div>
  )
}
