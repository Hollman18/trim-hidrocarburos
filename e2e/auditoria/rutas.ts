/* Lo que recorre el auditor: cada rol en cada una de sus pantallas, los
   estados que se abren con un clic o desde la dirección, y lo que cada nivel
   debe ver y lo que no. */

const R = (rol: string, pantallas: string[], campos: string[]) =>
  campos.flatMap(c => pantallas.map(p => `#/${rol}/${p}/${c}/curso`))

export const RUTAS = [
  ...R('ger', ['resumen', 'diferidos', 'produccion', 'riesgo', 'configuracion'], ['ceiba', 'ceiba~portafolio']),
  ...R('prod', ['produccion', 'diferidos', 'pozos', 'esp', 'causa', 'planta'], ['ceiba', 'ceiba~portafolio']),
  // Configuración en solo lectura para producción y confiabilidad, con la filosofía operacional en su propia dirección.
  ...R('prod', ['configuracion', 'filosofia'], ['ceiba']),
  ...R('sup', ['bombas', 'esp', 'turno', 'causa', 'pozos'], ['ceiba']),
  ...R('oper', ['bombas', 'esp', 'causa', 'turno'], ['ceiba']),
  ...R('jefe', ['mantenimiento', 'diferidos', 'bombas', 'esp', 'confiabilidad', 'equipo', 'riesgo', 'causa'], ['ceiba', 'ceiba~portafolio']),
  ...R('conf', ['bombas', 'esp', 'confiabilidad', 'diferidos', 'riesgo', 'equipo', 'causa', 'planta'], ['morichal', 'morichal~portafolio']),
  ...R('conf', ['configuracion', 'filosofia'], ['morichal']),
  ...R('tec', ['trabajo', 'bombas', 'esp', 'causa'], ['ceiba']),
  ...R('adm', ['configuracion', 'filosofia', 'conectores', 'planta', 'perfil'], ['ceiba', 'morichal']),
  // Cumplimiento regulatorio (encendido con el árbol de pérdidas del choke): el árbol en el orden de la circular.
  ...R('reg', ['regulatorio'], ['ceiba', 'morichal']),
  // C1 · Experiencia v2: La planta viva y Hoy en cada rol que las tiene (la dirección usa la ruta «planta-viva»).
  ...R('ger', ['planta-viva'], ['ceiba', 'ceiba~portafolio']),
  ...R('prod', ['planta-viva', 'hoy'], ['ceiba']),
  ...R('sup', ['hoy', 'planta-viva'], ['ceiba']),
  ...R('oper', ['hoy', 'planta-viva'], ['ceiba']),
  ...R('tec', ['hoy', 'planta-viva'], ['ceiba']),
  ...R('jefe', ['hoy', 'planta-viva'], ['ceiba']),
  ...R('conf', ['hoy', 'planta-viva'], ['morichal']),
  ...R('reg', ['planta-viva'], ['ceiba']),
  ...R('adm', ['planta-viva'], ['ceiba']),
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
  // «En riesgo»: la multifásica no es un servicio (la regla de Riesgo); cada cosa por lo que es.
  // POR CAMPO se despliega por campo (plegado en la pantalla: sus equipos no son texto visible).
  '#/ger/resumen/ceiba~portafolio/curso': { si: ['barriles diferidos', 'bbl · retorno', 'Antes', 'Durante', 'Después', 'simulado', 'Ver planes de acción', 'MEDIDO', 'POR EQUIPO', 'del diferido · reinyección y electrosumergibles', 'bbl · calculado', 'PROMEDIO DIARIO',
    /producción\s+(3\s+)?[\d.]+\s+bbl\/d\s+meta [\d.]+/i, /diferido\s+(3\s+)?[\d.]+\s+bbl\/d\s+máx\. [\d.]+/i,
    /CIERRE PROYECTADO[\s\S]{0,40}producción[\s\S]{0,40}meta 1\.[\d.]+[\s\S]{0,60}diferido[\s\S]{0,40}máx\. [\d.]+/i,
    'POR CAMPO', '+ 1 servicio y 1 bomba multifásica en alarma'],
    no: [...NO_DECISION, 'QUIÉN SE LOS LLEVA', 'Si todo sigue como está ahora', 'A la fecha:', '2 servicios en alarma', 'Reparar y arrancar', 'WhatsApp con ventana'] },
  '#/ger/resumen/ceiba/curso': { si: ['barriles diferidos', 'bbl · retorno', 'Antes', 'Durante', 'Después', 'Ver planes de acción', 'MEDIDO', 'POR EQUIPO', 'bbl · calculado', 'Mantenimiento proactivo', '+ 1 servicio en alarma'], no: NO_DECISION },
  '#/ger/diferidos/ceiba/curso': { si: ['MES A MES', 'DÓNDE BAJARLO'], no: NO_DECISION },
  // Regulatorio: el árbol de la circular con la cadena de cada paso, la rama vacía de la pérdida y PRODML debajo.
  '#/reg/regulatorio/ceiba/curso': { si: ['ÁRBOL DE CAUSAS · COMO LA CIRCULAR', 'resp_par', 'choke_mod', 'cau_niv1', 'Pérdida: TRIM todavía no tiene registro de pérdidas', 'el diferido del libro', 'TAMBIÉN EN PRODML'], no: [] },
  '#/ger/produccion/ceiba/curso': { si: ['DÍA A DÍA'], no: [...NO_DECISION, 'MEDICIÓN OFICIAL', 'ASIGNACIÓN OFICIAL'] },
  // RegExp: en minúsculas «metas por campo» lo trae el motivo de la versión 1 y la aserción pasaría sin el panel.
  '#/ger/configuracion/ceiba/curso': { si: [/METAS POR CAMPO/, 'Meta global', 'FIRMAR LA VERSIÓN', 'Usuarios y accesos'], no: ['TANQUES DE AGUA', 'PARADAS PROGRAMADAS', 'NO SE CONFIGURA', 'Configuración técnica'] },
  '#/prod/esp/palmar/curso': { si: ['no tiene electrosumergibles en su perfil', 'Todos'], no: ['Electrosumergible con aviso'] },
  '#/prod/planta/palmar/curso': { si: ['CAPTURANDO DATOS', 'no tiene tren de gas'], no: ['TREN DE GAS'] },
  '#/adm/configuracion/ceiba/curso': { si: ['TANQUES DE AGUA', 'MEMBRETE DEL INFORME', 'Metas de los campos'], no: ['Meta global'] },
  // La filosofía operacional tiene dirección propia; producción y confiabilidad la leen sin firmar nada.
  '#/adm/filosofia/ceiba/curso': { si: ['Filosofía operacional · La Ceiba', 'Paso 1 · Equipos y pozos', '¿A qué pozos sirve este equipo?'], no: ['Solo lectura'] },
  '#/prod/filosofia/ceiba/curso': { si: ['Filosofía operacional · La Ceiba', 'Solo lectura: la prepara y la firma el administrador'], no: ['FIRMAR LA VERSIÓN', 'Subir Excel o CSV'] },
  '#/conf/configuracion/morichal/curso': { si: ['Solo lectura: lo prepara y lo firma el administrador', 'TANQUES DE AGUA', 'Filosofía operacional'], no: ['FIRMAR LA VERSIÓN', 'Usuarios y accesos'] },
  // Lo que viene en camino no es «sin stock»: se dice cuándo llega, sin marca (6B·H8).
  '#/ger/resumen/ceiba/cerrado/P-201B': { si: ['Qué se está haciendo', 'Le ha costado', 'pozos cerrados desde', 'llega el 9 de oct'], no: [...NO_DECISION, 'sin stock de kit'] },
  '#/oper/bombas/ceiba/curso': { si: ['No arrancar'], no: ['Energía por barril', 'acumulado'] },
  // Los «no» van en minúsculas: en ingeniería «supuestos» y «tolerancia» son ahora rótulos de ⓘ.
  '#/sup/bombas/ceiba/curso [detalle]': { si: ['MIENTRAS ESTÉ PARADA', 'ÚLTIMAS PARADAS', 'No arrancar hasta identificar'], no: ['VIGÍA', 'SALUD POR PARTE', 'supuestos', 'Energía por barril', 'tolerancia'] },
  '#/sup/pozos/ceiba/curso': { si: ['POZOS'], no: ['Custodia', 'Sin custodia completa'] },
  // RegExp: «Si se para ahora» también es la cifra de la cabecera del detalle; el panel es el título.
  // Lo que YA costó es «le ha costado por falla», nunca «costo por falla» (que es la cifra de Riesgo);
  // la duración de cada parada va rotulada («bomba parada»).
  '#/conf/bombas/morichal/curso [detalle]': { si: ['VIGÍA', 'SALUD POR PARTE', /SI SE PARA AHORA/, 'SUPUESTOS', 'Le ha costado por falla', 'bomba parada'], no: ['Costo por falla'] },
  // Las horas con una sola regla: «2,0 d fuera» (MPP-301), no «48,7 h fuera»; lo histórico no es «bbl/falla».
  '#/conf/bombas/morichal/curso': { si: ['2,0 d fuera'], no: ['bbl/falla', '48,7 h fuera'] },
  // Los bbl/d son «en juego» (o «si para»): «si falla(n)» es la cifra en bbl de Riesgo.
  '#/conf/esp/morichal/curso': { si: ['bbl/d en juego'], no: ['bbl/d si fallan'] },
  // El título al comienzo del renglón: no lo confunde con «CUADRE · MEDICIÓN OFICIAL».
  // El mes que se coteja ya no va escrito aparte: solo en las opciones de la lista, que Safari y
  // Firefox no cuentan como texto visible. Que se ofrezca septiembre y no el mes en curso lo prueba carril.spec.
  '#/prod/produccion/ceiba/curso': { si: [/(?:^|\n)MEDICIÓN OFICIAL/, 'FACTOR DE ASIGNACIÓN', 'CUADRE · ASIGNACIÓN OFICIAL'], no: [] },
  // «no arrancar» sigue a la vista (procedimiento); los pozos que cerró P-201B llevan «parte por
  // identificar», no «sin identificar», como si su parada no tuviera causa.
  '#/sup/turno/ceiba/curso': { si: ['pozos cerrados por P-201B', 'WHATSAPP DEL TURNO', 'escalado', 'no arrancar', 'parte por identificar'], no: ['(sin identificar)', 'preguntarle al operario', 'LO QUE TRIM MANDÓ'] },
  // «Si falla hoy» en bbl y el colchón truncado con «antes de» (P-201B de Morichal: 10,05 h → «10 h»); lo viejo no vuelve.
  '#/jefe/riesgo/ceiba~portafolio/curso': { si: ['PERDIÉNDOSE AHORA', 'EN RIESGO', 'cruza en', 'qué hacer', 'bbl si falla hoy', 'bbl de exposición', 'bbl/d en juego', /0 si vuelve\santes\sde\s10\sh/, /ver \d+ más/i],
    no: ['LO QUE SE PUEDE EVITAR', 'ordenado por cuándo', 'Qué hacer:', 'bbl si fallan', 'bbl por falla', '< 10 h'] },
  // La regla de operación va en la franja: sus dos frases (los chips «no arrancar» no las satisfacen).
  '#/oper/causa/ceiba/curso': { si: [/\d\d:\d\d pregunta → \d\d:\d\d recordatorio/, 'Pista · historia del equipo', /· \d+ de \d+ fallas?/, 'Ver mi chat de WhatsApp', 'sin respuesta', 'No fue la electrosumergible', 'No arrancar hasta identificar el daño', 'si arranca antes: no conformidad', 'demo'],
    no: ['señal e historia', 'LO QUE DIJO LA SEÑAL', 'Regla de operación:', 'Demo · simular', 'en este demo'] },
  // Avisan EQUIPOS (un servicio como K-101 avisa sin parte), no «partes».
  '#/tec/trabajo/ceiba/curso': { si: ['ÓRDENES EN SAP', 'a su nombre', 'TRIM le avisó por WhatsApp', 'vea «Órdenes en SAP»', 'equipo avisando'], no: ['no está conectado', 'la primera en ya fuera', 'parte avisando'] },
  '#/conf/confiabilidad/morichal/curso': { si: ['REPARACIÓN ACTIVA Y ESPERA', '¿ACIERTA EL VIGÍA?', 'LO QUE ANUNCIÓ Y EN QUÉ QUEDÓ', 'Fallas anticipadas', 'Se le escaparon'], no: ['ninguna ha vencido', 'no se afirma'] },
  // «Por identificar» con la cuenta única: de las que piden respuesta, las que ya arrancaron.
  '#/jefe/mantenimiento/ceiba/curso': { si: ['HORAS EN SAP', 'ABIERTO EN SAP', /arranc(?:ó|aron) sin identificar/], no: [': ya fuera de límite', 'En este demo', 'Ninguna parte va hacia su límite'] },
  // Las mismas cifras y marcas que Riesgo: «si falla hoy» y, estimado con la flota, «flota»; una
  // parte chica del total es «< 1 %», no «0 %».
  '#/jefe/mantenimiento/ceiba~portafolio/curso': { si: ['si falla hoy', /si falla hoy\s+flota/, /arranc(?:ó|aron) sin identificar/], no: ['Ninguna parte va hacia su límite', 'bbl · 0 %'] },
  // El tanque con la bomba parada sube con el agua que ENTRA: en La Ceiba ya se cerraron los pozos que
  // hacía falta y lo que entra lo sacan P-201A y P-201C; no sube y no hay alarma por eso (el colchón de
  // «si parara con todo produciendo» no es eso). La capacidad del tren de agua se cuenta sin la detenida.
  '#/prod/planta/ceiba/curso': { si: ['el respaldo toma el agua que entra'], no: ['llega al alto-alto', 'no entra agua'] },
  '#/adm/conectores/ceiba/curso': { si: ['SISTEMAS CORPORATIVOS', 'trim_que_se_dano', 'conectado', 'CATÁLOGOS DE DAÑO'], no: ['en este demo'] },
  // «qué se dañó»: solo lo dice la ficha (la placa de detrás también dice «No arrancar hasta identificar»).
  '#/sup/bombas/ceiba/curso/P-201B': { si: ['No arrancar hasta identificar qué se dañó'], no: ['HISTORIA DEL PLC', 'Modo de falla'] },
}
