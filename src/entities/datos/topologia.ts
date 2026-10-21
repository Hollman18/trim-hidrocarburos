/** La locación de los pozos del demo · DATOS DE DEMO.
 *
 *  Para el caso de borde de CHOKE-COMPLETO §16 (U2 §8.6): un equipo que sirve
 *  a 2 o 3 pozos de la MISMA locación es compartido y va a la planta, pero falta
 *  que Edinson lo confirme; TRIM lo marca (`casoBordeDe` y `marcarCasosBorde`,
 *  choke.ts) para que, el día que conteste, se vea qué cambia.
 *
 *  La locación no está en `Pozo` (pozos.ts no cambia): vive aquí. Nada se
 *  inventa: el único dato de locación que el demo trae es el «clúster norte» de
 *  Morichal, los tres pozos que mueve MPP-301 (`CAMPO_PLANTA.morichal`: «Bomba
 *  multifásica · clúster norte»; `EQUIPOS['MPP-301'].aguasAbajo`: «3 pozos del
 *  clúster norte»; su perfil en bombas.ts: MN-07, MN-18 y MN-33). De los demás
 *  pozos el demo no dice la locación: sin dato, y el caso de borde no se marca.
 *
 *  Como todo dato de demostración, el motor no lo importa: entra por la costura
 *  (`shared/api/fuente.ts`), que le pasa `locacionDemo` a `marcarCasosBorde`. */

/** La locación de cada pozo del demo, por campo. Un pozo que no está: sin dato. */
export const LOCACIONES_DEMO: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  morichal: { 'MN-07': 'Clúster norte', 'MN-18': 'Clúster norte', 'MN-33': 'Clúster norte' },
}

/** La locación de un pozo del demo en su campo; undefined si el demo no la trae. */
export const locacionDemo = (campoId: string) => (pozo: string): string | undefined => {
  const c = Object.hasOwn(LOCACIONES_DEMO, campoId) ? LOCACIONES_DEMO[campoId] : undefined
  return c && Object.hasOwn(c, pozo) ? c[pozo] : undefined
}
