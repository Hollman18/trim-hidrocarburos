import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { contextoInicial } from '@/entities/libro'
import { versionInicial, type Version } from '@/entities/configuracion'
import { USUARIOS_INICIALES, type PersonaDelRegistro, type CambioAcceso } from '@/entities/usuarios'
import { rolPorId } from '@/entities/roles'
import { CAMPOS } from '@/entities/campos'
import { perezoso } from '@/entities/insumos'
import type { Contexto } from '@/entities/causa-senal'
import type { AvisoSap } from '@/entities/sap'
import type { Informe } from '@/entities/informe'
import type { FilaCargada, CargaAsignacion } from '@/entities/asignacion'
import type { Analisis } from '@/entities/catalogo'
import type { PlantaCampo, CambioPlanta } from '@/entities/planta'
import { FUENTE } from './fuente'
import { catalogoDelCampo } from './catalogo'

/** Lo que en producción guarda el SERVIDOR y aquí tiene el navegador en su
 *  copia: la configuración firmada y su historial, las respuestas de los
 *  operarios, quién tiene acceso, los avisos enviados a SAP, los informes
 *  emitidos, la asignación oficial cargada, los análisis de falla y el
 *  esquema de planta. La costura lo lee de aquí y no del estado de la
 *  aplicación (`app/store.ts`): ese estado registra oyentes del navegador al
 *  cargarse, y con él la costura no se podía cargar en Node para probarla ni
 *  compararla contra un backend.
 *
 *  De dónde sale:
 *  - en el demo, del motor y de la configuración de arranque; las escrituras
 *    (escrituras.ts) hacen de servidor y cambian esta copia;
 *  - con la fuente http, de los GET del arranque (servidor.ts), y cada
 *    escritura la actualiza con lo que el servidor respondió.
 *
 *  Este módulo no tiene efectos: no toca el navegador ni calcula nada al
 *  cargarse. La tienda se crea la primera vez que alguien la pide, cuando los
 *  insumos ya están instalados (el contexto inicial lleva el programa de
 *  paradas, que es un insumo). */
export interface Sesion {
  /** Configuración firmada vigente y respuestas de los operarios: todo lo que
   *  entra a mano. Un objeto nuevo en cada cambio, para que la caché de
   *  consultas sepa cuándo pedir de nuevo (`GET /api/configuracion/historial`
   *  + `GET /api/paradas/respuestas`). */
  ctx: Contexto
  /** Versiones firmadas, de la más vieja a la vigente (`GET /api/configuracion/historial`). */
  versiones: Version[]
  /** `GET /api/usuarios`. El servidor lo manda recortado (sin `usuarios:administrar`, los demás en su forma
   *  mínima); el demo guarda aquí el registro entero y `useRegistroDeAccesos` (usuarios.ts) le aplica la regla. */
  usuarios: PersonaDelRegistro[]
  /** `GET /api/usuarios/historial`, del más viejo al más nuevo. */
  accesos: CambioAcceso[]
  /** Avisos que TRIM le envió a SAP en esta sesión del demo. Con el servidor
   *  van en `GET /api/sap/avisos` y esta lista solo marca que hubo un envío
   *  (cambia la versión de la consulta de avisos). */
  avisosEnviados: AvisoSap[]
  /** `GET /api/informes`: los informes emitidos, con su folio y su huella. */
  informes: Informe[]
  /** `GET /api/asignacion-oficial` → `filas`: la asignación que la operadora reportó, por mes, campo y pozo, con la carga que trajo cada una… */
  asignacionOficial: FilaCargada[]
  /** …y `cargas`: quién cargó cada una, cuándo, por qué y qué reemplazó (del más viejo al más nuevo). */
  cargasAsignacion: CargaAsignacion[]
  /** `GET /api/analisis` → el análisis vigente de cada falla, por evento… */
  analisis: Record<string, Analisis>
  /** …y los que una corrección dejó en la historia (no se borran). */
  analisisAnteriores: Record<string, Analisis[]>
  /** El esquema de planta de cada campo que lo tiene (del catálogo, con los cambios del administrador). */
  plantas: Record<string, PlantaCampo>
  /** `GET /api/planta/cambios`: el historial de cambios al esquema, de todos los campos. */
  cambiosPlanta: CambioPlanta[]
}

let instalada: Sesion | undefined
/** La instala la fuente http con lo que respondió el servidor al arrancar. */
export function instalarSesion(s: Sesion): void { instalada = s }

const tienda = perezoso((): UseBoundStore<StoreApi<Sesion>> => create<Sesion>(() => {
  if (instalada) return instalada
  if (FUENTE === 'http') throw new Error('La sesión no está instalada: la fuente http la trae del servidor al arrancar (servidor.ts).')
  const v1 = versionInicial()
  return {
    // El MISMO objeto con que arrancan la historia de SAP, las predicciones y los
    // mensajes: las cachés del libro van por identidad, y con una copia igual
    // toda la historia se calculaba dos veces.
    ctx: contextoInicial(),
    versiones: [v1],
    usuarios: USUARIOS_INICIALES,
    accesos: [{ id: 1, fecha: v1.fecha, por: v1.por, usuario: 'Todas las personas iniciales',
      cambios: USUARIOS_INICIALES.map(u => `${u.nombre}: ${rolPorId(u.rolId).nombre.toLowerCase()}`), motivo: 'Accesos de arranque de la implementación' }],
    avisosEnviados: [],
    informes: [],
    asignacionOficial: [],
    cargasAsignacion: [],
    analisis: {},
    analisisAnteriores: {},
    plantas: Object.fromEntries(CAMPOS.flatMap(c => { const p = catalogoDelCampo(c.id).planta; return p ? [[c.id, p]] : [] })),
    cambiosPlanta: [],
  }
}))

/** Un pedazo de la sesión, con suscripción (como `useApp(s => …)`). */
export const useSesion = <T,>(selector: (s: Sesion) => T): T => tienda()(selector)
/** La sesión ahora, sin suscripción: para las acciones. */
export const sesion = (): Sesion => tienda().getState()
/** Lo que el servidor guardó: solo lo llaman las escrituras (escrituras.ts),
 *  después de que el servidor (o el del demo) aceptó el cambio. */
export const cambiarSesion = (cambio: Partial<Sesion>): void => tienda().setState(cambio)

/** El contexto de la sesión: entra en cada consulta de la costura. */
export const useCtx = (): Contexto => useSesion(s => s.ctx)
/** El historial de versiones firmadas. */
export const useVersiones = (): Version[] => useSesion(s => s.versiones)
/** Los informes emitidos. */
export const useInformes = (): Informe[] => useSesion(s => s.informes)
/** La asignación oficial cargada y el rastro de cada carga. */
export const useAsignacionOficial = (): FilaCargada[] => useSesion(s => s.asignacionOficial)
export const useCargasAsignacion = (): CargaAsignacion[] => useSesion(s => s.cargasAsignacion)
/** El análisis vigente de cada falla y los anteriores. */
export const useAnalisis = (): Record<string, Analisis> => useSesion(s => s.analisis)
export const useAnalisisAnteriores = (evento: string): Analisis[] | undefined =>
  useSesion(s => (Object.hasOwn(s.analisisAnteriores, evento) ? s.analisisAnteriores[evento] : undefined))
/** El esquema de planta de cada campo y su historial de cambios. */
export const usePlantas = (): Record<string, PlantaCampo> => useSesion(s => s.plantas)
export const useCambiosPlanta = (): CambioPlanta[] => useSesion(s => s.cambiosPlanta)
