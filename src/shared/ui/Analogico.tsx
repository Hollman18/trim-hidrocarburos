import { cn } from '@/shared/lib/cn'

/* F3 · El indicador viejo (`Analogico`, con la escala que se movía con el valor y
   la prioridad que decidía la pantalla) se retiró: nadie lo usaba ya (H12, H13, H17).
   Queda el de alto desempeño, con la escala que da el motor. */

/** C4 · El indicador analógico de alto desempeño del nivel 3 (X2 §5.1; X5 §5.4;
 *  la imagen 4, `indicadores.js`). La escala la da el motor y sale de los límites
 *  firmados de la señal: no depende del valor de ahora (X2 B7 e I1), así el puntero
 *  se lee por su lugar. Es provisional mientras falte el rango del instrumento (H5). Sin texto adentro: si no cabe, se dibuja más chico sin perder la proporción.
 *   · la pista en `--pista`; la banda normal en `--banda` con una raya en
 *     `--tinta3` en cada extremo cerrado;
 *   · el límite de alarma, una raya de 2,4 px en tinta;
 *   · el puntero en tinta (un triángulo con su línea); en gris si el equipo está
 *     parado (X2 B9); fuera de la escala, en el borde con su flecha;
 *   · sin lectura, la escala va discontinua y sin puntero (X2 §5.1, punto 6). En gris, no en
 *     morado (K1 · H13.2; X2 §4): el morado solo va en su forma, el círculo punteado que la fila
 *     pone al lado de «---» cuando el equipo está en marcha y no llega el dato; con el equipo
 *     parado no se lee nada y no lleva marca (X2 B9).
 *  Los extremos de la escala no se rotulan y no se dibuja disparo: el motor
 *  todavía no los trae (X2 §7, pedido 4). */
export function IndicadorFijo({ escala, banda, alarmas, valor, gris = false, fuera, etiqueta, className }: {
  escala: [number, number]
  /** Banda normal; null del lado abierto. */
  banda: [number | null, number | null] | null
  alarmas: readonly number[]
  valor: number | null
  gris?: boolean
  fuera?: 'abajo' | 'arriba'
  /** El nombre accesible: «Presión de succión, 18,2 psi; normal > 10; alarma 8». */
  etiqueta: string
  className?: string
}) {
  const A = 156, y = 22
  const [e0, e1] = escala
  const X = (v: number) => 6 + ((Math.min(Math.max(v, e0), e1) - e0) / (e1 - e0 || 1)) * (A - 12)
  const b0 = banda?.[0] ?? e0, b1 = banda?.[1] ?? e1
  const tinta = gris ? 'var(--tinta3)' : 'var(--tinta)'
  const xp = valor === null ? 0 : X(valor)
  return (
    <svg width={A} height={32} viewBox={`0 0 ${A} 32`} role="img" aria-label={etiqueta} className={cn('block h-auto max-w-full', className)}>
      <rect x={6} y={y - 3} width={A - 12} height={6} rx={3} fill="var(--pista)"
        {...(valor === null ? { fill: 'none', stroke: 'var(--tinta3)', strokeDasharray: '3 3', strokeWidth: 1.2, 'data-sin-lectura': '' } : {})} />
      {banda && valor !== null && <rect x={X(b0)} y={y - 6} width={Math.max(X(b1) - X(b0), 1)} height={12} rx={3} fill="var(--banda)" />}
      {banda && valor !== null && banda[0] !== null && <line x1={X(b0)} x2={X(b0)} y1={y - 8} y2={y + 8} stroke="var(--tinta3)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
      {banda && valor !== null && banda[1] !== null && <line x1={X(b1)} x2={X(b1)} y1={y - 8} y2={y + 8} stroke="var(--tinta3)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
      {alarmas.map(a => <line key={a} x1={X(a)} x2={X(a)} y1={y - 10} y2={y + 10} stroke="var(--tinta)" strokeWidth={2.4} vectorEffect="non-scaling-stroke" data-alarma />)}
      {valor !== null && (fuera
        ? <path d={fuera === 'abajo' ? `M2 ${y - 7} L10 ${y - 12} L10 ${y - 2} Z` : `M${A - 2} ${y - 7} L${A - 10} ${y - 12} L${A - 10} ${y - 2} Z`} fill={tinta} data-fuera={fuera} />
        : <g data-puntero>
          <path d={`M${xp - 6} 4 L${xp + 6} 4 L${xp} 13 Z`} fill={tinta} />
          <line x1={xp} x2={xp} y1={12} y2={y + 6} stroke={tinta} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </g>)}
    </svg>
  )
}
