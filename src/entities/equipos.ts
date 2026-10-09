import type { Equipo, Dispositivo, Severidad, Marcha } from './tipos'
import { perfilBomba, esBomba, type PerfilBomba } from './bombas'
import { respaldoDe, type Config } from './configuracion'
import { serieHasta } from './serie'

/** Las lecturas del demo se escriben como doce valores DIARIOS que terminan
 *  ahora; aquí se vuelven la serie del historiador con su inicio y su paso
 *  (`SerieTag`), que es lo que el vigía lee. En producción la serie llega así
 *  del historiador, con la cadencia que tenga. */
const PASO_DEMO_H = 24
const diaria = (valores?: number[]) => (valores ? serieHasta(valores, PASO_DEMO_H) : undefined)

/** Lo que el catálogo del demo declara de un instrumento, con la serie en valores diarios. */
type Lecturas = Partial<Omit<Dispositivo, 'serie'>> & { serie?: number[] }

const d = (
  tag: string, tipo: string, valor: number | string, unidad: string,
  estado: Dispositivo['estado'], origen: string, limite: string, serie?: number[],
  calibracion?: string,
): Dispositivo => ({ tag, tipo, valor, unidad, estado, origen, limite, serie: diaria(serie), calibracion })

/** Serie corta: solo en variables continuas. Un estado discreto
 *  («piloto encendido», «2 de 3 unidades») no lleva gráfica. */
export const EQUIPOS: Record<string, Equipo> = {
  'P-201B': {
    id: 'P-201B', nombre: 'Bomba multietapa de transferencia de agua', sistema: 'Tratamiento de agua',
    severidad: 1, marcha: 'detenido', estado: 'detenido', criticidad: 5, aguasAbajo: 'los pozos que el respaldo no cubre',
    redundancia: 'P-201A y P-201C en paralelo', modoFalla: 'Lubricación de cojinete',
    norma: 'Centrífuga multietapa · API 610, Tabla 8: vibración en la caja de rodamientos.',
    lectura: 'Detenida. P-201A y P-201C no alcanzan a tomar toda su agua: el tanque llegó al alto-alto y hubo que cerrar parte de los pozos.',
    intervencion: {
      ubicacion: 'Batería 1 · tren de agua',
      accionInmediata: 'Llevar P-201A y P-201C a su caudal máximo y confirmar el nivel del tanque de agua antes de intentar el arranque: si ya está alto, cerrar primero los pozos con menos crudo por barril de agua.',
      avisarA: 'Supervisor de operaciones e ingeniería de producción',
    },
    distribucionFalla: {
      reparto: [['Mecánicas', 44.1], ['Eléctricas', 27.7], ['Operacionales y de sistema', 25.4], ['Diseño', 2.4]],
      fuente: 'Reparto de bombeo en campo Sirte (Libia), 673 elementos de falla clasificados.',
    },
    dispositivos: [
      d('PI-2010', 'Presión de succión', 18.2, 'psi', 'normal', 'PI · 47 s', '> 10',
        [12.1, 12.0, 12.2, 12.1, 11.9, 12.0, 12.1, 11.8, 11.9, 12.0, 13.4, 18.2]),
      // Una de tres bombas iguales en paralelo (P-201A/B/C, 90.000 bbl/d de placa; el
      // cabezal de disposición las limita a 89.250): mueve su parte del agua que entra,
      // 74.200 bbl/d en marcha, la mediana que lee el colchón.
      d('FI-2011', 'Caudal', 0, 'bbl/d', 'alarma', 'PI · 47 s', '66.800 – 89.250',
        [74220, 74190, 74250, 74200, 74180, 74230, 74210, 74190, 74200, 74160, 63070, 0]),
      // Motor de 480 V: a 74.200 bbl/d y unos 200 psi de diferencial la bomba pide
      // unos 285 kW (eficiencia de bomba y motor ≈ 0,66), del orden de 400 A.
      d('II-2011', 'Corriente del motor', 0, 'A', 'alarma', 'PI · 47 s', '320 – 445',
        [398, 402, 408, 405, 412, 419, 425, 432, 436, 429, 378, 0]),
      d('TI-2011', 'Temperatura de cojinete', 41, '°C', 'normal', 'PI · 47 s', '< 85',
        [38, 39, 39, 40, 40, 41, 42, 43, 44, 45, 43, 41]),
      d('PDI-2011', 'Presión de descarga', 0, 'psi', 'alarma', 'PI · 47 s', '180 – 240',
        [214, 212, 215, 211, 210, 208, 205, 201, 198, 194, 160, 0]),
      // API 610, Tabla 8: 3,0 mm/s RMS en la región preferida, 3,9 en la permitida.
      d('VI-2011', 'Vibración global', 0, 'mm/s', 'normal', 'PLC · 47 s', '< 3,9',
        [2.2, 2.1, 2.2, 2.3, 2.2, 2.1, 2.2, 2.2, 2.3, 2.2, 2.4, 0]),
      d('LSH-2013', 'Fuga del sello', 'sin fuga', '', 'normal', 'PLC · interruptor', '—'),
      d('LT-2012', 'Nivel del tanque de agua', 89.6, '%', 'normal', 'PLC · 47 s', '> 15',
        [77.8, 77.1, 78.4, 76.9, 77.6, 77.2, 78.3, 77.9, 76.8, 77.4, 78.7, 89.6]),
    ],
  },
  'MPP-301': {
    id: 'MPP-301', nombre: 'Bomba multifásica de doble tornillo · clúster norte', sistema: 'Recolección multifásica',
    severidad: 3, marcha: 'en-marcha', estado: 'en marcha · perdiendo eficiencia', criticidad: 5,
    aguasAbajo: '3 pozos del clúster norte', redundancia: 'sin respaldo',
    modoFalla: 'Erosión de tornillos y camisa por arena',
    norma: 'Doble tornillo · API 676, 4.ª ed. 2022: Anexo G (instrumentos) y Anexo B (desgaste).',
    lectura: 'Para sostener la misma presión diferencial necesita 4,9 % más velocidad que hace 11 días, y la caída de presión del filtro se duplicó: está entrando arena. Es el círculo que describe API 676: más velocidad, más erosión.',
    soloEn: ['morichal'],
    intervencion: {
      ubicacion: 'Clúster norte · patín de bombeo multifásico',
      accionInmediata: 'Revisar y limpiar el filtro canasta de succión. No subir más la velocidad para compensar: la erosión crece con la velocidad.',
      avisarA: 'Ingeniería de confiabilidad y supervisor de operaciones',
    },
    dispositivos: [
      d('PT-3011', 'Presión de succión', 45, 'psi', 'normal', 'PLC · 1 s', '35 – 60',
        [46, 45, 47, 45, 46, 44, 45, 46, 45, 44, 45, 45]),
      d('TE-3011', 'Temperatura de succión', 58, '°C', 'normal', 'PLC · 1 s', '45 – 75',
        [57, 58, 58, 57, 59, 58, 58, 57, 58, 59, 58, 58]),
      d('PDT-3011', 'Caída de presión del filtro', 9.6, 'psi', 'atencion', 'PLC · 1 s', '< 8',
        [4.1, 4.3, 4.6, 4.8, 5.3, 5.9, 6.4, 7.1, 7.6, 8.4, 9.0, 9.6]),
      d('PT-3012', 'Presión de descarga', 345, 'psi', 'normal', 'PLC · 1 s', '320 – 360',
        [346, 344, 347, 345, 344, 346, 345, 343, 346, 345, 344, 345]),
      d('TE-3012', 'Temperatura de descarga', 71, '°C', 'normal', 'PLC · 1 s', '< 90',
        [70, 70, 71, 70, 71, 71, 70, 71, 72, 71, 71, 71]),
      d('TE-3013', 'Temperatura de rodamiento', 68, '°C', 'normal', 'PLC · 1 s', '< 85',
        [61, 61, 62, 62, 63, 64, 64, 65, 66, 66, 67, 68]),
      d('VT-3013', 'Vibración de la bomba', 4.3, 'mm/s', 'normal', 'PLC · 1 s', '< 5,5',
        [3.1, 3.2, 3.2, 3.4, 3.5, 3.6, 3.7, 3.9, 4.0, 4.1, 4.2, 4.3]),
      d('TE-3014', 'Temperatura de devanado', 96, '°C', 'normal', 'PLC · 1 s', '< 130',
        [94, 95, 95, 94, 96, 95, 96, 95, 96, 96, 95, 96]),
      d('TE-3015', 'Temperatura de rodamiento del motor', 63, '°C', 'normal', 'PLC · 1 s', '< 85',
        [62, 62, 63, 62, 63, 63, 62, 63, 63, 62, 63, 63]),
      d('VT-3015', 'Vibración del motor', 1.9, 'mm/s', 'normal', 'PLC · 1 s', '< 4,5',
        [1.8, 1.9, 1.8, 1.9, 1.9, 1.8, 1.9, 1.9, 1.8, 1.9, 1.9, 1.9]),
      d('SI-3016', 'Velocidad', 1535, 'rpm', 'normal', 'variador · 1 s', '1.300 – 1.650',
        [1463, 1468, 1471, 1478, 1484, 1490, 1497, 1505, 1512, 1520, 1528, 1535]),
      d('II-3016', 'Corriente', 182, 'A', 'normal', 'variador · 1 s', '140 – 210',
        [171, 172, 172, 174, 175, 176, 177, 178, 179, 180, 181, 182]),
      d('PT-3017', 'Presión de barrera del sello', 395, 'psi', 'normal', 'PLC · 1 s', '380 – 420',
        [398, 397, 398, 396, 397, 396, 397, 395, 396, 395, 396, 395]),
      d('LT-3017', 'Nivel del depósito de barrera', 71, '%', 'normal', 'PLC · 1 s', '50 – 90',
        [78, 78, 77, 77, 76, 75, 75, 74, 73, 73, 72, 71]),
      d('PT-3018', 'Presión de aceite', 32, 'psi', 'normal', 'PLC · 1 s', '25 – 45',
        [32, 33, 32, 32, 33, 32, 32, 33, 32, 32, 33, 32]),
      d('TE-3018', 'Temperatura de aceite', 58, '°C', 'normal', 'PLC · 1 s', '< 75',
        [57, 57, 58, 57, 58, 58, 57, 58, 58, 57, 58, 58]),
    ],
  },
  'K-101': {
    id: 'K-101', servicio: 'aire', nombre: 'Sistema de aire de instrumentos', sistema: 'Servicios industriales',
    severidad: 1, marcha: 'en-marcha', estado: 'en marcha · degradado', criticidad: 5,
    aguasAbajo: 'todo el campo', redundancia: '3 unidades (N+1)',
    modoFalla: 'Pérdida de suministro → válvulas a posición segura',
    norma: 'ISA-7.0.01 · API RP 14J §3.3.16. «El diseño a prueba de fallo no elimina la necesidad de supervivencia de la utilidad.»',
    lectura: 'La presión de cabezal cae hace 7 días. La norma exige recibidor de 5 a 30 min de autonomía: hoy quedan 11. Alimenta cinco sistemas.',
    intervencion: {
      ubicacion: 'Batería 1 · servicios industriales',
      accionInmediata: 'Verificar que las tres unidades estén en servicio: hoy hay dos. Con el recibidor en 11 min de autonomía, una parada deja las válvulas en posición segura.',
      avisarA: 'Supervisor de operaciones',
    },
    dispositivos: [
      d('PT-1011', 'Presión de cabezal', 112, 'psi', 'alarma', 'PI · 47 s', '115 – 130',
        [127, 126, 125, 124, 123, 121, 120, 118, 117, 115, 114, 112]),
      d('PDT-1011', 'Derivada de presión', -0.9, 'psi/h', 'alarma', 'calculado · 47 s', '> -0,2',
        [-0.05, -0.08, -0.1, -0.15, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9]),
      d('AIT-1011', 'Punto de rocío', -38, '°C', 'normal', 'PI · 15 min', '< -30',
        [-41, -40, -40, -39, -39, -38, -38, -38, -37, -38, -38, -38]),
      d('ZI-1011', 'Unidades en servicio', '2 de 3', '', 'atencion', 'PLC · 47 s', '3'),
    ],
  },
  'H-302': {
    id: 'H-302', servicio: 'tratamiento', nombre: 'Tratador térmico', sistema: 'Tratamiento de crudo', severidad: 3,
    marcha: 'en-marcha', estado: 'en marcha', criticidad: 4, aguasAbajo: 'sin impacto',
    redundancia: 'respaldo en línea (H-301)', modoFalla: 'Escama y impingimiento de llama',
    norma: 'Variable: temperatura de piel de tubo. Intervalo P-F: varía ampliamente.',
    lectura: 'Tiene respaldo en línea (H-301): su desviación no difiere barriles de proceso.',
    intervencion: {
      ubicacion: 'Batería 1 · tren de crudo',
      accionInmediata: 'No requiere intervención inmediata: H-301 toma la carga. Programar la limpieza del tubo de fuego en la próxima ventana.',
      avisarA: 'Planeación de mantenimiento',
    },
    dispositivos: [
      d('TI-3021', 'Temperatura de piel de tubo', 318, '°C', 'aviso', 'PI · 47 s', '280 – 310',
        [296, 298, 299, 301, 303, 305, 307, 310, 312, 314, 316, 318]),
      d('TI-3022', 'Temperatura de chimenea', 412, '°C', 'normal', 'PI · 47 s', '< 450',
        [398, 400, 401, 403, 404, 406, 407, 409, 410, 411, 412, 412]),
      d('AI-3021', 'BSW a la salida', 0.42, '%', 'normal', 'laboratorio · 8 h', '< 0,5',
        [0.31, 0.33, 0.32, 0.35, 0.36, 0.37, 0.38, 0.39, 0.40, 0.41, 0.42, 0.42]),
      d('FI-3021', 'Consumo de gas combustible', 48, 'KPCD', 'normal', 'PI · 47 s', '38 – 52',
        [41, 42, 42, 43, 44, 45, 45, 46, 47, 47, 48, 48]),
    ],
  },
  'V-101': {
    id: 'V-101', servicio: 'proceso', nombre: 'Separador trifásico', sistema: 'Separación', severidad: 0, marcha: 'en-marcha', estado: 'en marcha',
    criticidad: 4, aguasAbajo: '4 pozos', redundancia: 'sin respaldo',
    modoFalla: 'Arrastre · nivel de interfase', norma: 'Separa agua, gas y crudo. De él cuelgan los tres trenes.',
    lectura: 'Operación normal.',
    intervencion: {
      ubicacion: 'Batería 1 · separación',
      accionInmediata: 'Ante arrastre, revisar el nivel de interfase antes de tocar el control: de este separador cuelgan los tres trenes.',
      avisarA: 'Supervisor de operaciones',
    },
    dispositivos: [
      d('LI-1012', 'Nivel de interfase', 48, '%', 'normal', 'PI · 47 s', '35 – 65',
        [47, 48, 49, 48, 47, 48, 49, 48, 48, 47, 48, 48]),
      d('PDI-1012', 'Presión diferencial', 4.2, 'psi', 'normal', 'PI · 47 s', '< 8',
        [4.0, 4.1, 4.1, 4.2, 4.1, 4.2, 4.2, 4.3, 4.2, 4.2, 4.1, 4.2]),
    ],
  },
  'TK-102': {
    id: 'TK-102', servicio: 'evacuacion', nombre: 'Tanque de crudo en especificación', sistema: 'Almacenamiento', severidad: 2,
    marcha: 'en-marcha', estado: 'en servicio', criticidad: 5, aguasAbajo: 'despacho', redundancia: 'TK-101',
    modoFalla: 'Sobrellenado',
    norma: 'API 2350: la protección contra sobrellenado es del instrumento independiente de nivel alto-alto. Trim vigila, no protege.',
    lectura: 'Dos medidores independientes con 0,1 pie de desviación entre sí.',
    dispositivos: [
      d('LI-1102', 'Nivel · medidor primario', 14.2, 'pies', 'atencion', 'ATG Enraf · 2 min', 'rebose 18,5',
        [9.1, 9.8, 10.4, 11.0, 11.6, 12.1, 12.7, 13.1, 13.5, 13.8, 14.0, 14.2],
        'Verificado contra cinta el 3 de marzo de 2026 · vigente hasta marzo de 2027'),
      d('LI-1103', 'Nivel · medidor redundante', 14.3, 'pies', 'normal', 'ATG Rosemount · 2 min', 'rebose 18,5',
        [9.2, 9.9, 10.5, 11.1, 11.7, 12.2, 12.8, 13.2, 13.6, 13.9, 14.1, 14.3],
        'Verificado contra cinta el 3 de marzo de 2026 · vigente hasta marzo de 2027'),
      d('LSHH-1102', 'Nivel alto-alto independiente', 'armado', '', 'normal', 'SIS · cableado', '—'),
      d('AI-1102', 'BSW', 0.38, '%', 'normal', 'laboratorio · 8 h', '< 0,5',
        [0.33, 0.34, 0.34, 0.35, 0.36, 0.36, 0.37, 0.37, 0.38, 0.38, 0.38, 0.38]),
    ],
  },
  'LACT-01': {
    id: 'LACT-01', servicio: 'evacuacion', fiscal: 'FQI-0101', nombre: 'Unidad LACT · punto de medición oficial', sistema: 'Medición fiscal',
    severidad: 0, marcha: 'en-marcha', estado: 'despachando', criticidad: 5, aguasAbajo: 'todo el campo',
    redundancia: 'sin respaldo', modoFalla: 'Deriva del factor de medidor',
    norma: 'El archivo EFM (horarios, diarios, eventos) exige ROC Plus o Totalflow, no Modbus plano.',
    lectura: 'Factor de probado 1,0021. Calibración vigente hasta abril de 2027.',
    dispositivos: [
      d('FQI-0101', 'Medidor de desplazamiento positivo', 10450, 'BPDC', 'normal', 'computador de flujo · 1 min', '—',
        [10380, 10410, 10395, 10430, 10402, 10445, 10418, 10460, 10432, 10471, 10439, 10450],
        'Probado el 12 de abril de 2026 · factor 1,0021 · vigente hasta abril de 2027'),
      d('AI-0101', 'BSW en línea', 0.31, '%', 'normal', 'analizador · 5 min', '< 0,5',
        [0.29, 0.30, 0.30, 0.31, 0.30, 0.31, 0.31, 0.32, 0.31, 0.31, 0.31, 0.31],
        'Analizador verificado el 20 de enero de 2026 · vigente hasta enero de 2027'),
      d('DI-0101', 'Densidad · gravedad API', 29.4, '°API', 'normal', 'densitómetro · 5 min', '28 – 31',
        [29.5, 29.4, 29.5, 29.4, 29.4, 29.3, 29.4, 29.4, 29.5, 29.4, 29.4, 29.4],
        'Densitómetro verificado el 20 de enero de 2026 · vigente hasta enero de 2027'),
    ],
  },
  'C-401': {
    id: 'C-401', servicio: 'compresion', nombre: 'Compresor de gas', sistema: 'Compresión', severidad: 0, marcha: 'en-marcha', estado: 'en marcha',
    criticidad: 4, aguasAbajo: 'tren de gas', redundancia: 'sin respaldo',
    modoFalla: 'Válvulas de succión y descarga ≈ 50,7 %',
    norma: 'El modo de falla #1 de la familia NO es monitoreable a nuestra resolución: se diagnostica por ángulo de cigüeñal.',
    lectura: 'Operación normal.',
    intervencion: {
      ubicacion: 'Batería 1 · tren de gas',
      accionInmediata: 'Ante parada súbita, verificar presión de descarga y temperatura por etapa antes de reponer: el modo dominante no avisa.',
      avisarA: 'Supervisor de operaciones',
    },
    distribucionFalla: {
      reparto: [['Válvulas de succión', 29.1], ['Válvulas de descarga', 21.6], ['Resto de elementos', 49.3]],
      fuente: '21 compresores de pistón a lo largo de 20 años. Succión y descarga suman 50,7 %: es el modo de falla #1 de la familia.',
    },
    dispositivos: [
      d('PI-4011', 'Presión de descarga', 1180, 'psi', 'normal', 'PI · 47 s', '1.050 – 1.250',
        [1172, 1175, 1178, 1176, 1180, 1182, 1179, 1181, 1178, 1180, 1179, 1180]),
      d('TI-4011', 'Temperatura de descarga', 98, '°C', 'normal', 'PI · 47 s', '< 120',
        [95, 96, 96, 97, 97, 98, 98, 98, 99, 98, 98, 98]),
    ],
  },
  'SE-2': {
    id: 'SE-2', servicio: 'energia', nombre: 'Pórtico 13,8 kV · subestación 2', sistema: 'Distribución eléctrica',
    severidad: 0, marcha: 'en-marcha', estado: 'en servicio', criticidad: 3, aguasAbajo: 'todo el campo',
    redundancia: 'sin respaldo', modoFalla: 'Disparo de protección de barraje',
    norma: 'IEEE Std 493: el barraje de switchgear 601 V–15 kV tiene MTTR publicado de 261 a 372 h, es decir 10,9 a 15,5 DÍAS. Un pórtico NO es un transformador.',
    lectura: 'Barra dentro de banda. Sus disparos y lo que costaron salen del registro de eventos de la subestación.',
    intervencion: {
      ubicacion: 'Subestación 2 · pórtico de 13,8 kV',
      accionInmediata: 'Zona eléctrica: no se interviene sin bloqueo y etiquetado. La lectura es solo de supervisión.',
      avisarA: 'Mantenimiento eléctrico y supervisor de operaciones',
    },
    dispositivos: [
      d('II-0021', 'Corriente de barraje', 412, 'A', 'normal', 'PI · 47 s', '< 600',
        [405, 408, 410, 409, 411, 413, 412, 414, 411, 413, 412, 412]),
      d('VI-0021', 'Tensión de barra', 13.76, 'kV', 'normal', 'PI · 47 s', '13,2 – 14,4',
        [13.74, 13.75, 13.76, 13.75, 13.77, 13.76, 13.75, 13.76, 13.77, 13.76, 13.76, 13.76]),
      d('TI-0021', 'Termografía de conexiones', 0, '°C', 'sin señal', 'campaña · cada 180 d', 'ΔT < 15'),
    ],
  },
}

/** Cada campo tiene SU instancia del mismo tipo de equipo, con sus propias
 *  lecturas. El catálogo de arriba describe La Ceiba, que es el campo
 *  conectado; los demás traen solo lo que difiere. Si un campo no tiene
 *  instancia de un equipo, no se muestran los números de otro campo: se
 *  dice que ese equipo todavía no está instrumentado aquí. */
interface Instancia {
  severidad?: Severidad
  marcha?: Marcha
  estado?: string
  lectura?: string
  dispositivos?: Record<string, Lecturas>
  /* Lo que es de este campo y no de la máquina: si no se declara, no existe
     aquí. Heredarlo del catálogo pondría hechos de La Ceiba en otro campo. */
  intervencion?: Equipo['intervencion']
  redundancia?: string
  aguasAbajo?: string
}

/** Lecturas de una instancia SANA, por tipo de equipo. El catálogo describe
 *  La Ceiba, donde varias máquinas están en falla; un campo que declara la
 *  suya en marcha tiene que traer también sus valores dentro de banda, o la
 *  pantalla diría «normal» con los números de una máquina averiada. */
const NORMAL: Record<string, Record<string, Lecturas>> = {
  'P-201B': {
    'PI-2010': { valor: 12.1, estado: 'normal', serie: [12.0, 12.1, 12.2, 12.0, 12.1, 11.9, 12.1, 12.0, 12.2, 12.1, 12.0, 12.1] },
    'VI-2011': { valor: 2.2, estado: 'normal', serie: [2.1, 2.2, 2.2, 2.1, 2.3, 2.2, 2.2, 2.1, 2.2, 2.3, 2.2, 2.2] },
    'LT-2012': { valor: 55, estado: 'normal', serie: [54, 55, 56, 55, 54, 56, 55, 54, 55, 56, 55, 55] },
    'II-2011': { valor: 412, estado: 'normal', serie: [398, 402, 408, 405, 412, 408, 415, 412, 405, 408, 415, 412] },
    'TI-2011': { valor: 44, estado: 'normal', serie: [41, 42, 42, 43, 43, 44, 44, 45, 44, 44, 43, 44] },
    'PDI-2011': { valor: 212, estado: 'normal', serie: [214, 212, 215, 211, 213, 210, 212, 214, 211, 213, 212, 212] },
  },
  'K-101': {
    'PT-1011': { valor: 124, estado: 'normal', serie: [126, 125, 124, 125, 124, 123, 124, 125, 124, 123, 124, 124] },
    'PDT-1011': { valor: -0.02, estado: 'normal', serie: [-0.03, -0.02, -0.04, -0.02, -0.01, -0.03, -0.02, -0.02, -0.03, -0.01, -0.02, -0.02] },
    'ZI-1011': { valor: '3 de 3', estado: 'normal' },
  },
  'H-302': {
    'TI-3021': { valor: 298, estado: 'normal', serie: [294, 296, 295, 297, 296, 298, 297, 299, 298, 297, 298, 298] },
  },
  'TK-102': {
    'LI-1102': { valor: 9.4, estado: 'normal', serie: [8.7, 8.9, 9.0, 9.1, 9.2, 9.2, 9.3, 9.3, 9.4, 9.4, 9.4, 9.4] },
    'LI-1103': { valor: 9.5, estado: 'normal', serie: [8.8, 9.0, 9.1, 9.2, 9.3, 9.3, 9.4, 9.4, 9.5, 9.5, 9.5, 9.5] },
  },
}

/** Instancia en marcha y dentro de banda. */
const sano = (id: string, estado: string, extra: Record<string, Lecturas> = {}): Instancia =>
  ({ severidad: 0, marcha: 'en-marcha', estado, lectura: 'En marcha y dentro de banda.', dispositivos: { ...(NORMAL[id] ?? {}), ...extra } })

/** Nivel de tanque coherente con el caudal del campo. */
const nivelTanque = (a: number, b: number) => ({
  'LI-1102': { valor: a, estado: 'normal' as const, serie: [a - 2.4, a - 2.1, a - 1.8, a - 1.5, a - 1.2, a - 1, a - 0.8, a - 0.6, a - 0.4, a - 0.2, a - 0.1, a] },
  'LI-1103': { valor: b, estado: 'normal' as const, serie: [b - 2.4, b - 2.1, b - 1.8, b - 1.5, b - 1.2, b - 1, b - 0.8, b - 0.6, b - 0.4, b - 0.2, b - 0.1, b] },
})

/** Producción medida en el punto oficial de cada campo. */
const lact = (v: number) => ({
  'FQI-0101': { valor: v, estado: 'normal' as const,
    serie: [v - 70, v - 40, v - 55, v - 20, v - 48, v - 5, v - 32, v + 10, v - 18, v + 21, v - 11, v] },
})

/** Caudal y corriente del motor de una bomba de agua sana. Cada campo mueve
 *  lo suyo (`v`, con la nominal `techo`), y la corriente va con el caudal
 *  (`amperios`, motor de 480 V): la de una bomba de 90.000 bbl/d no es la de
 *  una de 4.000. La mediana de la serie de caudal es `v − 5`. */
const caudalAgua = (v: number, techo: number, amperios: number) => ({
  'FI-2011': { valor: v, estado: 'normal' as const,
    limite: `${Math.round(v * 0.9).toLocaleString('es-CO')} – ${techo.toLocaleString('es-CO')}`,
    serie: [v - 60, v + 20, v - 30, v + 40, v - 10, v + 30, v - 50, v + 10, v - 20, v + 50, v - 40, v] },
  'II-2011': { valor: amperios, estado: 'normal' as const,
    limite: `${Math.round(amperios * 0.8)} – ${Math.round(amperios * 1.11)}`,
    // Con un motor chico, un decimal: si no, la serie queda plana por el redondeo.
    serie: [0.97, 0.98, 0.99, 0.98, 1, 0.99, 1.01, 1, 0.98, 0.99, 1.01, 1].map(k => (amperios < 100 ? Math.round(amperios * k * 10) / 10 : Math.round(amperios * k))) },
})

const INSTANCIAS: Record<string, { catalogo?: boolean; equipos: Record<string, Instancia> }> = {
  ceiba: { catalogo: true, equipos: {} },

  morichal: {
    equipos: {
      'C-401': sano('C-401', 'en marcha'),
      'SE-2': {
        severidad: 3, marcha: 'en-marcha', estado: 'en servicio · corriente de barraje subiendo',
        dispositivos: {
          'II-0021': { valor: 528, estado: 'atencion', serie: [412, 418, 427, 441, 456, 468, 479, 491, 503, 514, 522, 528] },
        },
      },
      'V-101': sano('V-101', 'en marcha', { 'LI-1012': { valor: 52, estado: 'normal', serie: [49, 50, 51, 50, 52, 51, 52, 53, 52, 51, 52, 52] } }),
      'H-302': sano('H-302', 'en marcha'),
      'TK-102': sano('TK-102', 'en servicio', nivelTanque(11.2, 11.3)),
      'LACT-01': sano('LACT-01', 'despachando', lact(14800)),
      'P-201B': {
        ...sano('P-201B', 'en marcha · succión cayendo', {
          // Una de siete bombas iguales (P-201A…G), su parte del agua que entra:
          // mediana de FI-2011 = 79.900 bbl/d; el cabezal de disposición las limita a 86.500.
          ...caudalAgua(79905, 86500, 429),
          'PI-2010': { valor: 8.8, estado: 'atencion', serie: [14.2, 13.9, 13.5, 13.0, 12.6, 12.1, 11.5, 11.0, 10.4, 9.9, 9.3, 8.8] },
          'LT-2012': { valor: 61.8, estado: 'normal', serie: [60.9, 61.4, 62.0, 61.2, 61.7, 62.3, 61.5, 61.1, 61.9, 62.2, 61.6, 61.8] },
        }),
        severidad: 2,
        lectura: 'La presión de succión bajó 38 % en 11 días. Si cruza 8 psi, el NPSH disponible queda por debajo del que pide la bomba: cavitación. Revisar el nivel del tanque de succión y el filtro.',
      },
      'MPP-301': {},
      'K-101': sano('K-101', 'en marcha'),
    },
  },

  guacamayo: {
    equipos: {
      'LACT-01': sano('LACT-01', 'despachando'),
      'H-302': { ...sano('H-302', 'en marcha') },
      'P-201B': {
        // Recobro: inyecta al yacimiento a ~1.800 psi (motor de 4,16 kV: 45.000 bbl/d × 1.790 psi
        // ≈ 1.370 hhp, ≈ 1.900 hp al eje, ≈ 240 A).
        ...sano('P-201B', 'en marcha', { ...caudalAgua(45000, 50000, 242),
          'PDI-2011': { valor: 1800, estado: 'normal', limite: '1.650 – 1.950',
            serie: [1795, 1802, 1798, 1805, 1799, 1801, 1796, 1803, 1800, 1797, 1802, 1800] },
          'LT-2012': { valor: 42.3, estado: 'normal', serie: [41.8, 42.5, 42.1, 42.9, 42.0, 42.6, 41.9, 42.4, 42.8, 42.2, 42.0, 42.3] } }),
        lectura: 'Inyección para recobro: sus paradas no cierran pozos hoy, por eso no difieren barriles en el período. Hoy está dentro de banda.',
      },
      'V-101': sano('V-101', 'en marcha'),
      'TK-102': sano('TK-102', 'en servicio', nivelTanque(7.8, 7.9)),
      'K-101': sano('K-101', 'en marcha'),
      'SE-2': sano('SE-2', 'en servicio'),
    },
  },

  palmar: {
    equipos: {
      'V-101': {
        ...sano('V-101', 'en marcha'),
        lectura: 'Operación normal. Lo que difirió en el período sale de los eventos de los pozos, cada uno con su causa.',
      },
      'H-302': {
        ...sano('H-302', 'en marcha'),
        lectura: 'Instancia dentro de banda. El respaldo en línea (H-301) tomó la carga durante el último paro, así que la falla no costó barriles de proceso.',
      },
      'TK-102': {
        ...sano('TK-102', 'en servicio', nivelTanque(6.1, 6.2)),
        lectura: 'Nivel holgado. Los dos medidores independientes coinciden dentro de 0,1 pie.',
      },
      'LACT-01': sano('LACT-01', 'despachando', lact(3100)),
      'P-201B': sano('P-201B', 'en marcha', caudalAgua(13180, 16000, 80)),
      'K-101': sano('K-101', 'en marcha'),
      'SE-2': sano('SE-2', 'en servicio'),
    },
  },

  zarza: {
    equipos: {
      'C-401': {
        ...sano('C-401', 'en marcha · restringido por nominación'),
        lectura: 'El compresor está sano. Los barriles equivalentes del período son de restricción comercial: el comprador nominó menos. Se atribuyen a mercado y no a mantenimiento.',
        dispositivos: {
          'PI-4011': { valor: 980, estado: 'normal', serie: [1180, 1162, 1140, 1118, 1095, 1072, 1050, 1031, 1014, 999, 988, 980] },
          'TI-4011': { valor: 86, estado: 'normal', serie: [98, 97, 96, 95, 93, 92, 91, 90, 89, 88, 87, 86] },
        },
      },
      'LACT-01': { ...sano('LACT-01', 'despachando', lact(2900)) },
      'SE-2': { ...sano('SE-2', 'en servicio') },
      'V-101': sano('V-101', 'en marcha'),
      'TK-102': sano('TK-102', 'en servicio', nivelTanque(5.4, 5.5)),
      'P-201B': sano('P-201B', 'en marcha', caudalAgua(1450, 4000, 13.4)),
      'K-101': sano('K-101', 'en marcha'),
    },
  },
}

export type EquipoEnCampo = Equipo & { instrumentado: boolean }

/* Solo claves propias: un id que llega de un enlace («constructor»,
   «__proto__») no puede devolver una función del prototipo. */
const propio = <T,>(o: Record<string, T> | undefined, k: string): T | undefined =>
  o && Object.hasOwn(o, k) ? o[k] : undefined

/** Lo que dice de la redundancia y de lo que hay aguas abajo de una bomba en
 *  su campo, mientras no se lea la configuración firmada: lo pone
 *  `conRespaldoFirmado`. Nunca se supone «sin respaldo». */
const SEGUN_FIRMA = 'según la configuración firmada'

/** Devuelve la instancia del equipo EN ESE CAMPO. Si el campo no la tiene
 *  conectada, vuelve sin dispositivos y marcado como no instrumentado:
 *  nunca con las lecturas de otro campo. El respaldo de una bomba es
 *  configuración firmada: aquí no se lee (ver `conRespaldoFirmado`). */
export const equipoEnCampo = (id: string, campo: string): EquipoEnCampo | undefined => {
  const base = propio(EQUIPOS, id)
  if (!base) return undefined
  if (base.soloEn && !base.soloEn.includes(campo)) return undefined
  const mapa = propio(INSTANCIAS, campo)
  if (mapa?.catalogo) {
    const b = perfilBomba(id, campo)
    return b ? { ...base, instrumentado: true, aguasAbajo: SEGUN_FIRMA, redundancia: SEGUN_FIRMA } : { ...base, instrumentado: true }
  }
  const inst = propio(mapa?.equipos, id)
  // Sin instancia no hay estado que reportar: dejar el del catálogo haría
  // que un campo mostrara «detenido» por una máquina que es de otro campo.
  if (!inst) return {
    ...base, instrumentado: false, severidad: 0, dispositivos: [],
    marcha: 'sin-lectura', estado: 'sin lectura en este campo',
  }
  // De la máquina se hereda lo que es de la máquina: nombre, norma, modo de
  // falla, tags. Lo que se observó en un campo (lectura, ubicación) es de
  // ese campo y no se presta. La historia de fallas sale del PLC.
  const bomba = perfilBomba(id, campo)
  // Una máquina que solo existe en un campo tiene en el catálogo los datos de
  // ESE campo: ahí sí se heredan. Lo que no se presta es lo de otro campo.
  const propioDelCampo = base.soloEn?.includes(campo) ?? false
  return {
    ...base, ...inst, instrumentado: true,
    severidad: inst.severidad ?? base.severidad,
    lectura: inst.lectura ?? (propioDelCampo ? base.lectura : 'Sin lectura declarada en este campo.'),
    intervencion: inst.intervencion ?? (propioDelCampo ? base.intervencion : undefined),
    // En las bombas, el respaldo y lo que hay aguas abajo los dice la
    // configuración firmada (`conRespaldoFirmado`).
    redundancia: bomba ? SEGUN_FIRMA : esBomba(id) ? 'sin declarar en este campo' : inst.redundancia ?? base.redundancia,
    aguasAbajo: bomba ? SEGUN_FIRMA : esBomba(id) ? 'sin declarar en este campo' : inst.aguasAbajo ?? base.aguasAbajo,
    dispositivos: base.dispositivos.map(d => {
      const x = inst.dispositivos?.[d.tag]
      if (!x) return d
      const { serie, ...resto } = x
      return { ...d, ...resto, ...(serie ? { serie: diaria(serie) } : {}) }
    }),
  }
}

/** Redundancia y lo que queda aguas abajo de una bomba, de la configuración
 *  firmada: el mismo respaldo que usan el colchón y la predicción. Sin
 *  respaldo firmado se dice que no está declarado; con capacidad libre cero,
 *  «sin respaldo». */
export function respaldoEnCampo(b: PerfilBomba, config: Config): { redundancia: string; aguasAbajo: string } {
  const r = respaldoDe(config, b.campoId, b.equipo)
  const redundancia = !r ? 'respaldo sin declarar en la configuración' : r.libreBpd > 0 ? r.detalle : 'sin respaldo'
  const aguasAbajo = b.papel === 'transporte' ? `${b.pozos?.length ?? 0} pozos`
    : b.papel === 'recobro' ? 'soporte de presión del yacimiento'
      : !r ? 'sin declarar: falta el respaldo en la configuración'
        : r.libreBpd > 0 ? 'la parte del campo que el respaldo no cubre' : 'todo el campo'
  return { redundancia, aguasAbajo }
}

/** El equipo con el respaldo que firmó el administrador, si es una bomba de
 *  la línea en ese campo. */
export function conRespaldoFirmado<E extends EquipoEnCampo>(eq: E, campo: string, config: Config): E {
  const b = perfilBomba(eq.id, campo)
  return b ? { ...eq, ...respaldoEnCampo(b, config) } : eq
}

export const severidadEnCampo = (id: string, campo: string): Severidad =>
  equipoEnCampo(id, campo)?.severidad ?? 0
