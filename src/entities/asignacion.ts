/** Cuadre con la asignación oficial: lo que la operadora reporta cada mes
 *  pozo por pozo contra lo que asigna TRIM con el mismo método (lo real del
 *  punto de medición oficial repartido por prueba × factor × horas abierto).
 *  Si usan las mismas pruebas y las mismas horas, dan lo mismo; cuando no,
 *  la diferencia se parte en lo que explican las horas y lo que queda para
 *  la prueba o el factor. Nada de esto cambia el libro: es un cotejo.
 *
 *  Contrato: `GET /api/asignacion-oficial` (sin parámetros, en el arranque:
 *  la de los campos de la persona y sus cargas) y `POST /api/asignacion-oficial`
 *  para subirla; cuando el backend la lea del sistema de contabilidad de
 *  hidrocarburos, llega por el mismo GET.
 */
import type { AsignacionPozo } from './libro'
import { leerMes, leerNumero, leerCampo, celdas, comaAmbigua, partirTexto, nombreMes, diasDelMes } from './plan'
import { CAMPOS } from './campos'

export interface FilaOficial {
  mes: string
  campoId: string
  pozo: string
  /** Crudo asignado en el mes, bbl. */
  bbl: number
  /** Horas produciendo que reportó la operadora (opcional). */
  horas?: number
}

/** Una carga de la asignación oficial, como la guarda el servidor: quién la
 *  subió, cuándo, por qué y qué reemplazó. Reemplazar la oficial de un mes
 *  cambia su cotejo; sin este rastro nadie sabría después quién puso la que
 *  hoy se ve ni que antes había otra. Solo se inserta, nunca se corrige. */
export interface CargaAsignacion {
  /** Consecutivo del servidor. */
  id: number
  /** ISO 8601 con zona: la hora del servidor al aceptarla. */
  fecha: string
  /** «Nombre · rol»: sale del token, nunca del cuerpo. */
  por: string
  motivo: string
  /** Cada (mes, campo) que trajo: cuántos pozos entraron y cuántos tenía la
   *  carga que reemplazó (0 si no había ninguna). */
  grupos: Array<{ mes: string; campoId: string; pozos: number; reemplazados: number }>
}

/** La fila como queda guardada: con el id de la carga que la trajo. */
export interface FilaCargada extends FilaOficial { carga: number }

/** La carga que puso lo que hoy rige en un mes y campo; undefined si no hay nada cargado. */
export function cargaVigente(filas: FilaCargada[], cargas: CargaAsignacion[], mes: string, campoId: string): CargaAsignacion | undefined {
  const id = filas.find(f => f.mes === mes && f.campoId === campoId)?.carga
  return id === undefined ? undefined : cargas.find(c => c.id === id)
}

/** Lee la asignación pegada o subida: Mes;Campo;Pozo;Crudo asignado bbl;Horas
 *  produciendo (opcional). `cerrados` son los meses que se pueden cotejar.
 *  `errores` son filas que no se pueden leer (con una sola, no se carga nada:
 *  un pozo rechazado aparecería después como «no está en la oficial»);
 *  `avisos`, lo que se lee pero conviene mirar (un pozo repetido). */
export function leerAsignacion(texto: string, opciones: { permitidos: string[]; cerrados: string[] }): { filas: FilaOficial[]; errores: string[]; avisos: string[] } {
  const { lineas, sep } = partirTexto(texto)
  const filas: FilaOficial[] = [], errores: string[] = [], avisos: string[] = []
  const vistos = new Map<string, number>()
  let primera = true
  lineas.forEach((linea, i) => {
    if (!linea.trim()) return
    const c = celdas(linea, sep), n = i + 1
    const esPrimera = primera; primera = false
    const mes = leerMes(c[0] ?? '')
    if (!mes) {
      if (!(esPrimera && typeof leerNumero(c[3] ?? '') !== 'number')) errores.push(`Fila ${n}: «${c[0] ?? ''}» no es un mes (use 2026-09, 09/2026 o septiembre 2026).`)
      return
    }
    if (c.length > 5) { errores.push(`Fila ${n}: trae ${c.length} columnas y se esperan 5. Si usa coma decimal, separe las columnas con punto y coma o péguelas desde Excel.`); return }
    // Las cifras empiezan en la cuarta columna: mes, campo y pozo no son números.
    const ambigua = comaAmbigua(linea, sep, 3)
    if (ambigua) { errores.push(`Fila ${n}: «${ambigua}» puede ser un número con miles o dos columnas. Escriba el número entre comillas ("${ambigua}"), sin separador de miles, o separe las columnas con punto y coma.`); return }
    if (!opciones.cerrados.includes(mes)) { errores.push(`Fila ${n}: ${nombreMes(mes)} no es un mes cerrado con datos: no hay con qué cotejarlo.`); return }
    const campoId = leerCampo(c[1] ?? '')
    if (!campoId) { errores.push(`Fila ${n}: «${c[1] ?? ''}» no es un campo.`); return }
    if (!opciones.permitidos.includes(campoId)) { errores.push(`Fila ${n}: no tiene asignado ese campo.`); return }
    const pozo = (c[2] ?? '').trim().toUpperCase()
    if (!pozo) { errores.push(`Fila ${n}: falta el pozo.`); return }
    const bbl = leerNumero(c[3] ?? ''), horas = leerNumero(c[4] ?? '')
    if (bbl === 'malo' || bbl === undefined || bbl < 0) { errores.push(`Fila ${n}: «${c[3] ?? ''}» no es un volumen (bbl, cero o más).`); return }
    // Un mes tiene las horas de sus días: septiembre 720, octubre 744.
    const horasMes = diasDelMes(mes) * 24
    if (horas === 'malo' || (horas !== undefined && (horas < 0 || horas > horasMes))) { errores.push(`Fila ${n}: «${c[4]}» no son horas de ${nombreMes(mes)} (0 a ${horasMes}).`); return }
    const clave = `${mes}|${campoId}|${pozo}`
    if (vistos.has(clave)) avisos.push(`Fila ${n}: repite ${pozo} de ${nombreMes(mes)} (fila ${vistos.get(clave)}); vale la última.`)
    vistos.set(clave, n)
    const fila: FilaOficial = { mes, campoId, pozo, bbl, ...(horas !== undefined ? { horas } : {}) }
    const j = filas.findIndex(f => f.mes === mes && f.campoId === campoId && f.pozo === pozo)
    if (j >= 0) filas[j] = fila; else filas.push(fila)
  })
  return { filas, errores, avisos }
}

/** La plantilla de un mes y campo: una fila por pozo, con el volumen vacío. */
export function plantillaAsignacion(mes: string, campoId: string, pozos: string[]): string {
  const nombre = CAMPOS.find(c => c.id === campoId)!.nombre
  return '﻿' + ['Mes;Campo;Pozo;Crudo asignado bbl;Horas produciendo (opcional)', ...pozos.map(p => `${mes};${nombre};${p};;`)].join('\r\n')
}

export interface Cotejo {
  pozo: string
  oficial?: number
  trim?: number
  /** Oficial − TRIM, bbl. */
  diferencia: number
  horasOficial?: number
  horasTrim?: number
  /** Lo que explica la diferencia de horas: el ritmo del pozo × la diferencia. */
  porHoras?: number
  /** Más allá de la banda de asignación del campo. */
  fuera: boolean
  motivo: string
}

const f0 = (v: number) => Math.round(v).toLocaleString('es-CO')
const f1 = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 1 })

/** Coteja la asignación oficial de un mes y campo contra la de TRIM. La
 *  referencia para «fuera» es la banda de asignación que acepta la Res. 40236
 *  para el campo: más que eso no lo explica la incertidumbre de la medición. */
export function cotejar(oficial: FilaOficial[], trim: AsignacionPozo[], banda: number): { filas: Cotejo[]; totalOficial: number; totalTrim: number } {
  const pozos = [...new Set([...trim.map(t => t.pozo), ...oficial.map(o => o.pozo)])]
  const filas = pozos.map((pozo): Cotejo => {
    const o = oficial.find(x => x.pozo === pozo), t = trim.find(x => x.pozo === pozo)
    if (!o) return { pozo, trim: t!.asignado, diferencia: -t!.asignado, horasTrim: t!.horas, fuera: t!.asignado > 0.5,
      motivo: t!.asignado > 0.5 ? `No está en la asignación oficial; TRIM le asigna ${f0(t!.asignado)} bbl.` : 'No produjo en el mes.' }
    if (!t) return { pozo, oficial: o.bbl, diferencia: o.bbl, horasOficial: o.horas, fuera: o.bbl > 0.5,
      motivo: 'TRIM no tiene ese pozo con prueba en el campo: revise el nombre o el maestro de pozos.' }
    const diferencia = o.bbl - t.asignado
    const fuera = Math.abs(diferencia) > banda * Math.max(o.bbl, t.asignado)
    // Según el PLC no produjo en el mes y la oficial le da horas: la diferencia está en las horas, entera.
    if (t.horas === 0 && (o.horas ?? 0) > 0.05)
      return { pozo, oficial: o.bbl, trim: t.asignado, diferencia, horasOficial: o.horas, horasTrim: 0, fuera,
        motivo: `Según el PLC no produjo en el mes; la oficial le da ${f1(o.horas!)} h y ${f0(o.bbl)} bbl.` }
    if (o.horas !== undefined && Math.abs(o.horas - t.horas) > 0.05 && t.horas > 0) {
      const porHoras = (t.asignado / t.horas) * (o.horas - t.horas)
      const resto = diferencia - porHoras
      return { pozo, oficial: o.bbl, trim: t.asignado, diferencia, horasOficial: o.horas, horasTrim: t.horas, porHoras, fuera,
        motivo: `Horas: ${f1(o.horas)} oficial, ${f1(t.horas)} según el PLC; explican ${f0(porHoras)} bbl.${Math.abs(resto) >= 1 ? ` El resto, ${f0(resto)} bbl, está en la prueba o el factor.` : ''}` }
    }
    return { pozo, oficial: o.bbl, trim: t.asignado, diferencia, horasOficial: o.horas, horasTrim: t.horas, fuera,
      motivo: Math.abs(diferencia) < 1 ? 'Cuadra.' : o.horas === undefined ? 'Sin horas oficiales no se separa: está en las horas, la prueba o el factor.' : 'Mismas horas: está en la prueba o el factor que usó cada uno.' }
  // Primero los pozos que TRIM no conoce (casi siempre un nombre mal escrito), después la diferencia más grande.
  }).sort((a, b) => Number(a.trim !== undefined) - Number(b.trim !== undefined) || Math.abs(b.diferencia) - Math.abs(a.diferencia))
  return { filas, totalOficial: oficial.reduce((a, x) => a + x.bbl, 0), totalTrim: trim.reduce((a, x) => a + x.asignado, 0) }
}
