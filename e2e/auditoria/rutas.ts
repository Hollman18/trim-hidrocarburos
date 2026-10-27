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
  // K1 · P-10: el Riesgo del jefe y de confiabilidad se fundió en su Equipos («Qué está en riesgo», debajo de la lista).
  ...R('jefe', ['mantenimiento', 'diferidos', 'bombas', 'esp', 'confiabilidad', 'equipo', 'causa'], ['ceiba', 'ceiba~portafolio']),
  '#/jefe/equipos/ceiba~portafolio',
  ...R('conf', ['bombas', 'esp', 'confiabilidad', 'diferidos', 'equipo', 'causa', 'planta'], ['morichal', 'morichal~portafolio']),
  '#/conf/equipos/morichal', '#/conf/equipos/morichal~portafolio',
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
  '#/sup/bombas/ceiba/curso/P-201B', '#/jefe/equipos/ceiba/P-201B', '#/conf/confiabilidad/morichal/curso/MPP-301',
  '#/prod/pozos/ceiba/curso/LC-21', '#/prod/pozos/morichal/curso/LC-14', '#/jefe/esp/morichal/curso/MN-07',
  '#/ger/resultados/morichal/curso/SE-2', '#/jefe/equipo/ceiba/curso/K-101',
  // C4 · Equipos: la lista (técnica y del gerente), el nivel 3 sin instrumento y el nivel 4 (diagnóstico).
  '#/conf/equipos/ceiba', '#/ger/equipos/ceiba~portafolio', '#/sup/equipos/ceiba/P-201A',
  // F4 · La lista técnica de otro rol: «Cambió hoy» (confiabilidad lo dice en su frase de arriba, P-02).
  '#/jefe/equipos/ceiba',
  '#/conf/equipos/ceiba/P-201B/diagnostico', '#/conf/equipos/morichal/MPP-301/diagnostico',
  // el libro en otros períodos
  '#/ger/resultados/ceiba/cerrado', '#/ger/resultados/ceiba~portafolio/doce', '#/ger/resultados/morichal/trimestre',
  '#/ger/resultados/ceiba/cerrado/P-201B', '#/prod/causa/ceiba/curso', '#/prod/causa/morichal/cerrado',
  '#/prod/produccion/palmar/doce', '#/prod/produccion/ceiba~portafolio/ytd',
  // un campo sin electrosumergibles ni gas: la subpantalla no existe y la planta no dibuja gas
  '#/prod/esp/palmar/curso', '#/prod/planta/palmar/curso', '#/adm/planta/guacamayo/curso',
]

// F4 · 320 px (el teléfono chico, como un iPhone SE): el texto de SVG que se encoge (H9) y lo que
// ensancha `.vista` (A7) solo se ven ahí. Los cinco anchos del prompt §3 son 320, 390, 768, 1280 y 1440.
export const ANCHOS = [1512, 1280, 1024, 768, 390, 320]

/** Rutas donde además se abre el detalle de la primera bomba. */
export const ABRIR_BOMBA = new Set(['#/conf/bombas/morichal/curso', '#/sup/bombas/ceiba/curso', '#/jefe/bombas/ceiba/curso'])
/** Rutas donde además se abre la primera fila de la tabla (detalle del pozo). */
export const ABRIR_FILA = new Set(['#/prod/pozos/ceiba/curso', '#/jefe/esp/ceiba~portafolio/curso', '#/conf/esp/morichal/curso'])

/** F4 · Rutas donde además se toca un botón (por el comienzo de su nombre) y se audita lo
 *  que abre: lo que salió de la primera capa sigue a un toque (regla 4 del prompt: ninguna
 *  función se pierde) y también se ve bien. La aserción va en «ruta [botón]». */
export const ABRIR_BOTON: Record<string, string[]> = {
  // P-04: el administrador abre en el estado; lo técnico es una parte, a un toque.
  '#/adm/configuracion/ceiba/curso': ['Configuración técnica'],
  // P-reg-1 y X4 §3.7: los códigos de la ANH y la medición oficial con PRODML, detrás de «ver».
  '#/reg/regulatorio/ceiba/curso': ['Ver los códigos ANH', 'Ver más'],
  // P-causa-1: una parada abierta a la vez; LC-08 (electrosumergible) se abre con un toque.
  '#/oper/causa/ceiba/curso': ['LC-08'],
  // P-conf-1: «¿Le creo al vigía?» en una línea; lo que anunció y en qué quedó, detrás de «Ver».
  '#/conf/confiabilidad/morichal/curso': ['Ver lo que anunció'],
}

/** D-3 · Un título en su renglón, en frase o en MAYÚSCULAS: las aserciones de antes buscaban
 *  «TANQUES DE AGUA» tal cual y, con los títulos en frase, no habrían visto «Tanques de agua».
 *  Así lo que no debe estar se sigue buscando con las dos formas, sin probar menos, y lo que sí
 *  debe estar es un título y no la misma frase dentro de otro renglón. */
export const titulo = (t: string) => new RegExp(`(?:^|\\n)[ \\t]*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[ \\t]*(?:\\n|$|·|\\())`, 'i')

/** Lo que un nivel de decisión no tiene por qué ver: títulos de paneles técnicos. El vigía,
 *  en cualquier forma (ni «¿Acierta el vigía?» ni «Vigía»). */
const NO_DECISION = ['Presión de succión', 'Energía por barril', /\bvigía\b/i, 'Factor de asignación', titulo('Factor de asignación'), 'Cadena de custodia', titulo('Cadena de custodia'), 'Tolerancia', titulo('Dispositivos')]

/** Lo que cada nivel debe ver (`si`, sin importar mayúsculas; una expresión
 *  regular exige además el orden, p. ej. la cifra junto a su meta) y lo que no
 *  (`no`, tal cual o con una expresión regular), en el texto visible de la página.
 *  « [detalle]» es la misma ruta con el detalle de la primera bomba abierto, y
 *  « [botón]», con ese botón tocado (`ABRIR_BOTON`). F4 · `atras`: lo que salió de la
 *  primera capa (detrás de «ver más», una ⓘ o el papel): está en la página y no a la vista. */
export const ASERCIONES: Record<string, { si: Array<string | RegExp>; no: Array<string | RegExp>; atras?: string[] }> = {
  // Menos texto (piloto 7-oct): la producción y el diferido por día van como barra contra su meta,
  // y el cierre del mes contra la meta del mes completo («meta 1.…»: pasa del millón en el portafolio).
  // «En riesgo»: la multifásica no es un servicio (la regla de Riesgo); cada cosa por lo que es.
  // «Por campo» se despliega por campo (plegado en la pantalla: sus equipos no son texto visible).
  // F2 (G-10): la barra dice «máximo», no «máx.»; la frase de la cifra, «por debajo del máximo firmado a la fecha».
  '#/ger/resultados/ceiba~portafolio/curso': { si: ['Lo que pasó · octubre, en curso', 'barriles', 'no se produjeron en sus 5 campos', 'máximo firmado a la fecha',
    'calculado', 'Promedio por día', 'Cierre proyectado', 'proyectado', '¿Está bajando? Desde que entró TRIM', 'mantenimiento proactivo', 'Lo de alto impacto',
    'Diferido por día, mes a mes', 'Por dónde se trabó', 'Diferido por equipo', 'Por campo', 'dónde se trabó', 'Dónde bajarlo', 'Tipo de causa', 'Producción día a día',
    'Retorno posible del ciclo', 'simulado', 'Antes', 'Durante', 'Después', 'lo que salió y no se vendió',
    /producción\s+meta [\d.]+\s+(3\s+)?[\d.]+\s*bbl\/d/i, /diferido\s+máximo [\d.]+\s+(3\s+)?[\d.]+\s*bbl\/d/i, /Cierre proyectado[\s\S]{0,80}producción\s+meta 1\.[\d.]+/i],
    // Lo simulado nunca es la cifra grande; ni el bloque del ciclo, ni sus 1·2·3, ni el acordeón de planes; ni el detalle técnico.
    no: [...NO_DECISION, 'bbl · retorno', 'Ver planes de acción', '1 · Antes', '2 · Durante', '3 · Después', 'Medición oficial', titulo('Medición oficial'), 'Asignación oficial', titulo('Asignación oficial'),
      'Perdiéndose', titulo('Quién se los lleva'), 'Reparar y arrancar', 'WhatsApp con ventana', /diferido\s+máx\./i] },
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
  // F2 (P-03, P-reg-1): primero lo que falta (las paradas sin causa, quién y la hora); los códigos de la ANH,
  // detrás de «Ver los códigos ANH», y la medición oficial con PRODML, detrás de «Ver más».
  // K2: en el teléfono el árbol abre plegado (título y total); la rama de la pérdida y el cuadre se comprueban al abrirlo.
  '#/reg/regulatorio/ceiba/curso': { si: [/\d+\s+paradas? sin causa/, 'Lo debe', titulo('Árbol de causas · como la circular'), 'Ver los códigos ANH'],
    no: [], atras: ['resp_par', 'choke_mod', 'cau_niv1', 'También en PRODML'] },
  '#/reg/regulatorio/ceiba/curso [Ver los códigos ANH]': { si: ['resp_par', 'choke_mod', 'cau_niv1', 'Pérdida: TRIM todavía no tiene registro de pérdidas', 'el diferido del libro'], no: [] },
  '#/reg/regulatorio/ceiba/curso [Ver más]': { si: [titulo('También en PRODML'), 'Puntos de medición oficial'], no: [] },
  // El título en su renglón: en minúsculas «metas por campo» lo trae el motivo de la versión 1 y la aserción pasaría sin el panel.
  '#/ger/configuracion/ceiba/curso': { si: [titulo('Metas por campo'), 'Meta global', 'Firmar la versión', 'Usuarios y accesos'], no: [titulo('Tanques de agua'), titulo('Paradas programadas'), titulo('No se configura'), 'Configuración técnica'] },
  '#/prod/esp/palmar/curso': { si: ['no tiene electrosumergibles en su perfil', 'Todos'], no: ['Electrosumergible con aviso'] },
  '#/prod/planta/palmar/curso': { si: [titulo('Capturando datos'), 'no tiene tren de gas'], no: ['Tren de gas'] },
  // F3 (P-04): el administrador abre en el estado de cada campo («N de M pasos listos»); lo técnico, a un toque.
  '#/adm/configuracion/ceiba/curso': { si: ['Estado de la configuración', /\d+ de \d+\s+pasos listos/, 'Tanques de agua', 'Configuración técnica', 'Metas de los campos'], no: ['Meta global'] },
  '#/adm/configuracion/ceiba/curso [Configuración técnica]': { si: [titulo('Tanques de agua'), titulo('Membrete del informe'), titulo('Perfil del campo')], no: ['Meta global'] },
  // La filosofía operacional tiene dirección propia; producción y confiabilidad la leen sin firmar nada.
  '#/adm/filosofia/ceiba/curso': { si: ['Filosofía operacional · La Ceiba', 'Paso 1 · Equipos y pozos', '¿A qué pozos sirve este equipo?'], no: ['Solo lectura'] },
  '#/prod/filosofia/ceiba/curso': { si: ['Filosofía operacional · La Ceiba', 'Solo lectura: la prepara y la firma el administrador'], no: [titulo('Firmar la versión'), 'Subir Excel o CSV'] },
  '#/conf/configuracion/morichal/curso': { si: ['Solo lectura: lo prepara y lo firma el administrador', titulo('Tanques de agua'), 'Filosofía operacional'], no: [titulo('Firmar la versión'), 'Usuarios y accesos'] },
  // Lo que viene en camino no es «sin stock»: se dice cuándo llega, sin marca (6B·H8).
  '#/ger/resultados/ceiba/cerrado/P-201B': { si: ['Qué se está haciendo', 'Le ha costado', 'pozos cerrados desde', 'llega el 9 de oct'], no: [...NO_DECISION, 'sin stock de kit'] },
  '#/oper/bombas/ceiba/curso': { si: ['No arrancar'], no: ['Energía por barril', 'acumulado'] },
  // Los «no» van en minúsculas: en ingeniería «supuestos» y «tolerancia» son ahora rótulos de ⓘ.
  // C4 · La placa abre el nivel 3 (una vista): lo de ahora, sus dos últimas fallas en «Su historia» y el bloqueo;
  // al supervisor, sin el vigía ni el modo de falla (son del diagnóstico, nivel 4).
  '#/sup/bombas/ceiba/curso [detalle]': { si: ['Mientras esté parada', 'Su historia', /\d+ de sept\s+rodamientos/, 'No arrancar hasta identificar'], no: [/\bvigía\b/i, 'Salud por parte', titulo('Salud por parte'), 'supuestos', 'Energía por barril', 'tolerancia', 'Modo de falla'] },
  // F3 (G-5): el potencial de los pozos se llama como en el libro.
  '#/sup/pozos/ceiba/curso': { si: [titulo('Pozos'), 'Potencial del libro'], no: ['Custodia', 'Sin custodia completa', 'Potencial ahora'] },
  // Lo que YA costó es «le ha costado por falla», nunca «costo por falla» (que era la cifra de Riesgo);
  // la duración de cada parada va rotulada («bomba parada»).
  // C4 · En el nivel 3, «Si falla hoy» y lo que ya costó cada falla; el vigía, la salud por parte y las paradas del PLC, en el 4.
  // D-2 (G-16): el panel que decía «SI SE PARA AHORA» es «Si falla hoy», en bbl/d, como en todo el producto.
  '#/conf/bombas/morichal/curso [detalle]': { si: [titulo('Si falla hoy'), /Si falla hoy: [\d.]+ bbl\/d/, 'supuestos', /Le ha costado [\d.]+ bbl por falla/, 'Ver el diagnóstico'], no: ['Costo por falla', titulo('Si se para ahora')] },
  '#/conf/equipos/morichal/MPP-301/diagnostico': { si: [titulo('Vigía'), titulo('Salud por parte'), 'bomba parada', titulo('Puntos ciegos'), titulo('Historia del PLC'), 'Sus instrumentos'], no: ['Costo por falla'] },
  // F3 (P-02): confiabilidad abre con la cifra y los tres primeros de «Si falla hoy»; «Cambió hoy» se lo dice su
  // frase («hoy valen más») y cada fila («sube porque…»). La línea «Cambió hoy» la ven los demás roles (jefe, abajo).
  '#/conf/equipos/ceiba': { si: ['Si falla hoy', 'Ataque primero', '¿Le creo al vigía?', '¿Lo vigila TRIM?', 'sube porque P-201B está parada', 'no: sin instrumento'], no: ['Superficie'] },
  '#/jefe/equipos/ceiba': { si: ['Cambió hoy', '¿Lo vigila TRIM?', 'no: sin instrumento'], no: ['Superficie'] },
  // K1 · P-10: confiabilidad en Morichal: lo que decide arriba (el próximo instrumento, una vez) y lo que era su Riesgo debajo.
  '#/conf/equipos/morichal': { si: ['¿Dónde va el próximo instrumento?', 'Qué está en riesgo', 'Equipos que avisan', 'cruza en', 'le costaría la falla', 'Si falla hoy', 'Se trabaría en'], no: [/¿Dónde va el próximo instrumento\?[\s\S]*¿Dónde va el próximo instrumento\?/, 'bbl si falla hoy'] },
  '#/ger/equipos/ceiba~portafolio': { si: ['Ahora: lo que está parado o avisa', 'Diferido por equipo'], no: NO_DECISION },
  '#/sup/equipos/ceiba/P-201A': { si: ['sin instrumento', 'Mientras P-201B esté parada', 'Si falla hoy'], no: ['Ver el diagnóstico'] },
  // Las horas con una sola regla: «2,0 d fuera» (MPP-301), no «48,7 h fuera»; lo histórico no es «bbl/falla».
  '#/conf/bombas/morichal/curso': { si: ['2,0 d fuera'], no: ['bbl/falla', '48,7 h fuera'] },
  // D-2: «Si falla hoy» siempre en bbl/d; lo que costaría la falla entera, en bbl, es «le costaría la falla».
  '#/conf/esp/morichal/curso': { si: ['bbl/d en juego'], no: ['bbl/d si fallan', 'bbl si falla hoy'] },
  // El título al comienzo del renglón: no lo confunde con «Puntos de medición oficial». Un panel, una vez (C5):
  // «¿Se puede publicar?» (el cuadre y la custodia) vive en Diferidos, y lo perdido por tramo mes a mes, en Resultados.
  // El mes que se coteja ya no va escrito aparte: solo en las opciones de la lista, que Safari y
  // Firefox no cuentan como texto visible. Que se ofrezca septiembre y no el mes en curso lo prueba carril.spec.
  '#/prod/produccion/ceiba/curso': { si: [/(?:^|\n)Medición oficial/, 'Factor de asignación', 'Cuadre · asignación oficial', '¿Cuadra? Día por día', 'Potencial del libro'], no: ['¿Se puede publicar?', 'Lo perdido por tramo', titulo('Lo perdido por tramo')] },
  // Diferidos: el factor de asignación ya no se repite (su estado va en «¿Se puede publicar?»).
  '#/prod/diferidos/ceiba/curso': { si: ['¿Se puede publicar? Cuadre y custodia', '¿El factor está en su banda?', 'Cadena de custodia', 'Dónde bajarlo'], no: ['Factor de asignación', titulo('Factor de asignación'), 'Medición oficial'] },
  // «no arrancar» sigue a la vista (procedimiento); los pozos que cerró P-201B llevan «parte por
  // identificar», no «sin identificar», como si su parada no tuviera causa.
  // F1 (P-05): la cifra de Turno es lo medido, «1.966 bbl/d se dejan de producir ahora»; la proyección, chica.
  '#/sup/turno/ceiba/curso': { si: ['pozos cerrados por P-201B', 'WhatsApp del turno', 'escalado', 'no arrancar', 'parte por identificar', /se dejan? de producir ahora/i, 'Parado ahora', 'Por vigilar'],
    no: ['(sin identificar)', 'preguntarle al operario', titulo('Lo que TRIM mandó'), 'erdiéndose', 'bbl · retorno', '2 · Pasando ahora', '1 · Vigilar'] },
  // El colchón truncado con «antes de» (P-201B de Morichal: 10,05 h → «10 h»); lo viejo no vuelve.
  // C5 · Un nombre, una cifra: «Se deja de producir ahora» (el total), «Equipos que avisan» (el conteo) y la exposición con su nombre; sin el ciclo.
  // D-2 (G-16): lo que costaría cada falla, en bbl, es «le costaría la falla»; «si falla hoy» queda para los bbl/d.
  // K1 · P-10: lo que era Riesgo del jefe está en su Equipos, debajo de la lista («Qué está en riesgo»), con lo mismo.
  '#/jefe/equipos/ceiba~portafolio': { si: ['Qué está en riesgo', 'Se deja de producir ahora', 'Equipos que avisan', 'cruza en', 'qué hacer', 'bbl le costaría la falla', 'bbl de exposición si fallan hoy', 'bbl/d en juego', /0 si vuelve\santes\sde\s10\sh/, /ver \d+ más/i, 'Ojo:', 'no conviene intervenirlas hoy'],
    no: [titulo('Lo que se puede evitar'), 'ordenado por cuándo', 'Qué hacer:', 'bbl si fallan', 'bbl si falla hoy', 'bbl por falla', '< 10 h', /perdiéndose/i, '1 · Antes', '2 · Durante', 'bbl · retorno'] },
  // La regla de operación va en la franja: sus dos frases (los chips «no arrancar» no las satisfacen).
  // F1 (P-causa-1): una parada abierta a la vez; la de LC-08, con sus partes de electrosumergible, a un toque.
  '#/oper/causa/ceiba/curso': { si: [/\d\d:\d\d pregunta → \d\d:\d\d recordatorio/, 'Pista · historia del equipo', /· \d+ de \d+ fallas?/, 'Ver mi chat de WhatsApp', 'sin respuesta', 'No arrancar hasta identificar el daño', 'Si arranca antes, queda como no conformidad', 'demo'],
    no: ['señal e historia', titulo('Lo que dijo la señal'), 'Regla de operación:', 'Demo · simular', 'en este demo'], atras: ['No fue la electrosumergible'] },
  '#/oper/causa/ceiba/curso [LC-08]': { si: ['No fue la electrosumergible'], no: [] },
  // Avisan EQUIPOS (un servicio como K-101 avisa sin parte), no «partes».
  // F1 (P-trabajo-1): Mi trabajo se fundió en Hoy; su dirección abre Hoy y la orden liberada de SAP es una
  // tarjeta con su número, el aviso de WhatsApp y «Ver la orden». Lo que hay que hacer con K-101, una vez.
  '#/tec/trabajo/ceiba/curso': { si: ['cosas le tocan hoy', 'Atender la orden de K-101', /orden \d{8} · le llegó por WhatsApp a las \d\d:\d\d/, 'Ver la orden', 'Verificar que las tres unidades estén en servicio'],
    no: ['no está conectado', 'la primera en ya fuera', 'parte avisando'] },
  // F2 (P-conf-1): «¿Le creo al vigía?» en una línea (el nombre de Resultados); lo que anunció, a un toque.
  '#/conf/confiabilidad/morichal/curso': { si: [titulo('Reparación activa y espera'), titulo('¿Le creo al vigía?'), 'Ver lo que anunció', 'Se le escaparon'],
    no: ['ninguna ha vencido', 'no se afirma', titulo('¿Acierta el vigía?')], atras: ['Lo que anunció y en qué quedó', 'Fallas anticipadas'] },
  '#/conf/confiabilidad/morichal/curso [Ver lo que anunció]': { si: ['Lo que anunció y en qué quedó', 'Fallas anticipadas', 'Se le escaparon'], no: [] },
  // «Por identificar» con la cuenta única: de las que piden respuesta, las que ya arrancaron.
  '#/jefe/mantenimiento/ceiba/curso': { si: [titulo('Horas en SAP'), titulo('Abierto en SAP'), /arranc(?:ó|aron) sin identificar/, 'Intervenir ya'], no: [': ya fuera de límite', 'En este demo', 'Ninguna parte va hacia su límite', 'bbl · retorno', 'Ver planes de acción', '1 · Intervenir'] },
  // Las mismas cifras y marcas que Riesgo: lo que le costaría la falla y, estimado con la flota, «flota»; una
  // parte chica del total es «< 1 %», no «0 %». D-2: ya no «bbl si falla hoy».
  '#/jefe/mantenimiento/ceiba~portafolio/curso': { si: ['le costaría la falla', /le costaría la falla\s+flota/, /arranc(?:ó|aron) sin identificar/], no: ['Ninguna parte va hacia su límite', 'bbl · 0 %', 'bbl si falla hoy'] },
  // El tanque con la bomba parada sube con el agua que ENTRA: en La Ceiba ya se cerraron los pozos que
  // hacía falta y lo que entra lo sacan P-201A y P-201C; no sube y no hay alarma por eso (el colchón de
  // «si parara con todo produciendo» no es eso). La capacidad del tren de agua se cuenta sin la detenida.
  '#/prod/planta/ceiba/curso': { si: ['el respaldo toma el agua que entra'], no: ['llega al alto-alto', 'no entra agua'] },
  '#/adm/conectores/ceiba/curso': { si: [titulo('Sistemas corporativos'), 'trim_que_se_dano', 'conectado', titulo('Catálogos de daño')], no: ['en este demo'] },
  // «qué se dañó»: solo lo dice la ficha (la placa de detrás también dice «No arrancar hasta identificar»).
  '#/sup/bombas/ceiba/curso/P-201B': { si: ['No arrancar hasta identificar qué se dañó'], no: [titulo('Historia del PLC'), 'Modo de falla'] },
}
