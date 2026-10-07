/* Lo que recorre el auditor: cada rol en cada una de sus pantallas, los
   estados que se abren con un clic o desde la dirección, y lo que cada nivel
   debe ver y lo que no. */

const R = (rol: string, pantallas: string[], campos: string[]) =>
  campos.flatMap(c => pantallas.map(p => `#/${rol}/${p}/${c}/curso`))

export const RUTAS = [
  ...R('ger', ['resumen', 'diferidos', 'produccion', 'riesgo', 'configuracion'], ['ceiba', 'ceiba~portafolio']),
  ...R('prod', ['produccion', 'diferidos', 'pozos', 'esp', 'causa', 'planta'], ['ceiba', 'ceiba~portafolio']),
  ...R('sup', ['bombas', 'esp', 'turno', 'causa', 'pozos'], ['ceiba']),
  ...R('oper', ['bombas', 'esp', 'causa', 'turno'], ['ceiba']),
  ...R('jefe', ['mantenimiento', 'diferidos', 'bombas', 'esp', 'confiabilidad', 'equipo', 'riesgo', 'causa'], ['ceiba', 'ceiba~portafolio']),
  ...R('conf', ['bombas', 'esp', 'confiabilidad', 'diferidos', 'riesgo', 'equipo', 'causa', 'planta'], ['morichal', 'morichal~portafolio']),
  ...R('tec', ['trabajo', 'bombas', 'esp', 'causa'], ['ceiba']),
  ...R('adm', ['configuracion', 'conectores', 'planta', 'perfil'], ['ceiba', 'morichal']),
  // estados que se abren con un clic o desde la URL: bomba, pozo, servicio
  '#/sup/bombas/ceiba/curso/P-201B', '#/jefe/riesgo/ceiba/curso/P-201B', '#/conf/confiabilidad/morichal/curso/MPP-301',
  '#/prod/pozos/ceiba/curso/LC-21', '#/prod/pozos/morichal/curso/LC-14', '#/jefe/esp/morichal/curso/MN-07',
  '#/ger/diferidos/morichal/curso/SE-2', '#/jefe/equipo/ceiba/curso/K-101',
  // el libro en otros períodos
  '#/ger/diferidos/ceiba/cerrado', '#/ger/diferidos/ceiba~portafolio/doce', '#/ger/resumen/morichal/trimestre',
  '#/ger/resumen/ceiba/cerrado/P-201B', '#/prod/causa/ceiba/curso', '#/prod/causa/morichal/cerrado',
  '#/prod/produccion/palmar/doce', '#/prod/produccion/ceiba~portafolio/ytd',
  // un campo sin electrosumergibles ni gas: la subpantalla no existe y la planta no dibuja gas
  '#/prod/esp/palmar/curso', '#/prod/planta/palmar/curso', '#/adm/planta/guacamayo/curso',
]

export const ANCHOS = [1512, 1280, 1024, 768, 390]

/** Rutas donde además se abre el detalle de la primera bomba. */
export const ABRIR_BOMBA = new Set(['#/conf/bombas/morichal/curso', '#/sup/bombas/ceiba/curso', '#/jefe/bombas/ceiba/curso'])
/** Rutas donde además se abre la primera fila de la tabla (detalle del pozo). */
export const ABRIR_FILA = new Set(['#/prod/pozos/ceiba/curso', '#/jefe/esp/ceiba~portafolio/curso', '#/conf/esp/morichal/curso'])

/** Lo que un nivel de decisión no tiene por qué ver: títulos de paneles técnicos. */
const NO_DECISION = ['Presión de succión', 'Energía por barril', 'VIGÍA', 'FACTOR DE ASIGNACIÓN', 'CADENA DE CUSTODIA', 'Tolerancia', 'DISPOSITIVOS']

/** Lo que cada nivel debe ver (`si`, sin importar mayúsculas; una expresión
 *  regular exige además el orden, p. ej. la cifra junto a su meta) y lo que no
 *  (`no`, tal cual), en el texto visible de la página. « [detalle]» es la
 *  misma ruta con el detalle de la primera bomba abierto. */
export const ASERCIONES: Record<string, { si: Array<string | RegExp>; no: string[] }> = {
  // Menos texto (piloto 7-oct): la producción y el diferido por día van como barra contra su meta,
  // y el cierre del mes contra la meta del mes completo («meta 1.…»: pasa del millón en el portafolio).
  '#/ger/resumen/ceiba~portafolio/curso': { si: ['barriles diferidos', 'POR EQUIPO', 'del diferido · reinyección y electrosumergibles', 'bbl · calculado', 'PROMEDIO DIARIO',
    /producción\s+(3\s+)?[\d.]+\s+bbl\/d\s+meta [\d.]+/i, /diferido\s+(3\s+)?[\d.]+\s+bbl\/d\s+máx\. [\d.]+/i,
    /CIERRE PROYECTADO[\s\S]{0,40}producción[\s\S]{0,40}meta 1\.[\d.]+[\s\S]{0,60}diferido[\s\S]{0,40}máx\. [\d.]+/i],
    no: [...NO_DECISION, 'QUIÉN SE LOS LLEVA', 'Si todo sigue como está ahora', 'A la fecha:'] },
  '#/ger/resumen/ceiba/curso': { si: ['barriles diferidos', 'POR EQUIPO', 'bbl · calculado', 'Mantenimiento proactivo'], no: NO_DECISION },
  '#/ger/diferidos/ceiba/curso': { si: ['MES A MES', 'DÓNDE SE PUEDE BAJAR'], no: NO_DECISION },
  '#/ger/produccion/ceiba/curso': { si: ['DÍA A DÍA'], no: [...NO_DECISION, 'PUNTO DE MEDICIÓN OFICIAL', 'CUADRE CON LA ASIGNACIÓN OFICIAL'] },
  '#/ger/configuracion/ceiba/curso': { si: ['METAS DE LOS CAMPOS', 'Meta global', 'FIRMAR LA VERSIÓN', 'Usuarios y accesos'], no: ['TANQUES DE AGUA', 'PROGRAMA DE PARADAS APROBADO', 'LO QUE NO SE CONFIGURA', 'Configuración técnica'] },
  '#/prod/esp/palmar/curso': { si: ['no tiene electrosumergibles en su perfil', 'Todos'], no: ['Electrosumergible con aviso'] },
  '#/prod/planta/palmar/curso': { si: ['CAPTURANDO DATOS', 'no tiene tren de gas'], no: ['TREN DE GAS'] },
  '#/adm/configuracion/ceiba/curso': { si: ['TANQUES DE AGUA', 'MEMBRETE DE LOS INFORMES', 'Metas de los campos'], no: ['Meta global'] },
  '#/ger/resumen/ceiba/cerrado/P-201B': { si: ['Qué se está haciendo', 'Le ha costado', 'pozos cerrados desde'], no: NO_DECISION },
  '#/oper/bombas/ceiba/curso': { si: ['No arrancar'], no: ['Energía por barril', 'acumulado'] },
  '#/sup/bombas/ceiba/curso [detalle]': { si: ['MIENTRAS ESTÉ PARADA', 'ÚLTIMAS PARADAS', 'No arrancar hasta identificar'], no: ['VIGÍA', 'SALUD POR PARTE', 'SUPUESTOS', 'Energía por barril', 'Método de la tolerancia'] },
  '#/sup/pozos/ceiba/curso': { si: ['POZOS'], no: ['Custodia', 'Sin custodia completa'] },
  '#/conf/bombas/morichal/curso [detalle]': { si: ['VIGÍA', 'SALUD POR PARTE', 'SI SE PARA AHORA', 'SUPUESTOS'], no: [] },
  '#/prod/produccion/ceiba/curso': { si: ['PUNTO DE MEDICIÓN OFICIAL', 'FACTOR DE ASIGNACIÓN', 'CUADRE CON LA ASIGNACIÓN OFICIAL', 'septiembre de 2026'], no: [] },
  // «no arrancar» sigue a la vista (procedimiento); los pozos que cerró P-201B llevan «parte por
  // identificar», no «sin identificar», como si su parada no tuviera causa.
  '#/sup/turno/ceiba/curso': { si: ['pozos cerrados por P-201B', 'WHATSAPP DEL TURNO', 'escalado', 'no arrancar', 'parte por identificar'], no: ['(sin identificar)', 'preguntarle al operario', 'LO QUE TRIM MANDÓ'] },
  '#/jefe/riesgo/ceiba~portafolio/curso': { si: ['PERDIÉNDOSE AHORA', 'EN RIESGO', 'cruza en', 'qué hacer', 'bbl por falla', 'bbl si fallan', /ver \d+ más/i], no: ['LO QUE SE PUEDE EVITAR', 'ordenado por cuándo', 'Qué hacer:'] },
  '#/oper/causa/ceiba/curso': { si: ['WHATSAPP · LO QUE MANDÓ TRIM', 'Lo que más ha fallado en este equipo', 'Ver mi chat de WhatsApp', 'sin respuesta', 'No fue la electrosumergible', 'demo'], no: ['Lo que sugiere la señal (', 'Demo · simular', 'en este demo'] },
  '#/tec/trabajo/ceiba/curso': { si: ['ÓRDENES EN SAP', 'a su nombre', 'TRIM le avisó por WhatsApp', 'vea «Órdenes en SAP»'], no: ['no está conectado', 'la primera en ya fuera'] },
  '#/conf/confiabilidad/morichal/curso': { si: ['REPARACIÓN ACTIVA Y ESPERA', '¿ACIERTA EL VIGÍA?', 'LO QUE ANUNCIÓ Y EN QUÉ QUEDÓ', 'Fallas anticipadas', 'Se le escaparon'], no: ['ninguna ha vencido', 'no se afirma'] },
  '#/jefe/mantenimiento/ceiba/curso': { si: ['HORAS DE MANTENIMIENTO · SAP', 'ABIERTO EN SAP'], no: [': ya fuera de límite', 'En este demo'] },
  '#/adm/conectores/ceiba/curso': { si: ['SISTEMAS DE LA EMPRESA', 'trim_que_se_dano', 'conectado', 'CATÁLOGOS DE DAÑO'], no: ['en este demo'] },
  '#/sup/bombas/ceiba/curso/P-201B': { si: ['No arrancar hasta identificar'], no: ['HISTORIA DEL PLC', 'Modo de falla'] },
}
