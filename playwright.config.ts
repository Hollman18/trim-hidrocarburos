/* Pruebas de navegador (e2e/) con Playwright.

   Proyectos:
   - «dev»: los flujos y el auditor contra `npm run dev` (front + simulador de
     la API), en Chrome y en todos los anchos. Con TRIM_URL se corren contra
     otra dirección ya levantada (por ejemplo el front con VITE_FUENTE=http
     frente a un backend) y no se levanta nada.
   - «safari» y «firefox»: lo mismo en escritorio (1280 px) con los otros dos
     motores, donde cambian la medida del texto, el foco y la política.
   - «iphone»: Safari de teléfono, a 390 px, solo el auditor y la interfaz:
     es donde el operario abre el chat de WhatsApp. Firefox no tiene modo
     teléfono (`isMobile`); los anchos de teléfono los cubren Chrome y Safari.
   - «demo» y «demo-iphone»: la aplicación construida, servida como se
     entrega, con demo/servidor.mjs y su política de seguridad
     (e2e/servir-demo.mjs la construye y la arma en una carpeta temporal), en
     Chrome y en Safari de teléfono.

   Cada prueba abre un contexto de navegador nuevo: el estado de la
   aplicación vive en la página, así que las pruebas no se pisan y pueden
   correr a la vez. */
import { defineConfig, devices } from '@playwright/test'

const URL_DEV = (process.env.TRIM_URL ?? 'http://localhost:5173').replace(/\/$/, '')
// Un puerto distinto del 4173 del demo: el que se está mostrando no se toca.
const PUERTO_DEMO = Number(process.env.TRIM_PUERTO_DEMO ?? 4199)
const URL_DEMO = `http://127.0.0.1:${PUERTO_DEMO}`
const CI = !!process.env.CI
/** Safari y Firefox de escritorio no repiten los anchos que ya cubre Chrome. */
const OTROS_ANCHOS = /\b(1512|1024|768|390|320) px/
const ESCRITORIO = { viewport: { width: 1280, height: 900 } }

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'e2e/.resultados',
  fullyParallel: true,
  forbidOnly: CI,
  // Los flujos esperan tiempos fijos tras cada paso; con más páginas a la vez
  // el servidor de desarrollo responde más lento y esos tiempos no alcanzan.
  // En CI la máquina tiene 2 núcleos (repositorio privado).
  workers: CI ? 2 : 4,
  timeout: 180_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['html', { outputFolder: 'e2e/.informe', open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 900 },
    // Una acción que no puede hacerse (botón tapado, campo cerrado) falla
    // pronto y con su motivo, en vez de agotar el tiempo de la prueba.
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'dev', testIgnore: /demo-construido/, use: { baseURL: URL_DEV } },
    { name: 'safari', testIgnore: /demo-construido/, grepInvert: OTROS_ANCHOS, use: { ...devices['Desktop Safari'], ...ESCRITORIO, baseURL: URL_DEV } },
    { name: 'firefox', testIgnore: /demo-construido/, grepInvert: OTROS_ANCHOS, use: { ...devices['Desktop Firefox'], ...ESCRITORIO, baseURL: URL_DEV } },
    { name: 'iphone', testIgnore: /demo-construido/, grep: /\b390 px/, use: { ...devices['iPhone 14'], baseURL: URL_DEV } },
    { name: 'demo', testMatch: /demo-construido/, use: { baseURL: URL_DEMO } },
    { name: 'demo-iphone', testMatch: /demo-construido/, use: { ...devices['iPhone 14'], baseURL: URL_DEMO } },
  ],
  webServer: [
    ...(process.env.TRIM_URL ? [] : [{
      command: 'npm run dev -- --port 5173 --strictPort',
      // Las pruebas son del demo: un .env.local con VITE_FUENTE=http no las cambia de fuente.
      env: { VITE_FUENTE: 'demo' },
      url: URL_DEV,
      reuseExistingServer: !CI,
      timeout: 120_000,
    }]),
    {
      command: 'node e2e/servir-demo.mjs',
      url: URL_DEMO,
      env: { PUERTO: String(PUERTO_DEMO), VITE_FUENTE: 'demo' },
      reuseExistingServer: !CI,
      timeout: 180_000,
      // Así servir-demo.mjs alcanza a apagar el servidor y borrar su carpeta.
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
  ],
})
