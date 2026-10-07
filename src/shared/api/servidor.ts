import { pedirJson } from './fuente'
import { deRespuesta, ErrorDeContrato } from './cable'
import { urlDe, LISTA_CAMPOS, CATALOGO, CONFIGURACION_HISTORIAL, RESPUESTAS, USUARIOS, ACCESOS, INFORMES, ASIGNACION_OFICIAL, ANALISIS, CAMBIOS_PLANTA, type Endpoint } from './contrato'
import { instalarCatalogo, type DatosDeCatalogo } from './catalogo'
import { instalarSesion } from './sesion'
import { instalarCampos } from '@/entities/campos'
import type { Campo } from '@/entities/tipos'

/** El arranque con la fuente http: antes de pintar se trae lo que las
 *  pantallas leen sin esperar (el registro de campos y el catálogo) y la
 *  copia de la sesión (lo que entra a mano: configuración firmada, respuestas,
 *  accesos, informes, asignación oficial, análisis, cambios de planta). Todo
 *  en paralelo; si algo falla, main.tsx lo dice en la página: no se arranca a
 *  medias. */

const traer = <T, J>(ep: Endpoint<object, T, J>): Promise<T> => pedirJson(urlDe(ep, {})).then(r => deRespuesta(ep.codec, r))

/** Los campos que el catálogo trae y el registro no: el servidor se contradice
 *  (sabe los equipos de un campo que dice no tener) y no se arranca así,
 *  porque ese campo se vería como «sin registrar» con datos de verdad. */
export const camposSinRegistro = (registro: Campo[], catalogo: Pick<DatosDeCatalogo, 'campos'>): string[] =>
  Object.keys(catalogo.campos).filter(id => !registro.some(c => c.id === id))

export async function arrancarDelServidor(): Promise<void> {
  const [campos, catalogo, versiones, respuestas, usuarios, accesos, informes, asignacion, analisis, cambiosPlanta] = await Promise.all([
    traer(LISTA_CAMPOS), traer(CATALOGO), traer(CONFIGURACION_HISTORIAL), traer(RESPUESTAS), traer(USUARIOS), traer(ACCESOS),
    traer(INFORMES), traer(ASIGNACION_OFICIAL), traer(ANALISIS), traer(CAMBIOS_PLANTA),
  ])
  const vigente = versiones.at(-1)
  if (!vigente) throw new Error('El servidor no tiene ninguna versión de la configuración (GET /api/configuracion/historial vino vacío).')
  const sobran = camposSinRegistro(campos, catalogo)
  if (sobran.length) throw new ErrorDeContrato(`GET /api/catalogo trae ${sobran.join(', ')}, que GET /api/campos no registra.`)
  // El registro primero: todo lo que nombra un campo (permisos, configuración, nombres) lo lee de aquí.
  instalarCampos(campos)
  instalarCatalogo(catalogo)
  instalarSesion({
    // Las versiones ya vienen normalizadas por su códec (un precio en null es «sin precio»).
    ctx: { config: vigente.config, respuestas }, versiones, usuarios, accesos,
    // Con el servidor, los avisos enviados están en GET /api/sap/avisos.
    avisosEnviados: [],
    informes, asignacionOficial: asignacion.filas, cargasAsignacion: asignacion.cargas,
    analisis: analisis.vigentes, analisisAnteriores: analisis.anteriores,
    plantas: Object.fromEntries(Object.entries(catalogo.campos).flatMap(([c, x]) => (x.planta ? [[c, x.planta]] : []))),
    cambiosPlanta,
  })
}
