/** Alcance del primer producto.
 *
 *  Una sola promesa: **decir a qué equipo de superficie se le fueron los
 *  barriles, y probarlo.** Lo que no sirve a esa frase sale del MVP.
 *
 *  Nada se borra. Lo de v2 sigue en el código y se enciende apagando MVP.
 */
export const MVP = true

/** Lo que espera a v2: la evidencia contractual (abastecimiento) y la planeadora.
 *  El lazo de mantenimiento SÍ entra: sin alguien que haga bajar los barriles,
 *  el número de arriba no sirve. El tren de agua («La tubería del agua», U2
 *  §5.6) se encendió con el choke (21-oct-2026): el norte del plan son las
 *  bombas de reinyección, y la pantalla ya existía para esto. Cumplimiento
 *  regulatorio y su pantalla se encendieron con el árbol de pérdidas del choke
 *  (22-oct-2026; P1 «Respuestas a UX», P-1: «Sí para `reg` y Regulatorio»): el
 *  árbol en el orden de la circular, con lo que viaja a la ANH, es su panel. */
export const PANTALLAS_V2 = new Set(['evidencia'])
export const ROLES_V2 = new Set(['plan', 'cont'])

export const pantallaVisible = (id: string) => !MVP || !PANTALLAS_V2.has(id)
/** Fase 4 de facilidades · D3: el responsable de energía es un rol que el cliente enciende si tiene esa
 *  persona; si no, lo de energía lo recibe el jefe de mantenimiento. En el demo se enciende con
 *  `VITE_ROL_ENERGIA=1 npx vite`; con un servidor, cuando su registro de usuarios lo trae. */
export const ROL_ENERGIA = import.meta.env.VITE_ROL_ENERGIA === '1'
export const rolVisible = (id: string) => (!MVP || !ROLES_V2.has(id)) && (id !== 'ener' || ROL_ENERGIA)

/** El foco del primer producto: las bombas multifásicas y de inyección, que
 *  son el cuello de botella de la planta. Las listas de equipos las muestran
 *  primero y pliegan el resto; no lo esconden, porque una alarma de otro
 *  equipo (el aire de instrumentos) también puede parar la planta. */
export const FOCO_BOMBAS = true

/** Fase 1 (facilidades) · Para probar el demo con otras piezas contratadas
 *  (`entities/piezas-trim.ts`): `VITE_PIEZAS=equipos,planta npx vite`. Sin la
 *  variable, el demo arranca con todas, que es lo de hoy. Solo el demo: con un
 *  servidor, las piezas vienen en su configuración. */
export const PIEZAS_DEMO: string[] | undefined = import.meta.env.VITE_PIEZAS?.trim()
  ? import.meta.env.VITE_PIEZAS.split(',').map((x: string) => x.trim()).filter(Boolean)
  : undefined
