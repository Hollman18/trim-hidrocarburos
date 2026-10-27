import { useEffect, useRef, useState } from 'react'
import { useApp, useRol } from '@/app/store'
import { Boton } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { cn } from '@/shared/lib/cn'

/** La primera entrada (X4 §6.2; P-15): sin el modal de dos pasos ni el párrafo del
 *  foco. Se entra directo al inicio del rol, con sus datos, y encima van TRES señas
 *  de una línea, en el orden de la lectura de 10 segundos: la frase, la cifra o el
 *  control, y un primer acierto (una acción real y reversible). Se pasan con
 *  «Siguiente» y se cierran con «Ya entendí»; no vuelven, salvo desde «Introducción»
 *  en el menú de la persona. De usted, en palabras de campo. Las señas no nombran un
 *  equipo del demo: valen con cualquier dato. */
const SENAS: Readonly<Record<string, readonly [string, string, string]>> = {
  ger: ['Esto es lo que pasa ahora en sus campos, en una frase.',
    'Antes: lo que puede fallar. Durante: lo que se deja de producir ahora. Después: lo que ya costó.',
    'Toque un tramo de la tubería para ver dónde se trabó.'],
  reg: ['Si el reporte pasa, o qué le falta.', 'Quién lo debe y para cuándo.', 'Toque lo que falta para pedirlo.'],
  prod: ['Qué limita hoy al campo.', 'Lo oscuro pasa; lo rayado no, y está en el tramo donde se trabó.', 'Toque el tramo que limita.'],
  sup: ['Lo que se deja de producir ahora en su campo.', 'Lo que le toca, en orden: lo que tiene hora va primero.',
    'Confirme las paradas iguales, o véalas una por una.'],
  oper: ['Esto no se hace hasta contestar.',
    'Aquí le llegan las preguntas que solo usted puede contestar, una a la vez.',
    'Un toque y listo. Si se equivoca, toque «Deshacer».'],
  tec: ['Lo que le toca hoy, en orden.', 'Lo que usted encuentra le enseña al vigía.', 'Diga qué se dañó en la primera tarjeta.'],
  jefe: ['De cada falla, cuánto es reparar y cuánto es esperar.', 'Lo que hay que intervenir ya.', 'Abra el primer equipo y cree el aviso.'],
  conf: ['Ordenados por lo que le quitan al campo si fallan hoy.', 'Sin instrumento, TRIM no ve venir la falla.', 'Abra el primero: ¿por qué subió?'],
  adm: ['Lo que falta en cada campo, en orden.', 'Empiece por aquí.', 'Complete este paso; al final se firma.'],
  plan: ['Lo que le toca hoy, en orden.', 'El horizonte es lo que deja pedir el repuesto sin pagar urgencia.', 'Abra el primer equipo.'],
  cont: ['La línea de tiempo de cada parada, como evidencia.', 'Sale del PLC: no es un acta.', 'Abra la primera parada.'],
}

/** Qué es TRIM, a la ⓘ (lo que antes iba en el párrafo del primer paso). */
const AYUDA_TRIM = 'Reduce paradas con Antes (vigía), Durante (identificar) y Después (no repetir). Al fallar cierran pozos; tanque y orden de cierre dan tiempo. Retorno simulado; libro medido (PLC, causa por barril).'

/** Las tres señas, encima del inicio de verdad. No es un diálogo modal: la tercera
 *  pide hacer algo en la pantalla de atrás. El foco entra al abrir (el lector la
 *  dice), Escape la cierra y, al cerrar, el foco va al título de la vista (A14). */
export function Onboarding() {
  const rol = useRol()
  const cerrarOnboarding = useApp(s => s.cerrarOnboarding)
  const [paso, setPaso] = useState(0)
  const caja = useRef<HTMLDivElement>(null)
  const senas = SENAS[rol.id] ?? SENAS.sup!

  useEffect(() => { caja.current?.focus() }, [paso])

  const cerrar = () => {
    cerrarOnboarding()
    // A14: el foco no cae en <body>: va al título de la vista que se ve.
    requestAnimationFrame(() => document.querySelector<HTMLElement>('main [data-titulo-vista]')?.focus())
  }
  const ultimo = paso === senas.length - 1

  return (
    // `data-flotante`: no es un diálogo modal y no queda inerte detrás de otro (la ficha de un enlace).
    <div data-flotante className="no-imprimir pointer-events-none fixed inset-x-3 bottom-4 z-[160] flex justify-center sm:bottom-6">
      <div ref={caja} tabIndex={-1} role="dialog" aria-modal="false" aria-label="Introducción" aria-describedby="sena-texto" data-introduccion
        onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); cerrar() } }}
        className="pointer-events-auto w-full max-w-[460px] rounded-[20px] bg-[var(--elevado)] p-4 shadow-[var(--sombra-flota)] outline-none sm:p-5">
        <p className="flex items-center gap-2 text-[14px] font-medium text-[var(--tinta2)]">
          <span>{paso + 1} de {senas.length}</span>
          <span aria-hidden className="flex flex-1 gap-1.5">
            {senas.map((_, i) => <i key={i} className={cn('h-1.5 flex-1 rounded-full', i <= paso ? 'bg-[var(--primario)]' : 'bg-[var(--pista)]')} />)}
          </span>
          <Info titulo="Qué es TRIM" texto={AYUDA_TRIM} />
        </p>
        <p id="sena-texto" aria-live="polite" className="mt-2.5 text-[18px] font-medium leading-snug">{senas[paso]}</p>
        <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2.5">
          {!ultimo && <Boton onClick={cerrar}>Ya entendí</Boton>}
          {ultimo
            ? <Boton variante="principal" onClick={cerrar}>Ya entendí</Boton>
            : <Boton variante="principal" onClick={() => setPaso(paso + 1)}>Siguiente</Boton>}
        </div>
      </div>
    </div>
  )
}
