/* El demo construido (proyecto «demo»: dist/ servido por demo/servidor.mjs
   con su Content-Security-Policy) carga cada pantalla por partes: si la
   política bloqueara un trozo o un paquete faltara, la pantalla quedaría sin
   su contenido o la página lanzaría un error. */
import { test } from './apoyo.ts'

test('el demo construido carga cada pantalla', async ({ flujo: f }) => {
  // Lo que la política bloquea no lanza una excepción: el navegador lo dice
  // en la consola. Aquí cuenta como error de la página.
  f.page.on('console', m => { if (m.type() === 'error') f.errores.push(`console.error ${m.text().slice(0, 160)}`) })
  await f.abrir('/#/oper/causa/ceiba/curso')
  for (const [ruta, debe] of [
    ['#/oper/causa/ceiba/curso', 'Ver mi chat de WhatsApp'],
    ['#/conf/confiabilidad/morichal/curso', 'Lo que anunció y en qué quedó'],
    ['#/adm/conectores/ceiba/curso', 'SISTEMAS CORPORATIVOS'],
    ['#/prod/produccion/ceiba/curso', 'Cuadre · asignación oficial'],
    ['#/ger/resultados/ceiba~portafolio/curso', 'no se produjeron en sus 5 campos'],
  ] as const) {
    await f.ir(ruta); await f.esperar(900)
    const t = await f.texto()
    f.ok(t.includes(debe), `demo construido · ${ruta}: carga su pantalla («${debe}»)`)
  }
  f.cerrar()
})
