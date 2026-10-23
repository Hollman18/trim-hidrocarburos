import { esDePersona, type ParadaAnh, type PasoAnh, type PorqueChoke } from '@/shared/api/arbol'
import { valorEnPalabras, marcaDePersona, marcaDeTrim, sinReferencias, deducidoDeRespuesta, horaCorta } from './palabras'

/** Lo que falta preguntar del paso 2, en corto: la pregunta de campo que lo
 *  resuelve si está abierta («¿De dónde vino el corte?»); si no, la del motor
 *  del tramo («¿El oleoducto o el cliente estaba recibiendo?»). */
function preguntaDelTramo(p: ParadaAnh, q: PorqueChoke | undefined): string | undefined {
  const abierta = p.propuesta.preguntas.find(x => x.pasos.includes('choke') && x.id !== 'tanques' && x.id !== 'que-lo-paro')
  return abierta?.texto ?? q?.pregunta
}

/** El porqué del paso 2 en una frase: lo que dice el motor del tramo (con la
 *  cascada de este pozo, si va solo) y lo que todavía pregunta (U2 §4.2). */
function porqueDelTramo(p: ParadaAnh, q: PorqueChoke | undefined, o: { pregunta: boolean; cascada: boolean }): string {
  if (!q) return ''
  const pregunta = o.pregunta ? preguntaDelTramo(p, q) : undefined
  return [
    q.texto ? sinReferencias(q.texto) : '',
    o.cascada && q.cascada ? `${p.pozo} cerró ${q.cascada.minutos} min después de ${q.elemento ?? 'la raíz'}` : '',
    pregunta ? `falta: «${pregunta}»` : '',
  ].filter(Boolean).join(' · ')
}

/** Quién dijo cada paso y por qué (U1 §2, las marcas de procedencia), en
 *  palabras. `cascada`: con la cascada de este pozo (en una tarjeta de varios
 *  pozos la cascada ya va arriba, pozo por pozo). */
export function marcaDelPaso(p: ParadaAnh, paso: PasoAnh, cascada = true): string {
  const d = p.clasificacion[paso]
  if (!d) {
    if (paso !== 'choke') return ''
    if (p.estado === 'pendiente') return 'Hasta que alguien diga qué pasó, no se sabe dónde se trabó'
    return porqueDelTramo(p, p.propuesta.porqueChoke, { pregunta: true, cascada })
  }
  // Lo que TRIM dedujo de lo que contestó una persona en el campo: la persona no
  // lo escogió (el operador nunca escoge el tramo, U2 §3.2), así que no «lo dijo» (B-04).
  if (deducidoDeRespuesta(paso, d)) {
    const cuando = horaCorta(d.hora)
    return `TRIM lo dedujo de lo que contestó ${d.por ?? 'una persona'}${cuando ? ` · ${cuando}` : ''}`
  }
  if (esDePersona(d.procedencia)) {
    const quien = marcaDePersona(d.procedencia, d.por, d.hora, d.lote)
    const antes = d.procedencia === 'corregido' && d.propuesto !== undefined ? ` · antes: ${valorEnPalabras(paso, String(d.propuesto))}` : ''
    const texto = paso === 'choke' ? (d.porque as PorqueChoke | undefined)?.texto : d.procedencia === 'corregido' ? d.porque as string | undefined : undefined
    return `${quien}${antes}${texto ? ` · ${sinReferencias(texto)}` : ''}`
  }
  if (paso === 'choke') {
    const q = d.porque as PorqueChoke | undefined
    return `${q?.pregunta ? 'TRIM lo propone' : marcaDeTrim(d.procedencia)}: ${porqueDelTramo(p, q, { pregunta: true, cascada })}`
  }
  const porque = typeof d.porque === 'string' ? sinReferencias(d.porque) : ''
  return `${marcaDeTrim(d.procedencia)}${porque ? `: ${porque}` : ''}`
}

