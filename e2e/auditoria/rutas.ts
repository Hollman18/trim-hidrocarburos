/* Lo que recorre el auditor: cada rol en cada una de sus pantallas, los
   estados que se abren con un clic o desde la dirección, y lo que cada nivel
   debe ver y lo que no. */

const R = (rol: string, pantallas: string[], campos: string[]) =>
  campos.flatMap(c => pantallas.map(p => `#/${rol}/${p}/${c}/curso`))

export const RUTAS = [
  // C5: el Resumen, los Diferidos y la Producción del gerente se fundieron en La planta viva y Resultados.
  ...R('ger', ['resultados', 'configuracion'], ['ceiba', 'ceiba~portafolio']),
  // B2 (v3): Diferidos se fundió en Resultados (A-09); Pozos y Electrosumergibles son filtros de Equipos (B3).
  ...R('prod', ['produccion', 'causa', 'planta'], ['ceiba', 'ceiba~portafolio']),
  // Configuración en solo lectura para producción y confiabilidad, con la filosofía operacional en su propia dirección.
  ...R('prod', ['configuracion', 'filosofia'], ['ceiba']),
  // B3 (v3): sup, oper, tec y jefe abren en Hoy (sup y jefe con Equipos; jefe con Resultados); conf, en Equipos, y su
  // Resultados es Confiabilidad. Turno, Bombas, Electrosumergibles, Superficie y Mantenimiento se borraron: sus
  // direcciones viejas abren Hoy o Equipos con su filtro, y se recorren igual. Identificar es «Una por una» (causa).
  ...R('sup', ['hoy', 'causa', 'bombas', 'esp', 'turno', 'pozos'], ['ceiba']), '#/sup/equipos/ceiba',
  ...R('oper', ['hoy', 'causa', 'bombas', 'turno'], ['ceiba']),
  ...R('tec', ['hoy', 'trabajo', 'causa'], ['ceiba']),
  ...R('jefe', ['hoy', 'resultados', 'causa', 'mantenimiento', 'equipo'], ['ceiba', 'ceiba~portafolio']),
  '#/jefe/equipos/ceiba~portafolio',
  ...R('conf', ['confiabilidad', 'causa', 'hoy'], ['morichal', 'morichal~portafolio']),
  '#/conf/equipos/morichal', '#/conf/equipos/morichal~portafolio',
  ...R('conf', ['configuracion', 'filosofia'], ['morichal']),
  // A-22: los roles que no están (la planeadora, apagada; abastecimiento, que salió).
  '#/plan/hoy/ceiba/curso', '#/cont/evidencia/ceiba/curso',
  // B2 (v3): Planta y Agua salen de las puertas del administrador (B-04): lo de datos está en su Estado.
  ...R('adm', ['configuracion', 'filosofia', 'conectores', 'perfil'], ['ceiba', 'morichal']),
  // Cumplimiento regulatorio (encendido con el árbol de pérdidas del choke): el árbol en el orden de la circular.
  ...R('reg', ['regulatorio'], ['ceiba', 'morichal']),
  // C1 · Experiencia v2: La planta viva y Hoy en cada rol que las tiene (la dirección usa la ruta «planta-viva»).
  ...R('ger', ['planta-viva'], ['ceiba', 'ceiba~portafolio']),
  ...R('prod', ['planta-viva', 'hoy'], ['ceiba']),
  // C5 · Resultados: el inicio de la puerta en cada rol que la tiene.
  ...R('prod', ['resultados'], ['ceiba', 'ceiba~portafolio']),
  // estados que se abren con un clic o desde la URL: bomba, pozo, servicio
  '#/sup/bombas/ceiba/curso/P-201B', '#/jefe/equipos/ceiba/P-201B', '#/conf/confiabilidad/morichal/curso/MPP-301',
  '#/prod/pozos/ceiba/curso/LC-21', '#/prod/pozos/morichal/curso/LC-14', '#/jefe/esp/morichal/curso/MN-07',
  '#/ger/resultados/morichal/curso/SE-2', '#/jefe/equipo/ceiba/curso/K-101',
  // C4 · Equipos: la lista (técnica y del gerente), el nivel 3 sin instrumento y el nivel 4 (diagnóstico).
  '#/conf/equipos/ceiba', '#/sup/equipos/ceiba/P-201A',
  // F4 · La lista técnica de otro rol: «Cambió hoy» (confiabilidad lo dice en su frase de arriba, P-02).
  '#/jefe/equipos/ceiba',
  '#/conf/equipos/ceiba/P-201B/diagnostico', '#/conf/equipos/morichal/MPP-301/diagnostico',
  // el libro en otros períodos
  '#/ger/resultados/ceiba/cerrado', '#/ger/resultados/ceiba~portafolio/doce', '#/ger/resultados/morichal/trimestre',
  '#/ger/resultados/ceiba/cerrado/P-201B', '#/prod/causa/ceiba/curso', '#/prod/causa/morichal/cerrado',
  '#/prod/produccion/palmar/doce', '#/prod/produccion/ceiba~portafolio/ytd',
  // B4 · A-09: la dirección vieja de Diferidos abre Resultados, donde quedó su cuadre y custodia (C-02), en un mes cerrado.
  '#/prod/diferidos/ceiba/cerrado',
  // un campo sin electrosumergibles ni gas: la subpantalla no existe y la planta no dibuja gas
  '#/prod/planta/palmar/curso',
]

// F4 · 320 px (el teléfono chico, como un iPhone SE): el texto de SVG que se encoge (H9) y lo que
// ensancha `.vista` (A7) solo se ven ahí. Los cinco anchos del prompt §3 son 320, 390, 768, 1280 y 1440.
export const ANCHOS = [1512, 1280, 1024, 768, 390, 320]

/** Rutas donde además se abre el detalle de la primera bomba. */
// B3 · A-15: la pantalla Bombas se borró (sus placas eran filtros de Equipos; la ficha vive en el nivel 3).
export const ABRIR_BOMBA = new Set<string>()
/** Rutas donde además se abre la primera fila de la tabla (detalle del pozo). */
export const ABRIR_FILA = new Set(['#/prod/pozos/ceiba/curso'])

/** F4 · Rutas donde además se toca un botón (por el comienzo de su nombre) y se audita lo
 *  que abre: lo que salió de la primera capa sigue a un toque (regla 4 del prompt: ninguna
 *  función se pierde) y también se ve bien. La aserción va en «ruta [botón]». */
export const ABRIR_BOTON: Record<string, string[]> = {
  // P-04: el administrador abre en el estado; lo técnico es una parte, a un toque.
  '#/adm/configuracion/ceiba/curso': ['Configuración técnica'],
  // P-reg-1 y X4 §3.7: los códigos de la ANH y la medición oficial con PRODML, detrás de «ver».
  '#/reg/regulatorio/ceiba/curso': ['Ver los códigos ANH', 'Ver más'],
  // P-causa-1 → FF-2: las partes de la electrosumergible de LC-08 se ven en Hoy del técnico (allá se contesta).
  // P-conf-1: «¿Le creo al vigía?» en una línea; lo que anunció y en qué quedó, detrás de «Ver».
  '#/conf/confiabilidad/morichal/curso': ['Ver lo que anunció'],
  // B3: lo que está a un toque en cada inicio: entregar el turno y registrar una pérdida (sup), ver la orden y la
  // espera en 5 tramos (jefe), cerrar la orden (tec) y lo que le toca a confiabilidad (las tarjetas).
  // Una hoja por ruta: en el teléfono la hoja tapa la pantalla (es modal) y el segundo botón queda detrás.
  '#/sup/hoy/ceiba/curso': ['Entregar turno'],
  '#/sup/turno/ceiba/curso': ['Registrar una pérdida'],
  '#/jefe/hoy/ceiba/curso': ['Ver la orden', 'Espera'],
  '#/tec/hoy/ceiba/curso': ['Cerrar la orden'],
  '#/conf/equipos/morichal': ['Ver lo que le toca'],
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
  // B2 (v3): Resultados con el balance del choke (producido · diferido · perdido por tramo) y «¿Está funcionando?»
  // en lugar de «¿Está bajando?»; «Dónde bajarlo» y «Tipo de causa» salen (A-07, A-08) y lo simulado va a un toque
  // (A-30). La producción contra la meta y el cierre proyectado, con el kit SCADA.
  '#/ger/resultados/ceiba~portafolio/curso': { si: ['Lo que pasó · octubre, en curso', 'barriles', 'no se produjeron en sus 5 campos', 'máximo firmado a la fecha',
    'calculado', 'Promedio por día', 'Cierre proyectado', 'proyectado', 'Producido · diferido · perdido', 'sin registro', '¿Está funcionando?', 'Antes de TRIM',
    'Diferido por día, mes a mes', 'Diferido por equipo', 'Por campo', 'dónde se trabó', 'Producción día a día', 'Lo que todavía se puede mover', 'lo que salió y no se vendió',
    /producción\s+meta [\d.]+\s+(3\s+)?[\d.]+\s*bbl\/d/i, /diferido\s+máximo [\d.]+\s+(3\s+)?[\d.]+\s*bbl\/d/i, /Cierre proyectado[\s\S]{0,120}meta 1\.[\d.]+/i],
    // Lo simulado nunca es la cifra grande ni va en la primera capa; ni el detalle técnico.
    no: [...NO_DECISION, 'bbl · retorno', 'Ver planes de acción', titulo('Retorno posible del ciclo'), 'Dónde bajarlo', 'Tipo de causa', titulo('¿Está bajando? Desde que entró TRIM'),
      'Medición oficial', titulo('Medición oficial'), 'Asignación oficial', titulo('Asignación oficial'),
      'Perdiéndose', titulo('Quién se los lleva'), 'Reparar y arrancar', 'WhatsApp con ventana', /diferido\s+máx\./i] },
  '#/ger/resultados/ceiba/curso': { si: ['no se produjeron en La Ceiba', 'Producido · diferido · perdido', 'Yacimiento', 'Salida', 'Producción día a día', 'Ver P-201B', '¿Está funcionando?'],
    no: [...NO_DECISION, 'Por campo', 'bbl · retorno', 'Ver planes de acción', 'Dónde bajarlo', 'Tipo de causa'] },
  // El período vive aquí: otro período, otra cifra y su sello; un mes cerrado no proyecta.
  '#/ger/resultados/ceiba/cerrado': { si: ['Lo que pasó · septiembre', 'Total del período', 'Se puede publicar'], no: ['Cierre proyectado'] },
  // Producción: «¿Se puede publicar?» con el cuadre y la custodia; jefe y confiabilidad, su tarjeta; regulatorio, la publicación primero.
  '#/prod/resultados/ceiba/curso': { si: ['¿Se puede publicar?', 'Promedio por día', 'Diferido por día, mes a mes', 'Producido · diferido · perdido', '¿Está funcionando?', 'Lo que todavía se puede mover', '¿Cuadra? Ver la medición y el factor'],
    no: ['Dónde bajarlo', 'Producción día a día', titulo('Retorno posible del ciclo'), 'Ver el libro de diferidos'] },
  // Regulatorio: el árbol de la circular con la cadena de cada paso, la rama vacía de la pérdida y PRODML debajo.
  // F2 (P-03, P-reg-1): primero lo que falta (las paradas sin causa, quién y la hora); los códigos de la ANH,
  // detrás de «Ver los códigos ANH», y la medición oficial con PRODML, detrás de «Ver más».
  // K2: en el teléfono el árbol abre plegado (título y total); la rama de la pérdida y el cuadre se comprueban al abrirlo.
  // B2 (v3): los números a la izquierda (sin causa, sus barriles, la hora límite y la respuesta de la ANH), quién lo debe con
  // «Exportar el reporte» (uno solo, A-26), el balance con sus pérdidas y el árbol; la pérdida se dice una vez (A-25).
  '#/reg/regulatorio/ceiba/curso': { si: [/Paradas sin causa\s+\d+\s+paradas?/, 'Lo debe', 'Límite', 'Respuesta de la ANH', 'sin respuesta registrada', 'Exportar el reporte',
    'Producido · diferido · perdido', titulo('Árbol de causas · como la circular'), 'Ver los códigos ANH', 'Pérdida: va aparte del diferido'],
    no: [], atras: ['resp_par', 'choke_mod', 'cau_niv1', 'También en PRODML'] },
  '#/reg/regulatorio/ceiba/curso [Ver los códigos ANH]': { si: ['resp_par', 'choke_mod', 'cau_niv1', 'el diferido del libro'], no: ['Pérdida: TRIM todavía no tiene registro de pérdidas'] },
  '#/reg/regulatorio/ceiba/curso [Ver más]': { si: [titulo('También en PRODML'), 'Puntos de medición oficial'], no: [] },
  // El título en su renglón: en minúsculas «metas por campo» lo trae el motivo de la versión 1 y la aserción pasaría sin el panel.
  // B2 (v3): los inicios del gerente y de producción (imágenes d1-grafito, opción A: sin el control de momentos).
  '#/ger/planta-viva/ceiba~portafolio/curso': { si: ['Se deja de producir ahora', 'Ver P-201B', 'Compartir el informe', 'Producción por día', 'Cierre del mes', 'proyectado',
    'Producido · diferido · perdido', 'sin registro', '¿Está funcionando?', 'Por campo'], no: [...NO_DECISION, 'Lo que todavía se puede mover', 'Dónde bajarlo', 'Tipo de causa', 'Pedir la causa'] },
  '#/ger/planta-viva/ceiba/curso': { si: ['Se deja de producir ahora', 'Dónde se trabó · La Ceiba', 'Yacimiento', 'Pozos', 'Planta', 'Salida', 'bbl/d no pasan'], no: [...NO_DECISION, 'Pedir la causa'] },
  '#/prod/planta-viva/ceiba/curso': { si: ['Salen hoy', 'de 11.857 bbl/d', '◄ limita', 'Por confirmar', 'Confirmar las 2', 'esperan la causa', 'Ver una por una', 'Producido · diferido · perdido',
    '¿Está funcionando?', 'Si falla hoy', 'Fin de mes', 'Cargarla', 'Registrar una pérdida'], no: ['Lo que todavía se puede mover', 'Dónde bajarlo', 'Diferido por día, mes a mes'] },
  '#/ger/configuracion/ceiba/curso': { si: [titulo('Metas por campo'), 'Meta global', 'Firmar la versión', 'Usuarios y accesos'], no: [titulo('Tanques de agua'), titulo('Paradas programadas'), titulo('No se configura'), 'Configuración técnica'] },
  '#/prod/planta/palmar/curso': { si: [titulo('Capturando datos'), 'no tiene tren de gas'], no: ['Tren de gas'] },
  // F3 (P-04): el administrador abre en el estado de cada campo («N de M pasos listos»); lo técnico, a un toque.
  // B2 (v3): en el mismo Estado, los tags sin equipo, la conversión del árbol y la jornada; las metas y los accesos son del gerente (B-08).
  '#/adm/configuracion/ceiba/curso': { si: ['Estado de la configuración', /\d+\s+de \d+ pasos listos/, 'Seguir el paso', 'Tanques de agua', 'Configuración técnica',
    'Tags sin equipo', 'Conversión del árbol', 'Jornada', 'Cambio de turno'], no: ['Meta global', 'Metas de los campos', 'Usuarios y accesos'] },
  '#/adm/configuracion/ceiba/curso [Configuración técnica]': { si: [titulo('Tanques de agua'), titulo('Membrete del informe'), titulo('Perfil del campo')], no: ['Meta global'] },
  // La filosofía operacional tiene dirección propia; producción y confiabilidad la leen sin firmar nada.
  '#/adm/filosofia/ceiba/curso': { si: ['Filosofía operacional · La Ceiba', 'Paso 1 · Equipos y pozos', '¿A qué pozos sirve este equipo?'], no: ['Solo lectura'] },
  '#/prod/filosofia/ceiba/curso': { si: ['Filosofía operacional · La Ceiba', 'Solo lectura: la prepara y la firma el administrador'], no: [titulo('Firmar la versión'), 'Subir Excel o CSV'] },
  '#/conf/configuracion/morichal/curso': { si: ['Solo lectura: lo prepara y lo firma el administrador', titulo('Tanques de agua'), 'Filosofía operacional'], no: [titulo('Firmar la versión'), 'Usuarios y accesos'] },
  // Lo que viene en camino no es «sin stock»: se dice cuándo llega, sin marca (6B·H8).
  '#/ger/resultados/ceiba/cerrado/P-201B': { si: ['Qué se está haciendo', 'Le ha costado', 'pozos cerrados desde', 'llega el 9 de oct'], no: [...NO_DECISION, 'sin stock de kit'] },
  // Los «no» van en minúsculas: en ingeniería «supuestos» y «tolerancia» son ahora rótulos de ⓘ.
  // C4 · La placa abre el nivel 3 (una vista): lo de ahora, sus dos últimas fallas en «Su historia» y el bloqueo;
  // al supervisor, sin el vigía ni el modo de falla (son del diagnóstico, nivel 4).
  // F3 (G-5): el potencial de los pozos se llama como en el libro.
  // Lo que YA costó es «le ha costado por falla», nunca «costo por falla» (que era la cifra de Riesgo);
  // la duración de cada parada va rotulada («bomba parada»).
  // C4 · En el nivel 3, «Si falla hoy» y lo que ya costó cada falla; el vigía, la salud por parte y las paradas del PLC, en el 4.
  // D-2 (G-16): el panel que decía «SI SE PARA AHORA» es «Si falla hoy», en bbl/d, como en todo el producto.
  '#/conf/equipos/morichal/MPP-301/diagnostico': { si: [titulo('Vigía'), titulo('Salud por parte'), 'bomba parada', titulo('Puntos ciegos'), titulo('Historia del PLC'), 'Sus instrumentos'], no: ['Costo por falla'] },
  // F3 (P-02): confiabilidad abre con la cifra y los tres primeros de «Si falla hoy»; «Cambió hoy» se lo dice su
  // frase («hoy valen más») y cada fila («sube porque…»). La línea «Cambió hoy» la ven los demás roles (jefe, abajo).
  // K1 · P-10: confiabilidad en Morichal: lo que decide arriba (el próximo instrumento, una vez) y lo que era su Riesgo debajo.
  '#/sup/equipos/ceiba/P-201A': { si: ['sin instrumento', 'Mientras P-201B esté parada', 'Si falla hoy'], no: ['Ver el diagnóstico'] },
  // Las horas con una sola regla: «2,0 d fuera» (MPP-301), no «48,7 h fuera»; lo histórico no es «bbl/falla».
  // D-2: «Si falla hoy» siempre en bbl/d; lo que costaría la falla entera, en bbl, es «le costaría la falla».
  // El título al comienzo del renglón: no lo confunde con «Puntos de medición oficial». Un panel, una vez (C5):
  // «¿Se puede publicar?» (el cuadre y la custodia) vive en Diferidos, y lo perdido por tramo mes a mes, en Resultados.
  // El mes que se coteja ya no va escrito aparte: solo en las opciones de la lista, que Safari y
  // Firefox no cuentan como texto visible. Que se ofrezca septiembre y no el mes en curso lo prueba carril.spec.
  // B4 · «¿El factor está en su banda?» (de Diferidos) quedó aquí: el factor del mes contra su banda.
  '#/prod/produccion/ceiba/curso': { si: [/(?:^|\n)Medición oficial/, 'Factor de asignación', 'contra su banda', /factor [\d,]+ · banda ±\d+ %/, 'Cuadre · asignación oficial', '¿Cuadra? Día por día', 'Potencial del libro'], no: ['¿Se puede publicar?', 'Lo perdido por tramo', titulo('Lo perdido por tramo')] },
  // B4 · A-09: Diferidos ya no es pantalla; su dirección abre Resultados. Su «¿Se puede publicar? Cuadre y custodia» quedó en
  // «¿Se puede publicar?» (C-02: el cuadre y la cadena de custodia, en un mes cerrado), con la medición y el factor a un toque
  // («¿Cuadra?»); «Dónde bajarlo» y «Tipo de causa» salieron (A-07, A-08). El factor sigue sin repetirse aquí: vive en Producción.
  '#/prod/diferidos/ceiba/cerrado': { si: ['¿Se puede publicar?', 'Sí: cuadra y tiene su cadena de custodia', '¿Cuadra? Ver la medición y el factor', 'Producido · diferido · perdido', 'Diferido por equipo'],
    no: ['Dónde bajarlo', 'Tipo de causa', 'Factor de asignación', titulo('Factor de asignación'), 'Medición oficial'] },
  // «no arrancar» sigue a la vista (procedimiento); los pozos que cerró P-201B llevan «parte por
  // identificar», no «sin identificar», como si su parada no tuviera causa.
  // F1 (P-05): la cifra de Turno es lo medido, «1.966 bbl/d se dejan de producir ahora»; la proyección, chica.
  // El colchón truncado con «antes de» (P-201B de Morichal: 10,05 h → «10 h»); lo viejo no vuelve.
  // C5 · Un nombre, una cifra: «Se deja de producir ahora» (el total), «Equipos que avisan» (el conteo) y la exposición con su nombre; sin el ciclo.
  // D-2 (G-16): lo que costaría cada falla, en bbl, es «le costaría la falla»; «si falla hoy» queda para los bbl/d.
  // K1 · P-10: lo que era Riesgo del jefe está en su Equipos, debajo de la lista («Qué está en riesgo»), con lo mismo.
  // La regla de operación va en la franja: sus dos frases (los chips «no arrancar» no las satisfacen).
  // F1 (P-causa-1): una parada abierta a la vez; la de LC-08, con sus partes de electrosumergible, a un toque.
  // Avisan EQUIPOS (un servicio como K-101 avisa sin parte), no «partes».
  // F1 (P-trabajo-1): Mi trabajo se fundió en Hoy; su dirección abre Hoy y la orden liberada de SAP es una
  // tarjeta con su número y «Ver la orden» (experiencia v3: sin el aviso por mensaje). Lo que hay que hacer con K-101, una vez.
  // F2 (P-conf-1): «¿Le creo al vigía?» en una línea (el nombre de Resultados); lo que anunció, a un toque.
  '#/conf/confiabilidad/morichal/curso': { si: [titulo('Reparación activa y espera'), titulo('¿Le creo al vigía?'), 'Ver lo que anunció', 'Se le escaparon'],
    no: ['ninguna ha vencido', 'no se afirma', titulo('¿Acierta el vigía?')], atras: ['Lo que anunció y en qué quedó', 'Fallas anticipadas'] },
  '#/conf/confiabilidad/morichal/curso [Ver lo que anunció]': { si: ['Lo que anunció y en qué quedó', 'Fallas anticipadas', 'Se le escaparon'], no: [] },
  // «Por identificar» con la cuenta única: de las que piden respuesta, las que ya arrancaron.
  // Las mismas cifras y marcas que Riesgo: lo que le costaría la falla y, estimado con la flota, «flota»; una
  // parte chica del total es «< 1 %», no «0 %». D-2: ya no «bbl si falla hoy».
  // El tanque con la bomba parada sube con el agua que ENTRA: en La Ceiba ya se cerraron los pozos que
  // hacía falta y lo que entra lo sacan P-201A y P-201C; no sube y no hay alarma por eso (el colchón de
  // «si parara con todo produciendo» no es eso). La capacidad del tren de agua se cuenta sin la detenida.
  '#/prod/planta/ceiba/curso': { si: ['el respaldo toma el agua que entra'], no: ['llega al alto-alto', 'no entra agua'] },
  '#/adm/conectores/ceiba/curso': { si: [titulo('Sistemas corporativos'), 'conectado', titulo('Catálogos de daño')], no: ['en este demo', 'trim_que_se_dano'] },
  // «qué se dañó»: solo lo dice la ficha (la placa de detrás también dice «No arrancar hasta identificar»).
  // B3 · Experiencia v3: lo necesario de sup, oper, tec, jefe y conf (necesario-por-rol.md §14), tipo número, con el choke.
  '#/sup/hoy/ceiba/curso': { si: ['Paradas por confirmar', 'el reporte sale mañana antes de las 07:00', 'se dejan de producir', 'No arrancar', 'Sin causa', 'Mi turno', 'Por confirmar', 'Diferido', 'Perdido', 'sin registro',
    'Planta · Diferida · No planeada', 'Venía de las 05:43 · sigue', 'Entregar turno', 'Registrar una pérdida', 'Confirmar las 2', 'Contestar yo', 'Orden de cierre'],
    no: ['Su campo, ahora', 'Diferido de su turno', '«Entregar turno» abre', 'Seguir la orden de K-101', '≈ 983', 'WhatsApp'] },
  '#/sup/hoy/ceiba/curso [Entregar turno]': { si: ['Entrega de turno', 'La jornada', 'Compartir en PDF', 'Venía de las 05:43 · sigue'], no: ['WhatsApp'] },
  '#/sup/turno/ceiba/curso [Registrar una pérdida]': { si: ['¿Qué pasó?', 'Pitera', 'Derrame', 'Tea', 'Venteo', 'Rechazo'], no: [] },
  '#/oper/hoy/ceiba/curso': { si: ['Pregunta', 'de 4', '¿Qué parte se dañó?', 'Sello mecánico', 'Todavía no sé', 'No arrancar', 'Orden de cierre', 'Registrar una pérdida'],
    no: ['Su campo, ahora', 'Abrir La planta viva', 'Contestar'] },
  '#/tec/hoy/ceiba/curso': { si: ['cosas', 'Primero P-201B', 'No arrancar', '¿Qué parte se dañó?', 'Orden 40012056', 'Cerrar la orden', 'Verificar que las tres unidades estén en servicio'],
    no: ['Su campo, ahora', 'Atender la orden de K-101'] },
  '#/tec/hoy/ceiba/curso [Cerrar la orden]': { si: ['¿Qué hizo?', 'Inspeccioné', 'Empezó', 'Terminó'], no: [] },
  // A-12 y P-trabajo-1: las direcciones de Mi trabajo y Mantenimiento abren Hoy.
  '#/tec/trabajo/ceiba/curso': { si: ['cosas', 'Orden 40012056', 'Cerrar la orden'], no: ['Atender la orden de K-101'] },
  '#/jefe/hoy/ceiba/curso': { si: ['Avisan', 'K-101', 'frenaría en la planta', 'Por identificar', 'Fallas críticas', 'Espera', '7,7 de 8,1', 'Ver la orden', 'Ojo:', 'no conviene intervenirlas hoy', 'Contestar yo'],
    no: ['Seguir la orden de K-101', 'Su campo, ahora', /Ojo:[\s\S]*Ojo:/] },
  '#/jefe/hoy/ceiba/curso [Ver la orden]': { si: ['Orden 40012056', 'Óscar Daza'], no: [] },
  '#/jefe/hoy/ceiba/curso [Espera]': { si: ['El tiempo fuera en 5 tramos', 'Detección', 'Administrativo', 'Logística', 'Reparación', 'Arranque', 'sin dato', 'Sin marca que lo explique'], no: [] },
  '#/jefe/mantenimiento/ceiba/curso': { si: ['Avisan', 'Fallas críticas'], no: [titulo('Horas en SAP'), 'Intervenir ya'] },
  '#/jefe/equipos/ceiba': { si: ['¿Lo vigila TRIM?', 'no: sin instrumento', 'sube porque P-201B está parada'], no: ['Superficie', 'Cambió hoy', 'Qué está en riesgo'] },
  '#/jefe/equipos/ceiba~portafolio': { si: ['¿Lo vigila TRIM?', 'hasta'], no: ['Qué está en riesgo', 'bbl si falla hoy', /perdiéndose/i, 'bbl · retorno'] },
  '#/conf/equipos/ceiba': { si: ['Si falla hoy', '3.059', 'se trabaría en la planta', 'Vigía', '3 de 3', 'Sin instrumento', 'Entre fallas', '41 d', 'Clasificación confirmada', '0 de 7', 'Abrir P-201A', 'Le tocan', 'Filtrar', 'sube porque P-201B está parada'],
    no: ['Superficie', 'Qué está en riesgo', 'Cambió hoy', 'Más filtros'] },
  '#/conf/equipos/morichal': { si: ['¿Dónde va el próximo instrumento?', 'Si falla hoy', 'MPP-301'], no: [/¿Dónde va el próximo instrumento\?[\s\S]*¿Dónde va el próximo instrumento\?/, 'bbl si falla hoy', 'Qué está en riesgo'] },
  '#/conf/equipos/morichal [Ver lo que le toca]': { si: ['Ocultar'], no: [] },
  // FF-2: la misma pregunta en un solo lugar: «Una por una» lee la cadena; se contesta en Hoy (la pista va allá).
  '#/oper/causa/ceiba/curso': { si: ['No arrancar hasta identificar el daño', 'Si arranca antes, queda como no conformidad', 'Se contesta en Hoy', 'demo'],
    no: ['señal e historia', titulo('Lo que dijo la señal'), 'Regla de operación:', 'Demo · simular', 'en este demo', 'WhatsApp', 'Ver mi chat', 'causa probada por señal'] },
  // A-22: la planeadora y abastecimiento dicen que no están, sin abrir producción.
  '#/plan/hoy/ceiba/curso': { si: ['Este rol todavía no está disponible', 'Planeadora de mantenimiento'], no: ['La planta viva', 'Salen hoy'] },
  '#/cont/evidencia/ceiba/curso': { si: ['Este rol todavía no está disponible', 'Abastecimiento y contratos'], no: ['La planta viva', 'Evidencia de parada'] },
  '#/sup/bombas/ceiba/curso': { si: ['3 equipos', 'P-201B', 'P-201A', 'P-201C'], no: ['LC-11'] },
  '#/sup/turno/ceiba/curso': { si: ['Paradas por confirmar', 'Mi turno'], no: ['Entrega de turno', 'Por vigilar', '≈ 983'] },
  '#/sup/bombas/ceiba/curso/P-201B': { si: ['No arrancar hasta identificar qué se dañó'], no: [titulo('Historia del PLC'), 'Modo de falla'] },
}
