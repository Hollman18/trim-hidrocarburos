/** El catálogo regulatorio de las paradas de pozo: el árbol de 6 pasos de la
 *  Circular ANH 0024 de 2026 (responsable → choke → diferida/pérdida →
 *  planeada → causa N1 → causa N2), con sus códigos y sus dos formas de salida.
 *
 *  Tres reglas lo gobiernan (P1 §1.0 y §1.2):
 *  - CÓDIGO INTERNO ESTABLE. Ningún dato guarda la cadena que viaja a la ANH:
 *    guarda un código (`ClaveN1`, `CodigoN2`, `Responsable`, `ChokeAnh`…). La
 *    cadena sale de la FORMA DE SALIDA de una versión del catálogo.
 *  - DOS VERSIONES OFICIALES QUE SE CONTRADICEN. La Tabla 1 de la circular
 *    (clave en `cau_niv1`, «EXPORTACION» sin tilde, N2 en tipo oración) y el
 *    Diccionario de Datos V3.2 (texto en mayúsculas con tildes y cinco N2
 *    escritos distinto). Por defecto rige la circular, que es el acto
 *    administrativo (R1 A-3); la otra se escoge con una línea firmada de la
 *    configuración (P1 §3.5). Cuál acepta el receptor es NO VERIFICADO.
 *  - EL CÓDIGO DEL N2 ES LA PAREJA. `${N1}/${slug}`, con el slug sacado del N2
 *    de la Tabla 1 por una regla fija, sin tabla a mano (P1 §1.2, Anexo A):
 *    «Falla por falta de Mantenimiento» existe en `NP_ENINT` y en `NP_INS`, y
 *    son dos códigos.
 *
 *  Las cadenas de las fuentes van al principio, byte a byte.
 */
import type { ChokeAnh } from './choke'

/** Paso 2. El componente donde se origina la restricción (C24 p.4). Es el
 *  tipo del motor del choke (`choke.ts`, interfaz compartida de
 *  CHOKE-CONSTRUCCION.md): el árbol no tiene un choke propio. */
export type { ChokeAnh }

/* ───────────────────── las dos fuentes oficiales, byte a byte ─────────────────────

   - La Tabla 1 de la Circular ANH 0024 del 09-09-2026 (C24 p.6-7; transcrita en
     R1 §1.5 y cotejada otra vez contra el PDF el 21-oct-2026). Las cadenas van
     BYTE A BYTE, con sus mayúsculas y sus errores («Perdida Línea de Vista
     (Flora)» sin tilde, «Falla Instrumento/sensor» con I mayúscula): el receptor
     de la ANH compara exacto (C24 p.8) y corregirlas haría rechazar el archivo.
   - El Diccionario de Datos V3.2 (`20260820_Dicionario_de_Datos_JSON_V3.2_ANH.xlsx`,
     hoja JSONV3, celdas G133 y G137 a G141), que escribe todo en mayúsculas y no
     coincide con la circular en cinco N2 (R1 §4.4; P1 §1.2).

   Viven aquí y no en `datos/`: esa carpeta es la de los insumos de
   demostración, que solo carga la costura con import dinámico (insumos.ts;
   verificar-libro lo comprueba) y que el build empaqueta aparte. El catálogo
   es dato regulatorio y lo necesita todo build, también el conectado al
   servidor. Se cambia solo cuando la ANH publica otra versión: una versión
   nueva se agrega, nunca se reescribe una vieja. */

/** La Tabla 1 de la circular, en su orden (C24 p.6-7). `condicion` es la
 *  primera columna («Planeada» / «No Planeada»); `texto` el N1_TEXT; `n2` el
 *  «Catálogo de Causa Nivel 2 (cau_niv2) - Eventos Cerrados», separado por
 *  las comas del original y sin el punto final de cada celda. */
export const TABLA_1 = [
  { clave: 'P_MANT_ELE', condicion: 'Planeada', texto: 'Planeada - Mantenimiento Eléctrico',
    n2: ['Transformador', 'Acometida eléctrica', 'UPS / Fuente', 'Generador', 'Protecciones eléctricas', 'Cableado eléctrico', 'MCC / Switchgear', 'VSD', 'Red interna BT/MT/AT'] },
  { clave: 'P_MANT_MEC', condicion: 'Planeada', texto: 'Planeada - Mantenimiento Mecánico',
    n2: ['Unidad de bombeo superficie', 'Caja reductora', 'Correas / Poleas', 'Bomba (superficie)', 'Compresor', 'Lubricación', 'Sistema de Levantamiento Artificial'] },
  { clave: 'P_MANT_INS', condicion: 'Planeada', texto: 'Planeada - Mantenimiento Instrumentación',
    n2: ['Calibración instrumentos presión', 'Calibración instrumentos nivel', 'Sensores fondo', 'Instrumentación superficie', 'Verificación lazos de control', 'Válvulas de control'] },
  { clave: 'P_MANT_INT', condicion: 'Planeada', texto: 'Planeada - Mantenimiento Integridad',
    n2: ['Inspección líneas internas', 'Inspección válvulas', 'Inspección tubing / casing', 'Cambio de tramo de línea', 'Reparación por corrosión', 'Reemplazo de válvulas'] },
  { clave: 'P_WO', condicion: 'Planeada', texto: 'Planeada - Intervención / Workover',
    n2: ['Workover / recompletación', 'Cambio zona productora', 'Cañoneo / fractura / estimulación', 'Servicio contratado (equipo)'] },
  { clave: 'P_PRUEBAS', condicion: 'Planeada', texto: 'Planeada - Pruebas / Verificaciones',
    n2: ['Prueba de pozo (presión transiente, producción, potencial, PLT, ILT, otros)', 'Prueba de integridad', 'Verificación/calibración (metrología)', 'HAZOP / verificación de seguridad'] },
  { clave: 'P_PES', condicion: 'Planeada', texto: 'Planeada - Puesta en servicio',
    n2: ['Comisionamiento', 'Reintegro tras overhaul', 'Hook-up / puesta en marcha'] },
  { clave: 'P_OP', condicion: 'Planeada', texto: 'Planeada - Operación (curtailment)',
    n2: ['Curtailed por decisión operativa', 'Optimización / ramp-up controlado', 'Operación por balance de inventarios'] },
  { clave: 'NP_CLIMA', condicion: 'No Planeada', texto: 'No planeada - Clima / Natural',
    n2: ['Tormenta eléctrica / descargas', 'Deslizamiento / derrumbe', 'Incendio (natural)', 'Otro evento natural', 'Inundación / Desborde de río', 'Fuertes lluvias / vías intransitables'] },
  { clave: 'NP_OPUB', condicion: 'No Planeada', texto: 'No planeada - Orden público / Seguridad',
    n2: ['Paro gremios / transportadores', 'Grupo armado / amenaza seguridad', 'Hurto', 'Sabotaje / atentado', 'Vandalismo / daño intencional', 'Orden público - Pendiente detalle', 'Bloqueo comunidad / ingreso a locación', 'Bloqueo indígena / ingreso a locación'] },
  { clave: 'NP_ENEXT', condicion: 'No Planeada', texto: 'No planeada - Energía externa',
    n2: ['Corte energía proveedor', 'Baja/alta tensión del proveedor', 'Falla subestación externa', 'Acometida externa afectada (poste/red externa)'] },
  { clave: 'NP_ENINT', condicion: 'No Planeada', texto: 'No planeada - Eléctrica interna',
    n2: ['Falla transformador', 'Falla MCC/Switchgear', 'Falla UPS/Fuente', 'Falla generador local', 'Falla cableado interno/empalmes', 'Falla protecciones (breaker/fusible/relé)', 'Punto Caliente', 'Falla Sistema a Tierra', 'Falla por Fauna', 'Falla por Flora', 'Falla por falta de Mantenimiento', 'Falla VSD', 'Falla red interna BT/MT/AT'] },
  { clave: 'NP_INS', condicion: 'No Planeada', texto: 'No planeada - Instrumentación',
    n2: ['Falla transmisor de presión', 'Falla transmisor de nivel', 'Falla sensor fondo', 'Instrumento fuera de rango', 'Instrumento sin señal', 'Daño por humedad / inundación', 'Daño por tormenta eléctrica', 'Hurto de instrumentación', 'Instrumentación manipulada por terceros', 'Falla por falta de Mantenimiento', 'Error de calibración'] },
  { clave: 'NP_CTRL', condicion: 'No Planeada', texto: 'No planeada - Control / Comunicaciones',
    n2: ['Falla PLC/CPU', 'Falla SCADA/red/comunicaciones', 'Falla HMI/Servidor', 'Falla Instrumento/sensor', 'Perdida Línea de Vista (Flora)', 'Falla configuración/parametrización'] },
  { clave: 'NP_SUB', condicion: 'No Planeada', texto: 'No planeada - Mecánica subsuelo',
    n2: ['Falla ESP', 'Falla PCP', 'Falla Gas Lift', 'Arenamiento / obstrucción', 'Integridad de pozo (packer/tubing/casing)', 'Alto BSW / corte de agua'] },
  { clave: 'NP_SUP', condicion: 'No Planeada', texto: 'No planeada - Mecánica superficie',
    n2: ['Falla unidad de bombeo superficie (Componentes)', 'Falla rodamiento/cojinete (bearing box)', 'Falla caja reductora / lubricación', 'Falla Correas / Poleas', 'Falla motor superficie', 'Falla Sistema de Levantamiento Artificial'] },
  { clave: 'NP_INTEG', condicion: 'No Planeada', texto: 'No planeada - Integridad / Líneas / Válvulas',
    n2: ['Pitting / corrosión', 'Fuga / daño en línea interna', 'Daño válvula/acople/unión', 'Cambio de tramo/valvulería (correctivo)'] },
  { clave: 'NP_PROC', condicion: 'No Planeada', texto: 'No planeada - Proceso / Facilidades',
    n2: ['Tanques llenos / capacidad limitada', 'Capacidad tratamiento agua/crudo limitada', 'Capacidad compresión/transferencia gas limitada', 'Parada estación/bombeo afecta pozos'] },
  { clave: 'NP_TRANSP', condicion: 'No Planeada', texto: 'No planeada - Transporte externo',
    n2: ['Oleoducto externo fuera de servicio', 'Atentado/sabotaje oleoducto externo', 'Restricción nominación/entrega', 'Terminal/cliente no recibe'] },
  { clave: 'NP_AUT', condicion: 'No Planeada', texto: 'No planeada - Autoridad / Restricción',
    n2: ['Restricción autoridad', 'Restricción ambiental', 'Suspensión/orden autoridad'] },
] as const

/** Los nueve responsables del Paso 1, como los escribe la circular (C24 p.5),
 *  en su orden. Es la forma `C024-2026` de `resp_par`: la circular no da otra
 *  (el ejemplo del campo, «"Mantenimiento", "Operación", "Comunidad"», no
 *  cubre los nueve; P1 §1.2, pregunta 3 de §8). */
export const RESPONSABLES_C024 = [
  'Operador-Operación', 'Operador-Mantenimiento', 'Operador-Planeación/Logística',
  'Externo-Proveedor Energía', 'Externo-Transportador', 'Comunidad',
  'Autoridad/Regulador', 'Tercero', 'Fuerza Mayor (Clima/Natural)',
] as const

/** Los valores cerrados de `choke_mod`, `dif_perd` y `pla_no_plan` en la
 *  circular (C24 p.8). «EXPORTACION» va sin tilde: así lo escribe la circular. */
export const VALORES_C024 = {
  choke: ['POZO', 'PLANTA', 'EXPORTACION', 'RESERVORIO'],
  impacto: ['DIFERIDA', 'PERDIDA'],
  planeacion: ['PLANEADA', 'NO PLANEADA'],
} as const

/** Las listas del Diccionario V3.2 (hoja JSONV3), una cadena por renglón de
 *  la celda, en su orden. G138 = `resp_par` («AUTORIDAD / REGULADOR» es UNA
 *  opción aunque lleve « / », R1 §4.3 punto 5); G139 = `choke_mod` (con
 *  «EXPORTACIÓN» con tilde); G137 = `dif_perd`; G133 = `pla_no_plan`; G140 =
 *  `cau_niv1`, que trae el TEXTO en mayúsculas y no la clave (R1 §4.3 punto 3). */
export const LISTAS_DICC_V32 = {
  responsable: ['OPERADOR - OPERACIÓN', 'OPERADOR - MANTENIMIENTO', 'OPERADOR - PLANEACIÓN/LOGÍSTICA', 'EXTERNO - PROVEEDOR ENERGÍA',
    'EXTERNO - TRANSPORTADOR', 'COMUNIDAD', 'AUTORIDAD / REGULADOR', 'TERCERO', 'FUERZA MAYOR (CLIMA/NATURAL)'],
  choke: ['POZO', 'PLANTA', 'EXPORTACIÓN', 'RESERVORIO'],
  impacto: ['DIFERIDA', 'PERDIDA'],
  planeacion: ['PLANEADA', 'NO PLANEADA'],
  n1: ['PLANEADA - MANTENIMIENTO ELÉCTRICO', 'PLANEADA - MANTENIMIENTO MECÁNICO', 'PLANEADA - MANTENIMIENTO INSTRUMENTACIÓN',
    'PLANEADA - MANTENIMIENTO INTEGRIDAD', 'PLANEADA - INTERVENCIÓN / WORKOVER', 'PLANEADA - PRUEBAS / VERIFICACIONES',
    'PLANEADA - PUESTA EN SERVICIO', 'PLANEADA - OPERACIÓN (CURTAILMENT)', 'NO PLANEADA - CLIMA / NATURAL',
    'NO PLANEADA - ORDEN PÚBLICO / SEGURIDAD', 'NO PLANEADA - ENERGÍA EXTERNA', 'NO PLANEADA - ELÉCTRICA INTERNA',
    'NO PLANEADA - INSTRUMENTACIÓN', 'NO PLANEADA - CONTROL / COMUNICACIONES', 'NO PLANEADA - MECÁNICA SUBSUELO',
    'NO PLANEADA - MECÁNICA SUPERFICIE', 'NO PLANEADA - INTEGRIDAD / LÍNEAS / VÁLVULAS', 'NO PLANEADA - PROCESO / FACILIDADES',
    'NO PLANEADA - TRANSPORTE EXTERNO', 'NO PLANEADA - AUTORIDAD / RESTRICCIÓN'],
} as const

/** Los N2 del Diccionario V3.2 (celda G141), agrupados por la N1 de su
 *  renglón y en el orden de la celda (que en `NP_CLIMA` y `NP_OPUB` no es el
 *  de la Tabla 1). Limpios de los artefactos de edición de la celda, decisión
 *  propia (P1 §1.2; NO VERIFICADO que el receptor espere la forma limpia):
 *  «VSD\n- RED…» y «HURTO\n- SABOTAJE…» (un salto de línea en medio del
 *  separador), el «( - » inicial de `NP_OPUB` y `NP_ENINT`, «INCENDIO
 *  (NATURAL)- OTRO…» sin espacio y el doble espacio de «INSTRUMENTO SIN
 *  SEÑAL  -». Las cinco cadenas que el Diccionario escribe distinto de la
 *  circular quedan como él las escribe: «PRUEBA DE POZO (POTENCIAL/PLT)»,
 *  «OPERACIÓN POR BALANCE DE INVENTARIOS (PLANIFICADO)», «FALLA
 *  CONFIGURACIÓN/PARAMETRIZACIÓN (PLC/VSD/CONTROL)», «PERDIDA LINEA DE VISTA
 *  (FLORA)» (sin tilde en LINEA) y «FALLA INSTRUMENTO/SENSOR», que en el
 *  Diccionario está en `NP_INS` y no en `NP_CTRL` (R1 §4.4). */
export const N2_DICC_V32 = {
  P_MANT_ELE: ['TRANSFORMADOR', 'ACOMETIDA ELÉCTRICA', 'UPS / FUENTE', 'GENERADOR', 'PROTECCIONES ELÉCTRICAS', 'CABLEADO ELÉCTRICO', 'MCC / SWITCHGEAR', 'VSD', 'RED INTERNA BT/MT/AT'],
  P_MANT_MEC: ['UNIDAD DE BOMBEO SUPERFICIE', 'CAJA REDUCTORA', 'CORREAS / POLEAS', 'BOMBA (SUPERFICIE)', 'COMPRESOR', 'LUBRICACIÓN', 'SISTEMA DE LEVANTAMIENTO ARTIFICIAL'],
  P_MANT_INS: ['CALIBRACIÓN INSTRUMENTOS PRESIÓN', 'CALIBRACIÓN INSTRUMENTOS NIVEL', 'SENSORES FONDO', 'INSTRUMENTACIÓN SUPERFICIE', 'VERIFICACIÓN LAZOS DE CONTROL', 'VÁLVULAS DE CONTROL'],
  P_MANT_INT: ['INSPECCIÓN LÍNEAS INTERNAS', 'INSPECCIÓN VÁLVULAS', 'INSPECCIÓN TUBING / CASING', 'CAMBIO DE TRAMO DE LÍNEA', 'REPARACIÓN POR CORROSIÓN', 'REEMPLAZO DE VÁLVULAS'],
  P_WO: ['WORKOVER / RECOMPLETACIÓN', 'CAMBIO ZONA PRODUCTORA', 'CAÑONEO / FRACTURA / ESTIMULACIÓN', 'SERVICIO CONTRATADO (EQUIPO)'],
  P_PRUEBAS: ['PRUEBA DE POZO (POTENCIAL/PLT)', 'PRUEBA DE INTEGRIDAD', 'VERIFICACIÓN/CALIBRACIÓN (METROLOGÍA)', 'HAZOP / VERIFICACIÓN DE SEGURIDAD'],
  P_PES: ['COMISIONAMIENTO', 'REINTEGRO TRAS OVERHAUL', 'HOOK-UP / PUESTA EN MARCHA'],
  P_OP: ['CURTAILED POR DECISIÓN OPERATIVA', 'OPTIMIZACIÓN / RAMP-UP CONTROLADO', 'OPERACIÓN POR BALANCE DE INVENTARIOS (PLANIFICADO)'],
  NP_CLIMA: ['INUNDACIÓN / DESBORDE DE RÍO', 'FUERTES LLUVIAS / VÍAS INTRANSITABLES', 'TORMENTA ELÉCTRICA / DESCARGAS', 'DESLIZAMIENTO / DERRUMBE', 'INCENDIO (NATURAL)', 'OTRO EVENTO NATURAL'],
  NP_OPUB: ['BLOQUEO COMUNIDAD / INGRESO A LOCACIÓN', 'BLOQUEO INDÍGENA / INGRESO A LOCACIÓN', 'PARO GREMIOS / TRANSPORTADORES', 'GRUPO ARMADO / AMENAZA SEGURIDAD', 'HURTO', 'SABOTAJE / ATENTADO', 'VANDALISMO / DAÑO INTENCIONAL', 'ORDEN PÚBLICO - PENDIENTE DETALLE'],
  NP_ENEXT: ['CORTE ENERGÍA PROVEEDOR', 'BAJA/ALTA TENSIÓN DEL PROVEEDOR', 'FALLA SUBESTACIÓN EXTERNA', 'ACOMETIDA EXTERNA AFECTADA (POSTE/RED EXTERNA)'],
  NP_ENINT: ['FALLA TRANSFORMADOR', 'FALLA MCC/SWITCHGEAR', 'FALLA UPS/FUENTE', 'FALLA GENERADOR LOCAL', 'FALLA CABLEADO INTERNO/EMPALMES', 'FALLA PROTECCIONES (BREAKER/FUSIBLE/RELÉ)', 'PUNTO CALIENTE', 'FALLA SISTEMA A TIERRA', 'FALLA POR FAUNA', 'FALLA POR FLORA', 'FALLA POR FALTA DE MANTENIMIENTO', 'FALLA VSD', 'FALLA RED INTERNA BT/MT/AT'],
  NP_INS: ['FALLA TRANSMISOR DE PRESIÓN', 'FALLA TRANSMISOR DE NIVEL', 'FALLA SENSOR FONDO', 'INSTRUMENTO FUERA DE RANGO', 'INSTRUMENTO SIN SEÑAL', 'DAÑO POR HUMEDAD / INUNDACIÓN', 'DAÑO POR TORMENTA ELÉCTRICA', 'HURTO DE INSTRUMENTACIÓN', 'INSTRUMENTACIÓN MANIPULADA POR TERCEROS', 'FALLA POR FALTA DE MANTENIMIENTO', 'ERROR DE CALIBRACIÓN', 'FALLA INSTRUMENTO/SENSOR'],
  NP_CTRL: ['FALLA PLC/CPU', 'FALLA SCADA/RED/COMUNICACIONES', 'FALLA HMI/SERVIDOR', 'PERDIDA LINEA DE VISTA (FLORA)', 'FALLA CONFIGURACIÓN/PARAMETRIZACIÓN (PLC/VSD/CONTROL)'],
  NP_SUB: ['FALLA ESP', 'FALLA PCP', 'FALLA GAS LIFT', 'ARENAMIENTO / OBSTRUCCIÓN', 'INTEGRIDAD DE POZO (PACKER/TUBING/CASING)', 'ALTO BSW / CORTE DE AGUA'],
  NP_SUP: ['FALLA UNIDAD DE BOMBEO SUPERFICIE (COMPONENTES)', 'FALLA RODAMIENTO/COJINETE (BEARING BOX)', 'FALLA CAJA REDUCTORA / LUBRICACIÓN', 'FALLA CORREAS / POLEAS', 'FALLA MOTOR SUPERFICIE', 'FALLA SISTEMA DE LEVANTAMIENTO ARTIFICIAL'],
  NP_INTEG: ['PITTING / CORROSIÓN', 'FUGA / DAÑO EN LÍNEA INTERNA', 'DAÑO VÁLVULA/ACOPLE/UNIÓN', 'CAMBIO DE TRAMO/VALVULERÍA (CORRECTIVO)'],
  NP_PROC: ['TANQUES LLENOS / CAPACIDAD LIMITADA', 'CAPACIDAD TRATAMIENTO AGUA/CRUDO LIMITADA', 'CAPACIDAD COMPRESIÓN/TRANSFERENCIA GAS LIMITADA', 'PARADA ESTACIÓN/BOMBEO AFECTA POZOS'],
  NP_TRANSP: ['OLEODUCTO EXTERNO FUERA DE SERVICIO', 'ATENTADO/SABOTAJE OLEODUCTO EXTERNO', 'RESTRICCIÓN NOMINACIÓN/ENTREGA', 'TERMINAL/CLIENTE NO RECIBE'],
  NP_AUT: ['RESTRICCIÓN AUTORIDAD', 'RESTRICCIÓN AMBIENTAL', 'SUSPENSIÓN/ORDEN AUTORIDAD'],
} as const

/** La celda G141 del Diccionario V3.2 tal cual, con sus saltos de línea y
 *  sus espacios: la evidencia contra la que `verificar-arbol` comprueba que
 *  `N2_DICC_V32` solo limpió los artefactos y no cambió ninguna causa. */
export const CELDA_G141_DICC_V32 = 'PLANEADA - MANTENIMIENTO ELÉCTRICO ( TRANSFORMADOR -  ACOMETIDA ELÉCTRICA - UPS / FUENTE - GENERADOR - PROTECCIONES ELÉCTRICAS - CABLEADO ELÉCTRICO - MCC / SWITCHGEAR - VSD\n- RED INTERNA BT/MT/AT )\nPLANEADA - MANTENIMIENTO MECÁNICO (UNIDAD DE BOMBEO SUPERFICIE - CAJA REDUCTORA - CORREAS / POLEAS - BOMBA (SUPERFICIE) - COMPRESOR - LUBRICACIÓN - SISTEMA DE LEVANTAMIENTO ARTIFICIAL )\nPLANEADA - MANTENIMIENTO INSTRUMENTACIÓN ( CALIBRACIÓN INSTRUMENTOS PRESIÓN - CALIBRACIÓN INSTRUMENTOS NIVEL - SENSORES FONDO - INSTRUMENTACIÓN SUPERFICIE - VERIFICACIÓN LAZOS DE CONTROL - VÁLVULAS DE CONTROL) \nPLANEADA - MANTENIMIENTO INTEGRIDAD ( INSPECCIÓN LÍNEAS INTERNAS - INSPECCIÓN VÁLVULAS - INSPECCIÓN TUBING / CASING - CAMBIO DE TRAMO DE LÍNEA - REPARACIÓN POR CORROSIÓN - REEMPLAZO DE VÁLVULAS)\nPLANEADA - INTERVENCIÓN / WORKOVER ( WORKOVER / RECOMPLETACIÓN - CAMBIO ZONA PRODUCTORA - CAÑONEO / FRACTURA / ESTIMULACIÓN - SERVICIO CONTRATADO (EQUIPO) )\nPLANEADA - PRUEBAS / VERIFICACIONES ( PRUEBA DE POZO (POTENCIAL/PLT) - PRUEBA DE INTEGRIDAD - VERIFICACIÓN/CALIBRACIÓN (METROLOGÍA) - HAZOP / VERIFICACIÓN DE SEGURIDAD)\nPLANEADA - PUESTA EN SERVICIO (COMISIONAMIENTO - REINTEGRO TRAS OVERHAUL - HOOK-UP / PUESTA EN MARCHA)\nPLANEADA - OPERACIÓN (CURTAILMENT)  (CURTAILED POR DECISIÓN OPERATIVA - OPTIMIZACIÓN / RAMP-UP CONTROLADO - OPERACIÓN POR BALANCE DE INVENTARIOS (PLANIFICADO))\nNO PLANEADA - CLIMA / NATURAL (INUNDACIÓN / DESBORDE DE RÍO - FUERTES LLUVIAS / VÍAS INTRANSITABLES - TORMENTA ELÉCTRICA / DESCARGAS - DESLIZAMIENTO / DERRUMBE - INCENDIO (NATURAL)- OTRO EVENTO NATURAL)\nNO PLANEADA - ORDEN PÚBLICO / SEGURIDAD ( - BLOQUEO COMUNIDAD / INGRESO A LOCACIÓN - BLOQUEO INDÍGENA / INGRESO A LOCACIÓN - PARO GREMIOS / TRANSPORTADORES - GRUPO ARMADO / AMENAZA SEGURIDAD - HURTO\n- SABOTAJE / ATENTADO - VANDALISMO / DAÑO INTENCIONAL - ORDEN PÚBLICO - PENDIENTE DETALLE) \nNO PLANEADA - ENERGÍA EXTERNA ( CORTE ENERGÍA PROVEEDOR - BAJA/ALTA TENSIÓN DEL PROVEEDOR - FALLA SUBESTACIÓN EXTERNA - ACOMETIDA EXTERNA AFECTADA (POSTE/RED EXTERNA))\nNO PLANEADA - ELÉCTRICA INTERNA ( - FALLA TRANSFORMADOR - FALLA MCC/SWITCHGEAR - FALLA UPS/FUENTE - FALLA GENERADOR LOCAL - FALLA CABLEADO INTERNO/EMPALMES - FALLA PROTECCIONES (BREAKER/FUSIBLE/RELÉ) - PUNTO CALIENTE - FALLA SISTEMA A TIERRA - FALLA POR FAUNA - FALLA POR FLORA - FALLA POR FALTA DE MANTENIMIENTO - FALLA VSD - FALLA RED INTERNA BT/MT/AT )\nNO PLANEADA - INSTRUMENTACIÓN ( FALLA TRANSMISOR DE PRESIÓN - FALLA TRANSMISOR DE NIVEL - FALLA SENSOR FONDO - INSTRUMENTO FUERA DE RANGO - INSTRUMENTO SIN SEÑAL  - DAÑO POR HUMEDAD / INUNDACIÓN - DAÑO POR TORMENTA ELÉCTRICA - HURTO DE INSTRUMENTACIÓN - INSTRUMENTACIÓN MANIPULADA POR TERCEROS - FALLA POR FALTA DE MANTENIMIENTO - ERROR DE CALIBRACIÓN - FALLA INSTRUMENTO/SENSOR)\nNO PLANEADA - CONTROL / COMUNICACIONES ( FALLA PLC/CPU - FALLA SCADA/RED/COMUNICACIONES - FALLA HMI/SERVIDOR - PERDIDA LINEA DE VISTA (FLORA) - FALLA CONFIGURACIÓN/PARAMETRIZACIÓN (PLC/VSD/CONTROL) )\nNO PLANEADA - MECÁNICA SUBSUELO ( FALLA ESP - FALLA PCP - FALLA GAS LIFT - ARENAMIENTO / OBSTRUCCIÓN - INTEGRIDAD DE POZO (PACKER/TUBING/CASING) - ALTO BSW / CORTE DE AGUA)\nNO PLANEADA - MECÁNICA SUPERFICIE (FALLA UNIDAD DE BOMBEO SUPERFICIE (COMPONENTES) - FALLA RODAMIENTO/COJINETE (BEARING BOX) - FALLA CAJA REDUCTORA / LUBRICACIÓN - FALLA CORREAS / POLEAS - FALLA MOTOR SUPERFICIE - FALLA SISTEMA DE LEVANTAMIENTO ARTIFICIAL)\nNO PLANEADA - INTEGRIDAD / LÍNEAS / VÁLVULAS ( PITTING / CORROSIÓN - FUGA / DAÑO EN LÍNEA INTERNA - DAÑO VÁLVULA/ACOPLE/UNIÓN - CAMBIO DE TRAMO/VALVULERÍA (CORRECTIVO))\nNO PLANEADA - PROCESO / FACILIDADES (TANQUES LLENOS / CAPACIDAD LIMITADA - CAPACIDAD TRATAMIENTO AGUA/CRUDO LIMITADA - CAPACIDAD COMPRESIÓN/TRANSFERENCIA GAS LIMITADA - PARADA ESTACIÓN/BOMBEO AFECTA POZOS)\nNO PLANEADA - TRANSPORTE EXTERNO ( OLEODUCTO EXTERNO FUERA DE SERVICIO - ATENTADO/SABOTAJE OLEODUCTO EXTERNO - RESTRICCIÓN NOMINACIÓN/ENTREGA - TERMINAL/CLIENTE NO RECIBE)\nNO PLANEADA - AUTORIDAD / RESTRICCIÓN ( RESTRICCIÓN AUTORIDAD - RESTRICCIÓN AMBIENTAL - SUSPENSIÓN/ORDEN AUTORIDAD)'

/** Las 18 causas de paro de la Res. ANH 0651/2025, art. 15.1, parágrafo 2,
 *  literales y en su orden (R1 §3.1). Son lo único que existe para llenar
 *  `cau_gral_paro`, que ningún artefacto de la circular define (C24 p.8;
 *  Dicc. 136 «No aplica»): provisional hasta la pregunta 9 de P1 §8. */
export const CAUSAS_GENERALES_0651 = [
  'abandono', 'alto S&W', 'eléctrico', 'emergencia sanitaria', 'ambiental', 'facilidades', 'ingeniería',
  'bajo potencial', 'mantenimiento', 'mecánico', 'precio del crudo', 'orden público', 'cerrado temporalmente',
  'bombeo/transporte', 'pruebas suspendidas', 'climático', 'toma de registros/PBU', 'servicio a pozo',
] as const

/* ─────────────────────────────── versiones ─────────────────────────────── */

/** Las versiones del catálogo que se conocen. Se agregan, nunca se borran. */
export type IdVersionCatalogo = 'C024-2026' | 'DICC-V3.2'

/** La que rige si la operadora no escoge otra: la circular, que es el acto
 *  administrativo firmado (R1 A-3; P1 §3.5). */
export const VERSION_POR_DEFECTO: IdVersionCatalogo = 'C024-2026'

/* ───────────────────────────── los seis pasos ───────────────────────────── */

/** Los seis pasos, en el orden de la circular (C24 p.5): así se leen y así se confirman. */
export type PasoAnh = 'responsable' | 'choke' | 'impacto' | 'planeacion' | 'n1' | 'n2'
export const PASOS: readonly PasoAnh[] = ['responsable', 'choke', 'impacto', 'planeacion', 'n1', 'n2']

/** El nombre de cada paso en la circular (C24 p.5): va en el ⓘ de la pantalla (U1 §2.1). */
export const PASO_CIRCULAR: Record<PasoAnh, string> = {
  responsable: 'Paso 1: Identificación del responsable del evento',
  choke: 'Paso 2: Localización del Componente (Choke)',
  impacto: 'Paso 3: Definición del impacto en producción',
  planeacion: 'Paso 4: Condición de Planeación',
  n1: 'Paso 5: Selección de Causa - Nivel 1',
  n2: 'Paso 6: Selección de Causa - Nivel 2',
}

/** El rótulo de cada paso en palabras de campo (U1 §2.1): la pantalla no dice «choke». */
export const PASO_CAMPO: Record<PasoAnh, string> = {
  responsable: 'Quién', choke: 'Dónde se trabó', impacto: 'Qué pasó', planeacion: '¿Planeada?', n1: 'Causa', n2: 'Detalle',
}

/** Paso 1. Los nueve responsables de la circular (C24 p.5), en su orden. */
export type Responsable =
  | 'op-operacion' | 'op-mantenimiento' | 'op-planeacion' | 'ext-energia' | 'ext-transportador'
  | 'comunidad' | 'autoridad' | 'tercero' | 'fuerza-mayor'
export const RESPONSABLES: readonly Responsable[] = [
  'op-operacion', 'op-mantenimiento', 'op-planeacion', 'ext-energia', 'ext-transportador',
  'comunidad', 'autoridad', 'tercero', 'fuerza-mayor',
]

/** Los cuatro chokes en el orden de la circular: Pozo, Planta, Exportación o Reservorio (C24 p.5). */
export const CHOKES: readonly ChokeAnh[] = ['pozo', 'planta', 'exportacion', 'reservorio']

/** Paso 3. «Diferida de Producción o Pérdida de Producción» (C24 p.5). */
export type Impacto = 'diferida' | 'perdida'
export const IMPACTOS: readonly Impacto[] = ['diferida', 'perdida']

/** Paso 4. «Planeada» o «No Planeada» (C24 p.5). */
export type Planeacion = 'planeada' | 'no-planeada'
export const PLANEACIONES: readonly Planeacion[] = ['planeada', 'no-planeada']

/** Paso 5. Las 20 N1_KEY de la Tabla 1, tal cual: son códigos del acto
 *  administrativo, no textos de pantalla (P1 §1.2). Salen de los datos para
 *  que el tipo y la tabla no puedan decir cosas distintas. */
type FilaTabla1 = (typeof TABLA_1)[number]
export type ClaveN1 = FilaTabla1['clave']
export type ClaveN1Planeada = Extract<FilaTabla1, { condicion: 'Planeada' }>['clave']
export type ClaveN1NoPlaneada = Extract<FilaTabla1, { condicion: 'No Planeada' }>['clave']

/** Paso 6. El código interno de una causa N2: la PAREJA `${N1}/${slug}`. El
 *  tipo asegura el prefijo; que el slug exista en la versión lo comprueba
 *  `esCodigoN2` (y `verificar-arbol`, contra los 117 del Anexo A de P1). */
export type CodigoN2 = `${ClaveN1}/${string}`
/** Un código N2 de una N1 dada: lo que ata el paso 6 al 5 en el tipo. */
export type CodigoN2De<K extends ClaveN1> = `${K}/${string}`

/** Las 18 causas de paro de la Res. 0651 art. 15.1 par. 2, para
 *  `cau_gral_paro` (provisional, P1 §1.2b): códigos en el orden de la resolución. */
export type CausaGeneral =
  | 'abandono' | 'alto-sw' | 'electrico' | 'emergencia-sanitaria' | 'ambiental' | 'facilidades' | 'ingenieria'
  | 'bajo-potencial' | 'mantenimiento' | 'mecanico' | 'precio-crudo' | 'orden-publico' | 'cerrado-temporalmente'
  | 'bombeo-transporte' | 'pruebas-suspendidas' | 'climatico' | 'registros-pbu' | 'servicio-pozo'
export const CAUSAS_GENERALES: readonly CausaGeneral[] = [
  'abandono', 'alto-sw', 'electrico', 'emergencia-sanitaria', 'ambiental', 'facilidades', 'ingenieria',
  'bajo-potencial', 'mantenimiento', 'mecanico', 'precio-crudo', 'orden-publico', 'cerrado-temporalmente',
  'bombeo-transporte', 'pruebas-suspendidas', 'climatico', 'registros-pbu', 'servicio-pozo',
]

/** La segunda posición de cada tupla del JSON: «A» automático, «M» manual,
 *  «C» calculado (C24 p.2). Sale de la procedencia del dato (P1 §1.3). */
export type OrigenAnh = 'A' | 'M' | 'C'

/** Los 15 campos de `paradas_pozo`, en el orden del Schema (R1 §4.3). */
export type CampoParada = 'n_pozo' | 'id_rec' | 'uwi' | 'form' | 'campo' | 'pla_no_plan' | 'h_ini_paro' | 'h_fin_paro'
  | 'cau_gral_paro' | 'dif_perd' | 'resp_par' | 'choke_mod' | 'cau_niv1' | 'cau_niv2' | 'desc_evid'
export const CAMPOS_PARADA: readonly CampoParada[] = ['n_pozo', 'id_rec', 'uwi', 'form', 'campo', 'pla_no_plan', 'h_ini_paro',
  'h_fin_paro', 'cau_gral_paro', 'dif_perd', 'resp_par', 'choke_mod', 'cau_niv1', 'cau_niv2', 'desc_evid']

/* ────────────────────────── etiquetas de pantalla ────────────────────────── */

/** Cómo se dice cada valor en pantalla (P1 §1.2, columna «Etiqueta de
 *  pantalla»; U1 §2 las usa). No es lo que viaja a la ANH: eso es la forma. */
export const ETIQUETA_RESPONSABLE: Record<Responsable, string> = {
  'op-operacion': 'Operador · Operación', 'op-mantenimiento': 'Operador · Mantenimiento',
  'op-planeacion': 'Operador · Planeación/Logística', 'ext-energia': 'Externo · Proveedor de energía',
  'ext-transportador': 'Externo · Transportador', comunidad: 'Comunidad', autoridad: 'Autoridad / Regulador',
  tercero: 'Tercero', 'fuerza-mayor': 'Fuerza mayor (clima/natural)',
}
export const ETIQUETA_CHOKE: Record<ChokeAnh, string> = {
  pozo: 'Pozo', planta: 'Planta', exportacion: 'Exportación (evacuación)', reservorio: 'Reservorio',
}
export const ETIQUETA_IMPACTO: Record<Impacto, string> = { diferida: 'Diferida', perdida: 'Pérdida' }
export const ETIQUETA_PLANEACION: Record<Planeacion, string> = { planeada: 'Planeada', 'no-planeada': 'No planeada' }

/* ─────────────────────────── la regla del slug ─────────────────────────── */

/** El slug de un N2 (P1 §1.2, versión del 21-oct 12:45): el texto de la Tabla
 *  1 en minúsculas, sin diacríticos (la ñ pasa a n), con CADA RACHA de
 *  caracteres que no son letra ni número cambiada por UN solo «-», y sin «-»
 *  en los extremos. Es una regla fija: el código no depende de una tabla escrita a mano. */
export function slugN2(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/* ─────────────────────── el árbol de la circular ─────────────────────── */

export interface N1Catalogo {
  clave: ClaveN1
  /** La condición de la primera columna de la Tabla 1. */
  planeacion: Planeacion
  /** El N1_TEXT de la Tabla 1. */
  texto: string
  /** Sus N2, en el orden de la Tabla 1. */
  n2: readonly CodigoN2[]
}

export interface N2Catalogo {
  codigo: CodigoN2
  n1: ClaveN1
  /** La cadena de la Tabla 1, byte a byte: la etiqueta de pantalla y lo que
   *  viaja en `cau_niv2` con la forma `C024-2026`. */
  texto: string
}

/** Las 20 N1 de la circular, en el orden de la Tabla 1. */
export const N1_CIRCULAR: readonly N1Catalogo[] = TABLA_1.map(f => ({
  clave: f.clave,
  planeacion: f.condicion === 'Planeada' ? 'planeada' : 'no-planeada',
  texto: f.texto,
  n2: f.n2.map(t => `${f.clave}/${slugN2(t)}` as const),
}))

/** Los 117 N2 de la circular (C24 p.6-7), con su código y su texto. */
export const N2_CIRCULAR: readonly N2Catalogo[] = TABLA_1.flatMap(f =>
  f.n2.map((t): N2Catalogo => ({ codigo: `${f.clave}/${slugN2(t)}` as const, n1: f.clave, texto: t })))

/** Arma un registro con una entrada por cada clave de una lista cerrada. */
function porClave<K extends string, V>(claves: readonly K[], valor: (k: K) => V): Record<K, V> {
  // Un solo cruce de tipo: Object.fromEntries devuelve claves `string`, y aquí
  // las claves son exactamente las de la lista.
  return Object.fromEntries(claves.map(k => [k, valor(k)])) as Record<K, V>
}

export const CLAVES_N1: readonly ClaveN1[] = N1_CIRCULAR.map(n => n.clave)
const N1_POR_CLAVE = new Map(N1_CIRCULAR.map(n => [n.clave, n]))
const N2_POR_CODIGO = new Map(N2_CIRCULAR.map(n => [n.codigo, n]))

/** ¿Es una de las 20 N1_KEY? (un texto que llega de afuera, del contrato o de un enlace). */
export const esClaveN1 = (x: string): x is ClaveN1 => N1_POR_CLAVE.has(x as ClaveN1)
/** La planeación que exige una N1: la de su fila de la Tabla 1. El prefijo
 *  `P_`/`NP_` dice lo mismo, y `verificar-arbol` lo comprueba. */
export const planeacionDeN1 = (n1: ClaveN1): Planeacion => N1_POR_CLAVE.get(n1)!.planeacion
export const esN1Planeada = (n1: ClaveN1): n1 is ClaveN1Planeada => planeacionDeN1(n1) === 'planeada'
export const esN1NoPlaneada = (n1: ClaveN1): n1 is ClaveN1NoPlaneada => planeacionDeN1(n1) === 'no-planeada'
/** Las N1 que admite una planeación: el paso 4 filtra el paso 5 (U1 §2.5). */
export const n1DePlaneacion = (p: Planeacion): ClaveN1[] => N1_CIRCULAR.filter(n => n.planeacion === p).map(n => n.clave)
/** El N1_TEXT de la Tabla 1 (la etiqueta de pantalla del paso 5). */
export const textoN1 = (n1: ClaveN1): string => N1_POR_CLAVE.get(n1)!.texto

/** La N1 de un código N2: lo que va antes de la barra. */
export function n1DeCodigo(codigo: CodigoN2): ClaveN1 {
  const k = codigo.slice(0, codigo.indexOf('/'))
  if (!esClaveN1(k)) throw new Error(`«${codigo}» no empieza por una de las 20 claves de la circular.`)
  return k
}

/* ─────────────────────── equivalencias entre versiones ─────────────────────── */

/** Las parejas que cambian de N1 entre versiones. Se resuelven aquí, con una
 *  tabla, y NUNCA reescribiendo lo guardado (P1 §1.2): «Falla Instrumento/sensor»
 *  es `NP_CTRL` en la circular y `NP_INS` en el Diccionario (R1 §4.4). */
export const EQUIVALENCIA_VERSIONES: ReadonlyArray<Readonly<Record<IdVersionCatalogo, CodigoN2>>> = [
  { 'C024-2026': 'NP_CTRL/falla-instrumento-sensor', 'DICC-V3.2': 'NP_INS/falla-instrumento-sensor' },
]

/** El código de la otra versión para una pareja guardada con cualquiera de
 *  las dos. Si la pareja es la misma en las dos, el mismo código. */
export function equivalente(codigo: CodigoN2, hacia: IdVersionCatalogo): CodigoN2 {
  const e = EQUIVALENCIA_VERSIONES.find(x => Object.values(x).includes(codigo))
  return e ? e[hacia] : codigo
}

/* ────────────────────────── las formas de salida ────────────────────────── */

/** Cómo se escribe cada valor en el JSON de una versión (P1 §1.2). */
export interface FormaSalidaAnh {
  /** `C024-2026`: la clave (`P_MANT_ELE`); `DICC-V3.2`: el texto en mayúsculas. */
  cauNiv1: 'clave' | 'texto'
  responsable: Record<Responsable, string>
  choke: Record<ChokeAnh, string>
  impacto: Record<Impacto, string>
  planeacion: Record<Planeacion, string>
  /** Se usa si `cauNiv1` es 'texto'. */
  n1Texto: Record<ClaveN1, string>
  /** Por código de ESTA versión. */
  n2: Readonly<Record<CodigoN2, string>>
  /** Lo que viaja en `cau_gral_paro` (provisional, P1 §1.2b). */
  cauGral: Record<CausaGeneral, string>
  /** La tercera posición de la tupla, copiada de la plantilla V3.1 y del
   *  Diccionario (filas 128-142): «string», e «ISO 8601 DateTime» en las horas. */
  unidad: Record<CampoParada, string>
  /** Lo que tocó una persona. */
  origenConfirmado: 'M'
  /** Lo deducido que nadie confirmó (provisional: 'C'; con 'M' si la ANH
   *  rechaza «C» en estos campos, sin tocar datos; P1 §3.7). */
  origenDeducido: 'C' | 'M'
}

export interface VersionCatalogoAnh {
  id: IdVersionCatalogo
  nombre: string
  fuente: string
  /** Día (hora de Colombia) desde el que la versión existe. */
  vigenteDesde: string
  vigenteHasta: string | null
  /** Las 20 N1 de la versión, con sus N2 (códigos de ESTA versión), en el orden del documento. */
  arbol: readonly N1Catalogo[]
  /** Las parejas válidas, en el orden del documento. */
  parejas: readonly CodigoN2[]
  forma: FormaSalidaAnh
}

const UNIDAD: Record<CampoParada, string> = porClave(CAMPOS_PARADA, c => (c === 'h_ini_paro' || c === 'h_fin_paro' ? 'ISO 8601 DateTime' : 'string'))

/** Las cadenas de la circular: el Paso 1 para el responsable (C24 p.5), los
 *  valores cerrados de C24 p.8, la clave en `cau_niv1` y la Tabla 1 tal cual en `cau_niv2`. */
const FORMA_C024: FormaSalidaAnh = {
  cauNiv1: 'clave',
  responsable: porClave(RESPONSABLES, r => RESPONSABLES_C024[RESPONSABLES.indexOf(r)]!),
  choke: porClave(CHOKES, c => VALORES_C024.choke[CHOKES.indexOf(c)]!),
  impacto: porClave(IMPACTOS, i => VALORES_C024.impacto[IMPACTOS.indexOf(i)]!),
  planeacion: porClave(PLANEACIONES, p => VALORES_C024.planeacion[PLANEACIONES.indexOf(p)]!),
  n1Texto: porClave(CLAVES_N1, textoN1),
  n2: Object.fromEntries(N2_CIRCULAR.map(n => [n.codigo, n.texto])),
  // El texto literal de la resolución, como lo escribe (R1 §3.1): ningún
  // artefacto de la circular dice otra cosa (P1 §1.2b, pregunta 9).
  cauGral: porClave(CAUSAS_GENERALES, g => CAUSAS_GENERALES_0651[CAUSAS_GENERALES.indexOf(g)]!),
  unidad: UNIDAD,
  origenConfirmado: 'M',
  origenDeducido: 'C',
}

/** Los N2 que el Diccionario escribe distinto de la circular sin cambiarlos
 *  de N1 (R1 §4.4; S1 §1.1 fila 12). El que cambia de N1 va por
 *  `EQUIVALENCIA_VERSIONES`. Los demás son la cadena de la circular en
 *  mayúsculas, y `verificar-arbol` comprueba los 117 contra la celda G141. */
const DICC_ESCRIBE_DISTINTO: Readonly<Record<CodigoN2, string>> = {
  'P_PRUEBAS/prueba-de-pozo-presion-transiente-produccion-potencial-plt-ilt-otros': 'PRUEBA DE POZO (POTENCIAL/PLT)',
  'P_OP/operacion-por-balance-de-inventarios': 'OPERACIÓN POR BALANCE DE INVENTARIOS (PLANIFICADO)',
  'NP_CTRL/falla-configuracion-parametrizacion': 'FALLA CONFIGURACIÓN/PARAMETRIZACIÓN (PLC/VSD/CONTROL)',
  'NP_CTRL/perdida-linea-de-vista-flora': 'PERDIDA LINEA DE VISTA (FLORA)',
}

/** La cadena del Diccionario para un N2 de la circular. */
const textoDicc = (n: N2Catalogo): string => DICC_ESCRIBE_DISTINTO[equivalente(n.codigo, 'DICC-V3.2')] ?? n.texto.toUpperCase()

/** El árbol del Diccionario: el de la circular con la pareja que se mudó de
 *  N1 puesta en su N1 nueva, y cada N1 en el orden de la celda G141 (en
 *  `NP_CLIMA` y `NP_OPUB` no es el de la Tabla 1, R1 §2.2). */
const ARBOL_DICC: readonly N1Catalogo[] = N1_CIRCULAR.map(n => {
  const orden: readonly string[] = N2_DICC_V32[n.clave]
  const suyos = N2_CIRCULAR.filter(x => n1DeCodigo(equivalente(x.codigo, 'DICC-V3.2')) === n.clave)
    .sort((a, b) => orden.indexOf(textoDicc(a)) - orden.indexOf(textoDicc(b)))
  return { ...n, n2: suyos.map(x => equivalente(x.codigo, 'DICC-V3.2')) }
})

const FORMA_DICC: FormaSalidaAnh = {
  cauNiv1: 'texto',
  responsable: porClave(RESPONSABLES, r => LISTAS_DICC_V32.responsable[RESPONSABLES.indexOf(r)]!),
  choke: porClave(CHOKES, c => LISTAS_DICC_V32.choke[CHOKES.indexOf(c)]!),
  impacto: porClave(IMPACTOS, i => LISTAS_DICC_V32.impacto[IMPACTOS.indexOf(i)]!),
  planeacion: porClave(PLANEACIONES, p => LISTAS_DICC_V32.planeacion[PLANEACIONES.indexOf(p)]!),
  n1Texto: porClave(CLAVES_N1, k => LISTAS_DICC_V32.n1[CLAVES_N1.indexOf(k)]!),
  n2: Object.fromEntries(N2_CIRCULAR.map(n => [equivalente(n.codigo, 'DICC-V3.2'), textoDicc(n)])),
  // El Diccionario escribe en mayúsculas todas sus listas; para esta, que no
  // trae (Dicc. 136 «No aplica»), se sigue esa costumbre. NO VERIFICADO.
  cauGral: porClave(CAUSAS_GENERALES, g => CAUSAS_GENERALES_0651[CAUSAS_GENERALES.indexOf(g)]!.toUpperCase()),
  unidad: UNIDAD,
  origenConfirmado: 'M',
  origenDeducido: 'C',
}

export const VERSIONES_CATALOGO: Record<IdVersionCatalogo, VersionCatalogoAnh> = {
  'C024-2026': {
    id: 'C024-2026',
    nombre: 'Circular ANH 0024 de 2026, Tabla 1',
    fuente: 'Circular ANH 0024 del 09-09-2026: Tabla 1 (p.6-7), Paso 1 (p.5) y valores de choke_mod, dif_perd y pla_no_plan (p.8). Obligatoria desde el 01-12-2026 (p.8)',
    vigenteDesde: '2026-09-09', vigenteHasta: null,
    arbol: N1_CIRCULAR,
    parejas: N2_CIRCULAR.map(n => n.codigo),
    forma: FORMA_C024,
  },
  'DICC-V3.2': {
    id: 'DICC-V3.2',
    nombre: 'Diccionario de Datos JSON V3.2 de la ANH',
    fuente: '20260820_Dicionario_de_Datos_JSON_V3.2_ANH.xlsx, hoja JSONV3, celdas G133 y G137-G141 (archivo del 20-08-2026, publicado con la circular)',
    vigenteDesde: '2026-09-09', vigenteHasta: null,
    arbol: ARBOL_DICC,
    parejas: ARBOL_DICC.flatMap(n => n.n2),
    forma: FORMA_DICC,
  },
}

/** ¿Es una pareja válida en la versión? (Con la pareja que se mudó de N1, solo en la suya.) */
export function esCodigoN2(x: string, version: IdVersionCatalogo = VERSION_POR_DEFECTO): x is CodigoN2 {
  return VERSIONES_CATALOGO[version].parejas.includes(x as CodigoN2)
}

/** ¿La pareja existe en alguna versión conocida? Lo guardado puede venir de
 *  cualquiera de las dos: la salida lo resuelve con la equivalencia. */
export const esCodigoN2Conocido = (x: string): x is CodigoN2 =>
  (Object.keys(VERSIONES_CATALOGO) as IdVersionCatalogo[]).some(v => esCodigoN2(x, v))

/** Los N2 de una N1 en una versión: el paso 5 filtra el paso 6 (U1 §2.3). */
export const n2DeN1 = (n1: ClaveN1, version: IdVersionCatalogo = VERSION_POR_DEFECTO): readonly CodigoN2[] =>
  VERSIONES_CATALOGO[version].arbol.find(n => n.clave === n1)?.n2 ?? []

/** ¿El N2 pertenece a la N1? Con la equivalencia: «Falla Instrumento/sensor»
 *  guardada con la circular sigue siendo de `NP_CTRL` aunque la salida sea la del Diccionario. */
export const n2EnN1 = (n2: CodigoN2, n1: ClaveN1): boolean => esCodigoN2Conocido(n2) && n1DeCodigo(n2) === n1

/** La cadena de pantalla de un N2: la de la Tabla 1, para el código de
 *  cualquier versión (los N2 de la circular se leen en tipo oración, U1 §2). */
export function textoN2(codigo: CodigoN2): string {
  const n = N2_POR_CODIGO.get(codigo) ?? N2_POR_CODIGO.get(equivalente(codigo, 'C024-2026'))
  if (!n) throw new Error(`«${codigo}» no es una causa del catálogo de la ANH.`)
  return n.texto
}

/* ─────────────────────── cau_gral_paro (provisional) ─────────────────────── */

/** `CAU_GRAL_DE_N1@1` (P1 §1.2b): la causa general que se propone para cada
 *  N1, con dos excepciones por pareja. Cinco filas no tienen pareja natural en
 *  las 18 causas de la Res. 0651 (`P_PRUEBAS`, `P_PES`, `P_OP`, `NP_INS`,
 *  `NP_CTRL`, `NP_AUT`): es la razón de la pregunta 9 de P1 §8. La persona la
 *  puede cambiar. */
export const CAU_GRAL_DE_N1 = {
  id: 'CAU_GRAL_DE_N1@1',
  porN1: {
    P_MANT_ELE: 'mantenimiento', P_MANT_MEC: 'mantenimiento', P_MANT_INS: 'mantenimiento', P_MANT_INT: 'mantenimiento',
    P_WO: 'servicio-pozo', P_PRUEBAS: 'registros-pbu', P_PES: 'facilidades', P_OP: 'ingenieria',
    NP_CLIMA: 'climatico', NP_OPUB: 'orden-publico', NP_ENEXT: 'electrico', NP_ENINT: 'electrico',
    NP_INS: 'electrico', NP_CTRL: 'electrico', NP_SUB: 'mecanico', NP_SUP: 'mecanico',
    NP_INTEG: 'facilidades', NP_PROC: 'facilidades', NP_TRANSP: 'bombeo-transporte', NP_AUT: 'ambiental',
  } satisfies Record<ClaveN1, CausaGeneral>,
  porPareja: {
    'NP_SUB/alto-bsw-corte-de-agua': 'alto-sw',
    'NP_AUT/suspension-orden-autoridad': 'cerrado-temporalmente',
  } satisfies Readonly<Record<CodigoN2, CausaGeneral>>,
} as const

/** La causa general propuesta para una pareja. */
export function causaGeneralDe(n2: CodigoN2): CausaGeneral {
  const porPareja: Readonly<Record<CodigoN2, CausaGeneral>> = CAU_GRAL_DE_N1.porPareja
  return porPareja[n2] ?? CAU_GRAL_DE_N1.porN1[n1DeCodigo(n2)]
}

/* ─────────────────────────── la salida a la ANH ─────────────────────────── */

/** Los valores de los seis pasos (y la causa general), en códigos internos. */
export interface ValoresAnh {
  responsable: Responsable
  choke: ChokeAnh
  impacto: Impacto
  planeacion: Planeacion
  n1: ClaveN1
  n2: CodigoN2
  /** Una de las 18 causas, o lo que escribió una persona (provisional, P1 §1.4). */
  cauGral: CausaGeneral | string
}

/** Las cadenas de los campos de clasificación de `paradas_pozo`, en la forma de una versión. */
export interface CadenasAnh {
  resp_par: string
  choke_mod: string
  dif_perd: string
  pla_no_plan: string
  cau_niv1: string
  cau_niv2: string
  cau_gral_paro: string
}

const esCausaGeneral = (x: string): x is CausaGeneral => (CAUSAS_GENERALES as readonly string[]).includes(x)

/** Lo que viaja a la ANH por cada paso, en la forma de la versión escogida.
 *  Lo guardado no cambia: una pareja guardada con una versión sale con la
 *  otra por la equivalencia (P1 §1.2). Una pareja que no existe en ninguna
 *  versión es un error, nunca una cadena inventada. */
export function cadenasAnh(v: ValoresAnh, version: IdVersionCatalogo = VERSION_POR_DEFECTO): CadenasAnh {
  const { forma } = VERSIONES_CATALOGO[version]
  const n2 = equivalente(v.n2, version)
  const n1 = n1DeCodigo(n2)
  const texto = forma.n2[n2]
  if (texto === undefined) throw new Error(`«${v.n2}» no es una causa de la versión ${version} del catálogo.`)
  if (n1DeCodigo(v.n2) !== v.n1) throw new Error(`«${textoN2(v.n2)}» no es una causa de «${textoN1(v.n1)}».`)
  return {
    resp_par: forma.responsable[v.responsable],
    choke_mod: forma.choke[v.choke],
    dif_perd: forma.impacto[v.impacto],
    pla_no_plan: forma.planeacion[v.planeacion],
    cau_niv1: forma.cauNiv1 === 'clave' ? n1 : forma.n1Texto[n1],
    cau_niv2: texto,
    cau_gral_paro: esCausaGeneral(v.cauGral) ? forma.cauGral[v.cauGral] : v.cauGral,
  }
}
