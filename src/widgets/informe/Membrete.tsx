import { useApp, useAmbito } from '@/app/store'
import { formaCanonica, huellaLegible, type Informe } from '@/entities/informe'
import { fechaHoraLarga, AHORA } from '@/entities/reloj'
import { NOTA_DE_CALCULO } from '@/widgets/diferidos/Rango'
import { useSesion, useVersiones } from '@/shared/api/sesion'

/** Membrete del informe impreso. No se ve en pantalla: solo en el papel. Si
 *  alguien imprime sin pasar por «Exportar», sale sin folio y lo dice. */
export function Membrete() {
  const inf = useApp(s => s.imprimiendo)
  const empresa = useSesion(s => s.ctx.config.empresa)
  const versiones = useVersiones()
  // La versión es la de las cifras del informe, no la vigente al imprimir: si
  // alguien firma entre exportar e imprimir, el papel sigue diciendo con cuál se calculó.
  const v = (inf && versiones.find(x => x.version === inf.version)) || versiones.at(-1)!
  const ambito = useAmbito()
  // El folio va también al pie de CADA página: una hoja suelta sigue diciendo de qué informe es.
  const pie = inf ? `Folio ${inf.folio} · ${empresa} · lo producido se mide; lo diferido se calcula` : 'SIN FOLIO · no sirve como respaldo'
  return (
    <header className="solo-impresion mb-3 border-b-2 border-[var(--tinta)] pb-2 text-[10.5px]">
      <style>{`@media print { @page { @bottom-left { content: ${JSON.stringify(pie)}; } } }`}</style>
      <div className="flex items-start justify-between gap-4">
        <span>
          <b className="block text-[16px] leading-tight">{empresa}</b>
          <b className="block text-[12.5px]">{inf?.titulo ?? 'Impresión sin folio'}</b>
          <span className="block">{inf?.alcance ?? ambito.titulo} · {inf?.periodo ?? ''}</span>
        </span>
        <span className="text-right">
          <span className="block text-[10px] tracking-[.1em]">TRIM · HIDROCARBUROS</span>
          <b className="block text-[13px]">{inf ? `Folio ${inf.folio}` : 'SIN FOLIO'}</b>
          {inf && inf.estado !== 'publicable' && <b className="block text-[11px] tracking-[.06em]">{inf.estado === 'provisional' ? 'PROVISIONAL · MES EN CURSO' : 'NO PUBLICABLE TODAVÍA'}</b>}
          <span className="block">{inf ? `Generado el ${fechaHoraLarga(new Date(inf.fecha))}` : 'no sirve como respaldo'}</span>
        </span>
      </div>
      <p className="mt-1">
        {inf && <>Por {inf.por} · </>}Datos hasta el {fechaHoraLarga(AHORA)}, reloj del PLC · Configuración versión {v.version}, firmada por {v.por} el {fechaHoraLarga(new Date(v.fecha))}
      </p>
    </header>
  )
}

/** Pie del informe: la nota de cálculo y cómo se comprueba el folio. Lo que
 *  se le promete a quien recibe el papel es lo que el contrato da sin sesión
 *  (`GET /api/informes/:folio/verificacion?huella=` → coincide y fecha), no el
 *  registro completo, que pide sesión y los campos del informe. */
export function PieInforme() {
  return <PieDelInforme inf={useApp(s => s.imprimiendo)} />
}

/** El pie con su informe a la vista (o sin él): aparte del store para que
 *  verificar-libro lo pueda dibujar con un informe y leer lo que promete. */
export function PieDelInforme({ inf }: { inf: Informe | null }) {
  return (
    <footer className="solo-impresion mt-4 border-t border-[var(--tinta)] pt-2 text-[9.5px] leading-relaxed">
      <p><b>Nota de cálculo.</b> {NOTA_DE_CALCULO}</p>
      {inf
        ? <>
          <p className="mt-1"><b>Folio {inf.folio}</b> · huella SHA-256 <span className="font-mono">{huellaLegible(inf.huella)}</span> · Para comprobarlo sin cuenta en TRIM, la verificación pública recibe el folio y esta huella y responde solo si coinciden con las registradas, y cuándo se registró (no devuelve cifras: esas las ve quien tiene sesión y los campos del informe). Las cifras protegidas van abajo: con ellas cualquiera recalcula el SHA-256, y si no da esta huella, el documento fue modificado.</p>
          {/* Las cifras protegidas, tal como se hashean (una por línea, `clave=valor`): con ellas cualquiera recalcula el SHA-256. */}
          <p className="mt-1"><b>Cifras protegidas</b> <span className="font-mono">{formaCanonica(inf.cifras).split('\n').join(' · ')}</span></p>
        </>
        : <p className="mt-1"><b>Sin folio.</b> Esta impresión no pasó por «Exportar» y no quedó registrada: no sirve como respaldo documental.</p>}
    </footer>
  )
}
