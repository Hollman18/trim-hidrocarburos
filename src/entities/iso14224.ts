/** Códigos de ISO 14224:2016.
 *
 *  La cadena causal de la norma es: causa de falla → mecanismo de falla →
 *  modo de falla. El operador solo declara lo que VIO (el modo); el mecanismo
 *  y la causa raíz los completa mantenimiento después.
 */

export interface Modo { codigo: string; nombre: string; en: string }

/** Modos de falla · Annex B, tablas B.6–B.15. Los de nivel 1 son comunes a
 *  todo tipo de equipo; cuáles aplican a cada clase está en B.2.6. */
export const MODOS: Modo[] = [
  { codigo: 'AIR', nombre: 'Lectura anormal del instrumento', en: 'Abnormal instrument reading' },
  { codigo: 'BRD', nombre: 'Rotura', en: 'Breakdown' },
  { codigo: 'ELP', nombre: 'Fuga externa de producto', en: 'External leakage — process medium' },
  { codigo: 'ELU', nombre: 'Fuga externa de servicio', en: 'External leakage — utility medium' },
  { codigo: 'ERO', nombre: 'Salida errática', en: 'Erratic output' },
  { codigo: 'FTS', nombre: 'No arrancó cuando se pidió', en: 'Failure to start on demand' },
  { codigo: 'HIO', nombre: 'Entregó de más', en: 'High output' },
  { codigo: 'INL', nombre: 'Fuga interna', en: 'Internal leakage' },
  { codigo: 'LOO', nombre: 'Entregó de menos', en: 'Low output' },
  { codigo: 'NOI', nombre: 'Ruido', en: 'Noise' },
  { codigo: 'OHE', nombre: 'Sobrecalentamiento', en: 'Overheating' },
  { codigo: 'PDE', nombre: 'Parámetro fuera de rango', en: 'Parameter deviation' },
  { codigo: 'PLU', nombre: 'Taponado', en: 'Plugged / choked' },
  { codigo: 'SER', nombre: 'Problema menor en servicio', en: 'Minor in-service problems' },
  { codigo: 'STD', nombre: 'Deficiencia estructural', en: 'Structural deficiency' },
  { codigo: 'STP', nombre: 'No paró cuando se pidió', en: 'Failure to stop on demand' },
  { codigo: 'UST', nombre: 'Se paró sola', en: 'Spurious stop' },
  { codigo: 'VIB', nombre: 'Vibración', en: 'Vibration' },
  { codigo: 'OTH', nombre: 'Otro', en: 'Other' },
]
export const modo = (c: string) => MODOS.find(m => m.codigo === c)

/** Qué modos aplican a cada clase de equipo (ISO 14224 B.2.6). Mostrar los de
 *  la clase y no los 19 es la diferencia entre un toque y una búsqueda. */
export const MODOS_POR_CLASE: Record<string, string[]> = {
  'bomba-centrifuga': ['UST', 'FTS', 'ELP', 'VIB', 'OHE', 'LOO', 'INL', 'NOI', 'PDE', 'BRD'],
  // Doble tornillo (API 676): el sello manda en el MTBF y la arena baja el
  // caudal antes de romper nada. El filtro de entrada se tapa.
  'bomba-multifasica': ['ELP', 'LOO', 'OHE', 'VIB', 'UST', 'FTS', 'PLU', 'PDE', 'INL', 'NOI', 'BRD'],
  // Inyección y disposición (API 610 / HPS): la succión baja dispara la
  // bomba; la cámara de empuje se calienta antes de fallar.
  'bomba-inyeccion': ['UST', 'LOO', 'ELP', 'VIB', 'OHE', 'FTS', 'PDE', 'PLU', 'NOI', 'INL', 'BRD'],
  'bomba-electrosumergible': ['UST', 'FTS', 'LOO', 'PDE', 'AIR', 'BRD'],
  'compresor-aire': ['LOO', 'UST', 'FTS', 'ELU', 'OHE', 'NOI', 'VIB', 'PDE'],
  'compresor-gas': ['UST', 'FTS', 'LOO', 'OHE', 'VIB', 'NOI', 'INL'],
  'tratador-termico': ['OHE', 'PDE', 'PLU', 'ELP', 'LOO'],
  'separador-trifasico': ['PDE', 'INL', 'PLU', 'ELP', 'AIR'],
  'tanque-atmosferico': ['ELP', 'PDE', 'AIR', 'STD'],
  'unidad-lact': ['AIR', 'PDE', 'ERO', 'ELP', 'PLU'],
  'switchgear': ['UST', 'FTS', 'BRD', 'OHE', 'STD'],
}

export interface Mecanismo { codigo: string; nombre: string; en: string; familia: 'degradacion' | 'choque' }

/** Mecanismos de falla · ISO 14224:2016, Annex B, Table B.2.
 *
 *  Seis familias, cada una con su «general» (x.0) para cuando no se sabe más.
 *  La versión anterior de esta lista era el esquema simplificado que publicó
 *  SINTEF para OREDA, que numera distinto y no trae ni erosión ni cavitación:
 *  justo los dos mecanismos centrales de las bombas que vigila el producto.
 *
 *  TRANSCRITA, PENDIENTE DE COTEJO: la norma es de pago y ninguna fuente
 *  pública reproduce la tabla. Antes de exportar estos códigos al CMMS de un
 *  cliente hay que cotejarlos contra su copia de ISO 14224:2016.
 *
 *  La familia sale de aplicar la definición de SINTEF: degradación es lo que
 *  «evolves over time, and will typically develop to a critical failure in
 *  time if not corrected»; choque es lo súbito, que no depende del tiempo.
 *  Solo lo de degradación se puede anticipar con una tendencia. */
export const MECANISMOS: Mecanismo[] = [
  { codigo: '1.0', nombre: 'Falla mecánica · general', en: 'Mechanical failure — general', familia: 'degradacion' },
  { codigo: '1.1', nombre: 'Fuga', en: 'Leakage', familia: 'degradacion' },
  { codigo: '1.2', nombre: 'Vibración', en: 'Vibration', familia: 'degradacion' },
  { codigo: '1.3', nombre: 'Holgura o desalineación', en: 'Clearance / alignment failure', familia: 'degradacion' },
  { codigo: '1.4', nombre: 'Deformación', en: 'Deformation', familia: 'degradacion' },
  { codigo: '1.5', nombre: 'Aflojamiento', en: 'Looseness', familia: 'degradacion' },
  { codigo: '1.6', nombre: 'Agarrotamiento', en: 'Sticking', familia: 'degradacion' },
  { codigo: '2.0', nombre: 'Falla de material · general', en: 'Material failure — general', familia: 'degradacion' },
  { codigo: '2.1', nombre: 'Cavitación', en: 'Cavitation', familia: 'degradacion' },
  { codigo: '2.2', nombre: 'Corrosión', en: 'Corrosion', familia: 'degradacion' },
  { codigo: '2.3', nombre: 'Erosión', en: 'Erosion', familia: 'degradacion' },
  { codigo: '2.4', nombre: 'Desgaste', en: 'Wear', familia: 'degradacion' },
  { codigo: '2.5', nombre: 'Rotura', en: 'Breakage', familia: 'choque' },
  { codigo: '2.6', nombre: 'Fatiga', en: 'Fatigue', familia: 'degradacion' },
  { codigo: '2.7', nombre: 'Sobrecalentamiento', en: 'Overheating', familia: 'degradacion' },
  { codigo: '2.8', nombre: 'Estallido', en: 'Burst', familia: 'choque' },
  { codigo: '3.0', nombre: 'Falla de instrumento · general', en: 'Instrument failure — general', familia: 'choque' },
  { codigo: '3.1', nombre: 'Falla de control', en: 'Control failure', familia: 'choque' },
  { codigo: '3.2', nombre: 'Sin señal, indicación o alarma', en: 'No signal / indication / alarm', familia: 'choque' },
  { codigo: '3.3', nombre: 'Señal, indicación o alarma falsa', en: 'Faulty signal / indication / alarm', familia: 'choque' },
  { codigo: '3.4', nombre: 'Fuera de ajuste', en: 'Out of adjustment', familia: 'degradacion' },
  { codigo: '3.5', nombre: 'Falla de software', en: 'Software failure', familia: 'choque' },
  { codigo: '3.6', nombre: 'Falla de causa o modo común', en: 'Common cause / mode failure', familia: 'choque' },
  { codigo: '4.0', nombre: 'Falla eléctrica · general', en: 'Electrical failure — general', familia: 'choque' },
  { codigo: '4.1', nombre: 'Cortocircuito', en: 'Short circuiting', familia: 'choque' },
  { codigo: '4.2', nombre: 'Circuito abierto', en: 'Open circuit', familia: 'choque' },
  { codigo: '4.3', nombre: 'Sin energía o tensión', en: 'No power / voltage', familia: 'choque' },
  { codigo: '4.4', nombre: 'Energía o tensión anormal', en: 'Faulty power / voltage', familia: 'choque' },
  // El aislamiento pierde resistencia de a poco (calor, humedad, ciclos de
  // tensión) y eso se mide: el desbalance de corriente crece antes del
  // disparo a tierra. Por la definición de SINTEF es degradación; el disparo
  // es el final de ella, no un evento sin aviso.
  { codigo: '4.5', nombre: 'Falla de tierra o aislamiento', en: 'Earth / isolation fault', familia: 'degradacion' },
  { codigo: '5.0', nombre: 'Influencia externa · general', en: 'External influence — general', familia: 'choque' },
  { codigo: '5.1', nombre: 'Bloqueo o taponamiento', en: 'Blockage / plugged', familia: 'degradacion' },
  { codigo: '5.2', nombre: 'Contaminación', en: 'Contamination', familia: 'degradacion' },
  { codigo: '5.3', nombre: 'Otra influencia externa', en: 'Miscellaneous external influences', familia: 'choque' },
  { codigo: '6.0', nombre: 'Misceláneo · general', en: 'Miscellaneous — general', familia: 'choque' },
  { codigo: '6.1', nombre: 'Sin causa encontrada', en: 'No cause found', familia: 'choque' },
  { codigo: '6.2', nombre: 'Causas combinadas', en: 'Combined causes', familia: 'choque' },
  { codigo: '6.3', nombre: 'Otro', en: 'Other', familia: 'choque' },
  { codigo: '6.4', nombre: 'Desconocido', en: 'Unknown', familia: 'choque' },
]
/** Lo que falta para dar la tabla por buena. Se muestra donde se usa. */
export const MECANISMOS_ESTADO = 'Transcrita de ISO 14224:2016 Table B.2 · pendiente de cotejo con la norma comprada'
export const mecanismo = (c: string) => MECANISMOS.find(m => m.codigo === c)

/** Causas raíz · Table B.3. La norma define cinco categorías de primer nivel. */
export const CAUSAS_RAIZ = [
  { codigo: '1', nombre: 'Diseño' },
  { codigo: '2', nombre: 'Fabricación o instalación' },
  { codigo: '3', nombre: 'Operación o mantenimiento' },
  { codigo: '4', nombre: 'Gestión' },
  { codigo: '5', nombre: 'Misceláneo · causa combinada o común' },
] as const

export const FUENTE_ISO =
  'ISO 14224:2016 · modos de falla del Annex B (tablas B.6–B.15), mecanismos de la Table B.2 (transcrita, pendiente de cotejo) y las cinco categorías de causa raíz de la Table B.3.'
