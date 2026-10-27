# cont · Abastecimiento y contratos · ficha de valor (rol apagado)

**Lo necesario** de este rol está en `../necesario-por-rol.md` §9. **Recomendación: sale del producto.**

## 1. Su trabajo, en una frase

Saber si una parada le toca al contratista, a un tercero o a la operadora, con prueba.
- `roles.ts` (foco): «La línea de tiempo viene del PLC: deja de ser acta y pasa a ser evidencia».

## 2. Su pregunta y su decisión

- **Pregunta:** ¿esta parada le toca al contratista, a un tercero o a nosotros, y con qué prueba? [X4 §2]
- **Decisión:** a quién se le cobra.

## 3. Lo que ve hoy

El rol está apagado (`ROLES_V2`).
- `#/cont/evidencia/ceiba/curso` abre **la vista de producción** sin aviso [P-17].
- Su pantalla (`pages/Evidencia.tsx`) existe pero no se ofrece. Esto es lo que tiene:

| Elemento | Dónde | Quién lo pidió | Qué decisión habilita | Frecuencia | Si se borra… | Veredicto |
|---|---|---|---|---|---|---|
| La vista de producción al entrar por `#/cont/…` | Todas | Nadie | Ninguna | — | — | **B** |
| «Evidencia de parada»: horas fuera de las bombas (la cifra de 40 px) | Evidencia | `roles.ts`; U1 §1.1 (F3) | A quién cobrar | Al cerrar un contrato | Nadie: no se ofrece | **B**. Además **suma en la pantalla** (`horas`, `barriles`, en `Evidencia.tsx`), contra la regla «el motor calcula» |
| «bbl de sus propias paradas» | Evidencia | Ídem | Ídem | — | — | **B** |
| «Exportar CSV» con 22 columnas | Evidencia | `evidencia:exportar` | Entregar el expediente | — | El informe con folio lo exportan ger, prod y reg | **B** |
| La lista de paradas de las bombas con su línea de tiempo del PLC | Evidencia | Ídem | — | — | La cadena de cada parada y la ficha la tienen | **B** |

## 4. Lo necesario, y por qué sale

- **El número principal** (paradas con responsable externo) **falta en el motor** como vista. El dato está en el paso 1 «Quién» de `paradasAnh()`.
- **Pregunta 1, ¿agrega mucho valor al problema?** No: no baja un barril diferido ni uno perdido.
- **Pregunta 2, ¿sin esto pierde algo que no encuentra en otro lado?** No: el responsable ya está en el árbol de la ANH, que confirman sup y prod, y el informe con folio ya existe.
- Nadie lo pidió en la reunión ni lo dijo el dueño.

## 5. Sus tareas

No aplica.

## 6. Lo que se le borra

| Qué | Dónde |
|---|---|
| El rol en `roles.ts` (o su entrada en `ROLES_V2`) | Front |
| `pages/Evidencia.tsx`, su dirección y sus pruebas de pantalla | Front |

**En el contrato (§3.1):** nada se RETIRA. La vista de paradas de bombas la usan otras pantallas. Lo que solo use cont se marca «no prioritario».

**Si vuelve:** como vista «por responsable» en Resultados de ger o de reg (un escalón), si una operadora con mantenimiento tercerizado la pide.

## 7. Hoy contra lo necesario

No aplica: no se ofrece y sale.
