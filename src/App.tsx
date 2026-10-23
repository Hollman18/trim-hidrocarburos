import { Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import { ComoSeLee } from '@/shared/ui/comoSeLee'
import { cn } from '@/shared/lib/cn'
import { useApp, useRol, claveDeVista } from '@/app/store'
import { PANTALLAS } from '@/app/pantallas'
import { Pendiente } from '@/pages/Pendiente'
import { SoloCampo } from '@/pages/SoloCampo'
import { Riel } from '@/widgets/Riel'
import { Cabecera } from '@/widgets/Cabecera'
import { PanelEquipo } from '@/widgets/PanelEquipo'
import { Onboarding } from '@/widgets/Onboarding'
import { LimiteDeError } from '@/shared/ui/LimiteDeError'
import { Membrete, PieInforme } from '@/widgets/informe/Membrete'
import { Subpantallas } from '@/widgets/Subpantallas'
import { useSubpantallas, useSinPerfil } from '@/app/grupos'
import { grupoDe } from '@/app/pantallas'
import { Hueco } from '@/shared/ui/primitivas'

/** El riel fijo solo existe desde la anchura de escritorio (lg de Tailwind).
 *  Debajo se usa el cajón: tener los dos montados repetía todas sus cuentas
 *  (el estado de cada campo) con uno de ellos invisible. */
const ESCRITORIO = '(min-width: 1024px)'
const suscribirAncho = (cb: () => void) => { const m = matchMedia(ESCRITORIO); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) }
const esEscritorio = () => matchMedia(ESCRITORIO).matches

/** Mientras llega lo que una parte pidió al servidor (con la fuente http) o
 *  el código de una pantalla que se abre por primera vez. En el demo los datos
 *  están en el acto. La navegación y la cabecera tienen su propia espera: sin
 *  ella, lo que piden dejaba en blanco toda la aplicación hasta que llegara.
 *  `role="status"`: el lector de pantalla anuncia que está cargando.
 *  `data-cargando`: las pruebas de navegador esperan a que no quede ninguno. */
const CARGANDO = <p role="status" data-cargando="" className="p-3 text-[12px] text-[var(--tinta3)]">Cargando…</p>

/** Una dirección compartida que pedía un campo (o el portafolio) que la persona
 *  no tiene abre lo suyo y lo dice, mientras no se mueva de esa vista (B-38). */
function AvisoDeDireccion() {
  const aviso = useApp(s => s.avisoCampo)
  const clave = useApp(claveDeVista)
  if (!aviso || aviso.clave !== clave) return null
  return <p role="status" className="no-imprimir mb-2.5 rounded border border-dashed border-[var(--tinta3)] px-2.5 py-1.5 text-[12px] text-[var(--tinta2)]" data-aviso-campo>{aviso.texto}</p>
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
  const [nav, setNav] = useState(false)
  const [rielChico, setRielChico] = useState(false)
  const p = PANTALLAS[pantalla]
  // Si el alcance es portafolio y la pantalla es de un solo campo, se pide el
  // campo en vez de mostrar una suma que no significa nada.
  const Vista = !p ? Pendiente : alcance === 'portafolio' && !p.agrega ? SoloCampo : p.Vista
  // Una subpantalla de un grupo que este campo no tiene en su perfil no se pinta vacía: se dice.
  const grupo = grupoDe(pantalla)
  const subs = useSubpantallas(grupo)
  const sinSub = !!grupo && subs.length === 0
  const sinPerfil = useSinPerfil()

  /** Al navegar se cierra el cajón: en móvil el riel tapa el contenido. */
  useEffect(() => { setNav(false) }, [pantalla])
  // La salida de un error de dibujo es el inicio del rol, sin recargar: recargar
  // borraba lo hecho en la sesión y entraba como producción.
  const alInicio = { texto: 'Volver al inicio', accion: () => setPantalla(rol.inicio) }
  // Al cambiar de pantalla, alcance, campo o rol se vuelve a intentar: varias pantallas son de varios roles.
  const clave = `${pantalla}|${alcance}|${campoId}|${rolId}`

  return (
    <ComoSeLee.Provider value={comoSeLee}>
    <div className="raiz-app flex h-dvh overflow-hidden bg-[var(--suelo)] text-[var(--tinta)]">
      {/* En el papel: membrete arriba, la vista (o la ficha del equipo abierta) y el pie. */}
      <Membrete />
      <div className={cn('no-imprimir hidden shrink-0 transition-[width] duration-200 lg:block', rielChico ? 'w-[60px]' : 'w-[236px]')}>
        {escritorio && <LimiteDeError clave={clave} que="La navegación" salida={alInicio}>
          <Suspense fallback={CARGANDO}><Riel colapsado={rielChico} onColapsar={() => setRielChico(v => !v)} /></Suspense>
        </LimiteDeError>}
      </div>

      {nav && !escritorio && (
        <div className="no-imprimir fixed inset-0 z-[110] flex lg:hidden">
          <div className="w-[262px] max-w-[82vw] shadow-[var(--sombra2)]">
            <LimiteDeError clave={clave} que="La navegación" salida={alInicio}><Suspense fallback={CARGANDO}><Riel /></Suspense></LimiteDeError>
          </div>
          <button onClick={() => setNav(false)} aria-label="Cerrar la navegación"
            className="flex-1 cursor-default bg-black/35" />
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <LimiteDeError clave={clave} que="La cabecera" salida={alInicio}>
          <Suspense fallback={CARGANDO}><Cabecera onMenu={() => setNav(true)} /></Suspense>
        </LimiteDeError>
        <div className="vista flex-1 overflow-y-auto p-2.5 sm:p-3">
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
