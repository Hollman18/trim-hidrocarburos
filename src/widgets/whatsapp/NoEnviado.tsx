import { DatoInvalido } from '@/shared/ui/Prioridad'

/** Lo que el registro de mensajes no pudo enviar, dicho junto al paso del
 *  hilo: a quién no le llegó y por qué (un parámetro vacío o de varias líneas
 *  que Meta rechazaría). Es un dato inválido (magenta y con forma, ISA-101):
 *  quien lee el hilo no puede creer que avisaron a alguien a quien no le
 *  llegó nada. */
export function NoEnviado({ fallas }: { fallas: Array<{ para: string; motivo: string }> }) {
  if (!fallas.length) return null
  // Un mismo motivo para varias personas se dice una vez.
  const porMotivo = [...fallas.reduce((m, f) => m.set(f.motivo, [...new Set([...(m.get(f.motivo) ?? []), f.para])]), new Map<string, string[]>())]
  return (
    <>
      {porMotivo.map(([motivo, para]) => (
        <span key={motivo} className="inline-flex items-baseline gap-1 text-[var(--tinta)]">
          {' · '}<DatoInvalido etiqueta="Mensaje no enviado" tamano={10} />no se envió a {para.join(', ')}: {motivo}
        </span>
      ))}
    </>
  )
}

