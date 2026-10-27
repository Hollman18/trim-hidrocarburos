import { useAmbito, useRango, useRol } from '@/app/store'
import { usePlantaViva, conLenteTecnica } from '@/shared/api/plantaViva'
import { Gerente } from '@/widgets/plantaviva/Gerente'
import { InicioProduccion } from '@/widgets/produccion/Inicio'

/** LA PLANTA VIVA: el inicio del gerente y de producción (experiencia v3; necesario-por-rol §1, §2 y
 *  §14; imágenes d1-grafito ger y prod, opción A: sin el control Antes · Durante · Después).
 *
 *  Es «ahora»: abre en lo que pasa hoy. Con la lente técnica (producción, un campo) el número es
 *  el choke: lo que sale hoy y el tramo que limita; con la del gerente (y con todos los campos),
 *  lo que se deja de producir ahora y el equipo que más pesa. El Antes y el Después viven en
 *  «¿Está funcionando?» (§0d) y en Resultados. El motor calcula (`usePlantaViva`) y aquí se pinta. */
export function PlantaViva() {
  const ambito = useAmbito(); const rango = useRango(); const rol = useRol()
  const campos = ambito.campos.map(c => c.id)
  const v = usePlantaViva({ campos, momento: 'durante', desde: rango.desde, hasta: rango.hasta })
  const tecnica = conLenteTecnica(rol.id) && !!v.tecnica && !!v.planta
  const c = tecnica ? v.tecnica!.cifra : v.cifras.durante
  return (
    <div data-planta-viva={v.alcance} data-momento="durante" data-valor={c.valor} data-entero={c.entero} data-lente={tecnica ? 'tecnica' : 'gerente'} className="mx-auto max-w-[1600px]">
      {tecnica ? <InicioProduccion v={v} /> : <Gerente v={v} />}
    </div>
  )
}
