import { useMemo } from 'react'
import { create } from 'zustand'
import { rangoDePeriodo } from '@/entities/diferido'
import { rolPorId, ROL_INICIAL } from '@/entities/roles'
import { CAMPOS, periodoPorId, campoPorId } from '@/entities/campos'
import type { Periodo, IdPeriodo } from '@/entities/tipos'
import { leerHash, escribirHash, rangoValido, pantallaDelRol, nombreRolAjeno, PRIMER_DIA, ULTIMO_DIA, type DeLaDireccion, type MomentoDireccion, type FiltroDireccion } from './url'
import { pantallaVisible } from '@/shared/config/producto'
import { PANTALLAS } from '@/app/pantallas'
import type { Elemento, Miembro, CambioPlanta, Tren } from '@/entities/planta'
import { perfilDe, type Config } from '@/entities/configuracion'
import { personaDelRol, camposAsignados, type Usuario, type PersonaVisible, type Invitacion, type ErrorAcceso } from '@/entities/usuarios'
import type { Informe, ConsultaInforme } from '@/entities/informe'
import type { AvisoSap } from '@/entities/sap'
import { sesion, useSesion } from '@/shared/api/sesion'
import * as E from '@/shared/api/escrituras'
import type {
  CuerpoAviso, CuerpoRespuesta, CuerpoClasificacion, CuerpoConfirmacion, CuerpoYacimiento, CuerpoRespuestaAnh, CuerpoRevisionAnh,
} from '@/shared/api/contrato'
import type { FilaOficial } from '@/entities/asignacion'
import type { Respuesta } from '@/entities/pozos'
import type { Rol } from '@/entities/tipos'
import { AHORA } from '@/entities/reloj'
import { diaIso } from '@/shared/lib/formato'
import { formatoFecha } from '@/shared/lib/fecha'

type Tema = 'light' | 'dark' | 'system'

interface Estado {
  /** Contexto de datos · NO cambia al cambiar de rol. */
  campoId: string
  /** El portafolio no es una pantalla: es un alcance del mismo dato. */
  alcance: 'campo' | 'portafolio'
  /** Un período de la cabecera, o «medida» mientras haya un rango escogido a mano. */
  periodoId: IdPeriodo | 'medida'
  /** F1 · P-18: el momento de La planta viva (Antes · Durante · Después), que va en la dirección. */
  momento: MomentoDireccion
  setMomento: (m: MomentoDireccion) => void
  /** Rango escogido a mano. Manda sobre periodoId mientras exista. */
  rango: { desde: string; hasta: string } | null
  /** Contexto de vista · sí cambia. */
  rolId: string
  pantalla: string
  suplantando: boolean
  tema: Tema
  /** Interruptor de «¿cómo se lee?». */
  comoSeLee: boolean
  /** B3 · A-22: la dirección pedía un rol que no se ofrece (la planeadora, apagada) o que salió del
   *  producto (abastecimiento): su nombre, y la aplicación lo dice en vez de abrir otro rol. */
  rolNoDisponible: string | null
  /** Sale del aviso «este rol no está disponible» al inicio del rol de siempre. */
  salirDeRolNoDisponible: () => void
  /** B3 · A-15: el filtro de Equipos que trae una dirección vieja (Bombas, Electrosumergibles…). Equipos lo
   *  pone una vez y lo borra. */
  filtroEquipos: FiltroDireccion | null
  tomarFiltroEquipos: () => FiltroDireccion | null
  equipoAbierto: string | null
  equipoExpandido: boolean
  /** Una dirección que pedía un campo o el portafolio que la persona no tiene:
   *  se abre lo suyo y se dice (B-38). Vale mientras la vista sea la de `clave`. */
  avisoCampo: { texto: string; clave: string } | null
  /* Lo que es del servidor NO vive aquí: la configuración firmada, las
     respuestas, los accesos, los avisos enviados, los informes emitidos, la
     asignación oficial, los análisis, el esquema de planta y las decisiones
     de planes del ciclo los guarda la sesión (`shared/api/sesion.ts`), y las
     escrituras del contrato (`shared/api/escrituras.ts`) los cambian. Aquí
     quedan las acciones que la vista llama: dicen quién actúa (el rol que se
     está viendo; en producción, el token), esperan la escritura y ajustan la
     vista si hace falta. Todas son asíncronas: con el servidor, cada una es
     un pedido. */
  /** Firma una versión nueva (`POST /api/configuracion { config, motivo, base }`).
   *  `base` es la versión sobre la que se editó: si ya no es la vigente, alguien
   *  firmó en el medio y se rechaza (el 409 del contrato) en vez de pisarlo. */
  firmarConfig: (config: Config, motivo: string, base: number) => Promise<{ ok: true; cambios: string[]; version: number } | { ok: false; error: string }>
  /** Cambia a una persona que ya existe (`PATCH /api/usuarios/:id`). Lo firma quien tenga el rol actual. */
  guardarUsuario: (u: Usuario, motivo: string) => Promise<{ ok: true } | { ok: false; errores: ErrorAcceso[] }>
  /** Invita a una persona (`POST /api/usuarios`). El id, el día y el estado
   *  «invitado» los pone el servidor: el front manda solo los datos y el motivo. */
  invitarUsuario: (datos: Invitacion, motivo: string) => Promise<{ ok: true; id: string } | { ok: false; errores: ErrorAcceso[] }>
  /** Registra el informe (`POST /api/informes`): se manda la CONSULTA y el
   *  servidor calcula las cifras con su libro, su huella y el folio. Sin
   *  persona con acceso en el rol, no hay quién lo emita. */
  emitirInforme: (q: ConsultaInforme) => Promise<{ ok: true; informe: Informe } | { ok: false; error: string }>
  /** Envía a SAP un aviso de mantenimiento. No crea órdenes: eso lo hace el planeador en SAP. */
  enviarAviso: (a: CuerpoAviso) => Promise<{ ok: true; aviso: AvisoSap } | { ok: false; error: string; campo?: 'descripcion' }>
  /** Reemplaza, por cada mes y campo que trae la carga, todos sus pozos
   *  (`POST /api/asignacion-oficial`). Con las reglas del servidor: persona con
   *  acceso, solo sus campos, solo meses cerrados, volúmenes y horas posibles;
   *  con una fila mala no se carga nada. La carga queda en el rastro con quién,
   *  cuándo y el motivo. */
  cargarAsignacion: (filas: FilaOficial[], motivo: string) => Promise<{ ok: true } | { ok: false; error: string }>
  /** El informe que se está imprimiendo: su folio va en el membrete. Se borra al terminar de imprimir. */
  imprimiendo: Informe | null
  setImprimiendo: (i: Informe | null) => void
  /** Respuesta en pantalla a una parada que la señal no explicó
   *  (`POST /api/paradas/:evento/respuesta`). `por`, `hora` y `canal` los pone
   *  el servidor; la primera respuesta gana. */
  responder: (r: Omit<CuerpoRespuesta, 'parte'> & { parte?: Respuesta['parte'] }, o?: { keepalive?: boolean }) => Promise<{ ok: true } | { ok: false; error: string; estado?: number }>
  /** Mecanismo y causa raíz de una falla declarada (`POST /api/analisis/:evento`).
   *  Los completa confiabilidad o el jefe de mantenimiento; la parte y el modo son de quien la vio. */
  completarAnalisis: (evento: string, a: { mecanismo: string; causaRaiz: string; nota?: string }) => Promise<{ ok: true } | { ok: false; error: string }>
  /** Aceptar o marcar ejecutado un plan del ciclo (`POST /api/planes/:id`). */
  decidirPlan: (id: string, estado: 'aceptado' | 'ejecutado', motivo: string) => Promise<{ ok: true } | { ok: false; error: string }>
  /* El árbol de paradas de la ANH (Circular 024). Responden la fila como quedó o
     `{ ok: false, error }` con las palabras del servidor: el 403 (no le toca), el
     409 (otro cambió la parada mientras la miraba) y el 422 (incoherente). */
  /** Lo que una persona dice de los pasos de una parada (`POST /api/anh/paradas/:id/clasificacion`). */
  clasificarAnh: (id: string, c: CuerpoClasificacion) => ReturnType<typeof E.clasificarParada>
  /** Confirmar una parada, o varias de la misma cadena en lote (`POST /api/anh/paradas/confirmar`). */
  confirmarAnh: (c: CuerpoConfirmacion) => ReturnType<typeof E.confirmarParadasAnh>
  /** «En el yacimiento», con lo que lo muestra (`POST /api/anh/paradas/:id/yacimiento`). */
  yacimientoAnh: (id: string, c: CuerpoYacimiento) => ReturnType<typeof E.declararYacimientoAnh>
  /** La respuesta de campo a una pregunta de la parada (`POST /api/anh/paradas/:id/respuesta`). */
  responderAnh: (id: string, c: CuerpoRespuestaAnh, o?: { keepalive?: boolean }) => ReturnType<typeof E.responderPreguntaAnh>
  /** «Algo está mal» o «Pedir a producción» (`POST /api/anh/paradas/:id/revision`). */
  revisarAnh: (id: string, c: CuerpoRevisionAnh) => ReturnType<typeof E.revisarParadaAnh>
  /** Lo que cambiaría si se firmara el borrador, sin firmarlo (`POST /api/configuracion/vista-previa`). */
  previsualizarConfig: (config: Config) => ReturnType<typeof E.previsualizarConfiguracion>
  /** La topología leída de un CSV o un pegado de Excel (`POST /api/topologia/importar`): va al borrador, no se firma sola. */
  importarTopologia: (campo: string, texto: string) => ReturnType<typeof E.importarTopologia>
  setCampo: (id: string) => void
  setAlcance: (a: 'campo' | 'portafolio') => void
  setPeriodo: (id: IdPeriodo) => void
  /** Aplica un rango escogido a mano; si no hay días con datos en él, dice por qué. */
  setRango: (desde: string, hasta: string) => { ok: true } | { ok: false; error: string }
  setRol: (id: string) => void
  setPantalla: (p: string) => void
  /** Si la vista se movió sola (una subpantalla que el campo no tiene), por qué. */
  avisoSub: string | null
  /** Pasa a otra subpantalla dejando dicho por qué. */
  redirigir: (p: string, aviso: string) => void
  setTema: (t: Tema) => void
  setComoSeLee: (v: boolean) => void
  abrirEquipo: (id: string | null, expandido?: boolean) => void
  /** El esquema de planta lo edita quien configura los conectores, una persona
   *  con acceso, en un campo suyo (`POST /api/planta/cambios`); cada cambio
   *  queda en el historial. Un id repetido en el campo se rechaza: quitar uno
   *  se llevaba también al otro. */
  agregarMiembro: (campo: string, grupo: string, m: Miembro) => Promise<ResultadoPlanta>
  quitarMiembro: (campo: string, grupo: string, miembro: string) => Promise<ResultadoPlanta>
  agregarElemento: (campo: string, tren: Tren, el: Elemento) => Promise<ResultadoPlanta>
  quitarElemento: (campo: string, tren: Tren, id: string) => Promise<ResultadoPlanta>
}

export type ResultadoPlanta = { ok: true } | { ok: false; error: string }
export type { CambioPlanta, Tren }


const leerTema = (): Tema => {
  try { return (localStorage.getItem('trim.tema') as Tema) || 'system' } catch { return 'system' }
}

/** Se estampa el tema RESUELTO, no la preferencia: el CSS así tiene un solo
 *  juego de valores oscuros. La preferencia vive en localStorage. */
export const aplicarTema = (t: Tema) => {
  const raiz = document.documentElement
  const oscuro = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  raiz.setAttribute('data-theme', oscuro ? 'dark' : 'light')
  raiz.style.colorScheme = oscuro ? 'dark' : 'light'
  try { localStorage.setItem('trim.tema', t) } catch { /* modo privado */ }
}


// Funciones declaradas, no constantes: el estado inicial ya las usa al crear el store.
/** Campos que un rol tiene asignados: los que el gerente le dio a la persona
 *  que tiene ese rol (registro de usuarios); si nadie lo tiene, los del rol. */
export function camposDelRol(rol: { id: string; campos: 'todos' | string[] }, usuarios: readonly PersonaVisible[] = sesion().usuarios) {
  return camposAsignados(rol, usuarios)
}

/** ¿Tiene sentido el portafolio para este rol? Más de un campo asignado Y
 *  alguna pantalla suya que sume campos. Sin esto, el administrador (cuyas
 *  pantallas son todas de un campo) o el técnico (un solo campo) aterrizaban
 *  en «elija un campo» mientras el riel decía otra cosa. */
export function portafolioPermitido(rol: Rol, usuarios: readonly PersonaVisible[] = sesion().usuarios) {
  return camposDelRol(rol, usuarios).length > 1 && rol.pantallas.some(p => pantallaVisible(p) && !!PANTALLAS[p]?.agrega)
}

/** Los campos de cada rol según el registro de usuarios. */
const camposDelRegistro = (usuarios: readonly PersonaVisible[]) => (rolId: string) => personaDelRol(usuarios, rolId)?.campos ?? rolPorId(rolId).campos
const inicial = leerHash(camposDelRegistro(sesion().usuarios), ROL_INICIAL)
const rolInicial = rolPorId(inicial.rolId ?? ROL_INICIAL)
/** La vista que se está viendo: el aviso de una dirección vale solo para ella. */
export const claveDeVista = (s: Pick<Estado, 'rolId' | 'pantalla' | 'campoId' | 'alcance'>) => `${s.rolId}|${s.pantalla}|${s.campoId}|${s.alcance}`
/** «Usted no tiene asignado el campo La Zarza: le mostramos La Ceiba.» (B-38). */
function avisoDeDireccion(c: DeLaDireccion, s: Pick<Estado, 'rolId' | 'pantalla' | 'campoId' | 'alcance'>): Estado['avisoCampo'] {
  const visto = campoPorId(s.campoId).nombre
  // P-17: un rol que todavía no se ofrece (la planeadora, abastecimiento) no abre en silencio el de otro.
  const texto = c.campoAjeno && c.campoAjeno !== s.campoId ? `Usted no tiene asignado el campo ${campoPorId(c.campoAjeno).nombre}: le mostramos ${visto}.`
    : c.alcance === 'portafolio' && s.alcance !== 'portafolio' ? `Usted no tiene asignado el portafolio: le mostramos ${visto}.` : null
  return texto ? { texto, clave: claveDeVista(s) } : null
}
/** «portafolio» era una pantalla y ahora es un alcance. Una dirección vieja
 *  o una pestaña abierta desde antes aterrizan donde corresponde. */
const migrar = (p: string | undefined) => (p === 'portafolio' ? rolInicial.inicio : p)

export const useApp = create<Estado>((set, get) => ({
  campoId: inicial.campoId ?? CAMPOS[0]!.id,
  alcance: (inicial.pantalla === 'portafolio' || inicial.alcance === 'portafolio') && portafolioPermitido(rolInicial, sesion().usuarios) ? 'portafolio' : 'campo',
  periodoId: inicial.periodoId ?? 'curso',
  rango: inicial.rango ?? null,
  momento: inicial.momento ?? 'durante',
  setMomento: m => set({ momento: m }),
  rolId: rolInicial.id,
  pantalla: migrar(inicial.pantalla) ?? rolInicial.inicio,

  suplantando: false,
  tema: leerTema(),
  comoSeLee: false,
  rolNoDisponible: inicial.rolAjeno ? nombreRolAjeno(inicial.rolAjeno) ?? null : null,
  salirDeRolNoDisponible: () => { set({ rolNoDisponible: null }); escribirHash(aDireccion(get()), true) },
  filtroEquipos: inicial.equipoAbierto ? null : inicial.filtro ?? null,
  tomarFiltroEquipos: () => { const f = get().filtroEquipos; if (f) set({ filtroEquipos: null }); return f },
  equipoAbierto: inicial.equipoAbierto ?? null,
  equipoExpandido: false,
  avisoCampo: null,

  firmarConfig: (config, motivo, base) => E.firmarConfiguracion(quien(), { config, motivo, base }),
  enviarAviso: a => E.enviarAviso(quien(), a),
  imprimiendo: null,
  setImprimiendo: i => set({ imprimiendo: i }),
  emitirInforme: q => E.emitirInforme(quien(), q),
  cargarAsignacion: (filas, motivo) => E.cargarAsignacion(quien(), { filas, motivo }),
  guardarUsuario: async (u, motivo) => {
    const rolId = get().rolId
    const r = await E.guardarUsuario({ rolId }, { usuario: u, motivo })
    if (!r.ok) return r
    // Si quien cambió fue el propio campo de vista (sus propios campos), la
    // vista se ajusta: nadie ve un campo que ya no tiene. Se mira el rol con
    // que se firmó, no el de ahora (pudo cambiar mientras llegaba la respuesta).
    if (get().rolId !== rolId) return r
    const { usuarios } = sesion(), mios = camposDelRol(rolPorId(rolId), usuarios)
    const { campoId, alcance } = get()
    set({
      // Si la vista cambia de campo, el aviso de una redirección hablaba del anterior.
      ...(mios.some(c => c.id === campoId) ? {} : { campoId: mios[0]?.id ?? campoId, avisoSub: null }),
      ...(alcance === 'portafolio' && !portafolioPermitido(rolPorId(rolId), usuarios) ? { alcance: 'campo' as const } : {}),
    })
    return r
  },
  invitarUsuario: (invitacion, motivo) => E.invitarUsuario(quien(), { invitacion, motivo }),
  responder: (r, o) => E.responderParada(quien(), r, o),
  completarAnalisis: (evento, a) => E.completarAnalisis(quien(), { evento, ...a }),
  decidirPlan: (id, estado, motivo) => E.decidirPlan(quien(), { id, estado, motivo }),
  clasificarAnh: (id, c) => E.clasificarParada(quien(), id, c),
  confirmarAnh: c => E.confirmarParadasAnh(quien(), c),
  yacimientoAnh: (id, c) => E.declararYacimientoAnh(quien(), id, c),
  responderAnh: (id, c, o) => E.responderPreguntaAnh(quien(), id, c, o),
  revisarAnh: (id, c) => E.revisarParadaAnh(quien(), id, c),
  // La pantalla pide el impacto también con errores: los muestra al lado, sin firmar nada (B-53).
  previsualizarConfig: config => E.previsualizarConfiguracion(quien(), { config, aunConErrores: true }),
  importarTopologia: (campo, texto) => E.importarTopologia(quien(), { campo, texto }),

  // Un campo que la persona no tiene no se abre, venga de donde venga. Al
  // cambiar de campo, el aviso de una redirección hablaba del anterior: se borra.
  setCampo: id => {
    const { rolId } = get(), { usuarios } = sesion()
    if (!camposDelRol(rolPorId(rolId), usuarios).some(c => c.id === id)) return
    set({ campoId: id, alcance: 'campo', avisoSub: null })
  },
  setAlcance: a => {
    const { rolId } = get(), { usuarios } = sesion()
    set({ alcance: a === 'portafolio' && !portafolioPermitido(rolPorId(rolId), usuarios) ? 'campo' : a, avisoSub: null })
  },
  setPeriodo: id => set({ periodoId: id, rango: null }),
  // Un rango al revés se endereza: nadie quiere decir «del 20 al 10».
  // El rango se valida igual que el de la dirección: fechas reales, enderezado
  // si viene al revés y recortado a los días con datos. Si no queda nada, se dice.
  setRango: (desde, hasta) => {
    const r = rangoValido(desde, hasta)
    if (!r) return { ok: false, error: `Escoja dos fechas entre el ${PRIMER_DIA} y el ${ULTIMO_DIA}: fuera de esos días no hay datos.` }
    set({ rango: r, periodoId: 'medida' })
    return { ok: true }
  },
  /** Al cambiar de rol se conserva campo, período y unidades.
   *  Solo cambia la vista, y si la pantalla no existe en el rol nuevo se puentea. */
  setRol: id => {
    // Se guarda el rol que de verdad se muestra: un id de v2 o desconocido se
    // resolvía a producción en pantalla, pero quedaba guardado crudo y ninguna
    // acción encontraba a la persona.
    const rol = rolPorId(id)
    const { pantalla, campoId, alcance } = get(), { usuarios } = sesion()
    // Si el campo que se estaba viendo no está asignado al rol nuevo, se pasa
    // al primero que sí lo esté: nadie ve un campo que no le corresponde.
    const asignados = camposDelRol(rol, usuarios)
    const nuevoCampo = asignados.some(c => c.id === campoId) ? campoId : asignados[0]?.id ?? campoId
    set({
      rolId: rol.id,
      // Si la persona del rol no tiene ningún campo registrado (un id que el
      // catálogo no conoce), la vista se queda donde estaba en vez de reventar.
      campoId: nuevoCampo,
      alcance: alcance === 'portafolio' && portafolioPermitido(rol, usuarios) ? 'portafolio' : 'campo',
      pantalla: pantallaDelRol(rol, pantalla) ? pantalla : rol.inicio,
      equipoAbierto: null,
      avisoSub: null,
    })
  },
  setPantalla: p => {
    const { rolId } = get(), { usuarios } = sesion()
    const rol = rolPorId(rolId)
    if (p === 'portafolio') return set({ pantalla: rol.inicio, alcance: portafolioPermitido(rol, usuarios) ? 'portafolio' : 'campo', equipoAbierto: null, avisoSub: null })
    // Una pantalla que el rol no tiene no se abre: la misma regla que la dirección.
    if (!pantallaDelRol(rol, p)) return
    set({ pantalla: p, equipoAbierto: null, avisoSub: null })
  },
  avisoSub: null,
  // Una redirección reemplaza la entrada del historial: si la agregara, «atrás» volvería
  // a la dirección que redirige y el usuario quedaría atrapado.
  redirigir: (p, aviso) => {
    reemplazando = true
    try { set({ pantalla: p, equipoAbierto: null, avisoSub: aviso }) } finally { reemplazando = false }
  },
  setTema: t => { aplicarTema(t); set({ tema: t }) },
  setComoSeLee: v => set({ comoSeLee: v }),
  abrirEquipo: (id, expandido = false) => set({ equipoAbierto: id, equipoExpandido: expandido }),

  agregarMiembro: (campo, grupo, miembro) => E.cambiarPlanta(quien(), campo, { tipo: 'agregar-miembro', grupo, miembro }),
  quitarMiembro: (campo, grupo, miembro) => E.cambiarPlanta(quien(), campo, { tipo: 'quitar-miembro', grupo, miembro }),
  agregarElemento: (campo, tren, elemento) => E.cambiarPlanta(quien(), campo, { tipo: 'agregar-elemento', tren, elemento }),
  quitarElemento: (campo, tren, id) => E.cambiarPlanta(quien(), campo, { tipo: 'quitar-elemento', tren, id }),
}))
// La dirección con la que se abrió la aplicación también se dice (B-38).
useApp.setState({ avisoCampo: avisoDeDireccion(inicial, useApp.getState()) })

/** Con qué rol se actúa: el que se está viendo (en producción, el del token). */
const quien = (): E.Credencial => ({ rolId: useApp.getState().rolId })

/** Selectores derivados */
export const useCampo = () => campoPorId(useApp(s => s.campoId))
/** Configuración de planta del campo que se está mirando, según su perfil
 *  firmado: un campo que no tiene gas no dibuja tren de gas aunque el esquema
 *  lo traiga registrado. Un campo sin esquema registrado da undefined y la
 *  pantalla muestra el hueco: nunca se dibuja la planta de otro campo. */
export const usePlanta = () => {
  const campoId = useApp(s => s.campoId)
  const planta = useSesion(s => s.plantas)
  const gas = useSesion(s => perfilDe(s.ctx.config, campoId).gas)
  const cfg = Object.hasOwn(planta, campoId) ? planta[campoId] : undefined
  // Sin gas no hay tren de gas; con gas que no se vende, no hay salida «a venta».
  return useMemo(() => (!cfg ? undefined : gas === 'no' && cfg.gas.length ? { ...cfg, gas: [] }
    : gas !== 'venta' && cfg.gas.some(e => e.simbolo === 'salida') ? { ...cfg, gas: cfg.gas.filter(e => e.simbolo !== 'salida') } : cfg), [cfg, gas])
}
/** El perfil firmado del campo que se está mirando. */
export const usePerfil = () => perfilDe(useSesion(s => s.ctx.config), useApp(s => s.campoId))
/** Un rango escogido a mano se vuelve un período como cualquier otro:
 *  los días que cubre deciden el factor, y si llega hasta hoy es parcial. */
const aMedida = (desde: string, hasta: string): Periodo => {
  const d = new Date(`${desde}T00:00:00`), h = new Date(`${hasta}T00:00:00`)
  const dias = Math.max(1, Math.round((h.getTime() - d.getTime()) / 86_400_000) + 1)
  // «Hoy» es el del reloj de los datos (en producción, el del servidor).
  const hoy = new Date(`${diaIso(AHORA)}T00:00:00`)
  const corte = formatoFecha({ day: 'numeric', month: 'short' })
  return {
    id: 'medida',
    nombre: 'Rango escogido',
    detalle: `${dias} día${dias === 1 ? '' : 's'} · ${corte.format(d)} a ${corte.format(h)}`,
    parcial: h >= hoy,
  }
}
export const usePeriodo = (): Periodo => {
  // Dos selectores separados a propósito: devolver un objeto nuevo en el
  // selector haría que zustand viera un snapshot distinto en cada render.
  const periodoId = useApp(s => s.periodoId)
  const rango = useApp(s => s.rango)
  if (rango) return aMedida(rango.desde, rango.hasta)
  // «medida» sin rango no lo deja ninguna acción (setRango pone los dos, setPeriodo quita los dos): si pasa, se dice.
  if (periodoId === 'medida') throw new Error('El período «rango escogido» quedó sin su rango.')
  return periodoPorId(periodoId)
}
/** El período de la cabecera como intervalo sobre el reloj del PLC. */
export const useRango = () => {
  const periodoId = useApp(s => s.periodoId)
  const rango = useApp(s => s.rango)
  return rangoDePeriodo(periodoId, rango)
}
export const useRol = () => rolPorId(useApp(s => s.rolId))
/** Cuánto detalle ve el rol en cada pantalla (`NivelDetalle`). */
export const useNivel = () => rolPorId(useApp(s => s.rolId)).nivel
export const useCampos = () => camposDelRol(rolPorId(useApp(s => s.rolId)), useSesion(s => s.usuarios))
/** La persona que está viendo la aplicación con el rol actual (registro de
 *  usuarios). Sin nadie con ese rol, la persona original del rol. */
export const usePersona = () => {
  const rol = rolPorId(useApp(s => s.rolId))
  const u = personaDelRol(useSesion(s => s.usuarios), rol.id)
  const nombre = u?.nombre ?? rol.persona
  // La persona que mira llega completa (su correo está en Mi perfil); la forma mínima no lo trae.
  return { id: u?.id, nombre, correo: u && 'correo' in u ? u.correo : undefined, iniciales: nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(), sinAcceso: !u }
}

/** Sobre qué se está mirando: un campo o todos los asignados. */
export const useAmbito = () => {
  const alcance = useApp(s => s.alcance)
  const campoId = useApp(s => s.campoId)
  const rolId = useApp(s => s.rolId)
  const asignados = camposDelRol(rolPorId(rolId), useSesion(s => s.usuarios))
  const global = alcance === 'portafolio' && asignados.length > 1
  return {
    global,
    campos: global ? asignados : [campoPorId(campoId)],
    titulo: global ? 'Portafolio' : campoPorId(campoId).nombre,
  }
}

/** Y al revés: si alguien pega una dirección o usa atrás/adelante, el estado
 *  la sigue. Sin esto, el enlace compartido solo funciona al cargar. */
// Mientras se aplica una dirección (atrás, adelante, enlace pegado) no se
// escriben entradas nuevas en el historial: se rompería el «atrás».
let aplicandoDireccion = false
let reemplazando = false
function aplicarDireccion() {
  const ahora = useApp.getState
  const c = leerHash(camposDelRegistro(sesion().usuarios), ahora().rolId)
  // A-22: un rol que no se ofrece no abre otro en silencio: se dice, y la dirección queda como vino.
  if (c.rolAjeno) return useApp.setState({ rolNoDisponible: nombreRolAjeno(c.rolAjeno) ?? null })
  if (ahora().rolNoDisponible) useApp.setState({ rolNoDisponible: null })
  // El filtro de una dirección vieja (Bombas, Electrosumergibles) vale para esa visita: al llegar a Equipos desde otra
  // pantalla por una dirección sin filtro, la lista abre entera (el filtro de antes no se queda pegado).
  // («Atrás» desde el nivel 3 del mismo rol vuelve a la lista con el filtro que tenía.)
  const listaDeEquipos = c.pantalla === 'equipos' && !c.equipoAbierto
  if (listaDeEquipos && c.filtro) useApp.setState({ filtroEquipos: c.filtro })
  else if (listaDeEquipos && !(ahora().pantalla === 'equipos' && ahora().equipoAbierto && (!c.rolId || c.rolId === ahora().rolId))) useApp.setState({ filtroEquipos: {} })
  // Cada paso se compara contra el estado de ESE momento, no contra una foto
  // del principio: setCampo pone el alcance en «campo» y setRol/setPantalla
  // cierran el equipo, así que el portafolio o el equipo de un enlace pegado
  // se perdían. Por eso también el orden: el alcance después del campo y el
  // equipo al final.
  if (c.rolId && c.rolId !== ahora().rolId) ahora().setRol(c.rolId)
  if (c.campoId && c.campoId !== ahora().campoId) ahora().setCampo(c.campoId)
  if (c.pantalla && c.pantalla !== ahora().pantalla) ahora().setPantalla(c.pantalla)
  if (c.alcance && c.alcance !== ahora().alcance) ahora().setAlcance(c.alcance)
  const s = ahora()
  if (c.rango && (c.rango.desde !== s.rango?.desde || c.rango.hasta !== s.rango?.hasta)) s.setRango(c.rango.desde, c.rango.hasta)
  else if (c.periodoId && c.periodoId !== 'medida' && c.periodoId !== s.periodoId) s.setPeriodo(c.periodoId)
  if ((c.equipoAbierto ?? null) !== ahora().equipoAbierto) ahora().abrirEquipo(c.equipoAbierto ?? null)
  // P-18: atrás y adelante también cambian el momento de La planta viva.
  if (ahora().pantalla === 'plantaViva' && (c.momento ?? 'durante') !== ahora().momento) ahora().setMomento(c.momento ?? 'durante')
  // Un campo o un portafolio que la persona no tiene no se abre, y se dice (B-38).
  useApp.setState({ avisoCampo: avisoDeDireccion(c, ahora()) })
  // Lo que la dirección pedía y no se pudo (un campo ajeno, un rol que no
  // existe) no se queda escrito: la dirección dice lo que de verdad se ve.
  escribirHash(aDireccion(ahora()))
}

/** La dirección refleja el contexto, para poder compartir la vista. */
const aDireccion = (s: Estado) => ({
  rolId: s.rolId, pantalla: s.pantalla, campoId: s.campoId, alcance: s.alcance,
  periodoId: s.periodoId, equipoAbierto: s.equipoAbierto, rango: s.rango, momento: s.momento,
})

/** Lo que el estado de la aplicación hace sobre el navegador: oyentes de
 *  impresión, del tema del sistema y de la dirección, y la dirección escrita
 *  desde el estado. Va aquí y no al cargar el módulo: cargarlo no debe tocar
 *  el navegador (lo importan pruebas y herramientas). Lo llama main.tsx una
 *  vez, antes de pintar; una segunda llamada no duplica los oyentes. */
let iniciada = false
export function iniciarApp(): void {
  if (iniciada) return
  iniciada = true
  // El tema: index.html ya lo puso para que no haya destello; aquí se reafirma
  // desde el estado, que es la fuente de verdad en la sesión.
  aplicarTema(useApp.getState().tema)
  // El papel es claro: al imprimir se estampa el tema claro y al terminar se
  // vuelve al que había.
  // También `color-scheme` (A8): con el tema oscuro, los controles nativos y el pie impreso salían en oscuro.
  addEventListener('beforeprint', () => { const r = document.documentElement; r.setAttribute('data-theme', 'light'); r.style.colorScheme = 'light' })
  addEventListener('afterprint', () => { aplicarTema(useApp.getState().tema); useApp.getState().setImprimiendo(null) })
  // En «sistema» hay que seguir al sistema también DESPUÉS de cargar.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useApp.getState().tema === 'system') aplicarTema('system')
  })
  addEventListener('hashchange', () => {
    aplicandoDireccion = true
    try { aplicarDireccion() } finally { aplicandoDireccion = false }
  })
  useApp.subscribe((s, antes) => { if (!s.rolNoDisponible) escribirHash(aDireccion(s), !aplicandoDireccion && !reemplazando
    && (s.pantalla !== antes.pantalla || s.rolId !== antes.rolId || s.campoId !== antes.campoId || s.alcance !== antes.alcance)) })
  // Al cargar se escribe una vez: si la dirección pedía una pantalla que el rol
  // no tiene, queda la que de verdad se muestra. La de un rol que no está disponible queda como vino.
  if (!useApp.getState().rolNoDisponible) escribirHash(aDireccion(useApp.getState()))
}
