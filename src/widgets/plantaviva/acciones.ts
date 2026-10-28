import { useApp, useRol } from '@/app/store'
import { useExportar } from '@/widgets/informe/useExportar'

/** Lo que hacen los botones de La planta viva: abren lo que ya existe.
 *  - Un equipo abre su ficha ejecutiva (`PanelEquipo` → `FichaEjecutiva`) encima de lo que
 *    se ve: si es de otro campo, la ficha toma ese campo sin salir de «Todos mis campos».
 *  - «Ver el plan» abre la ficha del equipo del plan: ahí están sus planes del ciclo.
 *  - «Pedir la causa» lleva a Identificar a quien la tiene; al gerente (no identifica
 *    él) le abre la ficha del pozo, que dice a quién se le pidió y desde cuándo.
 *  - «Ver el diferido» y «Ver la producción» abren su pantalla si el rol la tiene. */
export function useAcciones() {
  const rol = useRol()
  const campoId = useApp(s => s.campoId), alcance = useApp(s => s.alcance)
  const setCampo = useApp(s => s.setCampo), setAlcance = useApp(s => s.setAlcance), abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla)
  // C1 (QA v3) · FF-9: la ficha se abre ENCIMA de «Todos mis campos» y, al cerrarla, se vuelve ahí. Antes
  // pasaba al campo del equipo en silencio y el gerente quedaba en La Ceiba. El campo del equipo se fija
  // (la ficha lo lee), pero el alcance del portafolio se conserva.
  const abrir = (eq: { campoId: string; equipo: string } | null | undefined) => {
    if (!eq) return
    if (eq.campoId !== campoId) {
      setCampo(eq.campoId)
      if (alcance === 'portafolio') setAlcance('portafolio')
    }
    abrirEquipo(eq.equipo, false)
  }
  const ir = (p: string) => (rol.pantallas.includes(p) ? () => setPantalla(p) : undefined)
  const pedirCausa = (eq: { campoId: string; equipo: string } | null) =>
    rol.pantallas.includes('causa') ? () => { if (eq && eq.campoId !== campoId) setCampo(eq.campoId); setPantalla('causa') } : eq ? () => abrir(eq) : undefined
  return { abrir, ir, pedirCausa, verCampo: (c: string) => setCampo(c) }
}

/** «Compartir el informe»: el mismo informe con folio y huella que «Exportar →
 *  Informe en PDF» (`useExportar`, la pantalla con membrete, por la ventana de
 *  imprimir). La planta viva no lleva «Exportar» arriba: su salida es este botón. */
export function useCompartir() {
  const x = useExportar()
  return { puede: x.puede, compartir: () => x.pdf(), ocupado: x.ocupado, aviso: x.aviso }
}
