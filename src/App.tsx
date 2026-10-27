import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Menu } from 'lucide-react'
import { ComoSeLee } from '@/shared/ui/comoSeLee'
import { cn } from '@/shared/lib/cn'
import { useApp, useRol, useAmbito, claveDeVista } from '@/app/store'
import { PANTALLAS } from '@/app/pantallas'
import { Pendiente } from '@/pages/Pendiente'
import { SoloCampo } from '@/pages/SoloCampo'
import { Riel, SelectorCampo, InsigniaHoy } from '@/widgets/Riel'
import { Cabecera } from '@/widgets/Cabecera'
import { MenuPerfil } from '@/widgets/MenuPerfil'
import { PanelEquipo } from '@/widgets/PanelEquipo'
import { Onboarding } from '@/widgets/Onboarding'
import { LimiteDeError } from '@/shared/ui/LimiteDeError'
import { Membrete, PieInforme } from '@/widgets/informe/Membrete'
import { Subpantallas } from '@/widgets/Subpantallas'
import { useSubpantallas, useSinPerfil } from '@/app/grupos'
import { PUERTAS_DEL_ROL, tituloDe } from '@/app/pantallas'
import { grupoDe } from '@/app/pantallas'
import { Hueco } from '@/shared/ui/primitivas'
import { Wordmark } from '@/shared/brand/Logo'
import { useModal } from '@/shared/ui/foco'
import { RANURA_PASO } from '@/shared/ui/ranura'

/** El panel fijo solo existe desde la anchura de escritorio (lg de Tailwind).
 *  Debajo, la banda clara con el ☰ abre el mismo panel desde la izquierda
 *  (X5 §4.2): tener los dos montados repetía todas sus cuentas con uno invisible. */
const ESCRITORIO = '(min-width: 1024px)'
const suscribirAncho = (cb: () => void) => { const m = matchMedia(ESCRITORIO); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) }
const esEscritorio = () => matchMedia(ESCRITORIO).matches

/** Plegado o desplegado, recordado por persona (X5 §4.1). Sin nada recordado,
 *  por debajo de 1280 px de ancho arranca plegado. Es una comodidad de quien la
 *  usa: vive en su navegador y, si no se puede leer, no pasa nada. */
const claveRiel = (rolId: string) => `trim.riel.${rolId}`
const leerPlegado = (rolId: string): boolean => {
  try {
    const v = localStorage.getItem(claveRiel(rolId))
    if (v === 'plegado' || v === 'desplegado') return v === 'plegado'
  } catch { /* modo privado */ }
  return typeof matchMedia === 'function' && !matchMedia('(min-width: 1280px)').matches
}
const recordarPlegado = (rolId: string, plegado: boolean) => {
  try { localStorage.setItem(claveRiel(rolId), plegado ? 'plegado' : 'desplegado') } catch { /* modo privado */ }
}

/** Mientras llega lo que una parte pidió al servidor (con la fuente http) o
 *  el código de una pantalla que se abre por primera vez. En el demo los datos
 *  están en el acto. La navegación y la cabecera tienen su propia espera: sin
 *  ella, lo que piden dejaba en blanco toda la aplicación hasta que llegara.
 *  `role="status"`: el lector de pantalla anuncia que está cargando.
 *  `data-cargando`: las pruebas de navegador esperan a que no quede ninguno. */
const CARGANDO = <p role="status" data-cargando="" className="p-3 text-[14px] text-[var(--tinta2)]">Cargando…</p>
/** Mientras llega la cabecera, su mismo alto (A20): lo de abajo no salta al llegar. */
const CARGANDO_CABECERA = <p role="status" data-cargando="" className="mb-4 min-h-[52px] p-0 text-[14px] text-[var(--tinta2)] sm:mb-5 lg:min-h-[78px]"><span className="sr-only">Cargando…</span></p>
const CARGANDO_PANEL = <p role="status" data-cargando="" className="p-4 text-[14px] text-[var(--nav-tinta2)]">Cargando…</p>

/** Una dirección compartida que pedía un campo (o el portafolio) que la persona
 *  no tiene abre lo suyo y lo dice, mientras no se mueva de esa vista (B-38). */
function AvisoDeDireccion() {
  const aviso = useApp(s => s.avisoCampo)
  const clave = useApp(claveDeVista)
  if (!aviso || aviso.clave !== clave) return null
  return <p role="status" className="no-imprimir mb-3 rounded-[14px] border-[1.5px] border-dashed border-[var(--tinta3)] px-3.5 py-2 text-[14px] text-[var(--tinta2)]" data-aviso-campo>{aviso.texto}</p>
}

/** La banda del teléfono (v3, decisión 5): clara, en el gris cálido del panel,
 *  con su borde abajo; el ☰ con la insignia de Hoy, el logo, el campo en su
 *  píldora y la persona. Sin barra inferior (decisión 4). */
function BandaTelefono({ onMenu }: { onMenu: () => void }) {
  const rol = useRol()
  // El ☰ lleva la insignia de Hoy: así se sabe que hay algo sin abrir el panel.
  const conHoy = (PUERTAS_DEL_ROL[rol.id] ?? []).includes('hoy') && rol.pantallas.includes('hoy')
  return (
    <div data-banda className="no-imprimir flex min-h-16 shrink-0 items-center gap-2.5 border-b border-[var(--nav-linea)] bg-[var(--nav)] px-4 py-3 text-[var(--nav-tinta)] lg:hidden">
      <button onClick={onMenu}
        className="toque relative -ml-1.5 grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-[var(--nav-hover)]">
        <Menu aria-hidden className="size-6" />
        <span className="sr-only">Abrir la navegación</span>
        {conHoy && <InsigniaHoy variante="menu" />}
      </button>
      <span className="shrink-0 max-[359px]:hidden"><Wordmark className="h-[15px]" /></span>
      <span data-banda-campo className="flex min-w-0 flex-1 justify-center"><SelectorCampo variante="banda" /></span>
      <span data-banda-persona className="contents"><MenuPerfil variante="banda" /></span>
      {/* UI-21 (imagen 5): con la pregunta del operador, «Pregunta 1 de 4» va aquí, en la
          banda, en lugar del campo y la persona (los dos siguen en el panel del ☰). Lo pone
          `widgets/hoy/Operador.tsx`. */}
      <span id={RANURA_PASO} className="ml-auto empty:hidden" />
    </div>
  )
}

/** El panel abierto en el teléfono: el mismo panel claro, desde la izquierda, al
 *  84 % del ancho, con la pantalla detrás oscurecida al 40 %. Se cierra tocando
 *  afuera, deslizando a la izquierda, con Escape o al escoger una puerta. */
function PanelTelefono({ onCerrar }: { onCerrar: () => void }) {
  const dialogo = useModal<HTMLDivElement>(onCerrar)
  const toque = useRef<number | null>(null)
  return (
    <div className="no-imprimir fixed inset-0 z-[110] lg:hidden">
      {/* `data-velo`: no queda inerte con el diálogo (foco.ts), así tocar afuera lo cierra (UI-02). */}
      <div aria-hidden data-velo onClick={onCerrar} className="aparece absolute inset-0 bg-[var(--velo)]" />
      <div ref={dialogo} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Navegación"
        onTouchStart={e => { toque.current = e.touches[0]?.clientX ?? null }}
        onTouchMove={e => { const x0 = toque.current, x = e.touches[0]?.clientX; if (x0 !== null && x !== undefined && x0 - x > 60) { toque.current = null; onCerrar() } }}
        className="entra-izquierda absolute inset-y-0 left-0 w-[84%] max-w-[360px] shadow-[var(--sombra-flota)] outline-none">
        <Suspense fallback={CARGANDO_PANEL}><Riel onCerrar={onCerrar} /></Suspense>
      </div>
    </div>
  )
}

export default function App() {
  const pantalla = useApp(s => s.pantalla)
  const alcance = useApp(s => s.alcance)
  const campoId = useApp(s => s.campoId)
  const rolId = useApp(s => s.rolId)
  const equipoAbierto = useApp(s => s.equipoAbierto)
  const onboarding = useApp(s => s.onboarding)
  const setPantalla = useApp(s => s.setPantalla)
  const abrirEquipo = useApp(s => s.abrirEquipo)
  const rol = useRol()
  const comoSeLee = useApp(s => s.comoSeLee)
  const escritorio = useSyncExternalStore(suscribirAncho, esEscritorio)
  // El panel del teléfono se abre sobre una pantalla: al navegar se cierra solo (tapa el contenido).
  const [navEn, setNavEn] = useState<string | null>(null)
  const nav = navEn === pantalla
  // Cada persona tiene su panel: al cambiar de rol se lee lo que esa persona dejó.
  const [panel, setPanel] = useState(() => ({ rol: rolId, plegado: leerPlegado(rolId) }))
  const plegado = panel.rol === rolId ? panel.plegado : leerPlegado(rolId)
  const p = PANTALLAS[pantalla]
  // Si el alcance es portafolio y la pantalla es de un solo campo, se pide el
  // campo en vez de mostrar una suma que no significa nada.
  const Vista = !p ? Pendiente : alcance === 'portafolio' && !p.agrega ? SoloCampo : p.Vista
  // Una subpantalla de una puerta que este campo no tiene en su perfil no se pinta vacía: se dice.
  const grupo = grupoDe(pantalla)
  const subs = useSubpantallas(grupo)
  const sinSub = !!grupo && subs.length === 0
  const sinPerfil = useSinPerfil()

  // A12 (WCAG 2.4.2): cada vista tiene su título en la pestaña: «Hoy · La Ceiba · TRIM».
  const ambito = useAmbito()
  useEffect(() => {
    document.title = `${tituloDe(pantalla, rolId) ?? 'TRIM'} · ${ambito.global ? 'Todos mis campos' : ambito.titulo} · TRIM`
  }, [pantalla, rolId, ambito.global, ambito.titulo])

  const alternarPanel = useCallback(() => {
    recordarPlegado(rolId, !plegado); setPanel({ rol: rolId, plegado: !plegado })
  }, [rolId, plegado])
  // «[» pliega y despliega el panel (X5 §4.1), salvo mientras se escribe.
  useEffect(() => {
    if (!escritorio) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== '[' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      e.preventDefault(); alternarPanel()
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [escritorio, alternarPanel])

  // La salida de un error de dibujo es el inicio del rol, sin recargar: recargar
  // borraba lo hecho en la sesión y entraba como producción.
  const alInicio = { texto: 'Volver al inicio', accion: () => setPantalla(rol.inicio) }
  // Al cambiar de pantalla, alcance, campo o rol se vuelve a intentar: varias pantallas son de varios roles.
  const clave = `${pantalla}|${alcance}|${campoId}|${rolId}`

  return (
    <ComoSeLee.Provider value={comoSeLee}>
    <div className="raiz-app flex h-dvh overflow-hidden bg-[var(--suelo)] text-[var(--tinta)]">
      {/* A13: «Saltar al contenido», lo primero de la página: lleva el foco al título de la vista sin tocar la dirección. */}
      <a href="#contenido" className="saltar sobre-marca no-imprimir rounded-full bg-[var(--marca)] px-4 py-2.5 text-[15px] font-semibold text-white"
        onClick={e => { e.preventDefault(); (document.querySelector<HTMLElement>('main [data-titulo-vista]') ?? document.getElementById('contenido'))?.focus() }}>
        Saltar al contenido
      </a>
      {/* En el papel: membrete arriba, la vista (o la ficha del equipo abierta) y el pie. */}
      <Membrete />
      <aside className={cn('no-imprimir hidden shrink-0 transition-[width] duration-200 ease-[cubic-bezier(.2,0,0,1)] lg:block', plegado ? 'w-[88px]' : 'w-[240px]')}>
        {escritorio && <LimiteDeError clave={clave} que="La navegación" salida={alInicio}>
          <Suspense fallback={CARGANDO_PANEL}><Riel plegado={plegado} onPlegar={alternarPanel} /></Suspense>
        </LimiteDeError>}
      </aside>

      {nav && !escritorio && (
        <LimiteDeError clave={clave} que="La navegación" salida={alInicio}>
          <PanelTelefono onCerrar={() => setNavEn(null)} />
        </LimiteDeError>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        {!escritorio && (
          <LimiteDeError clave={clave} que="La navegación" salida={alInicio}>
            <Suspense fallback={CARGANDO_PANEL}><BandaTelefono onMenu={() => setNavEn(pantalla)} /></Suspense>
          </LimiteDeError>
        )}
        <div id="contenido" tabIndex={-1} className="vista flex-1 overflow-y-auto px-4 pb-6 pt-4 outline-none sm:px-6 sm:pt-5 xl:px-8 xl:pt-[22px]">
          <LimiteDeError clave={clave} que="La cabecera" salida={alInicio}>
            <Suspense fallback={CARGANDO_CABECERA}><Cabecera /></Suspense>
          </LimiteDeError>
          <AvisoDeDireccion />
          <Subpantallas />
          {sinSub
            ? <Hueco>{sinPerfil.length
              ? `${sinPerfil.join(', ')}: sin perfil firmado en la configuración, no se sabe qué equipos ${sinPerfil.length === 1 ? 'tiene' : 'tienen'}.`
              : 'Este campo no tiene en su perfil ninguno de los equipos de esta pantalla.'} El perfil lo firma el administrador en Configuración técnica.</Hueco>
            : <LimiteDeError clave={clave} salida={alInicio}>
              <Suspense fallback={CARGANDO}><Vista /></Suspense>
            </LimiteDeError>}
        </div>
      </main>

      {/* La ficha va aparte: un equipo que no existe (una dirección escrita a mano)
          no puede dejar en blanco toda la aplicación, y la salida es cerrarla. */}
      <LimiteDeError clave={`${equipoAbierto}|${campoId}`} que="La ficha del equipo" className="no-imprimir fixed bottom-3 right-3 z-[120] max-w-[360px] shadow-[var(--sombra2)]"
        salida={{ texto: 'Cerrar la ficha', accion: () => abrirEquipo(null) }}>
        <Suspense fallback={null}><PanelEquipo /></Suspense>
      </LimiteDeError>
      {onboarding && <Onboarding />}
      <PieInforme />
    </div>
    </ComoSeLee.Provider>
  )
}
