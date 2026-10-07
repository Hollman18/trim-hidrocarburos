/** Adaptador de país.
 *
 *  El núcleo es internacional: el modelo de cuatro cuellos de botella de
 *  NSTA/SPE, la eficiencia de producción de ISO/TS 3250, los códigos de falla
 *  de ISO 14224 y las casillas ReasonLost de PRODML. Lo que cambia de un país
 *  a otro son las unidades, las condiciones estándar y los límites de entrega.
 *
 *  Un cliente nuevo de otro país cambia esta configuración, no el código.
 */
export interface Region {
  id: string
  nombre: string
  /** Tasa de líquido. En Colombia se usa el promedio por día calendario. */
  tasaCrudo: string
  tasaAgua: string
  tasaGas: string
  volumen: string
  /** Condiciones estándar de referencia para volúmenes. */
  condiciones: string
  /** Límites de entrega. Son del contrato o del regulador, nunca del núcleo. */
  limites: Array<{ que: string; valor: string; origen: string }>
  /** Celular nacional para WhatsApp: si se escribe sin indicativo, se le pone. */
  celular?: { indicativo: string; patron: RegExp }
}

export const REGIONES: Record<string, Region> = {
  internacional: {
    id: 'internacional', nombre: 'Internacional',
    tasaCrudo: 'bbl/d', tasaAgua: 'bwpd', tasaGas: 'MMscf/d', volumen: 'bbl',
    condiciones: '14,696 psia · 60 °F',
    limites: [
      { que: 'BS&W del crudo entregado', valor: 'según contrato de transporte', origen: 'contrato' },
      { que: 'Sal', valor: 'según contrato de transporte', origen: 'contrato' },
    ],
  },
  colombia: {
    id: 'colombia', nombre: 'Colombia',
    celular: { indicativo: '+57', patron: /^3\d{9}$/ },
    tasaCrudo: 'BPDC', tasaAgua: 'BWPD', tasaGas: 'KPCD', volumen: 'bbl',
    condiciones: '14,65 psia · 60 °F',
    limites: [
      { que: 'BS&W del crudo entregado', valor: '≤ 0,5 %', origen: 'Res. MME 40236 de 2022' },
      { que: 'Contenido de sal', valor: '≤ 20 PTB', origen: 'Res. MME 40236 de 2022' },
    ],
  },
}

/** Región del despliegue. Se declara una vez por cliente. */
export const region = REGIONES['colombia']!
