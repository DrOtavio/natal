import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function AdminDialog({ title, busy, onClose, children }: { title: string; busy: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog?.showModal()
    return () => {
      dialog?.close()
      // React may remove the opener (deletion) or re-enable it in this commit.
      window.requestAnimationFrame(() => {
        if (opener?.isConnected && !opener.hasAttribute('disabled')) opener.focus({ preventScroll: true })
        else document.querySelector<HTMLElement>('[data-participants-heading]')?.focus()
      })
    }
  }, [])

  return <dialog ref={ref} className="admin-dialog" aria-labelledby="admin-dialog-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}>
    <div className="admin-dialog-header"><div><p className="eyebrow text-wine">Área da organização</p><h2 id="admin-dialog-title">{title}</h2></div><button type="button" className="dialog-close" onClick={onClose} disabled={busy} aria-label="Fechar janela"><X size={20} aria-hidden="true" /></button></div>
    {children}
  </dialog>
}
