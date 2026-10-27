/* R4 · Lo que comparten los guiones de accesibilidad y frontend.
   Usa el Playwright del proyecto (node_modules); no instala nada.
   Se corre desde la raíz del repo:  node docs/experiencia-v2/R-revision/herramientas/<guion>.mjs */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url))
export const { RUTAS, ASERCIONES } = await import(join(RAIZ, 'e2e/auditoria/rutas.ts'))

/** Los 9 roles que se ofrecen en el MVP (plan y cont son de v2: `ROLES_V2`). */
export const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'tec', 'reg', 'adm']
/** El inicio de cada rol (roles.ts, `inicio`), con un campo que el rol tiene. */
export const INICIOS = {
  ger: '#/ger/planta-viva/ceiba/curso', prod: '#/prod/planta-viva/ceiba/curso', sup: '#/sup/hoy/ceiba/curso',
  oper: '#/oper/hoy/ceiba/curso', jefe: '#/jefe/hoy/ceiba/curso', conf: '#/conf/equipos/morichal',
  tec: '#/tec/hoy/ceiba/curso', reg: '#/reg/regulatorio/ceiba/curso', adm: '#/adm/configuracion/ceiba/curso',
}

/** Introducción vista para todos los roles (la de un rol se salta con trim.intro.<rol>). */
export const SIN_INTRO = () => { try { for (const r of ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'plan', 'tec', 'cont', 'reg', 'adm']) localStorage.setItem(`trim.intro.${r}`, '1') } catch { /* about:blank no tiene localStorage */ } }

export const SALIDA = process.env.R4_SALIDA ?? '/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/r4/salida'
mkdirSync(SALIDA, { recursive: true })
export const guardar = (nombre, datos) => {
  const f = join(SALIDA, nombre)
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(f, typeof datos === 'string' ? datos : JSON.stringify(datos, null, 2))
  return f
}

export const lanzar = (o = {}) => chromium.launch({ headless: true, ...o })

/** Espera a que la pantalla tenga contenido y no quede nada «Cargando…» (como el auditor). */
export async function lista(page, ms = 15_000) {
  await page.waitForFunction(() => !document.querySelector('[data-cargando]') && (document.querySelector('main')?.innerText ?? '').length > 80, undefined, { timeout: ms }).catch(() => {})
}

export const esperar = ms => new Promise(r => setTimeout(r, ms))
