import { useCtx, useVersiones, useSesion } from './sesion'
import { useDato, versionDe } from './consulta'
import { guardadasDe } from './arbol'
import { RESULTADOS } from './contrato'
import { pedirOrdenesSap, pedirRelojes } from './sap'
import { pedirPredicciones } from './predicciones'
import { pedirInicioDeHistoria } from './calendario'
import { useRiesgo, useEstadoCampos } from './diferidos'
import { useMemo } from 'react'
import {
  resultados, cifrasDeUnNombre, NOMBRE_CIFRA,
  type ConsultaResultados, type VistaResultados, type SeccionResultados, type MesResultados, type CifrasDeUnNombre,
} from '@/entities/resultados'
import type { BorradorClasificacion } from '@/entities/anh-clasificacion'
import type { Contexto } from '@/entities/causa-senal'
import type { Historial } from '@/entities/choke'
import { AHORA } from '@/entities/reloj'

/** C5 · LA COSTURA DE «RESULTADOS» (X4 §4.8; CONTRATO.md · «C5 · Resultados»).
 *
 *  `GET /api/vistas/resultados?rol=&campos=&desde=&hasta=`: lo que pasó en el
 *  período y si está bajando, en una sola lectura. El servidor junta lo que ya
 *  calcula para La planta viva (el diferido, la producción, el mes a mes, por
 *  equipo, «¿está bajando?», lo que se puede mover), el libro y su reparto por
 *  tramo cada mes, las órdenes de SAP (el mantenimiento proactivo) y, para quien
 *  los usa, los tres relojes y el registro del vigía (los mismos de
 *  Confiabilidad). El motor (`resultados`, entities/resultados.ts) dice qué ve
 *  cada rol y en qué orden. `rol` es el de la persona (con el servidor, el del token).
 *
 *  Las pantallas leen `useResultados` y `useCifrasDeUnNombre`. Nadie en
 *  pages/widgets llama `pedirResultados` (oxlint). */

export { NOMBRE_CIFRA }
export type { ConsultaResultados, VistaResultados, SeccionResultados, MesResultados, CifrasDeUnNombre }

/** Lo que el servidor tiene de la sesión para esta vista. */
export interface SesionResultados { ctx: Contexto; versiones: Historial | undefined; clasificacionesAnh?: Record<string, BorradorClasificacion> }

const QUIEN_MIRA_EL_VIGIA = new Set(['jefe', 'conf', 'plan'])

/** `GET /api/vistas/resultados?rol&campos&desde&hasta` · la respuesta del demo: la misma fórmula que el backend. */
export function pedirResultados(q: ConsultaResultados, s: SesionResultados): VistaResultados {
  const { ctx, versiones } = s
  const campos = [...new Set(q.campos)]
  const vigila = QUIEN_MIRA_EL_VIGIA.has(q.rol)
  // Los tres relojes, en toda la historia (los de Confiabilidad y de Hoy del jefe).
  const r = vigila ? pedirRelojes(campos, pedirInicioDeHistoria(), AHORA, ctx) : undefined
  const pr = vigila ? pedirPredicciones(campos, ctx, versiones ?? []) : undefined
  const vencidas = pr?.registro.filter(p => p.calificacion !== 'seguimiento') ?? []
  const aciertos = vencidas.filter(p => p.calificacion === 'acierto')
  const anticipo = aciertos.map(p => (new Date(p.falla!.inicio).getTime() - new Date(p.emitida).getTime()) / 86_400_000)
  const vigiladas = pr?.fallas.filter(f => f.visibilidad === 'vigilada') ?? []
  return resultados({ ...q, campos }, ctx, versiones, {
    guardadas: guardadasDe(s.clasificacionesAnh ?? {}),
    ordenes: pedirOrdenesSap(campos, ctx),
    ...(r ? { relojes: { fallas: r.fallas, ...(r.totalH !== undefined ? { totalH: r.totalH } : {}), ...(r.activaH !== undefined ? { activaH: r.activaH } : {}), ...(r.esperaH !== undefined ? { esperaH: r.esperaH } : {}) } } : {}),
    ...(pr ? { vigia: {
      aciertos: aciertos.length, falsas: vencidas.filter(p => p.calificacion === 'falsa-alarma').length,
      intervenidas: vencidas.filter(p => p.calificacion === 'intervenida').length,
      seguimiento: pr.registro.filter(p => p.calificacion === 'seguimiento').length,
      anticipoDias: anticipo.length ? anticipo.reduce((a, b) => a + b, 0) / anticipo.length : null,
      anunciadas: vigiladas.filter(f => aciertos.some(p => p.falla?.id === f.falla.id)).length, vigiladas: vigiladas.length,
    } } : {}),
  })
}

/** Resultados del rol que se ve, en sus campos y su período. */
export function useResultados(q: ConsultaResultados): VistaResultados {
  const ctx = useCtx(), versiones = useVersiones(), clasificacionesAnh = useSesion(s => s.clasificacionesAnh)
  return useDato(RESULTADOS, q, `${versionDe(ctx)}.${versionDe(versiones)}.${versionDe(clasificacionesAnh)}`,
    () => pedirResultados(q, { ctx, versiones, clasificacionesAnh }))
}

/** «Un nombre, una cifra» (X4 §1.3.3): lo que se deja de producir ahora (el total),
 *  lo de las bombas paradas, los equipos que avisan y la exposición, con la regla
 *  del motor. Sale del riesgo de ahora (`/vistas/riesgo`) y del estado de cada
 *  campo: no es un endpoint nuevo. */
export function useCifrasDeUnNombre(campos: string[]): CifrasDeUnNombre {
  const riesgo = useRiesgo(campos), estados = useEstadoCampos(campos)
  return useMemo(() => cifrasDeUnNombre(riesgo, estados), [riesgo, estados])
}
