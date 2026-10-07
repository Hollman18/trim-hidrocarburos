/** Descarga un CSV hecho en el navegador. Separador «;» y coma decimal: así
 *  lo abre Excel con la configuración regional de Colombia. Sin servidor: el
 *  archivo sale de lo mismo que se ve en pantalla. */
export type Celda = string | number | null | undefined

/** Un texto listo para una celda. Lo que empieza por = + - @ (o un
 *  tabulador o un retorno) la hoja de cálculo lo ejecuta como fórmula aunque
 *  vaya entre comillas: se le antepone «'». Importa porque hay textos que
 *  vienen de afuera (el pozo de una asignación subida, lo que escribió un
 *  operario). Es la misma regla para todo CSV del producto, también el del
 *  informe con folio. */
export const textoCsv = (v: string) => {
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const celda = (v: Celda) => {
  if (v === null || v === undefined) return ''
  // Un número no se neutraliza: −5 es una cifra, no una fórmula.
  if (typeof v === 'number') return Number.isFinite(v) ? String(Math.round(v * 1000) / 1000).replace('.', ',') : ''
  return textoCsv(v)
}

export function descargarCsv(nombre: string, filas: Celda[][]): void {
  // BOM para que Excel reconozca UTF-8 y no rompa las tildes.
  const texto = '﻿' + filas.map(f => f.map(celda).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre.endsWith('.csv') ? nombre : `${nombre}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
