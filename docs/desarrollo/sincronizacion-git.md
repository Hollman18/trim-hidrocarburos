# Sincronizar Cursor y Claude Code (misma repo en GitHub)

**Fuente de verdad:** `main` en GitHub (`trim-hidrocarburos`). Cursor y Claude Code son dos entornos sobre el mismo clone.

## Antes de empezar a trabajar

```bash
git checkout main
git pull origin main
```

## Al terminar un bloque de trabajo

```bash
git status
git add …   # o git add -A con criterio
git commit -m "…"
git push origin main
```

## Si trabajaste en la otra herramienta

Haz **pull** antes de abrir el agente o editar. Si hay conflictos, resuélvelos en un solo lugar y vuelve a push.

## Contexto rápido para agentes

| Tema | Dónde leer |
|------|------------|
| Contrato API + demo | `CONTRATO.md` |
| Ciclo Antes / Durante / Después | `docs/backend/11-ciclo-de-valor.md`, `src/widgets/ciclo/Ciclo.tsx` |
| Libro de diferidos | `docs/backend/06a-libro-gerencia/`, `src/entities/libro.ts` |
| Plan Circular 24 / choke (WIP) | `docs/plan-circular-24/`, `src/entities/choke.ts` |
| Pitch comercial | `npm run pitch:pdf` → `docs/backend/TRIM-pitch-comercial.pdf` |

## Ramas

Preferir **`main` integrado** para no divergir. Si Claude Code usa otra rama, merge a `main` y avisar en el commit o en el chat del otro entorno.
