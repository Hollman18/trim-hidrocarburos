# X1 · Identidad: referentes, diagnóstico y tres direcciones

**25-oct-2026 · X1, director de identidad del equipo de diseño.** Sigue el `BRIEF.md` de esta carpeta. No toca código del producto: las capturas, las paletas medidas y los prototipos están en el scratchpad del equipo:

- `SCR = /private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/ux/X1`
- capturas propias de la app en `SCR/app/`; referentes en `SCR/referentes/`; paletas y su medición en `SCR/paletas/`; prototipos de las tres direcciones en `SCR/prototipos/`; scripts en `SCR/scripts/` (`contraste.mjs` mide WCAG 2.2 y la separación de los colores con daltonismo).

Cada afirmación sobre una empresa, una norma o una fuente lleva su enlace. Lo que no se pudo comprobar dice **NO VERIFICADO**. Las cifras de contraste las calculé yo con la fórmula de WCAG 2.2 (luminancia relativa); la separación entre colores es la distancia en OKLab ×100 con visión normal y con la simulación de Machado, Oliveira y Fernandes (2009) para protanopía, deuteranopía y tritanopía. Una distancia menor que 5 se confunde; desde 10 se separa a simple vista.

## Índice

1. [Nubank a fondo](#1-nubank-a-fondo)
2. [Otros referentes](#2-otros-referentes)
3. [Lo que TRIM ya tiene](#3-lo-que-trim-ya-tiene)
4. [Tres direcciones de identidad](#4-tres-direcciones-de-identidad)
5. [Recomendación](#5-recomendación)
6. [Desacuerdos](#6-desacuerdos)
7. [Referencias visuales y fuentes](#7-referencias-visuales-y-fuentes)
8. [Resumen](#8-resumen)

## 1. Nubank a fondo

Nubank es fácil por tres cosas que se pueden comprobar: una misión escrita contra la complejidad («O Nubank nasceu para acabar com a complexidade dos bancos tradicionais», [ficha del App Store](https://apps.apple.com/br/app/nubank-conta-cart%C3%A3o-e-mais/id814456780)), palabras sin jerga y un sistema de diseño que se vigila. El morado es un acento, no un relleno. Y la simplicidad no se sostiene sola: la reorganizaron en 2018, 2021 y 2022, y aun así en 2022 hubo usuarios que decían que el app «Foi se tornando Frankstein» ([foro de Tecnoblog](https://tecnoblog.net/comunidade/t/voces-acham-a-interface-do-nubank-facil/54207)).

Abrí yo, para confirmarlas, las citas de dos artículos de Building Nubank de 2018 que son distintos y tienen autores distintos: Guilherme Neumann, «Designing a multi-product experience» (13-jun-2018: la portada, las más de 100 sesiones y el «fake loader»), y Lucas Neumann, la parte II de la cuenta NuConta (15-mar-2018: la revelación progresiva y el «free of jargon»). También abrí las del nuevo logo (17-may-2021), el Brand Refresh (10-jun-2026), el NPS (resultados del 2T22) y David Vélez (Rest of World). El resto viene de la investigación del equipo, con sus enlaces. Capturas en `SCR/referentes/nubank-*.png`.

### 1.1 Qué hace que «cualquiera lo entienda»

| Eje | Qué hace Nubank | Evidencia |
|---|---|---|
| **Una cosa por pantalla** | En 2018 la portada debía ser «helpful, contextual, simple at-a-glance», con las acciones «close to their thumbs»; hicieron más de 100 sesiones de prueba hasta un 85 % de éxito en tareas. En 2021 la portada dejó las tarjetas por secciones: primero el saldo y cuatro atajos (Pix, Pagar, Transferir, Depositar). En 2022 el app pasó a tres pestañas: «we have the challenge of keeping the experience simple, intuitive, and organized» (Hugh Strange). Los contratos se explican pantalla por pantalla, con ilustración y narración en audio. | [G. Neumann, Building Nubank, 13-jun-2018](https://building.nu.com/designing-a-multi-product-experience/) · [MacMagazine, 2021](https://macmagazine.com.br/post/2021/07/20/app-do-nubank-agora-conta-com-tela-inicial-repaginada/) · [Nu, 2022](https://nu.com/en/newsroom/consumers/nubank-app-organizes-routine-in-transactions-planning-and-shopping) · [blog Nubank](https://blog.nubank.com.br/atendimento-nubank-acessivel/) |
| **La cifra grande y su frase** | Una etiqueta corta y debajo la cifra: «Conta R$ 1.356,98», «Fatura atual R$ 1.094,80» (`SCR/referentes/nubank-appstore.png`). La cifra es la del usuario, nunca un ejemplo: con montos fijos de ejemplo, «People with lower incomes might freeze when they look at monthly R$1.000 deposits». El ojo de la franja esconde saldo y factura, y el «Modo Rua» esconde inversiones fuera del wifi seguro. | [App Store](https://apps.apple.com/br/app/nubank-conta-cart%C3%A3o-e-mais/id814456780) · [Building Nubank, parte II](https://building.nu.com/how-we-designed-our-bank-account-nubanks-account-part-ii/) · [Canaltech](https://canaltech.com.br/apps/aplicativo-do-nubank-esta-de-visual-novo-saiba-tudo-que-mudou-190302/) · [TI Inside](https://tiinside.com.br/12/03/2024/nubank-amplia-modo-rua-para-area-de-investimentos-do-app/) |
| **Revelación progresiva** | «The UI progressively displays information in a way that it is there when you need it, but only when and if you need it.» La página de tarifas son acordeones con una línea por tarifa (`SCR/referentes/nubank-tarifas-contrato.png`). En 2018 hicieron un «fake loader for first-time users» que explicaba la estructura del app mientras cargaba. | [L. Neumann, parte II, 15-mar-2018](https://building.nu.com/how-we-designed-our-bank-account-nubanks-account-part-ii/) · [Contratos e tarifas](https://nubank.com.br/contrato/) · [G. Neumann, 13-jun-2018](https://building.nu.com/designing-a-multi-product-experience/) |
| **Textos humanos** | «Designing for financial services is about getting the words right as much as it is about getting screens right.» La cuenta es «100% free of jargon and acronyms». Pentagram describe su voz como «frank and human»; el caso de Figma, «simple, transparent, and human». Guía de voz pública: **NO VERIFICADO**. | [Parte I](https://building.nu.com/how-we-designed-our-bank-account-nuconta-part-i/) · [Parte II](https://building.nu.com/how-we-designed-our-bank-account-nubanks-account-part-ii/) · [Pentagram](https://www.pentagram.com/work/nubank/story) · [Figma](https://www.figma.com/customers/nubank-design-system-accessible-experiences-with-figma/) |
| **El morado como identidad** | David Vélez lo escogió para ser «the most anti-bank possible»: «Some people absolutely hated it … some people absolutely loved it, but nobody ignored it.» Empezaron con «12 purple credit cards». En 2021 vino «a slightly different purple»; en el Brand Refresh de 2026, hecho con Koto: «O roxo continua sendo o coração do Nubank» y «A paleta evoluiu de uma cor dominante para um sistema estruturado, com hierarquia clara». No hay hex oficial publicado: el 25-oct-2026 el CSS de nubank.com.br declara `--colors-brand-core-P: #8D0DE3` y el de nu.com.co, `#820AD1`. **Cuánto ocupa:** el app pasó en 2021 del fondo morado a «uma curta faixa roxa»; en la primera pantalla de sus sitios el morado mide 2,4 % (escritorio), 7,1 % (móvil), 1,8 % (Colombia) y 1,2 % (tarifas): solo el logo y los botones, sobre blanco o arena #F3EFE6. | [Rest of World](https://restofworld.org/2020/david-velez-nubank/) · [carta a accionistas](https://nu.com/en/newsroom/company/a-letter-from-the-ceo-to-our-shareholders) · [nuevo logo, 2021](https://building.nu.com/new-logo-nubank/) · [Brand Refresh, 2026](https://blog.nubank.com.br/brand-refresh-como-renovamos-a-identidade-visual-do-nubank/) · [Canaltech](https://canaltech.com.br/apps/aplicativo-do-nubank-esta-de-visual-novo-saiba-tudo-que-mudou-190302/) · medición del equipo en `SCR/scripts/` |
| **Movimiento y tacto** | Las ilustraciones se animan en Rive; la regla de su sistema de ilustración es que el movimiento «should be use with purpose to not distract the users». Sus vacantes de motion exigen respetar `prefers-reduced-motion`. En 2018, el perfil quedaba «Easy to access with one simple gesture». Háptica: **NO VERIFICADO**. | [illo](https://illo.tv/nubank-illustration-system) · [NuIS](https://work.fernandomarar.com/NuIS-Nu-Illustration-System) · [vacante](https://careers.base10.vc/companies/nubank/jobs/92288941-senior-motion-designer) |
| **El onboarding** | La web arranca con un solo campo: «Digite seu CPF» → «Continuar»; en Colombia, «Tu correo electrónico» (`SCR/referentes/nubank-colombia-home.png`). La cuenta se abre «with a few taps, no credit analysis». Un estudio de idwall (2023) le dio el mejor onboarding de 23 bancos. Los pasos de documento y selfie: **NO VERIFICADO**. | [nubank.com.br](https://nubank.com.br/) · [nu.com.co](https://nu.com.co/) · [Parte II](https://building.nu.com/how-we-designed-our-bank-account-nubanks-account-part-ii/) · [BP Money](https://bpmoney.com.br/?p=135292) |
| **La confianza** | Todas las tarifas en una página, también las caras (rotativo de 2,75–19,99 % mensual). La campaña #AsteriscoNão (2019) contra la letra pequeña: «Fizemos um pente fino em todas as nossas peças de comunicação e criamos um guia». La seguridad se explica con analogías («Modo Rua», como el modo avión; en Colombia, «Modo Tranqui»). NPS de «about 90 points» en México y Colombia; 4,8 con 1,7 millones de valoraciones en el App Store. | [Contratos e tarifas](https://nubank.com.br/contrato/) · [Meio & Mensagem](https://www.meioemensagem.com.br/marketing/manifesto-do-nubank-pede-o-fim-da-letra-miuda-na-publicidade) · [Nu, Modo Rua](https://nu.com/en/newsroom/company/nubank-launches-modo-rua-an-innovative-safety-feature-that-simplifies-setting-transaction-limits) · [resultados 2T22](https://building.nu.com/nu-results-q2-2022/) |

**Lo demás de su sistema.** Tipografía propia, **NuSans** (Display para títulos y Text para la interfaz), dibujada desde el lazo entre la «n» y la «u» del logo; la Text conserva métricas cercanas a la fuente anterior para no romper pantallas ([Brand Refresh](https://blog.nubank.com.br/brand-refresh-como-renovamos-a-identidade-visual-do-nubank/)). Sistema de diseño **NuDS** en Figma: más de 100 componentes, 80 % de las pantallas lo cumple y un plugin revisa la adherencia; «Every component is designed to support screen readers, responsive text resizing, and color contrast standards» ([Figma](https://www.figma.com/customers/nubank-design-system-accessible-experiences-with-figma/)). Tema oscuro desde el 20-abr-2023, siguiendo la configuración del teléfono ([Nu](https://nu.com/es/sala-de-prensa/clientes/el-modo-oscuro-ya-esta-disponible-en-la-app-de-nubank)). Guía de iconografía pública: **NO VERIFICADO**.

### 1.2 Los principios que sí se llevan a una herramienta industrial

1. **Una pregunta por vista.** Cada pantalla abre respondiendo la pregunta de ese rol: «¿cuánto se está dejando de producir ahora y por qué?». Es la versión industrial de «una cosa por pantalla», y encaja con la jerarquía de niveles 1 a 4 de las pantallas de alto desempeño (§2.2).
2. **Una cifra con su etiqueta corta y su unidad, y que sea la del usuario.** «Se dejan de producir ahora · 1.966 bbl/d» en su campo y su turno, nunca un ejemplo genérico. Un solo héroe por pantalla, y medido (§4.0, punto 9).
3. **Lo demás, cuando se pide.** Los cálculos, los supuestos y las salvedades van detrás de la ⓘ, de «ver N más» o de la ficha; nunca en párrafos en la primera capa (el contraejemplo es `SCR/app/42-agua-tuberia.png`).
4. **Sin jerga ni siglas en la primera capa.** «¿Dónde se trabó?» y no `choke_mod`; los códigos de la circular solo en Regulatorio.
5. **Un color de marca con un solo significado, poco y con arquitectura.** El morado de Nubank ocupa entre 1 y 7 % de la pantalla. El índigo de TRIM también va poco y solo en el marco: la atención es de lo anormal.
6. **Movimiento con propósito** y respeto a `prefers-reduced-motion`.
7. **Un primer día de un solo campo.** La primera vez, TRIM muestra la pantalla del rol con su única pregunta y señala dónde mirar; no un párrafo en un modal (`SCR/app/30-intro-ger.png`).
8. **La confianza por transparencia.** Como la página de tarifas con todo, también lo caro: TRIM ya dice «calculado», el rango, «falta» y «sin identificar» (U2 §0, punto 5: «nada se reparte para que cuadre»). Es su #AsteriscoNão, y hay que hacerlo visible, no esconderlo en 10 px.
9. **La simplicidad se gobierna.** NuDS tiene un plugin que revisa la adherencia; TRIM ya tiene el auditor de desbordes y las aserciones (`e2e/auditoria/rutas.ts`). Falta el equivalente para la identidad: que ninguna pantalla use un color fuera de los tokens ni un estado fuera de la guía.

### 1.3 Lo que NO se lleva, y por qué

1. **El morado como color de marca.** En las pantallas de proceso el magenta o morado siempre es un color de estado, aunque cada fabricante le dé un significado distinto: TRIM lo usa para el dato en el que no se puede confiar (`--invalido`; Adair pidió «moradito con falla de comunicación»), la librería de AVEVA lo usa para la alarma de severidad 4 y Honeywell pinta de rosa el borde de una variable fuera de su rango normal (§2.2; `SCR/referentes/hmi-aveva-sa-medidor-y-alarmas.png`, `hmi-honeywell-experion-nivel1-asm.png`). Una marca morada diría en cada pantalla «algo anda mal con esto». TRIM tiene su propio color, el índigo del isotipo, que medí lejos del magenta (§4.0).
2. **Ocultar cifras** (el ojo, el Modo Rua). En operación una variable escondida es un riesgo. TRIM restringe por rol, que ya lo hace (cap. 8.12), y nunca enmascara.
3. **Animación decorativa, ilustraciones emotivas, contadores que suben.** En una pantalla de alto desempeño el movimiento es un aviso: si se mueve algo normal, el aviso pierde fuerza.
4. **Promociones y novedades en la portada** («Novidade!», «Descubra mais»). En una vista de nivel 1 son ruido.
5. **«Una cosa por pantalla» al pie de la letra en la sala de control.** El supervisor necesita una vista general densa; por eso el principio es «una pregunta por vista».
6. **El tono juguetón.** Se lleva el «sin jerga»; no se llevan el saludo ni el humor. Las alarmas usan vocabulario fijo.
7. **Los fondos pastel de la paleta secundaria** del Brand Refresh (`SCR/referentes/nubank-brand-refresh-color.png`): competirían con los tintes de las alarmas.
8. **El tema como preferencia libre en la sala de control.** Allí el fondo lo fija la guía de estilo del sitio, y ningún tema puede cambiar el significado de un color. En la oficina y en el teléfono sí puede seguir al sistema, como hace Nubank.

## 2. Otros referentes

Abrí yo las fuentes que más pesan en las direcciones: el artículo de color accesible de Stripe, la guía de diseño de Vercel, la página de Aura de Cognite y la regla de color de Tractian (esta última es una página que se arma con JavaScript: la leí renderizada con Playwright, `SCR/scripts/verificar-tractian.mjs`). El resto viene de la investigación del equipo, con su enlace.

### 2.1 Producto y fintech

| Referente | Qué hace | TRIM toma | TRIM no toma |
|---|---|---|---|
| **Revolut** (`SCR/referentes/revolut-home.png`, `revolut-analiticas.png`) | La portada muestra «all your money on the sleek home screen» ([Revolut 10, 10-oct-2023](https://www.revolut.com/blog/post/revolut-10/)). Las analíticas comparan «Spent» e «Income» con el período anterior, con ventanas de 1 semana a 1 año y desglose por categoría, comercio o país ([ayuda de Revolut](https://help.revolut.com/en-US/help/accounts/budget-and-analytics/how-can-i-see-my-spending-and-income-analytics/)). La tarjeta se congela y descongela «in seconds». | La cifra que responde, comparada con el período anterior; el selector de ventana; el desglose por causa, campo y pozo; las acciones reversibles en un toque. | Los fondos y temas que escoge el usuario (en TRIM el color significa algo), los degradados morados y la foto. |
| **Linear** (`SCR/referentes/linear-home.png`) | Rehízo su interfaz en 2024: los temas salen de tres entradas, «base color, accent color, and contrast», en LCH y no en HSL; redujo «how much chrome (blue in our case)» para verse «more neutral and timeless»; más jerarquía y densidad ([Linear, 28-mar-2024](https://linear.app/now/how-we-redesigned-the-linear-ui)). Teclado primero: Cmd+K, «G» y luego «I», «?» para ver los atajos ([guía](https://linear.app/enablement/guides/navigating-linear)). Su método dice «Aim for clarity… Don't invent terms» ([Linear Method](https://linear.app/method/introduction)). | Generar cada tema desde pocas entradas en un espacio de color perceptual (OKLCH), con el contraste como perilla para un modo sol sin rediseñar. Acento casi ausente. Atajos de teclado para los roles de escritorio. No inventar términos. | Que el usuario genere temas, la densidad de 13 px en el teléfono y el negro del sitio comercial. |
| **Stripe** (`SCR/referentes/stripe-accessible-color-systems.png`) | En 2019 auditó su paleta: «none of the default text colors we were using for small text (except for black) met the contrast threshold». La reconstruyó en CIELAB con una regla: «Any two colors are guaranteed to have sufficient contrast for small text if they are at least five levels apart», y cuatro niveles para íconos y texto grande ([Koopersmith y Miner, 15-oct-2019](https://stripe.com/blog/accessible-color-systems)). Su guía de apps limita los colores por elemento ([Stripe Apps](https://docs.stripe.com/stripe-apps/design)), pone la cifra arriba de la gráfica («so users get the answer before checking the trend») y da la misma altura a los estados de carga, error, vacío y con datos ([patrón de gráficas](https://docs.stripe.com/stripe-apps/patterns/chart-layout)). | La regla de «N pasos de distancia = contraste asegurado» para la rampa de grises; la cifra arriba y la tendencia abajo; **los cuatro estados a la misma altura**, que es justo lo que pide el auditor de desbordes de TRIM; un juego cerrado de tokens para quien construye. | El verde de «éxito» para lo bueno y su tipografía (Söhne). |
| **Vercel · Geist** (`SCR/referentes/vercel-geist-colors.png`) | Diez escalas de diez pasos, cada paso con un papel fijo: 100–300 fondos de componente, 400–600 bordes, 700–800 fondos fuertes, 900–1000 texto e íconos ([Geist colors](https://vercel.com/geist/colors)). Su guía: «Use color only when it adds significant meaning to state, action, or data, and pair it with a non-color cue»; «Do not turn a recommendation, savings figure, cost component, or longer bar green merely because it is favorable»; «Meet WCAG AA and never rely on color alone» ([vercel.com/design.md](https://vercel.com/design.md)). Las [Web Interface Guidelines](https://vercel.com/design/guidelines) piden cifras tabulares, foco siempre visible, 44 px de blanco táctil en el teléfono y una variante sin movimiento. En el teléfono, el tablero usa una barra flotante abajo «optimized for one-handed use» ([changelog, 26-feb-2026](https://vercel.com/changelog/dashboard-navigation-redesign-rollout)). | La escala con un papel por paso; la regla de no pintar de verde lo favorable, que es la misma de ISA-101; las Web Interface Guidelines como lista de chequeo; la barra inferior para una mano en el teléfono del operador. | El negro puro, los colores saturados del espacio P3 y la tipografía Geist (la identidad de TRIM es Air). |

### 2.2 Industriales de alto desempeño

La norma, el manual de Hollifield, ASM, NUREG-0700, EEMUA 201 y la guía de Rockwell los trabajó X2 a fondo (`X2-norma-hmi.md` §1). Aquí va lo que cada fabricante muestra en pantalla y lo que TRIM toma para su identidad. Abrí yo la página de técnicas de alto desempeño de Ignition; lo demás viene de la investigación del equipo, con su enlace.

| Referente | Qué hace | TRIM toma | TRIM no toma |
|---|---|---|---|
| **Ignition Perspective** (Inductive Automation; `SCR/referentes/hmi-ignition-tradicional-vs-hp.png`) | La misma pantalla, tradicional y de alto desempeño: «Gray-scale colors are used instead of the traditional bright red, green, and blue colors». La alarma: «The Alarm Indicator represents different levels of alarm with different shapes, color, and descriptive text». Y advierte: «Common color combinations such as red and green and blue and purple cannot adequately be distinguished» ([Ignition 8.1, técnicas de alto desempeño](https://docs.inductiveautomation.com/docs/8.1/ignition-modules/vision/common-tasks-in-vision/high-performance-hmitechniques)). El indicador analógico móvil trae la banda deseada y los límites ([componente](https://docs.inductiveautomation.com/docs/8.3/appendix/components/perspective-components/perspective-display-palette/perspective-moving-analog-indicator)). La calidad del dato se marca con el borde: error, sólido con «!»; incierto, punteado con «?» ([códigos de calidad](https://docs.inductiveautomation.com/docs/8.1/platform/tags/quality-codes-and-overlays)). Temas claro y oscuro hechos con variables CSS ([temas](https://docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/styles/perspective-built-in-themes)), y Perspective es «mobile responsive», con una rejilla de 12 columnas ([Perspective](https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective)). | La advertencia azul/morado, que respalda sacar el azul de los estados (§4.0, punto 3); la calidad del dato marcada por el patrón del borde, además del color; los temas como variables CSS, que es como ya trabaja `index.css`. | El rectángulo rojo «1»: en TRIM la alarma 1 es el rombo. Las plantillas del Exchange, que no se pudieron verificar. |
| **AVEVA** (InTouch y Situational Awareness Library; `hmi-aveva-sa-medidor-y-alarmas.png`, `hmi-aveva-intouch-sa-poor-better-best.png`) | Su librería existe para resaltar lo crítico y «reduce visual noise» ([SA Library](https://docs.aveva.com/bundle/sp-salibrary/page/1400748.html)). El medidor trae el rango óptimo sombreado, la consigna, los límites y la velocidad de cambio ([SA_Meters](https://docs.aveva.com/bundle/sp-salibrary/page/71165.html)). Las alarmas van por severidad: 1, diamante rojo; 2, cuadrado amarillo; 3, triángulo azul; 4, triángulo **magenta** ([alarmas](https://docs.aveva.com/bundle/sp-salibrary/page/97688.html)). La calidad del dato tiene un ícono para cada uno de sus 12 estados ([calidad](https://docs.aveva.com/bundle/sp-salibrary/page/62318.html)). Su demostración enseña con «Poor / Better / Best»: el número solo, el número con su rango y la tendencia con su rango ([InTouch](https://www.aveva.com/en/products/intouch-hmi/)). | La anatomía del medidor, que TRIM ya tiene en `Analogico`; la pedagogía de «pobre, mejor, óptimo» para el primer día y para vender; un ícono propio por cada estado de calidad. | El azul y el magenta como severidades de alarma, y el parpadeo (TRIM no reconoce alarmas). |
| **Honeywell Experion** (HMIWeb; `hmi-honeywell-experion-nivel1-asm.png`) | Sus pantallas de alto desempeño traen lo desarrollado por el consorcio ASM ([Experion Station](https://process.honeywell.com/us/en/products/control-and-supervisory-systems/distributed-control-systems-dcs/experion-pks/operations/experion-station)), y en la consola Orion «Limits and targets are built into overview displays» ([Orion](https://process.honeywell.com/us/en/products/process-automation/distributed-control-systems-dcs/experion-pks/operations/experion-orion-console)). El caso de la refinería Rodeo de Phillips 66 (Honeywell Users Group, 2013) muestra los cuatro niveles. Cada indicador lleva sus límites de alarma, sus límites normales y la consigna, y su borde se vuelve rosa al salir de lo normal («believe the color»). También usa indicadores de desviación con una flecha de tendencia de 24 h ([HUG 2013](https://process.honeywell.com/content/dam/process/en/documents/document-lists/doc_asm-consortium/white-papers/June%2020%202013%20-%20Effective%20Use%20of%20Large%20Screen%20Technology%20Using%20Visual%20Thesaurus.pdf)). | Un nivel 1 donde cada campo muestra su desviación contra la meta y su flecha de 24 h; los límites dibujados dentro de la vista general, no en otra pantalla. | El rosa para «fuera de lo normal»: en TRIM eso es atención, en amarillo con triángulo. |
| **Emerson DeltaV Live** (`hmi-emerson-deltav-live.png`, `-overview.png`, `-faceplate.png`) | Fue la primera interfaz de operador de un sistema de control con gráficos HTML5 nativos. Sigue al Center for Operator Performance y a ISA-101, usando forma y color «without having to limit displays to a few shades of grey». Trae cinco temas que el operador cambia en uso, una barra de navegación que refleja la jerarquía y una banda abajo con las 5 alarmas de más prioridad, la mayor a la izquierda: un clic abre el gráfico y la ficha. Las tendencias van embebidas, también dentro de la ficha ([ficha técnica, abril de 2026](https://www.emerson.com/is/content/emerson/en/systems-and-software/deltav-distributed-control-system-dcs/product-data-sheets/documents/deltav-live.pdf)). | La franja fija de condiciones ordenada por prioridad (X2 §3.5); la navegación que sale de la jerarquía; la tendencia dentro de la ficha de la bomba. | Los medidores de media luna y el azul para el valor de proceso. |
| **Siemens WinCC Unified** (`hmi-siemens-wincc-unified-estilos.png`) | Es web nativa («HTML 5, SVG, and JavaScript», [Siemens](https://www.siemens.com/global/en/products/automation/simatic-hmi/wincc-unified.html)). Trae tres estilos (Default, Bright y Dark) que se cambian en uso: «Bright style during daylight», «Dark style during night» ([webinar V17, 2021](https://assets.new.siemens.com/siemens/assets/api/uuid:90353fae-08eb-4b55-8b62-3b21baa8e10b/wincc-unified-v17-webinar-junio.pdf)). Guía propia de alto desempeño: **NO VERIFICADO**. | El cambio de tema por la luz del momento, sin que cambie lo que significa cada color (§2.4). | Sus medidores de colores vivos, con el verde y el turquesa para lo normal. |

**Lo que comparten.** Fondo gris claro (el de Ignition mide RGB 213, el nivel 1 de Honeywell ≈ 221 y DeltaV ≈ 224/227/236, medidos sobre sus imágenes públicas); la alarma con forma, color y número junto al valor, sin pintar el equipo; el valor sobre su rango normal; la tendencia embebida; la jerarquía de cuatro niveles. El manual de alto desempeño, en la reseña de Stephen Few, pide «little to no color» cuando todo va bien y «no gratuitous animation» ([Perceptual Edge](https://www.perceptualedge.com/blog/?p=650)). ASM advierte que cumplir no es «simply applying a new gray-scale color palette» ([ASM, 2015](https://process.honeywell.com/content/dam/process/en/documents/document-lists/doc_asm-consortium/white-papers/March%2031%202015%20-%20Operator%20Situation%20Awareness%20and%20Delivering%20ASM%20compliant%20High%20Performance%20HMIs%20Failure%20Modes%20and%20Success%20Factors.pdf)). Mi observación sobre sus capturas: sin el logo, ninguno de los cinco se distingue de los otros. Ese es el hueco que puede ocupar TRIM.

### 2.3 Mantenimiento industrial moderno

| Referente | Qué hace | TRIM toma | TRIM no toma |
|---|---|---|---|
| **Tractian** (`SCR/referentes/tractian-app.png`) | La orden de trabajo del técnico dice «Intervene in the next 7 days. Bearing wear is up 20%, severity rising. Follow this SOP.» ([app móvil](https://tractian.com/en/solutions/mobile-app)). Las alertas deben decir «what's wrong, how bad, how long you have, and what to do», ordenadas por «failure severity and asset criticality» ([monitoreo](https://tractian.com/en/solutions/condition-monitoring)). El tablero cuenta por gravedad («Danger 2», «Warning 6») y dice cuánto lleva cada activo en su estado («Danger for 2min»). Su manual de marca: «Complementary colors exist for one reason: communicating state… They never lead a layout, never replace the primary palette, and never appear as decorative accents. If a complementary color is on screen, it should mean something operationally» ([brand.tractian.com/color](https://brand.tractian.com/color), leído renderizado). | La alerta en cuatro partes (qué pasa, qué tan grave, cuánto tiempo queda, qué hacer), que TRIM ya tiene a medias («cruza en», «qué hacer»); el tiempo en estado («parada hace 10,1 h»); el orden por gravedad y criticidad; y su regla de color casi palabra por palabra. | El azul de fábrica de Tailwind como marca, el verde de «éxito» en la vista de operación y el **morado para lo «premium o de IA»**, que en TRIM diría «dato inválido». |
| **Augury** (`SCR/referentes/augury-como-funciona.png`) | Cuatro verbos: Monitor → Diagnose → Validate («Confirm critical diagnostics with reliability experts») → Act, con «Prescriptive guidance backed by Cat III and IV Vibration Analysts» ([Augury](https://www.augury.com/machine-health/)). Sus estados de salud (aceptable y vigilar en dos verdes, alarma en naranja, peligro en rojo) y los plazos de 7 y 3 días solo los vimos en fragmentos del buscador: las páginas de ayuda hoy dan 404 (**NO VERIFICADO**). | Un plazo de respuesta por nivel de alarma; el sello «confirmado por…» (U2 §0, punto 3: TRIM propone y una persona confirma); los cuatro verbos como guion del primer día. | Los dos verdes para lo sano: colorean lo normal y casi no se distinguen entre sí. |
| **Cognite · Aura** (`SCR/referentes/cognite-aura-campo.png`) | Su sistema de diseño para Cognite Data Fusion ([qué es Aura](https://docs.cognite.com/aura-design-system/what-is-aura)): «Aura is WCAG AA compliant», pensado para un «wall-mounted display» o una pantalla «in a gloved hand at arm's length»; «Layouts hold up outdoors, zoomed in for readability in direct sunlight»; «Status colors and chart lines stay legible under fluorescent lighting and monitor glare». Y la regla clave: «Semantic tokens like error and warning stay as-is because they're pre-tested for accessibility»; el cliente solo puede cambiar los tokens de marca ([Aura](https://design.cognite.com/aura-design-system)). Cada estado tiene su par fondo/texto en claro y en oscuro (aviso: #F8E4D1/#9D5006 y #352210/#E4974D) ([color](https://docs.cognite.com/cdf/aura/foundations/color.md)). | Los pares fondo/texto por estado en los dos temas (TRIM ya tiene los `--p*-f`); **los tokens de estado bloqueados aunque cada operadora ponga su membrete**; los tres contextos de Aura (sala con reflejo, tableta con guantes, celular al sol) como prueba de aceptación de la identidad. | El aspecto de fábrica de shadcn como identidad y sus colores decorativos. |

**El patrón común de §2.1 y §2.3.** El gris neutro carga todo y el color solo marca estado, siempre con texto o ícono al lado (Vercel, Tractian, Cognite, Stripe Apps). La cifra que responde va arriba y la tendencia abajo (Stripe, Revolut). Una alerta dice qué pasa, qué tan grave es, cuánto tiempo queda, qué hacer y quién la confirmó (Tractian, Augury). Hay una divergencia: Stripe y Augury pintan de verde lo bueno; Vercel y Tractian lo prohíben. TRIM va con Vercel y Tractian, que es lo mismo que pide ISA-101.

### 2.4 Sala oscura o clara, y el magenta

**La sala oscura es una herencia del monitor de tubo, no una recomendación.** Lo dice el consorcio ASM (Bullemer, Reising y Laberge, 2011; leí el PDF):

- «the use of black background on CRT screens created an unexpected impact on control room lighting… The result was excessive glare and the response in almost all control rooms was a migration from bright, well lit control rooms… to dark, dimly lit control rooms».
- Su recomendación: «the recommendation of a light display background is coupled to the recommendation for high ambient lighting in the control room».
- La razón: «Working in a dark control room exacerbates the challenge of maintaining alertness because it causes a physiological reaction that facilitates sleeping». En turnos de 12 horas, mirar «a bright display in a dark room or a dark display in a bright room» obliga al ojo a adaptarse una y otra vez.
- Gris y no blanco, por la fatiga; gris y no beige, verde o azul, para no gastar colores. Y aclara: «the ASM Consortium does NOT recommend only using grayscale».

Fuente: [ASM, «Why Gray Backgrounds for DCS Operating Displays?»](https://process.honeywell.com/content/dam/process/en/documents/document-lists/doc_asm-consortium/white-papers/February%2028%202011%20-%20Why%20Gray%20Backgrounds%20for%20DCS%20Operating%20Displays.pdf).

**Lo confirman otras fuentes:**

- Rockwell pide «dark, sans-serif font… on a light grey background» ([Rockwell, 2016](https://literature.rockwellautomation.com/idc/groups/literature/documents/wp/proces-wp016_-en-p.pdf)).
- La tabla de EN 12464-1 que publica Glamox pone las salas de control de centrales en 500 lux, con «Lighting should be dimmable» ([Glamox](https://glamox.com/en/pbs/application-guide/industry/control-rooms)).
- En un estudio de laboratorio con turnos nocturnos simulados, la luz tenue (unos 7 lux) dio el doble de fallos de vigilancia que una luz más brillante: 15,6 contra 7,4 ([Sleep, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11543619)).
- Los valores de ISO 11064-6: **NO VERIFICADO** (norma de pago).

**El contrapeso.** Siemens ofrece el estilo oscuro «during night», Emerson trae cinco temas y Ignition, temas oscuros (§2.2). Y hay operadores a quienes el gris les parece aburrido ([Automation World, 2014](https://automationworld.com/products/control/blog/13311220/high-performance-hmi-hurdle)). No encontré ningún conteo de cuántas salas son oscuras hoy.

**Lo que decido para las tres direcciones:**

1. **El tema sigue a la luz del cuarto, no al gusto.** En una sala iluminada y en la oficina va el tema claro de gris (Día en A, Papel en B, Acero en C).
2. **El oscuro, gris y nunca negro, es para una sala atenuada o para el turno de noche.** Lo fija la guía de estilo del sitio por consola o por turno, como el cambio de día a noche de Siemens. No es un botón libre en la sala de control.
3. **En el teléfono, claro por defecto**, por el sol del campo. De noche sigue la configuración del teléfono, como Nubank.

**El magenta no tiene dueño normativo.** Ninguna norma pública lo asigna:

- AVEVA lo usa para la alarma de severidad 4;
- Rockwell, para la alarma baja (#916AAD, [guía de estilo, 2019](https://literature.rockwellautomation.com/idc/groups/literature/documents/wp/proces-wp023_-en-p.pdf));
- Honeywell y ASM pintan de rosa lo que sale de lo normal;
- FrameworX lo usa para la alarma suprimida ([Tatsoft](https://docs.tatsoft.com/display/FX/ISA-101+HMI+Compliance+How-to));
- NUREG-0700 lo da como «estado de alarma» (X2 §1.5).

TRIM tiene tres prioridades y no tiene alarma baja, así que el magenta queda libre para «no le crea a este número», que es lo que pidió Adair y lo que decide X2 (§1.8 y §4.1). Si la operadora piloto usa el magenta para su alarma baja, la guía del sitio lo cambia, porque es configurable (X2 §1.8). Lo que no cambia con ninguna guía: **la marca de TRIM nunca es morada ni magenta.**

## 3. Lo que TRIM ya tiene

Recorrí el demo construido (`http://127.0.0.1:4173`) con Playwright, sin la introducción (`trim.intro.<rol>=1`), en 1512 px y en 390 px (teléfono, escala 2), en claro y en oscuro: 25 capturas en `SCR/app/` (script `SCR/scripts/capturar-app.mjs`) y 5 de secciones (`capturar-secciones.mjs`). Leí `src/index.css`, `src/shared/ui/Prioridad.tsx`, `src/entities/roles.ts`, `docs/backend/08-presentacion.md`, U1 §9 y U2 §0.

### 3.1 Inventario de marca

| Pieza | Lo que hay | Lo que mide o dice |
|---|---|---|
| **Isotipo** (`public/brand/logo_256.png`) | Una «X» que es a la vez una flecha y un corte: dos barras horizontales que entran por la izquierda y una diagonal que las atraviesa. | Índigo **#142d88** (medido en los píxeles). Se lee como «recortar» (*trim*) y como «flujo que sale»: es la semilla de la dirección C. |
| **Wordmark** (`logo_trim_dark.png`, `logo_trim_light.png`) | «trim» en minúsculas, dibujado aparte (no es Air): trazo uniforme, la «t» y la «r» con remates cortados en ángulo. | Negro cálido **#2a2620** y blanco. Monocromo: los PNG del repositorio no traen la rampa índigo-turquesa. |
| **Rampa `--color-marca-1…7`** (`index.css`) | Índigo #12287a → violeta #36126e → ciruela #4d2473 → azul grisáceo → turquesa #50a5a9, «extraídos del wordmark oficial». | Hoy solo se usa en las iniciales del avatar y en el borde del ciclo (`Ciclo.tsx`). **El violeta y la ciruela quedan a un paso del morado que la guía de TRIM reserva para el dato en el que no se puede confiar** (lo pidió Adair; ISA-101 no fija colores, X2 §1.1): no deberían entrar nunca a la interfaz. |
| **Fuente Air** (`public/fonts/`, 8 caras) | De **Neil Summerour, Positype, 2011** (tabla `name` de los WOFF2: «Copyright (c) 2011 by Neil Summerour», `www.positype.com`, kit `com.myfonts.easy.positype.air`). Regular, Medium, Semibold, Bold y las cuatro Condensed. Es una neogrotesca «heavily influenced by Summerour's Aaux Next typeface and Akzidenz-Grotesk», según la ficha de su sucesora, Air Pro (2025), que agrega versalitas, más juegos de cifras y cinco anchos ([MyFonts, Air Pro Condensed](https://www.myfonts.com/es/collections/air-pro-condensed-font-positype/)). | 947 glifos; trae `tnum`, `onum`, `frac`, `case`, `smcp`, `c2sc`, `ss01`, `salt`. Las cifras por defecto son **proporcionales** (el «1» mide 377 unidades y el «0», 582): toda columna necesita `tabular-nums`. Altura de x: 500/1000, moderada: a 10–11 px se ve chica. |
| **Licencia de Air** | El kit es de MyFonts para web. MyFonts vende por separado las licencias de escritorio, *webfonts*, *app* y documento electrónico (misma ficha). | **NO VERIFICADO**: hay que revisar que la licencia comprada cubra el autohospedaje en servidores del cliente, el paquete del demo (`npm run paquete`) y la fuente incrustada en el PDF exportado. Si no lo cubre, la identidad tipográfica entera está en riesgo. |

Espécimen de Air que armé para esta revisión: `SCR/app/50-especimen-air.png`. Las cifras Bold de Air son lo más propio que tiene TRIM hoy: anchas, firmes, con el «1» de bandera corta. La Condensed Bold sirve para placas de equipo («P-201B · LC-21»). Los pares confundibles son «Il1» (la I mayúscula y la l minúscula casi iguales); «O0», «5S», «8B» y «rn/m» se separan bien.

### 3.2 Lo que se ve bien

1. **La disciplina de alto desempeño (ISA-101) ya existe, y es rara en el mercado.** Lo normal es gris, la prioridad lleva color, forma y número (`Prioridad.tsx`: rombo 1, triángulo 2, cuadrado 3), nada parpadea, el dato inválido va aparte (círculo punteado morado), la barra contra la meta es siempre gris (`BarraMeta`, cap. 8.5) y el indicador analógico muestra la banda normal y los límites (`SCR/app/07-sup-bombas-claro.png`). Casi ningún software de mantenimiento «moderno» hace esto: pintan verde lo que funciona.
2. **El esquema de planta** (`SCR/app/40-esquema-planta-claro.png` y `41-…-oscuro.png`) es la pieza con más carácter: trenes de gas, crudo y agua en paneles grises, equipos con símbolos coherentes, y lo anormal con tinte, borde y forma (P-201B en rojo, el tratador en amarillo, los tanques en naranja). Es lo más parecido a lo que el dueño llama «tipo gemelo digital».
3. **La cifra grande en Air Bold** funciona: «1.665 bbl/d · perdiéndose ahora» en la línea de bombas se entiende de un vistazo (`SCR/app/20-tel-oper-bombas.png`).
4. **El operador en el teléfono ya es casi Nubank**: «Conteste aquí, una pregunta a la vez», botones grandes, «No arrancar» arriba de todo (`SCR/app/22-tel-oper-causa.png`).
5. **La voz es de campo**: «¿Dónde se trabó?», «Si falla hoy», «colchón», «Qué limita hoy al campo». Es una identidad verbal que ningún competidor tiene en español.
6. **El contraste está medido y pasa AA**: toda la tinta da ≥ 4,5:1 en los cinco fondos de los dos temas (§3.5).

### 3.3 Lo que se ve viejo o recargado

1. **Muchas cifras grandes peleando.** El resumen del gerente abre con «**2.133** bbl · retorno» (simulado) y justo debajo «**1.046** barriles diferidos» (medido): dos héroes que significan cosas distintas (`SCR/app/01-ger-resumen-claro.png`). La entrega de turno pone cinco cifras grandes en la primera pantalla: 2.133, 983, 1.966, 3 y 723 (`SCR/app/10-sup-turno.png`). Nada dice cuál importa.
2. **Párrafos de cálculo en la pantalla.** «Agua y almacenamiento» trae siete renglones como «Con las tres bombas, cabe más agua: 43.675 bbl/d (sin contar la capacidad del tratamiento de agua: no tiene dato)…» (`SCR/app/42-agua-tuberia.png`), y la ficha de P-201B, otros seis (`SCR/app/09-sup-bomba-P201B.png`). Es documentación, no interfaz.
3. **Letra chica en todas partes.** En `src/` hay **316** usos de `text-[10.5px]`, 196 de 11,5 px, 190 de 11 px, 164 de 10 px y 31 de 9,5 px: unos **900 textos por debajo de 12 px**, y 13 tamaños distintos sin escala. El cuerpo es de 13 px (`index.css`): con la altura de x de Air (0,50), sus minúsculas miden 6,5 px, y las de un texto de 10 px, 5 px. Un gerente en un portátil y un operador al sol no lo leen cómodo.
4. **Todo lleva rótulo, nada resalta.** Títulos en mayúsculas espaciadas en cada bloque (78 `tracking-[…]`, 91 `font-cond`) y chips con borde para todo («bomba de reinyección», «fuera de banda», «sin instrumento», «no arrancar»). El estilo es de consola de 2010: correcto y plano.
5. **El oscuro es un gris medio sin profundidad.** Fondo #34373a y panel #474b4f: 1,36:1 entre niveles, y el borde contra el panel, 1,35:1 (`SCR/app/02-ger-resumen-oscuro.png`). No se siente de sala de control ni de noche: se siente apagado.
6. **La marca casi no aparece.** El wordmark arriba a la izquierda y el índigo en las iniciales del usuario. Ninguna pantalla «se ve TRIM»: con el logo tapado podría ser cualquier tablero gris.
7. **La tubería del campo no parece una tubería.** Son cuatro cajas con una barra de capacidad cada una y flechas de 6 px entre ellas (`SCR/app/04-prod-planta-claro.png`). Se lee como un gráfico de barras; el «◄ LIMITA» es un rótulo chico. Lo que el dueño pide, «ver el flujo y dónde está el cuello de botella», está calculado pero no dibujado.
8. **El rojo dice dos cosas**: alarma P1 y «equipo parado» (el selector de campo, el aviso rojo de Planta). Adair pidió rojo solo para el interlock; U1 §9 ya lo documentó.

### 3.4 Dónde se enreda alguien nuevo

1. **«2.133 bbl · retorno»** es lo primero y lo más grande que ve el gerente, y es una cifra **simulada**. Se lee «recuperamos 2.133 barriles». El chip «simulado» está a la derecha, en 10 px.
2. **Los números 1, 2 y 3 significan dos cosas.** «1 Antes · 2 Durante · 3 Después» usa los mismos dígitos que las prioridades (rombo 1, triángulo 2, cuadrado 3), en la misma pantalla y a pocos centímetros (`SCR/app/01-ger-resumen-claro.png`).
3. **Chips que parecen botones y botones que parecen chips.** «no arrancar» o «sin identificar» llevan borde como «Abrir» o «Identificar». El usuario nuevo toca el chip.
4. **Seis calificativos por cifra**: medido, calculado, provisional, simulado, firmado, sin firmar. Cada uno es correcto (custodia, cap. 8.9). Juntos son una carga que solo entiende quien los diseñó.
5. **Dos ⓘ seguidas** junto a «102 mil USD» en el héroe del gerente; la explicación siempre está a un clic, pero la pantalla no dice qué hacer.
6. **El mismo lugar con nombres distintos según el rol**: «Pozos y equipos», «Equipos», «Bombas de la línea», «Superficie».
7. **La introducción** (`SCR/app/30-intro-ger.png`) es un modal con el «foco» del rol en un párrafo («Barriles que no se produjeron, el retorno posible del ciclo antes / durante / después, y si baja contra la meta que usted firmó…») y dos pasos. Explica en abstracto; no señala dónde mirar.

### 3.5 Contraste medido de la paleta actual

Medido con `SCR/scripts/contraste.mjs` sobre `SCR/paletas/actual.json` (valores de `src/index.css`):

| Tema | Tinta / tinta2 / tinta3 (mínimo en los 5 fondos) | Formas de prioridad (mínimo) | Hallazgo |
|---|---|---|---|
| Claro | 9,53 / 5,94 / 4,69 — AA | P1 3,96 · P2 3,21 · P3 1,19 con trazo 9,53 · morado 4,66 | **Rojo P1 y naranja P2 casi iguales**: 6,1 con visión normal y 4,7 con deuteranopía. Hoy solo los separa la forma. |
| Oscuro | 6,16 / 5,30 / 4,56 — AA | P1 3,25 · P2 3,94 · P3 5,26 · morado 3,83 | **El azul P4 y el morado se funden con deuteranopía**: 2,3 (en claro, 3,2). Y el acento de marca del oscuro (#b5d3e9) queda a 5,8 del azul P4. |

Las dos alertas pesan en §4: el azul no puede ser a la vez un estado y la marca, y el rojo y el naranja del tema claro necesitan separarse más que hoy.

## 4. Tres direcciones de identidad

Las tres están dibujadas con el mismo contenido del demo (La Ceiba, octubre en curso, P-201B parada desde las 03:52) para que se comparen en igualdad: el resumen del gerente en escritorio (1280 × 800) y la pregunta del operador en el teléfono (390 × 844), en claro y en oscuro. **Para verlas de un vistazo: `SCR/prototipos/tres-direcciones.png`** (una fila por dirección). Además hay 12 capturas sueltas en `SCR/prototipos/` (`{a,b,c}-{escritorio,telefono}-{claro,oscuro}.png`) y dos mosaicos: `escritorio-mosaico.png` y `telefonos-mosaico.png`. El prototipo es `SCR/prototipos/direcciones.html` (se abre con `?dir=a|b|c&tema=claro|oscuro&vista=escritorio|telefono`). Las cifras son las del demo; los rótulos nuevos son propuesta.

### 4.0 Lo que no cambia entre direcciones

Las tres comparten la semántica del estado; cambian el fondo, la letra, la forma, el movimiento y la voz. Así el dueño escoge un carácter sin reabrir la norma. **La paleta de estado es la de X2** (`X2-norma-hmi.md` §4, con lo que pidió Adair): la tomé tal cual y la medí sobre los seis fondos de mis direcciones. Pasa en todos (detalle abajo), así que el equipo tiene una sola paleta de estado y cada dirección solo pone su marco.

1. **Lo normal es gris.** Los datos van en una rampa de grises; lo que manda se distingue por tamaño, peso y un gris más fuerte, no por color.
2. **El color solo para estas condiciones, cada una con su forma y su palabra** (X2 §4.2; claro / oscuro):

| Condición | Color | Forma | Palabra que la acompaña |
|---|---|---|---|
| Interlock | rojo #8b1a1a / #ff8080 | candado | «Interlock · baja succión (PSL-2011)» |
| Alarma 1 | naranja #bf4000 / #ffb347 | rombo con «1» | «Alarma» |
| Atención 2 | amarillo #f9a825 (con trazo oscuro) / #fff176 | triángulo con «2» | «Atención» |
| Aviso 3 | el mismo amarillo | cuadrado con «3» | «Aviso» |
| Sin comunicación | magenta #8420a3 / #c99cff | círculo punteado | «Sin comunicación desde 14:07», y el valor pasa a «---» |
| Dato inválido | el mismo magenta | círculo punteado con raya | «Dato inválido · fuera del rango del instrumento» |
| Falta, sin instrumento, medido a mano, anticipa | gris | contorno discontinuo, corchetes, reloj, flecha | «falta la causa», «sin instrumento», «medido a mano hace 42 d», «anticipa · cruza en 33 d» |
| Normal | gris | punto | nada |

   La alarma 1 va sola en naranja, y la 2 y la 3 comparten el amarillo: así lo propone X2 §4.1 (punto 3), distinto de U1 §9.2. Lo decide la guía de estilo con Adair; el cambio no toca ninguna dirección.
3. **Ningún estado es azul; el índigo es de TRIM y de la interacción.** El índigo del isotipo, **#142d88**, es el color de marca en los dos temas, siempre como superficie con blanco encima (11,93:1): la placa del isotipo, la banda de B, el botón principal de B en claro y lo seleccionado. Coincide con X2 §4.1 (punto 1), que deja el azul para la interacción. El foco del teclado va en índigo en claro (de 6,9:1 a 11,9:1 sobre los fondos) y en la tinta en oscuro, porque un índigo claro sobre gris oscuro queda cerca del texto gris; es la nota de X2 §4.5 sobre el acento `#b5d3e9`. Nunca va en un dato, una serie, una tubería o un equipo. El diagnóstico del vigía no lleva color: va en gris con la palabra «anticipa» hasta que la matriz le da una prioridad (X2 §4.1, punto 5; desacuerdo con U1 en §6).
4. **El rojo y el naranja se separan por luz.** El rojo del interlock se oscurece y el naranja queda solo para la alarma 1. En mis fondos claros, rojo y naranja quedan a 13,8 con visión normal y a 14,0 con deuteranopía (hoy, 6,1 y 4,7); en los oscuros, a 15,1 y 10,8.
5. **El cuerpo de un equipo dice si corre, por brillo, y nunca toma el color de la alarma** (X2 §4.3 y B5). En marcha, más claro que el fondo; parado, más oscuro y con contorno de 2 px; sin dato, del color del fondo. La marca de la condición va aparte, en una esquina fija, y el número se escribe en tinta.
6. **Un equipo parado lleva una sola marca** (X2, B9). Sus variables se ven en gris con «parada» y no suman rombos.
7. **Nada parpadea.** TRIM no tiene reconocimiento de alarmas (U1 §9.3; X2 §1.2). El movimiento sirve para navegar y para decir, una sola vez, que algo cambió de estado.
8. **Las fases Antes · Durante · Después no llevan número**: los dígitos 1, 2 y 3 son de las prioridades (§3.4, punto 2; X4 §4.4).
9. **La letra se mide en ángulo, no en píxeles.** El texto que se lee de corrido pide al menos 16′ de arco: en Air, un cuerpo de unos 18 px a la distancia del escritorio (X2, B16, con NUREG-0700). Los datos de tabla y los rótulos no bajan de 12 px. Solo las etiquetas en mayúsculas condensadas pueden ir a 11 px: su altura de mayúscula (11 × 0,698 = 7,7 px) supera la altura de x de un texto de 13 px en Air (6,5 px). Las cifras siempre con `tabular-nums`.
10. **Lo simulado y lo que falta se distinguen por forma**: «simulado» con trazo discontinuo y su palabra del mismo tamaño que la unidad; «falta» en gris discontinuo. Nunca con color.
11. **Una sola cifra héroe por pantalla, y es medida.** Lo simulado (el retorno del ciclo) va debajo y con su palabra (§6; X4 §3.1, regla 7, y X2, B14, dicen lo mismo).
12. **Diferido no es pérdida, tampoco en la voz.** Lo que no pasa «se deja de producir», «no pasa» o «se trabó»; «se pierde» queda para lo que no se recupera (el brief: diferidos y perdidos; X4 §4.2: el diferido se dibuja como un estrechamiento y la pérdida como una gota). El rótulo de hoy, «Perdiéndose ahora», cambia.

**Contraste medido de las tres** (`SCR/paletas/direcciones-final.json`; el resultado completo, con los pares fijos de número, tinte, tubería, equipos y marca, en `SCR/paletas/medicion-direcciones-final.txt`):

- Toda la tinta pasa 4,5:1 en los cinco fondos de cada tema.
- Toda forma de estado pasa 3:1 contra los fondos, o lleva trazo oscuro de más de 10:1. El más justo es el naranja sobre el suelo de A en día: 3,07.
- El número dentro de cada forma pasa 4,5:1; el más justo es el blanco en el rombo naranja, 5,32.
- La tinta sobre los tintes de las etiquetas pasa de 9,5:1.
- Todas las parejas de colores de estado quedan a 10 o más con los tres tipos de daltonismo. La más justa es naranja contra magenta con tritanopía en oscuro: 10,4. La protanopía y la deuteranopía son las comunes: las tiene «about 1 in 12 men» ([NEI](https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/color-blindness)).

### 4.1 Dirección A · «Consola»

**La idea:** TRIM se ve como un instrumento de precisión de sala de control. Gris, denso y exacto; la identidad está en la letra condensada y en el rigor, no en el color.

Capturas: `SCR/prototipos/a-escritorio-claro.png`, `a-escritorio-oscuro.png`, `a-telefono-claro.png`, `a-telefono-oscuro.png`.

**Paleta**

| Token | Día (gris de alto desempeño) | Noche (gris oscuro, no negro) | Uso |
|---|---|---|---|
| `suelo` | #c2c5c8 | #2a2e33 | fondo del display |
| `superficie` | #cdd0d3 | #31363b | riel y cabecera |
| `panel` · `panel2` | #d9dcde · #d3d6d9 | #393f45 · #353a40 | placas |
| `elevado` | #e4e6e8 | #424950 | globos y menús |
| `tinta` · `tinta2` · `tinta3` | #0f1215 · #2a2f35 · #3b4148 | #eef0f2 · #d0d4d9 · #b9bfc5 | texto |
| `dato-1` · `dato-3` | #30353b · #5c636a | #d5d9de · #9aa1a8 | barras, líneas, tendencias |
| `marca` | #142d88: barra de 3 px del ítem activo y logo | #142d88 como placa con blanco | marco |
| `primario` | #0f1215 con texto blanco | #eef0f2 con texto #1a1d21 | botón |
| estado (X2 §4.4) | interlock #8b1a1a · alarma 1 #bf4000 · atención y aviso #f9a825 (+ trazo) · sin comunicación #8420a3 | #ff8080 · #ffb347 · #fff176 · #c99cff | estado |

Contraste mínimo en los cinco fondos (día / noche): tinta 10,84 / 7,99; tinta3 5,95 / 4,92; `dato-3` 3,51 / 3,49; interlock 5,36 / 3,76; alarma 1 3,07 / 5,13; magenta 4,46 / 4,21; el amarillo en día, con trazo de 10,84.

**Tipografía.** Air Condensed Semibold en todas las etiquetas (11 px, mayúsculas, +9 % de espaciado); Air Regular para los datos de tabla (13 px) y para las pocas frases (18 px, por la regla de 16′ de §4.0); cifras en Air Bold tabular. Escala de escritorio: 11 (etiqueta) · 13 (dato) · 16 (título de placa) · 18 (frase) · 24 (cifra de placa) · 30 (cifra principal). Teléfono: 12 · 14 · 16 · 18 · 22 · 28.

**Iconografía.** Lucide (ya está en el proyecto) a 16 px y trazo 1,5, monocromo. Los equipos con símbolos de línea tipo ISA-5.1 simplificados, sin relleno salvo el del estado.

**Tarjetas y rejilla.** Rejilla de 12 columnas, medianil de 8 px, unidad de 4 px. Placas de radio 2 px con borde de 1 px, sin sombra. Tablas con filas de 30 px. Una franja de alarma de una sola línea arriba de todo.

**Movimiento y microinteracciones.** Casi nada: los cambios de estado son instantáneos (≤ 100 ms) y el foco y el hover tardan 80 ms. La entrada de una alarma nueva se marca una sola vez: el tinte de su franja aparece en 200 ms. Teclado primero, con atajos por pantalla, y la fila enfocada con borde de 2 px.

**Tono.** Telegráfico, de consola: «P-201B · PARADA 03:52 · −1.665 bbl/d · cerró LC-07 y LC-16». Siempre la unidad; casi sin verbos.

**Oscuro y claro.** «Día» es el gris de alto desempeño y va por defecto en la sala iluminada y en la oficina (§2.4). «Noche» es gris oscuro, nunca negro, para la sala atenuada o el turno de noche; lo fija la guía del sitio por consola o por turno.

**Teléfono del operador.** La misma consola, compacta: la parada con su señal en monoespaciada («ZS-2011 · MARCHA → PARO · 03:52»), opciones en filas de 48 px y «REGISTRAR» a lo ancho. Claro por defecto, por el sol.

**Color solo para lo anormal.** Todo es gris. La marca solo aparece en el logo y en la barra de 3 px del ítem activo. La identidad es la letra condensada, la placa y la exactitud.

**Fuerte en:** supervisor, confiabilidad, jefe de mantenimiento y producción en pantallas grandes. Es la evolución más barata de lo que hay. **Débil en:** el gerente y el operador nuevo. Además se parece a cualquier sistema de control: con el logo tapado, podría ser otro.

### 4.2 Dirección B · «Una cifra»

**La idea:** Nubank llevado al campo. Cada pantalla responde una pregunta con una cifra grande y una frase de campo, y lo demás se abre si se pide. La marca es una banda índigo, como el morado de Nubank, pero con el color propio de TRIM, que la guía de estado de §4.0 deja libre.

Capturas: `SCR/prototipos/b-escritorio-claro.png`, `b-escritorio-oscuro.png`, `b-telefono-claro.png`, `b-telefono-oscuro.png`.

**Paleta**

| Token | Papel (claro, por defecto) | Noche | Uso |
|---|---|---|---|
| `suelo` | #efede8 | #1a1d21 | fondo |
| `superficie` · `panel` · `panel2` | #f6f5f1 · #fcfbf8 · #f3f1ec | #202328 · #262a2f · #23272c | tarjetas |
| `elevado` | #ffffff | #2e3238 | hojas y menús |
| `tinta` · `tinta2` · `tinta3` | #15171a · #464b52 · #5b6168 | #f3f4f5 · #c8cdd3 · #a3aab2 | texto |
| `dato-1` · `dato-3` | #3a3f45 · #7a8087 | #d9dde1 · #878e96 | barras y líneas |
| `banda` (marca) | #142d88 con blanco; navegación inactiva #c9d1f0 (7,87:1) | #142d88 con blanco | cabecera |
| `primario` | #142d88 con blanco | #f3f4f5 con #15171a | botón píldora |
| estado (X2 §4.4) | #8b1a1a · #bf4000 · #f9a825 (+ trazo) · #8420a3 | #ff8080 · #ffb347 · #fff176 · #c99cff | estado |

Contraste mínimo (papel / noche): tinta 15,35 / 11,70; tinta3 5,35 / 5,49; blanco sobre la banda 11,93; interlock 7,94 / 5,31; alarma 1 4,55 / 7,24; magenta 6,61 / 5,94.

**Tipografía.** Solo Air, en frases: nada de mayúsculas espaciadas. Escala de escritorio: 13 (nota) · 15 (dato) · 18 (cuerpo) · 22 (la frase) · 34 (cifra de tarjeta) · 88 (la cifra héroe). Teléfono: 13 · 15 · 18 · 22 · 27 · 56. Interlineado de 1,5.

**Iconografía.** Lucide a 20–24 px con trazo 1,75; flechas «›» para abrir lo que sigue; pictogramas de equipo solo dentro de la ficha.

**Tarjetas y rejilla.** Una columna central (máximo 880 px) y una lateral de 360 px. Tarjetas de radio 20 px sin borde, separadas por el tono del fondo. Filas de 56–64 px con «›», botones de píldora, unidad de 8 px y relleno de 24–32 px.

**Movimiento y tacto.** 180–280 ms con salida suave. Las filas se despliegan en su lugar (altura y opacidad); en el teléfono, las hojas suben desde abajo en 240 ms. La cifra cambia por fundido y nunca cuenta hacia arriba: un contador animado es decoración. Vibración corta (10 ms) solo al confirmar una respuesta en el teléfono, nunca por una alarma. Todo respeta `prefers-reduced-motion`.

**Tono.** Frase completa, de usted, en palabras de campo: «Se están dejando de producir 1.966 barriles por día en La Ceiba. La bomba de agua P-201B paró a las 3:52 y se cerraron dos pozos». La acción también es una frase: «Ver qué se está haciendo».

**Oscuro y claro.** Papel por defecto (oficina, gerente, teléfono de día). Noche es gris muy oscuro, no negro: lo pide §2.4, aunque Nubank use negro. La banda conserva el índigo y el botón principal pasa a claro.

**Teléfono del operador.** Una pregunta por pantalla, con la banda índigo arriba («1 de 3 · ¿Qué parte se dañó?»), el aviso «No la arranque…» en tinte amarillo con su triángulo de atención, opciones de 64 px y un botón de píldora fijo abajo. Es la más Nubank de las tres.

**Color solo para lo anormal.** La banda índigo es marco, no dato: queda arriba, lejos de cualquier estado, y no es ningún color reservado (contra el magenta, 19,9 con visión normal y 11,0 con deuteranopía). Dentro de las tarjetas, todo es gris.

**Fuerte en:** el gerente, abastecimiento, regulatorio y el operador en el teléfono; cualquiera la entiende el primer día. **Débil en:** la sala de control. Para supervisar 18 pozos y 13 equipos la densidad no alcanza, y una banda saturada en una pantalla de supervisión va contra la idea de alto desempeño (lo único brillante debe ser lo anormal). Frente a Adair puede verse «de app de banco». Y la banda pesa: ocupa 20 % del teléfono, casi el triple que el morado en la portada móvil de Nubank (§4.4).

### 4.3 Dirección C · «La tubería»

**La idea:** el proceso es la interfaz. Toda pantalla parte de la tubería yacimiento → pozos → planta → salida, y cada cifra cuelga de su tramo. La línea del isotipo se vuelve la línea del proceso, y el corte en ángulo del logo se vuelve la forma de las placas.

**Coherente con X4 y X2.** El dibujo sigue la anatomía de «La planta viva» (`X4-arquitectura-roles.md` §4.2), con sus tres capas: el contorno de cada tramo es lo que cabe (X2 §3.3, regla 2), y el más angosto lleva doble contorno y «limita»; el relleno es lo que pasa ahora; el rayado es lo que no pasa, encima del relleno y solo en el tramo donde se trabó. La pérdida, que no es el diferido, sería una gota. Mi primera versión usaba el grosor solo para la capacidad (quedó en `SCR/prototipos/direcciones-v1.html`).

Capturas: `SCR/prototipos/c-escritorio-claro.png`, `c-escritorio-oscuro.png`, `c-telefono-claro.png`, `c-telefono-oscuro.png`.

**Paleta**

| Token | Acero (claro) | Grafito (oscuro, no negro) | Uso |
|---|---|---|---|
| `suelo` | #d3d6d9 | #1f2327 | fondo |
| `superficie` · `panel` | #dde0e3 · #eaecee | #262b30 · #2d3338 | riel y placas |
| `panel2` (lienzo de la tubería) | #e3e6e8 | #2a2f34 | el dibujo |
| `elevado` | #f3f4f5 | #353c42 | globos y menús |
| `tinta` · `tinta2` · `tinta3` | #121519 · #30363c · #434a51 | #eef0f2 · #c9ced4 · #a9b0b8 | texto |
| `tubo` · `tubo-limita` | #5d656d · #121519 | #8a929a · #e3e6e9 | la tubería: el relleno es lo que pasa ahora y el rayado, lo que no pasa; el doble contorno del tramo que limita va en el gris más fuerte |
| `marca` | #142d88: placa del isotipo e ítem activo | #142d88 con blanco | marco |
| `primario` | #121519 con blanco | #eef0f2 con #1a1d21 | botón con el corte |
| estado (X2 §4.4) | #8b1a1a · #bf4000 · #f9a825 (+ trazo) · #8420a3 | #ff8080 · #ffb347 · #fff176 · #c99cff | estado |
| `eq-marcha` · `eq-parado` | #f7f8f9 · #5d656d | #d3d8dd · #15181b | el cuerpo del equipo, por brillo (X2 §4.3) |

Contraste mínimo (acero / grafito): tinta 12,55 / 9,80; tinta3 6,16 / 5,11; `tubo` sobre el lienzo 4,72 / 4,28; contorno de «limita» 14,60 / 10,78; interlock 6,37 / 4,61; alarma 1 3,64 / 6,28; magenta 5,30 / 5,16; equipo parado sobre el lienzo 4,72 en acero; en grafito el parado se separa por su contorno (15,60:1).

**Tipografía.** Air para frases y cifras; Air Condensed para placas y tags de equipo, como una placa de identificación («P-201B», «POZOS · 18 · ◄ LIMITA»). Escala de escritorio: 12 (placa) · 14 (dato) · 16 (título) · 19 (la frase) · 28 (cifra de tramo) · 52 (titular). Teléfono: 12 · 14 · 16 · 18 · 22 · 40. En los prototipos algunas líneas de dato van en 13–13,5 px: dentro de la regla de datos (≥ 12 px), no de frases.

**Iconografía.** Los símbolos de equipo del esquema de planta actual (bomba, separador, tanque, compresor, LACT), de línea 1,5 px, se vuelven los íconos de la marca. Lucide queda solo para acciones.

**Tarjetas y rejilla.** «Placas» con la esquina superior izquierda cortada a 45° (de 8 a 14 px según el tamaño: el corte del isotipo) y borde de 1 px. La rejilla sigue a los tramos: lo que va debajo de un tramo se alinea con él. El tramo que limita lleva doble contorno gris y la palabra «limita»; nunca color.

**Movimiento y microinteracciones.** Zoom semántico de 240–320 ms entre niveles (campo → tramo → equipo): la placa crece desde su lugar en la tubería y el usuario no pierde dónde está. Cuando un equipo para, el hueco rayado aparece en su tramo en 300 ms, una vez. En estado normal nada fluye (`index.css` ya lo dice: «una línea con flujo normal no se anima»). En el teléfono, una mini-tubería arriba de cada pregunta dice dónde está el equipo.

**Tono.** Primero el lugar, luego el equipo y luego la cifra: «En la planta no pasan 1.665 bbl/d: P-201B, la bomba de agua, está parada desde las 03:52». Mandan las cuatro frases de U2 §1.2: «¿Dónde se trabó?», «Qué limita hoy al campo», «Si falla hoy» y «La tubería del agua».

**Oscuro y claro.** Acero (claro) y Grafito (oscuro) son los dos de primera, con los mismos nombres de token. Los nombres son de material y no de lugar, a propósito: **Acero va por defecto** en la sala iluminada, en la oficina y en el teléfono al sol; **Grafito** en la sala atenuada, en el turno de noche y en una pantalla de pared de un cuarto oscuro. Lo fija la guía del sitio por consola o por turno (§2.4).

**Teléfono del operador.** La placa del equipo con su mini-tubería (pozos — planta — AGUA ◆ — inyectores), el aviso «No arrancar hasta identificar…», una pregunta, opciones de 60 px y el botón a lo ancho con el corte a 45°.

**Color solo para lo anormal.** La identidad está en la forma (el corte a 45°, la línea del proceso, el ancho de la tubería que dice cuánto pasa) y en la letra de placa. El color aparece solo donde hay un equipo con una condición. El índigo, solo en la placa del isotipo.

**No se llama «gemelo digital».** `docs/backend/01-propuesta-de-valor.md` §1.6 reserva esa palabra para la línea de simulación, y esta vista no simula: dibuja lo medido y lo calculado. Coincido con X4 §4.1: en pantalla la puerta se llama «Planta» y el título, «La Ceiba, hoy». «La tubería» es el nombre de esta dirección de identidad, no un rótulo. Si el dueño quiere la palabra «gemelo», lo decide él.

**Fuerte en:** todos, con dos densidades: **Lectura** (gerente: la tubería de nivel 1, cuatro tramos, una cifra y una frase) y **Consola** (técnicos: el esquema de planta y la ficha del equipo con sus analógicos, que ya existen). **Débil en:** el costo. El dibujo tiene que acomodarse a cinco anchos y a 390 px, y el auditor de desbordes lo va a exigir. Además puede caer en «dibujito» si se le agregan cosas: nada de 3D ni de dibujos realistas. Y tiene que conservar la lista para quien prefiere leer (el «Ver como tabla» que ya existe).

### 4.4 Las tres, lado a lado

| | A · Consola | B · Una cifra | C · La tubería |
|---|---|---|---|
| Brilla con | la sala de control | el gerente y el teléfono | todos, con dos densidades |
| Se entiende el primer día | poco | mucho | bastante |
| Seriedad industrial | muy alta | media | alta |
| ISA-101 | de nacimiento | con cuidado (la banda) | de nacimiento |
| Lo que pidió el dueño: «ver el proceso y dónde se pierde» | una tira de cuatro casillas | cuatro puntos en línea | es el centro de la pantalla |
| Se distingue de AVEVA, Honeywell o Tractian | poco | sí, pero como cualquier fintech | sí, con algo propio |
| Costo de construir | bajo: evoluciona lo que hay | medio | alto |
| Riesgo | «otro SCADA gris» | «app de banco» | «dibujito» y desbordes |
| Pantalla con color (escritorio claro / teléfono claro) | 0,1 % / 3,4 %: todo de estado | 9,0 % / 26,3 %: la banda índigo es 8,9 % y 20,2 % | 0,3 % / 4,8 %: de estado, salvo 0,2 % de marca |

La última fila la medí sobre las capturas de los prototipos: la parte de la pantalla con croma OKLCH mayor que 0,035, separada por familia de tono (`SCR/scripts/medir-color.py`, resultado en `SCR/paletas/medicion-color-en-pantalla.txt`). Como referencia, el morado de Nubank ocupa 2,4 % de su portada de escritorio y 7,1 % de la móvil (§1.1), y NUREG-0700 admite hasta 10 % de resaltado en condición normal (X2 §1.5). La banda de B en el teléfono triplica a Nubank y, sola, pasa el tope de NUREG; si B ganara, la banda tendría que adelgazar.

## 5. Recomendación

**Recomiendo la dirección C, «La tubería», con dos préstamos: de B, la voz y el héroe («una cifra, una frase», siempre medida); de A, la densidad de consola para los niveles 3 y 4 de los roles técnicos.**

Por qué:

1. **Es la única que dibuja lo que pidió el dueño**: «su planta, el proceso, el pipeline de dónde se están perdiendo», con su antes, durante y después. El gerente abre en la tubería de nivel 1, con una cifra y una frase. El supervisor ve la misma tubería con más detalle. El técnico baja al esquema y a la ficha del equipo. Encaja con la arquitectura de X4 (`X4-arquitectura-roles.md` §3.2): C es el lenguaje visual de su puerta «Planta» y de «La planta viva» del gerente.
2. **La identidad sale del producto, no de la decoración.** Lo único de TRIM es calcular dónde se trabó cada barril (U2). Dibujar eso como interfaz no lo hace un sistema de control, que dibuja equipos y no barriles. Tampoco Tractian ni Augury, que dibujan activos, ni Cognite, que junta P&ID y 3D. Y no necesita color para existir.
3. **Cumple ISA-101 por construcción.** Todo se dibuja con forma y gris: lo que no pasa, como un estrechamiento rayado en el tramo donde se trabó; lo que limita, con doble contorno y «◄ limita». El color queda solo para las condiciones de los equipos.
4. **Usa la marca que ya existe.** La línea y el corte del isotipo se vuelven el sistema: las placas y la tubería. Air Condensed es la letra de placa. No hace falta un logo ni una fuente nuevos.
5. **Evoluciona lo construido.** El esquema de planta, la tubería del campo, la tubería del agua, los analógicos y el «Ver como tabla» ya existen. El costo es redibujar y reordenar, no inventar, y el riesgo de desbordes lo controla el auditor de cinco anchos.

**Por qué no A o B solas.** A es correcta, pero no se distingue de un sistema de control, el gerente se pierde en ella y no muestra el proceso. B es el mejor primer día, pero pierde la sala de control y, frente a Adair, se ve de banco.

**Cuándo cambiaría de opinión.** Si los primeros contratos los compra la sala de control (supervisores y automatización), A va primero y C después. Si TRIM se vende sobre todo como tablero ejecutivo, B.

**Los primeros pasos, si el dueño aprueba** (sin tocar código hasta que el coordinador lo ordene):

1. **Firmar el contrato de §4.0 como la guía de estilo del sitio**, con Adair (U1 §11.3) y con la paleta de estado de X2: ningún estado azul, rojo y naranja separados por luz, el equipo por brillo, la letra medida en ángulo (frases de unos 18 px, datos de 12 px o más) y una escala de seis tamaños en lugar de trece.
2. **Rehacer el inicio del gerente** («La planta viva», X4) con la tubería de nivel 1: una cifra medida y una frase. El retorno simulado baja y lleva su palabra.
3. **Placas con el corte a 45° y Air Condensed en los tags.** Fuera los chips con borde que parecen botones.
4. **Los dos temas, Acero y Grafito, con los mismos tokens.** Acero por defecto; Grafito para la sala atenuada y la noche, fijado por la guía del sitio (§2.4).
5. **Probar las tres direcciones con usuarios antes de construir** (U1 §11, U2 §10, X4 §7), con los prototipos de `SCR/prototipos/`. El criterio: alguien nuevo encuentra «cuánto se pierde, dónde y por qué» en menos de 10 segundos, en el teléfono y en el escritorio. Adair valida los colores, y los operadores prueban al sol y con guantes (los tres contextos de Aura, §2.3).

## 6. Desacuerdos

1. **Con U1 §9.2: el diagnóstico en azul.** U1 lo propone en azul (#0d5bb5 / #90caf9), con un círculo con «i». Propongo sacar el azul de la guía de estado, y X2 §4.1 llega a lo mismo por su lado:
   - con deuteranopía, ese azul y el morado del dato inválido se funden (2,3 en oscuro y 3,2 en claro; §3.5); Ignition advierte justo eso del par azul y morado (§2.2);
   - el azul queda pegado al índigo de la marca y de la interacción;
   - lo que anticipa el vigía todavía no pide acción: va en gris con «anticipa», y cuando la pide toma su prioridad.
2. **Con `01-propuesta-de-valor.md` §1.7 («En Resumen el ciclo va arriba y el libro abajo, para que no se confundan») y con el cap. 8.13.** Hoy la primera y más grande cifra del gerente es el retorno **simulado**, y un usuario nuevo la lee como algo logrado (§3.4, punto 1). Propongo lo medido como única cifra héroe y el ciclo debajo, con su palabra «simulado». Así se conserva lo que buscaba ese orden, que no se confundan, sin poner lo simulado primero. X4 (§3.1, regla 7) y X2 (B14) piden lo mismo.
3. **Con la rampa de marca de `index.css`.** `--color-marca-3` (violeta #36126e) y `--color-marca-4` (ciruela #4d2473) están a un paso del magenta de estado. Propongo retirarlas de la interfaz y dejar un solo color de marca, el índigo del isotipo (#142d88). Hoy `--color-marca-1` (#12287a) y el isotipo (#142d88) no coinciden; conviene uno solo.
4. **Con la premisa del encargo de X1 de que «las salas de control suelen ser oscuras».** No está en el `BRIEF.md`, y Adair, en la reunión del 19-oct, pidió el estándar de colores de alto desempeño sin hablar del fondo (`docs/reuniones/2026-10-19-edinson-adair/transcript.txt`). Según ASM, la sala oscura es la herencia del monitor de tubo, y lo recomendado es fondo gris claro en una sala iluminada (§2.4). Por eso el tema claro va por defecto y el oscuro, gris y nunca negro, es para la sala atenuada y la noche.
5. **Con la voz de `roles.ts` y de algunas pantallas: tú y usted mezclados.** El «foco» del gerente dice «la meta que usted firmó». Los de los demás roles tutean: «Explicas», «cierras», «vas», «Abres y dices», «Configuras». En las pantallas hay 20 «Escoja» y 7 «Revise» contra 4 «Abre». Propongo **usted en todo**: es el registro de trabajo en Colombia y el que ya usa el operador («Conteste aquí…»). X4 (§1.3, punto 9) encontró la misma mezcla.
6. **Con «una cosa por pantalla» tomado al pie de la letra.** Va como «una pregunta por vista» (§1.2). La sala de control necesita una vista general densa, y eso no se negocia por parecerse a Nubank.
7. **Respuesta a X4 §9, punto 8 (la fuente de Nubank).** Son dos artículos distintos y los dos están bien citados: Guilherme Neumann, «Designing a multi-product experience» (13-jun-2018), y Lucas Neumann, la parte II de NuConta (15-mar-2018). Los volví a abrir; §1 ya nombra a cada uno con su fecha.
8. **Respuesta a X2 §8, puntos 1 y 8.** La primera versión de este documento compartía el naranja entre las prioridades 1 y 2, como U1; ahora uso la paleta de X2 tal cual (§4.0). Además, re-medí sus cuatro tonos sobre mis fondos oscuros, que son más oscuros que los de hoy pero nunca negros: el interlock queda entre 3,76 y 5,31:1, mejor que los 3,06 de hoy.
9. **El dibujo en tres capas, entre X2 y X4.** X2 §3.3 (regla 2) pide el alto de cada tramo proporcional a su **capacidad**; X4 empezó con el grosor como **lo que pasa ahora**. Propuse que las dos caben juntas (contorno = lo que cabe, relleno = lo que pasa, rayado = lo que no pasa en su tramo), y X4 ya lo dejó así en su §4.2, con una prueba (G1, X4 §7) que compara el dibujo con contorno y sin él, porque tres capas pueden ser mucho para el gerente. Mi prototipo C ya muestra las tres capas.

## 7. Referencias visuales y fuentes

**Capturas propias de TRIM** (`SCR/app/`, demo en `http://127.0.0.1:4173`, 25-oct-2026):

| Archivo | Qué muestra |
|---|---|
| `01-ger-resumen-claro.png`, `02-ger-resumen-oscuro.png`, `24-tel-ger-resumen.png` | Resumen del gerente: los dos héroes (2.133 simulado y 1.046 medido) |
| `03-ger-resumen-portafolio.png` | Resumen del portafolio |
| `04-prod-planta-claro.png`, `05-prod-planta-oscuro.png`, `25-tel-prod-planta.png` | La tubería del campo de hoy: cuatro cajas con barra |
| `40-esquema-planta-claro.png`, `41-esquema-planta-oscuro.png` | El esquema de planta: la pieza con más carácter |
| `42-agua-tuberia.png` | La tubería del agua y sus párrafos de cálculo |
| `07-sup-bombas-claro.png`, `08-sup-bombas-oscuro.png`, `09-sup-bomba-P201B.png` | Bombas: el indicador analógico y la ficha de P-201B |
| `10-sup-turno.png` | Entrega de turno: cinco cifras grandes |
| `11-jefe-riesgo.png`, `12-jefe-mantenimiento.png`, `13-conf-confiabilidad.png` | Riesgo, mantenimiento y confiabilidad |
| `14-reg-regulatorio.png`, `15-adm-filosofia.png`, `16-prod-diferidos.png`, `06-prod-produccion.png` | Regulatorio, filosofía operacional, libro de diferidos, producción |
| `17-oper-causa.png`, `20`–`23-tel-*.png` | El operador y el técnico, en escritorio y teléfono |
| `30-intro-ger.png`, `31-intro-oper-tel.png` | La introducción del primer día |
| `50-especimen-air.png` | Espécimen de la fuente Air |

**Referentes** (`SCR/referentes/`):

| Archivo | Qué muestra |
|---|---|
| `nubank-appstore.png` | El app: franja morada corta, saldo, atajos y factura; 4,8 con 1,7 millones de valoraciones |
| `nubank-home-escritorio.png`, `nubank-home-movil.png`, `nubank-colombia-home.png` | Portadas con un solo campo y el morado solo en logo y botones |
| `nubank-tarifas-contrato.png` | Tarifas en acordeón: todo a la vista |
| `nubank-brand-refresh-blog.png`, `nubank-brand-refresh-color.png`, `nubank-brand-refresh-tipografia.png` | El Brand Refresh de 2026: color con arquitectura y NuSans |
| `nubank-pentagram-identidad.png`, `nubank-nuds-figma.png` | La identidad de Pentagram y el caso NuDS en Figma |
| `revolut-home.png`, `revolut-analiticas.png` | Saldo y analíticas de un solo tono |
| `linear-home.png` | Linear: densidad, acento casi ausente |
| `stripe-accessible-color-systems.png` | La auditoría de contraste de Stripe |
| `vercel-geist-colors.png` | Las escalas de diez pasos de Geist |
| `tractian-app.png` | Tablero por gravedad con tiempo en estado |
| `augury-como-funciona.png` | Monitor, Diagnose, Validate, Act |
| `cognite-aura-campo.png` | Aura: AA en sala, con guantes y al sol |
| `hmi-ignition-tradicional-vs-hp.png` | La misma pantalla en estilo tradicional y de alto desempeño, y las marcas de calidad del dato (Inductive Automation) |
| `hmi-honeywell-experion-nivel1-asm.png` | Nivel 1 en Experion y el indicador con límites normales (Honeywell) |
| `hmi-aveva-sa-medidor-y-alarmas.png`, `hmi-aveva-intouch-sa-poor-better-best.png` | El medidor de la Situational Awareness Library, sus bordes de alarma y la demostración «Poor / Better / Best» (AVEVA) |
| `hmi-emerson-deltav-live.png`, `hmi-emerson-deltav-live-overview.png`, `hmi-emerson-deltav-live-faceplate.png` | La ficha técnica, la vista general y la ficha de un lazo en DeltaV Live (Emerson) |
| `hmi-siemens-wincc-unified-estilos.png` | Los tres estilos de WinCC Unified y el cambio de día a noche (Siemens) |

**Prototipos de las tres direcciones** (`SCR/prototipos/`): **`tres-direcciones.png`** (el tablero para verlas de un vistazo), `direcciones.html` con `direcciones.css`, las 12 capturas `{a,b,c}-{escritorio,telefono}-{claro,oscuro}.png` y los mosaicos `escritorio-mosaico.png` y `telefonos-mosaico.png`.

**Paletas y medición** (`SCR/paletas/`): `actual.json` y `medicion-actual.txt` (la paleta de hoy); **`direcciones-final.json` y `medicion-direcciones-final.txt`** (las tres direcciones con la paleta de estado de X2, con los pares fijos); `medicion-color-en-pantalla.txt` (cuánta pantalla lleva color). Las versiones anteriores (`direcciones-v1` a `v4`) muestran cómo se llegó.

**Verificación de citas** (`SCR/verificacion/` y `SCR/dl/asm-gris/asm-gris.txt`): el texto del artículo de ASM de 2011 y el guion que leyó la regla de color de Tractian.

Las fuentes web van enlazadas donde se citan, en §1 y §2.

## 8. Resumen

1. **Nubank** es fácil por una pregunta por pantalla con su cifra y su frase, palabras sin jerga y un sistema que se vigila. Su morado ocupa de 1 a 7 % de la pantalla. TRIM se lleva todo eso, menos el morado (en una pantalla de proceso, el magenta es estado) y la animación decorativa.
2. **Los referentes coinciden**: el gris carga todo y el color solo marca estado, con forma y texto (Vercel, Tractian, Cognite, Ignition, AVEVA, Honeywell, DeltaV). La sala oscura es herencia del monitor de tubo: ASM recomienda gris claro en sala iluminada.
3. **TRIM ya tiene** la disciplina de alto desempeño (ISA-101) y una voz de campo propia. Le sobran dos cifras héroe (una simulada), párrafos de cálculo y unos 900 textos de menos de 12 px. La marca casi no aparece, y la tubería no parece tubería.
4. **Tres direcciones dibujadas** (`SCR/prototipos/tres-direcciones.png`):
   - A, «Consola»: gris de alto desempeño, denso, con letra condensada.
   - B, «Una cifra»: Nubank con banda índigo.
   - C, «La tubería»: el proceso como interfaz, con placas cortadas a 45° como el logo.
5. **Las tres comparten un contrato:**
   - la paleta de estado de X2, que pasa AA en los seis fondos y deja todas las parejas a 10 o más con daltonismo;
   - ningún estado azul; el índigo #142d88 es solo de marca e interacción;
   - el equipo se pinta por brillo, nada parpadea y diferido no es pérdida;
   - una sola cifra héroe, y medida.
6. **Recomiendo C**, con la voz de B y la densidad de A para lo técnico. Es lo que pidió el dueño, encaja con «La planta viva» de X4 y no la vi en ningún referente.
7. **Pendiente: NO VERIFICADO** si la licencia de Air cubre el autohospedaje, el paquete y el PDF.
