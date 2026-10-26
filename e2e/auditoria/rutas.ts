/* Lo que recorre el auditor: cada rol en cada una de sus pantallas, los
   estados que se abren con un clic o desde la dirección, y lo que cada nivel
   debe ver y lo que no. */

const R = (rol: string, pantallas: string[], campos: string[]) =>
  campos.flatMap(c => pantallas.map(p => `#/${rol}/${p}/${c}/curso`))

export const RUTAS = [
  // C5: el Resumen, los Diferidos y la Producción del gerente se fundieron en La planta viva y Resultados.
  ...R('ger', ['resultados', 'configuracion'], ['ceiba', 'ceiba~portafolio']),
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
  // C5 · Resultados: el inicio de la puerta en cada rol que la tiene.
  ...R('prod', ['resultados'], ['ceiba', 'ceiba~portafolio']),
  ...R('jefe', ['resultados'], ['ceiba', 'ceiba~portafolio']),
  ...R('conf', ['resultados'], ['morichal']),
  ...R('reg', ['resultados'], ['ceiba']),
  // estados que se abren con un clic o desde la URL: bomba, pozo, servicio
  '#/sup/bombas/ceiba/curso/P-201B', '#/jefe/riesgo/ceiba/curso/P-201B', '#/conf/confiabilidad/morichal/curso/MPP-301',
  '#/prod/pozos/ceiba/curso/LC-21', '#/prod/pozos/morichal/curso/LC-14', '#/jefe/esp/morichal/curso/MN-07',
  '#/ger/resultados/morichal/curso/SE-2', '#/jefe/equipo/ceiba/curso/K-101',
  // C4 · Equipos: la lista (técnica y del gerente), el nivel 3 sin instrumento y el nivel 4 (diagnóstico).
  '#/conf/equipos/ceiba', '#/ger/equipos/ceiba~portafolio', '#/sup/equipos/ceiba/P-201A',
  '#/conf/equipos/ceiba/P-201B/diagnostico', '#/conf/equipos/morichal/MPP-301/diagnostico',
  // el libro en otros períodos
  '#/ger/resultados/ceiba/cerrado', '#/ger/resultados/ceiba~portafolio/doce', '#/ger/resultados/morichal/trimestre',
  '#/ger/resultados/ceiba/cerrado/P-201B', '#/prod/causa/ceiba/curso', '#/prod/causa/morichal/cerrado',
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
const NO_DECISION = ['Presión de succión', 'Energía por barril', 'VIGÍA', 'FACTOR DE ASIGNACIÓN', 'Factor de asignación', 'CADENA DE CUSTODIA', 'Cadena de custodia', 'Tolerancia', 'DISPOSITIVOS']

/** Lo que cada nivel debe ver (`si`, sin importar mayúsculas; una expresión
 *  regular exige además el orden, p. ej. la cifra junto a su meta) y lo que no
 *  (`no`, tal cual), en el texto visible de la página. « [detalle]» es la
 *  misma ruta con el detalle de la primera bomba abierto. */
export const ASERCIONES: Record<string, { si: Array<string | RegExp>; no: string[] }> = {
  // Menos texto (piloto 7-oct): la producción y el diferido por día van como barra contra su meta,
  // y el cierre del mes contra la meta del mes completo («meta 1.…»: pasa del millón en el portafolio).
  // «En riesgo»: la multifásica no es un servicio (la regla de Riesgo); cada cosa por lo que es.
  // POR CAMPO se despliega por campo (plegado en la pantalla: sus equipos no son texto visible).
  '#/ger/resultados/ceiba~portafolio/curso': { si: ['Lo que pasó · octubre, en curso', 'barriles', 'no se produjeron en sus 5 campos', 'El máximo firmado para lo que va de octubre',
    'calculado', 'Promedio por día', 'Cierre proyectado', 'proyectado', '¿Está bajando? Desde que entró TRIM', 'mantenimiento proactivo', 'Lo de alto impacto',
    'Diferido por día, mes a mes', 'Por dónde se trabó', 'Diferido por equipo', 'Por campo', 'dónde se trabó', 'Dónde bajarlo', 'Tipo de causa', 'Producción día a día',
    'Retorno posible del ciclo', 'simulado', 'Antes', 'Durante', 'Después', 'lo que salió y no se vendió',
    /producción\s+meta [\d.]+\s+(3\s+)?[\d.]+\s*bbl\/d/i, /diferido\s+máx\. [\d.]+\s+(3\s+)?[\d.]+\s*bbl\/d/i, /Cierre proyectado[\s\S]{0,80}producción\s+meta 1\.[\d.]+/i],
    // Lo simulado nunca es la cifra grande; ni el bloque del ciclo, ni sus 1·2·3, ni el acordeón de planes; ni el detalle técnico.
    no: [...NO_DECISION, 'bbl · retorno', 'Ver planes de acción', '1 · Antes', '2 · Durante', '3 · Después', 'Medición oficial', 'MEDICIÓN OFICIAL', 'Asignación oficial', 'ASIGNACIÓN OFICIAL', 'Perdiéndose', 'QUIÉN SE LOS LLEVA', 'Reparar y arrancar', 'WhatsApp con ventana'] },
  '#/ger/resultados/ceiba/curso': { si: ['no se produjeron en La Ceiba', 'Dónde se trabó', 'Dónde bajarlo', 'Tipo de causa', 'Producción día a día', 'Ver qué se está haciendo', 'Retorno posible del ciclo', 'simulado'],
    no: [...NO_DECISION, 'Por campo', 'bbl · retorno', 'Ver planes de acción'] },
  // El período vive aquí: otro período, otra cifra y su sello; un mes cerrado no proyecta.
  '#/ger/resultados/ceiba/cerrado': { si: ['Lo que pasó · septiembre', 'Total del período', 'Se puede publicar'], no: ['Cierre proyectado'] },
  // Producción: «¿Se puede publicar?» con el cuadre y la custodia; jefe y confiabilidad, su tarjeta; regulatorio, la publicación primero.
  '#/prod/resultados/ceiba/curso': { si: ['¿Se puede publicar?', 'Promedio por día', 'Diferido por día, mes a mes', 'Retorno posible del ciclo', 'Ver el libro de diferidos'], no: ['Dónde bajarlo', 'Producción día a día'] },
  '#/jefe/resultados/ceiba/curso': { si: ['Mantenimiento', /De [\d,]+ días que dura una falla, [\d,]+ son espera/, '¿Le creo al vigía?', 'Ver lo que hay que atacar', 'Retorno posible del ciclo'], no: ['¿Se puede publicar?'] },
  '#/conf/resultados/morichal/curso': { si: ['¿Le creo al vigía?', 'de lo que se puede juzgar fue verdad', 'Mantenimiento', 'Ver la confiabilidad'], no: [] },
  '#/reg/resultados/ceiba/curso': { si: ['¿Se puede publicar?', 'Ver el reporte', 'Diferido por día, mes a mes'], no: ['Retorno posible del ciclo', 'simulado'] },
  // Regulatorio: el árbol de la circular con la cadena de cada paso, la rama vacía de la pérdida y PRODML debajo.
  '#/reg/regulatorio/ceiba/curso': { si: ['ÁRBOL DE CAUSAS · COMO LA CIRCULAR', 'resp_par', 'choke_mod', 'cau_niv1', 'Pérdida: TRIM todavía no tiene registro de pérdidas', 'el diferido del libro', 'TAMBIÉN EN PRODML'], no: [] },
  // RegExp: en minúsculas «metas por campo» lo trae el motivo de la versión 1 y la aserción pasaría sin el panel.
  '#/ger/configuracion/ceiba/curso': { si: [/METAS POR CAMPO/, 'Meta global', 'FIRMAR LA VERSIÓN', 'Usuarios y accesos'], no: ['TANQUES DE AGUA', 'PARADAS PROGRAMADAS', 'NO SE CONFIGURA', 'Configuración técnica'] },
  '#/prod/esp/palmar/curso': { si: ['no tiene electrosumergibles en su perfil', 'Todos'], no: ['Electrosumergible con aviso'] },
  '#/prod/planta/palmar/curso': { si: ['CAPTURANDO DATOS', 'no tiene tren de gas'], no: ['Tren de gas'] },
  '#/adm/configuracion/ceiba/curso': { si: ['TANQUES DE AGUA', 'MEMBRETE DEL INFORME', 'Metas de los campos'], no: ['Meta global'] },
  // La filosofía operacional tiene dirección propia; producción y confiabilidad la leen sin firmar nada.
  '#/adm/filosofia/ceiba/curso': { si: ['Filosofía operacional · La Ceiba', 'Paso 1 · Equipos y pozos', '¿A qué pozos sirve este equipo?'], no: ['Solo lectura'] },
  '#/prod/filosofia/ceiba/curso': { si: ['Filosofía operacional · La Ceiba', 'Solo lectura: la prepara y la firma el administrador'], no: ['FIRMAR LA VERSIÓN', 'Subir Excel o CSV'] },
  '#/conf/configuracion/morichal/curso': { si: ['Solo lectura: lo prepara y lo firma el administrador', 'TANQUES DE AGUA', 'Filosofía operacional'], no: ['FIRMAR LA VERSIÓN', 'Usuarios y accesos'] },
  // Lo que viene en camino no es «sin stock»: se dice cuándo llega, sin marca (6B·H8).
  '#/ger/resultados/ceiba/cerrado/P-201B': { si: ['Qué se está haciendo', 'Le ha costado', 'pozos cerrados desde', 'llega el 9 de oct'], no: [...NO_DECISION, 'sin stock de kit'] },
  '#/oper/bombas/ceiba/curso': { si: ['No arrancar'], no: ['Energía por barril', 'acumulado'] },
  // Los «no» van en minúsculas: en ingeniería «supuestos» y «tolerancia» son ahora rótulos de ⓘ.
  // C4 · La placa abre el nivel 3 (una vista): lo de ahora, sus dos últimas fallas en «Su historia» y el bloqueo;
  // al supervisor, sin el vigía ni el modo de falla (son del diagnóstico, nivel 4).
  '#/sup/bombas/ceiba/curso [detalle]': { si: ['Mientras esté parada', 'Su historia', /\d+ de sept\s+rodamientos/, 'No arrancar hasta identificar'], no: ['VIGÍA', 'SALUD POR PARTE', 'supuestos', 'Energía por barril', 'tolerancia', 'Modo de falla'] },
  '#/sup/pozos/ceiba/curso': { si: ['POZOS'], no: ['Custodia', 'Sin custodia completa'] },
  // RegExp: «Si se para ahora» también es la cifra de la cabecera del detalle; el panel es el título.
  // Lo que YA costó es «le ha costado por falla», nunca «costo por falla» (que es la cifra de Riesgo);
  // la duración de cada parada va rotulada («bomba parada»).
  // C4 · En el nivel 3, «Si se para ahora» y lo que ya costó cada falla; el vigía, la salud por parte y las paradas del PLC, en el 4.
  '#/conf/bombas/morichal/curso [detalle]': { si: [/SI SE PARA AHORA/, 'SUPUESTOS', /Le ha costado [\d.]+ bbl por falla/, 'Ver el diagnóstico'], no: ['Costo por falla'] },
  '#/conf/equipos/morichal/MPP-301/diagnostico': { si: ['VIGÍA', 'SALUD POR PARTE', 'bomba parada', 'PUNTOS CIEGOS', 'HISTORIA DEL PLC', 'Sus instrumentos'], no: ['Costo por falla'] },
  '#/conf/equipos/ceiba': { si: ['¿Le creo al vigía?', '¿Lo vigila TRIM?', 'Cambió hoy', 'no: sin instrumento'], no: ['Superficie'] },
  '#/ger/equipos/ceiba~portafolio': { si: ['Ahora: lo que está parado o avisa', 'POR EQUIPO'], no: NO_DECISION },
  '#/sup/equipos/ceiba/P-201A': { si: ['sin instrumento', 'Mientras P-201B esté parada', 'Si falla hoy'], no: ['Ver el diagnóstico'] },
  // Las horas con una sola regla: «2,0 d fuera» (MPP-301), no «48,7 h fuera»; lo histórico no es «bbl/falla».
  '#/conf/bombas/morichal/curso': { si: ['2,0 d fuera'], no: ['bbl/falla', '48,7 h fuera'] },
  // Los bbl/d son «en juego» (o «si para»): «si falla(n)» es la cifra en bbl de Riesgo.
  '#/conf/esp/morichal/curso': { si: ['bbl/d en juego'], no: ['bbl/d si fallan'] },
  // El título al comienzo del renglón: no lo confunde con «Puntos de medición oficial». Un panel, una vez (C5):
  // «¿Se puede publicar?» (el cuadre y la custodia) vive en Diferidos, y lo perdido por tramo mes a mes, en Resultados.
  // El mes que se coteja ya no va escrito aparte: solo en las opciones de la lista, que Safari y
  // Firefox no cuentan como texto visible. Que se ofrezca septiembre y no el mes en curso lo prueba carril.spec.
  '#/prod/produccion/ceiba/curso': { si: [/(?:^|\n)Medición oficial/, 'Factor de asignación', 'Cuadre · asignación oficial', '¿Cuadra? Día por día', 'Potencial del libro'], no: ['¿Se puede publicar?', 'Lo perdido por tramo', 'LO PERDIDO POR TRAMO'] },
  // Diferidos: el factor de asignación ya no se repite (su estado va en «¿Se puede publicar?»).
  '#/prod/diferidos/ceiba/curso': { si: ['¿Se puede publicar? Cuadre y custodia', '¿El factor está en su banda?', 'Cadena de custodia', 'Dónde bajarlo'], no: ['Factor de asignación', 'FACTOR DE ASIGNACIÓN', 'Medición oficial'] },
  // «no arrancar» sigue a la vista (procedimiento); los pozos que cerró P-201B llevan «parte por
  // identificar», no «sin identificar», como si su parada no tuviera causa.
  '#/sup/turno/ceiba/curso': { si: ['pozos cerrados por P-201B', 'WhatsApp del turno', 'escalado', 'no arrancar', 'parte por identificar', 'se deja de producir ahora', 'Parado ahora', 'Por vigilar'],
    no: ['(sin identificar)', 'preguntarle al operario', 'LO QUE TRIM MANDÓ', 'erdiéndose', 'bbl · retorno', '2 · Pasando ahora', '1 · Vigilar'] },
  // «Si falla hoy» en bbl y el colchón truncado con «antes de» (P-201B de Morichal: 10,05 h → «10 h»); lo viejo no vuelve.
  // C5 · Un nombre, una cifra: «Se deja de producir ahora» (el total), «Equipos que avisan» (el conteo) y la exposición con su nombre; sin el ciclo.
  '#/jefe/riesgo/ceiba~portafolio/curso': { si: ['Se deja de producir ahora', 'Equipos que avisan', 'cruza en', 'qué hacer', 'bbl si falla hoy', 'bbl de exposición si fallan hoy', 'bbl/d en juego', /0 si vuelve\santes\sde\s10\sh/, /ver \d+ más/i],
    no: ['LO QUE SE PUEDE EVITAR', 'ordenado por cuándo', 'Qué hacer:', 'bbl si fallan', 'bbl por falla', '< 10 h', 'Perdiéndose', 'PERDIÉNDOSE', '1 · Antes', '2 · Durante', 'bbl · retorno'] },
  // La regla de operación va en la franja: sus dos frases (los chips «no arrancar» no las satisfacen).
  '#/oper/causa/ceiba/curso': { si: [/\d\d:\d\d pregunta → \d\d:\d\d recordatorio/, 'Pista · historia del equipo', /· \d+ de \d+ fallas?/, 'Ver mi chat de WhatsApp', 'sin respuesta', 'No fue la electrosumergible', 'No arrancar hasta identificar el daño', 'si arranca antes: no conformidad', 'demo'],
    no: ['señal e historia', 'LO QUE DIJO LA SEÑAL', 'Regla de operación:', 'Demo · simular', 'en este demo'] },
  // Avisan EQUIPOS (un servicio como K-101 avisa sin parte), no «partes».
  '#/tec/trabajo/ceiba/curso': { si: ['ÓRDENES EN SAP', 'a su nombre', 'TRIM le avisó por WhatsApp', 'vea «Órdenes en SAP»', 'equipo avisando'], no: ['no está conectado', 'la primera en ya fuera', 'parte avisando'] },
  '#/conf/confiabilidad/morichal/curso': { si: ['REPARACIÓN ACTIVA Y ESPERA', '¿ACIERTA EL VIGÍA?', 'LO QUE ANUNCIÓ Y EN QUÉ QUEDÓ', 'Fallas anticipadas', 'Se le escaparon'], no: ['ninguna ha vencido', 'no se afirma'] },
  // «Por identificar» con la cuenta única: de las que piden respuesta, las que ya arrancaron.
  '#/jefe/mantenimiento/ceiba/curso': { si: ['HORAS EN SAP', 'ABIERTO EN SAP', /arranc(?:ó|aron) sin identificar/, 'Intervenir ya'], no: [': ya fuera de límite', 'En este demo', 'Ninguna parte va hacia su límite', 'bbl · retorno', 'Ver planes de acción', '1 · Intervenir'] },
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
