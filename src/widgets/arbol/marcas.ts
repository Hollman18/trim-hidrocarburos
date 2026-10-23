import { esDePersona, ATAJO_YACIMIENTO, type ParadaAnh, type PasoAnh, type PorqueChoke, type DatoClasificado } from '@/shared/api/arbol'
import { rolEnPapel } from '@/shared/ui/papel'
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

/** ¿El paso lo determinó una respuesta de campo de esa misma persona (la misma
 *  persona y la misma hora en la conversación de la fila)? Entonces la marca dice
 *  quién y nada más: «TRIM lo dedujo de lo que contestó…» ya no se repite al lado
 *  de «dijo …» (QA-R, vecino 11). */
const deUnaRespuesta = (p: ParadaAnh, d: DatoClasificado<unknown, unknown>) =>
  d.procedencia === 'declarado' && (p.clasificacion.respuestas ?? []).some(r => !r.noSe && r.porId === d.porId && r.hora === d.hora)

/** Quién dijo cada paso y por qué (U1 §2, las marcas de procedencia), en
 *  palabras. `cascada`: con la cascada de este pozo (en una tarjeta de varios
 *  pozos la cascada ya va arriba, pozo por pozo). `papel`: la del papel y el PDF
 *  (D2): la persona por su rol y sin lo que escribió con sus palabras (el motivo
 *  de una corrección, la nota del yacimiento). */
export function marcaDelPaso(p: ParadaAnh, paso: PasoAnh, cascada = true, papel = false): string {
  const d = p.clasificacion[paso]
  if (!d) {
    if (paso !== 'choke') return ''
    if (p.estado === 'pendiente') return 'Hasta que alguien diga qué pasó, no se sabe dónde se trabó'
    return porqueDelTramo(p, p.propuesta.porqueChoke, { pregunta: true, cascada })
  }
  // Lo que TRIM dedujo de lo que contestó una persona en el campo: la persona no
  // lo escogió (el operador nunca escoge el tramo, U2 §3.2), así que no «lo dijo» (B-04).
  const persona = papel ? rolEnPapel(d) : d.por
  if (deducidoDeRespuesta(paso, d)) {
    const cuando = horaCorta(d.hora)
    return `TRIM lo dedujo de lo que contestó ${persona ?? 'una persona'}${cuando ? ` · ${cuando}` : ''}`
  }
  if (esDePersona(d.procedencia)) {
    const quien = marcaDePersona(d.procedencia, persona, d.hora, d.lote)
    const antes = d.procedencia === 'corregido' && d.propuesto !== undefined ? ` · antes: ${valorEnPalabras(paso, String(d.propuesto))}` : ''
    const q = paso === 'choke' ? d.porque as PorqueChoke | undefined : undefined
    // En el papel no va lo que escribió la persona: del yacimiento, solo el atajo («la prueba del pozo»).
    const atajo = q?.evidencia && Object.hasOwn(ATAJO_YACIMIENTO, q.evidencia) ? ATAJO_YACIMIENTO[q.evidencia as keyof typeof ATAJO_YACIMIENTO] : undefined
    const texto = deUnaRespuesta(p, d) ? undefined
      : papel ? atajo
        : paso === 'choke' ? q?.texto : d.procedencia === 'corregido' ? d.porque as string | undefined : undefined
    return `${quien}${antes}${texto ? ` · ${sinReferencias(texto)}` : ''}`
  }
  if (paso === 'choke') {
    const q = d.porque as PorqueChoke | undefined
    return `${q?.pregunta ? 'TRIM lo propone' : marcaDeTrim(d.procedencia)}: ${porqueDelTramo(p, q, { pregunta: true, cascada })}`
  }
  const porque = typeof d.porque === 'string' ? sinReferencias(d.porque) : ''
  return `${marcaDeTrim(d.procedencia)}${porque ? `: ${porque}` : ''}`
}

