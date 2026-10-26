import { useApp, useRango } from '@/app/store'
import { usePrediccion } from '@/shared/api/diferidos'
import { pedirPerfilesBomba } from '@/shared/api/equipos'
import { Panel, Enlace } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { TuberiaDelAgua } from '@/widgets/choke/Agua'

/** El tren de agua de un campo: cuánta agua llega, cuánta saca la bomba de
 *  reinyección, cuánto aguanta el tanque y cuánto crudo depende de eso. Es «La
 *  tubería del agua» de U2 §5 (el modelo choke de inyección): en un campo de
 *  92-97 % de agua, esta tubería decide más paradas que la del crudo. Todo de
 *  los instrumentos (transmisor de nivel, medidor de la bomba, pruebas) y del
 *  tanque configurado; lo que el demo no tiene va «sin dato». */
export function Agua() {
  const rango = useRango()
  const campoId = useApp(s => s.campoId), abrirEquipo = useApp(s => s.abrirEquipo)
  // La bomba de reinyección del campo la dice su perfil en el registro, no un
  // id fijo: un cliente con otra numeración la ve igual.
  const perfil = pedirPerfilesBomba(campoId).find(p => p.subtipo === 'inyeccion')
  const pr = usePrediccion(perfil)

  return (
    <>
      <TuberiaDelAgua campoId={campoId} desde={rango.desde} hasta={rango.hasta} periodo={rango.nombre} />
      <Lectura>
        El agua no se mide en cada pozo: sale de sus pruebas. La que saca la bomba sí se mide, en su
        medidor de caudal. Lo que las bombas no sacan llena el tanque; cuando llega al alto-alto, hay
        que cerrar pozos, primero los más acuatosos. Por eso la bomba de reinyección es de alto impacto.
      </Lectura>
      {perfil && pr && (
        <Panel className="mt-2.5" titulo="La bomba de reinyección" extra={pr.metodo}>
          <ul className="list-disc pl-4 text-[15px] text-[var(--tinta2)]">{pr.supuestos.map(s => <li key={s}>{s}</li>)}</ul>
          {/* C4 · Bajar es tocar (X4 §5.3): del tren (nivel 2) a la bomba (nivel 3). */}
          <Enlace className="mt-2" onClick={() => abrirEquipo(perfil.equipo)}>Ver {perfil.equipo}</Enlace>
        </Panel>
      )}
    </>
  )
}
