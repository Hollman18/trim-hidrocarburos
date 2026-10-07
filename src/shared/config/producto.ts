/** Alcance del primer producto.
 *
 *  Una sola promesa: **decir a qué equipo de superficie se le fueron los
 *  barriles, y probarlo.** Lo que no sirve a esa frase sale del MVP.
 *
 *  Nada se borra. Lo de v2 sigue en el código y se enciende apagando MVP.
 */
export const MVP = true

/** Lo que espera a v2: el tren de agua como pantalla propia, la evidencia
 *  contractual y el reporte al regulador. El lazo de mantenimiento SÍ entra:
 *  sin alguien que haga bajar los barriles, el número de arriba no sirve. */
export const PANTALLAS_V2 = new Set(['agua', 'evidencia', 'regulatorio'])
export const ROLES_V2 = new Set(['plan', 'cont', 'reg'])

export const pantallaVisible = (id: string) => !MVP || !PANTALLAS_V2.has(id)
export const rolVisible = (id: string) => !MVP || !ROLES_V2.has(id)

/** El foco del primer producto: las bombas multifásicas y de inyección, que
 *  son el cuello de botella de la planta. Las listas de equipos las muestran
 *  primero y pliegan el resto; no lo esconden, porque una alarma de otro
 *  equipo (el aire de instrumentos) también puede parar la planta. */
export const FOCO_BOMBAS = true
