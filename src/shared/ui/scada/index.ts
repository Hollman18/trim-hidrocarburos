/* El kit SCADA de la v3 (docs/experiencia-v3/kit-scada.md), como componentes de React.
   Hoy no lo usa ninguna pantalla: lo montan las de la tanda B. La muestra con sus 5 estados
   está en src/shared/ui/scada/muestra.html (solo en desarrollo) y la prueba, en scripts/verificar-kit.mjs. */
export { Barra } from './Barra'
export { Tendencia, type SerieKit, type TrazoKit } from './Tendencia'
export { Bomba, Tanque, Valvula, Separador, Pozo, Medidor, Area, Linea, Esquema, type PropsSimbolo } from './Simbolos'
export { Marca } from './Marca'
export { Cifra, type CalidadCifra } from './Cifra'
export { ESTADOS_KIT, PALABRA_MARCA, TRAZO_FLUIDO, nombreDeEquipo, type EstadoKit, type CondicionKit, type Escala, type Banda, type MarcaKitTipo, type Fluido } from './tipos'
