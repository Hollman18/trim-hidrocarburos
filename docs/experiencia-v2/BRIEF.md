# Experiencia v2 · Brief del equipo de diseño

**25-oct-2026 · Coordinador.** Lo leen todos los agentes del equipo antes de trabajar.

## Lo que pidió el dueño (Hollman), en sus palabras
> «Aquí quiero más que eso [UX/UI y alguien que investigue la norma]. Aquí yo quiero **identidad**. Quiero una **verdadera experiencia de usuario**… imagínate una experiencia tipo **Nubank**, que en realidad es demasiado simple de entender y de hacer y de usar. Cualquiera… algo exageradamente fácil, buena, simple de usar, que cualquier persona que entre y lo use pueda entenderlo rápido y no se enrede.»
>
> «**Tipo SCADA para el lado técnico**, para los roles técnicos, y para los roles más **gerenciales o directivos**, algo fácil de leer, de entender, tipo **su planta, el proceso, como el pipeline de dónde se están perdiendo**, y el **antes, durante y después de ese pipeline**. O sea, algo **tipo gemelo digital** que te pueda decir en la UI, donde tú puedas ver fácilmente y entenderlo. **No una simple gráfica normal**, sino su proceso, su flujo, y ahí entender dónde está el cuello de botella, las métricas relacionadas y todo esto.»
>
> «Aplicando las buenas prácticas de la **ISA-101** específicamente y las demás. Ya tenemos todas las funcionalidades, ya tenemos todo en el front. Ahora quiero que organicemos eso de una manera exageradamente buena… a partir de ahí se van a quedar pegados a usarlo.»

Dejó una página web de referencia que no llegó en el mensaje. Si llega, el coordinador la reenvía.

## El producto (lo que ya existe)
- **TRIM Hidrocarburos** (`/Users/hollman/trim-hidrocarburos`): React 19, Vite 8, TypeScript estricto, Tailwind v4, zustand y lucide-react. No usa librerías de gráficos: los dibujos son SVG propios.
- **El norte:** subir la productividad bajando los barriles DIFERIDOS (se recuperan después) y PERDIDOS (no se recuperan), monitoreando y prediciendo las bombas críticas (electrosumergibles, de reinyección y multifásicas). Campos colombianos con 92–97 % de agua.
- **Lo construido**, todo funcionando con datos de demostración:
  - el libro de diferidos;
  - el vigía (salud y predicción);
  - el colchón del tanque y el orden de cierre;
  - el **modelo choke**: la tubería yacimiento → pozos → planta → salida; lo que limita; «¿Dónde se trabó?»; la tubería del agua; «Si falla hoy»;
  - el **árbol de causas** de 6 pasos de la Circular ANH 024, que cuelga de cada tramo;
  - el **ciclo Antes · Durante · Después** (retorno simulado y planes de acción);
  - Identificar con WhatsApp, SAP PM, Regulatorio y la «Filosofía operacional».
- **Los 11 roles** (`src/entities/roles.ts`): ger (gerente de activo), prod (ingeniera de producción), sup (supervisor), oper (operador de campo), jefe (jefe de mantenimiento), conf (confiabilidad), plan (planeadora), tec (técnico), cont (abastecimiento), reg (regulatorio) y adm (administrador). Cada rol tiene sus pantallas.
- **Dónde verlo:**
  - el demo construido, en http://127.0.0.1:4173;
  - el servidor de desarrollo, en http://localhost:5173 (con `#/<rol>/<pantalla>/<campo>/curso`);
  - para no ver la introducción en un navegador automático: `localStorage.setItem('trim.intro.<rol>','1')`;
  - las rutas que recorre el auditor están en `e2e/auditoria/rutas.ts`.
- **Diseño actual:**
  - ISA-101 parcial: gris lo normal; colores de prioridad en `src/index.css` y `src/shared/ui/Prioridad.tsx`; morado para el dato inválido;
  - fuente **Air** (`public/fonts/`) y logos en `public/brand/`;
  - el diseño del choke en `docs/plan-circular-24/U2-choke-experiencia.md`;
  - el del árbol en `U1-experiencia.md`;
  - las pantallas anotadas en `docs/backend/06a`–`06d`.
- **Lo que pidió Adair** (experto en automatización): colores tipo SCADA de alto desempeño. Morado = falla de comunicación; rojo = interlock; naranja y amarillo = alarma.
- **Un dato a tener en cuenta:** el documento comercial (`docs/backend/01-propuesta-de-valor.md` §1.6) reservó la palabra «gemelo digital» para otra línea de producto, la de simulación. El dueño ahora pide algo «tipo gemelo digital». Se puede lograr la vista sin usar esa palabra, o el dueño decide.

## Restricciones técnicas
- El demo se sirve con una Content-Security-Policy estricta (`script-src 'self'` más un hash; sin `eval`). Ninguna librería puede necesitar `eval`.
- Hoy hay 209 pruebas e2e y un auditor de desbordes que recorre 100 rutas en 5 anchos: lo nuevo tiene que poder probarse igual.
- El motor calcula y la pantalla pinta.

## Reglas para el equipo
- **No se toca el código del producto** (`src/`, `e2e/`, `scripts/`) en esta fase. Cada agente escribe SOLO su archivo en `docs/experiencia-v2/`.
- **Los prototipos y las imágenes** van en el repositorio: `docs/experiencia-v2/imagenes/` (X1 en `X1-prototipo/`). Lo de `/private/tmp` se borra cuando el Mac se reinicia, y así se perdió el 25-oct. Las pruebas de librerías, que se pueden tirar, sí pueden ir en el scratchpad. Nunca `npm i` dentro del repositorio.
- **Fuentes:** cada afirmación sobre una norma, una empresa o una librería lleva su fuente (URL o documento). Lo que no se pueda verificar se marca **NO VERIFICADO**.
- **Español.** Palabras de campo colombianas cuando se habla al usuario final.
- **Coherencia:** si otro agente ya escribió su archivo en la carpeta, léelo. Si no estás de acuerdo, dilo en «Desacuerdos».
- **Escribir por partes.**
- **Al terminar, un resumen corto** (≤15 líneas).
