import { useApp, useRol } from '@/app/store'
import { Wordmark } from '@/shared/brand/Logo'
import { Boton } from '@/shared/ui/primitivas'

/** B3 · A-22 (P-17): la dirección de un rol que no se ofrece (la planeadora, apagada en esta versión) o
 *  que salió del producto (abastecimiento) lo dice, en vez de abrir la vista de otro rol sin avisar. */
export function RolNoDisponible({ nombre }: { nombre: string }) {
  const salir = useApp(s => s.salirDeRolNoDisponible)
  const rol = useRol()
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--suelo)] px-4 text-[var(--tinta)]">
      <section role="status" data-rol-no-disponible className="grid max-w-[460px] gap-4 rounded-[10px] bg-[var(--panel)] px-6 py-6 shadow-[inset_0_0_0_1px_var(--linea)]">
        <Wordmark className="h-[18px]" />
        <h1 className="text-[22px] font-semibold leading-snug">Este rol todavía no está disponible</h1>
        <p className="text-[16px] leading-normal text-[var(--tinta2)]">«{nombre}» no está en esta versión de TRIM.</p>
        <Boton variante="principal" className="min-h-12 justify-self-start px-6" onClick={salir}>Entrar como {rol.nombre.toLowerCase()}</Boton>
      </section>
    </main>
  )
}
