/* El kit SCADA de la v3 (docs/experiencia-v3/kit-scada.md), como componentes de React. Es el ÚNICO
   lugar que dibuja un indicador, una barra o una gráfica: cada <svg> suyo lleva `data-kit`, y el
   auditor (e2e/auditoria/detector.ts, «kit») marca cualquier otro <svg> que no sea un ícono o una
   marca (K3, P-01). La muestra con sus 5 estados está en src/shared/ui/scada/muestra.html (solo en
   desarrollo) y la prueba, en scripts/verificar-kit.mjs. */
export { Barra } from './Barra'
export { Tendencia, type SerieKit, type TrazoKit } from './Tendencia'
export { Bomba, Tanque, Valvula, Separador, Pozo, Medidor, Area, Linea, Esquema, MuestraFluido, type PropsSimbolo } from './Simbolos'
export { ContraMeta } from './ContraMeta'
export { Columnas, LeyendaColumnas, type PeriodoColumna } from './Columnas'
export { Marca } from './Marca'
export { Cifra, type CalidadCifra } from './Cifra'
export { ESTADOS_KIT, PALABRA_MARCA, TRAZO_FLUIDO, nombreDeEquipo, type EstadoKit, type CondicionKit, type Escala, type Banda, type MarcaKitTipo, type Fluido } from './tipos'
