/* Cabeceras de seguridad de la aplicación construida. Una sola fuente: las
   usan el servidor del demo (servidor.mjs), el simulador autónomo
   (simulador-api/indice.mjs) y el build, que pone la misma política como
   <meta> en index.html (vite.config.ts). El servidor que publique el front en
   producción tiene que mandar estas mismas cabeceras (README, «Despliegue»).

   No hay hoy ningún sumidero de XSS en el código; esto es defensa en
   profundidad para el día en que entre uno. Sin dependencias: solo Node. */
import { createHash } from 'node:crypto'

/** Huella SHA-256 de cada <script> EN LÍNEA del HTML (el que evita el
 *  destello de tema). Se calcula del HTML que se sirve, no se copia a mano:
 *  si el script cambia, la huella cambia con él. */
export const huellasDeScripts = html =>
  [...html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`)

/** La política. Scripts: solo los del propio origen y los en línea con su
 *  huella; nada de eval. Estilos: 'unsafe-inline' porque el membrete del
 *  informe impreso escribe un <style> con el pie de página de cada hoja
 *  (@page, widgets/informe/Membrete.tsx) y su texto cambia con el informe; un
 *  estilo no ejecuta código. Imágenes data:/blob: por las exportaciones CSV.
 *  `frame-ancestors` no vale dentro de un <meta>: solo va en la cabecera.
 *  `api`: el origen del backend cuando el build lo pide a otro dominio
 *  (VITE_API_URL absoluta): sin él, la política bloquearía cada pedido. */
export function politica(html, { meta = false, api } = {}) {
  const directivas = [
    "default-src 'self'",
    `script-src 'self' ${huellasDeScripts(html).join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${api ? ` ${api}` : ''}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    ...(meta ? [] : ["frame-ancestors 'none'"]),
  ]
  return directivas.join('; ')
}

/** Cabeceras para toda respuesta. Con el HTML de la página, la política
 *  lleva las huellas de sus scripts; sin él (un .js, una fuente) basta la base. */
export const cabecerasSeguridad = (html = '') => ({
  'content-security-policy': politica(html),
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  // Para navegadores que no entienden frame-ancestors: nadie la mete en un
  // iframe para hacer clic por encima de «Firmar como…».
  'x-frame-options': 'DENY',
  'cross-origin-opener-policy': 'same-origin',
})
