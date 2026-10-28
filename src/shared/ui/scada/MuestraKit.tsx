import type { ReactNode } from 'react'
import { Barra, Tendencia, Columnas, LeyendaColumnas, ContraMeta, Bomba, Tanque, Valvula, Separador, Pozo, Medidor, Area, Linea, Esquema, Marca, Cifra, TRAZO_FLUIDO, ESTADOS_KIT, type EstadoKit, type Fluido, type MarcaKitTipo } from './index'

/* La muestra del kit, solo para desarrollo (muestra.html): cada componente en sus 5 estados.
   Los valores son los de la lámina (kit-scada.md): lecturas del demo donde las hay, y «ejemplo
   de estado» donde el demo no tiene ese estado en ese momento. Ninguna escala de aquí está
   firmada: todas dicen «provisional». */

const NOMBRE: Record<EstadoKit, string> = { normal: 'Normal', anormal: 'Anormal', 'sin-dato': 'Sin dato', 'sin-comunicacion': 'Sin comunicación', parado: 'Parado' }
const ESCALA = { min: 0, max: 30, firmada: false }
const MARCAS: readonly MarcaKitTipo[] = ['interlock', 'alarma', 'atencion', 'aviso', 'sin-comunicacion', 'invalido', 'falta', 'sin-instrumento', 'bloqueo', 'normal']

const Seccion = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <section className="rounded-[10px] bg-[var(--panel)] p-6">
    <h2 className="mb-4 text-[16px] font-semibold">{titulo}</h2>
    {children}
  </section>
)
const Fila = ({ children }: { children: ReactNode }) => <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">{children}</div>
const Celda = ({ estado, ejemplo, children }: { estado: EstadoKit; ejemplo?: boolean; children: ReactNode }) => (
  <div data-muestra={estado} className="min-w-0 border-t border-[var(--linea2)] pt-3">
    <p className="mb-2 text-[12px] font-semibold text-[var(--tinta2)]">{NOMBRE[estado]}{ejemplo && <span className="font-normal"> · ejemplo de estado</span>}</p>
    {children}
  </div>
)

const serie = [11.8, 12.1, 12.0, 12.3, 11.9, 12.2, 12.4, 12.0, 12.1, 12.3, 12.2, 12.0]
const sube = [70, 71, 72, 73, 75, 76, 78, 80, 82, 84, 86, 88]
const hueco = [70, 71, 72, null, null, null, 73, 72, 74, 73, 72, 73]
const perdida = [70, 71, 72, 72, 73, 72, 71, 72, null, null, null, null]
const pdi = [280, 281, 279, 280, 282, 280, 278, 276, 270, 250, 200, 120]
const CIEN = { min: 0, max: 100, firmada: false }

export function MuestraKit() {
  return (
    <main className="mx-auto grid max-w-[1200px] gap-5 p-6">
      <header>
        <h1 className="text-[26px] font-bold">Kit SCADA · los 5 estados</h1>
        <p className="text-[15px] text-[var(--tinta2)]">Solo para desarrollo. Escalas sin firmar: dicen «provisional». <a className="underline" href="?noche">noche</a> · <a className="underline" href="?">claro</a></p>
      </header>

      <Seccion titulo="1 · Indicador de barra">
        <Fila>
          <Celda estado="normal"><Barra nombre="Presión de succión" tag="PI-2010" valor={12} decimales={1} unidad="psi" escala={ESCALA} banda={[10, null]} alarmas={[8]} disparos={[6]} /></Celda>
          <Celda estado="anormal" ejemplo><Barra nombre="Presión de succión" tag="PI-2010" valor={7.6} decimales={1} unidad="psi" escala={ESCALA} banda={[10, null]} alarmas={[8]} estado="anormal" condicion="alarma" cruzo={8} /></Celda>
          <Celda estado="sin-dato" ejemplo><Barra nombre="Presión de succión" tag="PI-2010" valor={null} unidad="psi" escala={ESCALA} banda={[10, null]} alarmas={[8]} estado="sin-dato" /></Celda>
          {/* Llega un 12 viejo: el kit no lo pinta como si fuera de ahora. */}
          <Celda estado="sin-comunicacion" ejemplo><Barra nombre="Presión de succión" tag="PI-2010" valor={12} unidad="psi" escala={ESCALA} estado="sin-comunicacion" desde="14:07" /></Celda>
          <Celda estado="parado"><Barra nombre="Presión de succión" tag="PI-2010" valor={18.2} decimales={1} unidad="psi" escala={ESCALA} banda={[10, null]} alarmas={[8]} estado="parado" /></Celda>
        </Fila>
      </Seccion>

      <Seccion titulo="2 · Tendencia">
        <Fila>
          <Celda estado="normal"><Tendencia titulo="Succión" ventana="12 d" unidad="psi" series={[{ nombre: 'PI-2010', valores: serie }]} escala={ESCALA} banda={[10, 30]} alarmas={[8]} ejeX={['21 sept', 'hoy']} ancho={240} /></Celda>
          <Celda estado="anormal" ejemplo><Tendencia titulo="Cojinete" ventana="12 d" unidad="°C" series={[{ nombre: 'TI-2011', valores: sube }]} escala={CIEN} banda={[0, 85]} alarmas={[85]} estado="anormal" condicion="alarma" cruzo={85} ejeX={['21 sept', 'hoy']} ancho={240} /></Celda>
          <Celda estado="sin-dato" ejemplo><Tendencia titulo="Cojinete" ventana="12 d" unidad="°C" series={[{ nombre: 'TI-2011', valores: hueco }]} escala={CIEN} banda={[0, 85]} alarmas={[85]} estado="sin-dato" ejeX={['21 sept', 'hoy']} ancho={240} /></Celda>
          <Celda estado="sin-comunicacion" ejemplo><Tendencia titulo="Cojinete" ventana="12 d" unidad="°C" series={[{ nombre: 'TI-2011', valores: perdida }]} escala={CIEN} banda={[0, 85]} alarmas={[85]} estado="sin-comunicacion" desde="14:07" ejeX={['21 sept', 'hoy']} ancho={240} /></Celda>
          <Celda estado="parado"><Tendencia titulo="Diferencial" ventana="12 d" unidad="psi" series={[{ nombre: 'PDI-2011', valores: pdi }]} escala={{ min: 100, max: 300, firmada: false }} estado="parado" paradaDesde={9} ejeX={['21 sept', 'hoy']} ancho={240} /></Celda>
        </Fila>
        <div className="mt-5 flex flex-wrap items-center gap-6">
          <Tendencia titulo="Una placa" ventana="12 d" unidad="psi" compacta series={[{ nombre: 'PI-2010', valores: serie }]} escala={ESCALA} banda={[10, 30]} ancho={130} alto={30} />
          <Tendencia titulo="Dos trazas" ventana="12 d" unidad="psi" series={[{ nombre: 'medido', valores: serie }, { nombre: 'proyección', valores: serie.map(v => v + 3), proyectado: true }]} escala={ESCALA} ejeX={['21 sept', 'hoy']} ancho={300} />
        </div>
        {/* D2 · El modo detalle (el modal): a lo ancho, más marcas, el rango escrito, mínimo y máximo en la leyenda.
            Pase el cursor, toque y arrastre, o llegue con Tab y use las flechas: la ficha con la fecha y cada valor. */}
        <div className="mt-5" data-muestra-detalle="">
          <Tendencia titulo="Cojinete y succión" ventana="12 d" unidad="°C" detalle alto={260}
            series={[{ nombre: 'TI-2011', valores: hueco }, { nombre: 'Referencia', valores: sube.map(v => v - 6), trazo: 'punteado' }, { nombre: 'Proyección', valores: [], proyectado: true, puntos: [[11, 73], [14, 88]] }]}
            escala={CIEN} banda={[0, 85]} alarmas={[85]} hasta={14} hoy={11} ejeX={['21 sept', '+3 d']} tiempo={{ desde: '2026-09-21T00:00:00-05:00', pasoH: 24 }} origen="TI-2011, ejemplo de estado" />
        </div>
      </Seccion>

      <Seccion titulo="2b · Columnas, barra contra la meta (con su ficha)">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Columnas periodos={[{ clave: '2026-07', rotulo: 'jul', segundo: '2026', valores: [2, 1, 0] }, { clave: '2026-08', rotulo: 'ago', valores: [1, 0, 1] }, { clave: '2026-09', rotulo: 'sept', valores: [0, 0, 0] }, { clave: '2026-10', rotulo: 'oct', valores: [3, 1, 1] }]}
              partes={['Bombas', 'Motores', 'Válvulas']} aria-label="Fallas por mes, ejemplo de estado" unidad="fallas" minimo={320} />
            <LeyendaColumnas partes={['bombas', 'motores', 'válvulas']} />
          </div>
          <div className="grid content-start gap-3">
            <ContraMeta rotulo="producción" valor={10700} unidad="bbl/d" meta={10900} rotuloMeta="meta 10.900" fuera origen="el libro, ejemplo de estado" />
            <ContraMeta rotulo="diferido" valor={600} unidad="bbl/d" meta={800} rotuloMeta="máximo 800" tipoMeta="máximo" />
          </div>
        </div>
      </Seccion>

      <Seccion titulo="3 · Símbolos de proceso">
        <div className="overflow-x-auto">
          <Esquema ancho={1000} alto={560} etiqueta="Los símbolos del kit en sus 5 estados">
            {ESTADOS_KIT.map((e, i) => {
              const x = 120 + i * 190
              const cond = e === 'anormal' ? 'alarma' as const : undefined
              return (
                <g key={e}>
                  <text x={x} y={20} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--tinta2)">{NOMBRE[e]}</text>
                  <Bomba x={x} y={70} estado={e} condicion={cond} rotulo="P-201B" />
                  <Tanque x={x - 24} y={130} ancho={48} alto={72} estado={e} condicion={cond} nivel={e === 'sin-dato' || e === 'sin-comunicacion' ? null : 89.6} limites={[[90, 'HH']]} />
                  <Valvula x={x} y={262} estado={e} condicion={cond} />
                  <Separador x={x - 56} y={300} estado={e} condicion={cond} />
                  <Pozo x={x} y={420} estado={e} condicion={cond} rotulo="LC-07" />
                  <Medidor x={x - 20} y={490} estado={e} condicion={cond} letras="FI" lazo="2011" valor={e === 'parado' ? 0 : e === 'anormal' ? 63070 : 74200} />
                </g>
              )
            })}
          </Esquema>
        </div>
        <div className="mt-4 overflow-x-auto">
          <Esquema ancho={760} alto={80} etiqueta="Los tramos del proceso">
            <Area x={10} y={20} texto="Pozos" />
            <Linea puntos={[[130, 42], [190, 42]]} fluido="multifasico" />
            <Area x={200} y={20} texto="Planta" estado="anormal" condicion="alarma" />
            <Linea puntos={[[320, 42], [380, 42]]} fluido="crudo" />
            <Area x={390} y={20} texto="Salida" estado="parado" />
            <Linea puntos={[[510, 42], [570, 42]]} fluido="agua" sinFlujo />
            <Area x={580} y={20} texto="Sin dato" estado="sin-dato" />
          </Esquema>
        </div>
      </Seccion>

      <div className="grid gap-5 lg:grid-cols-2">
        <Seccion titulo="4 · Una línea por fluido">
          <Esquema ancho={420} alto={180} etiqueta="Los trazos de cada fluido">
            {(Object.keys(TRAZO_FLUIDO) as Fluido[]).map((f, i) => (
              <g key={f}>
                <Linea puntos={[[10, 20 + i * 28], [130, 20 + i * 28]]} fluido={f} />
                <text x={146} y={24 + i * 28} fontSize={13} fill="var(--tinta)">{TRAZO_FLUIDO[f].nombre}</text>
              </g>
            ))}
            <Linea puntos={[[260, 20], [380, 20]]} fluido="agua" sinFlujo />
            <text x={260} y={44} fontSize={12} fill="var(--tinta2)">SIN FLUJO</text>
          </Esquema>
        </Seccion>
        <Seccion titulo="5 · Marca de estado">
          <div className="grid grid-cols-2 gap-3">{MARCAS.map(t => <Marca key={t} tipo={t} />)}</div>
        </Seccion>
      </div>

      <Seccion titulo="6 · La cifra">
        <Fila>
          <Celda estado="normal"><Cifra rotulo="Se deja de producir" valor={2650} unidad="bbl/d" tamano="principal" nota="ahora, 5 campos" /></Celda>
          <Celda estado="anormal"><Cifra rotulo="Producción por día" valor={10700} unidad="bbl/d" estado="anormal" condicion="aviso" nota="bajo la meta de 10.900 · La Ceiba" /></Celda>
          <Celda estado="sin-dato"><Cifra rotulo="Pérdida" valor={null} unidad="bbl" estado="sin-dato" nota="sin registro en octubre" /></Celda>
          <Celda estado="sin-comunicacion" ejemplo><Cifra rotulo="Caudal FI-2011" valor={74200} unidad="bbl/d" estado="sin-comunicacion" desde="14:07" /></Celda>
          <Celda estado="parado"><Cifra rotulo="Caudal FI-2011" valor={0} unidad="bbl/d" estado="parado" nota="P-201B parada" /></Celda>
        </Fila>
        {/* Se pide «principal», pero es proyectado: baja a apoyo y lleva su palabra. */}
        <div className="mt-5"><Cifra rotulo="Cierre del mes" valor={1222131} unidad="bbl" tamano="principal" calidad="proyectado" nota="meta 1.246.200" /></div>
      </Seccion>
    </main>
  )
}
