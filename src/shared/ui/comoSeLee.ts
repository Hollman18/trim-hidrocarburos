import { createContext } from 'react'

/** ¿Está encendido «¿cómo se lee?»? Lo provee App desde el estado de la
 *  aplicación; los componentes compartidos lo leen de aquí y no del estado,
 *  para que shared/ no dependa de app/ (la capa de abajo no conoce la de arriba). */
export const ComoSeLee = createContext(false)
